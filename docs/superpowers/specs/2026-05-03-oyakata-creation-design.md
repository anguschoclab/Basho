# Oyakata Creation at Game Start — Design Spec
**Date:** 2026-05-03  
**Status:** Ready for implementation

---

## 1. Problem Statement

When a player starts a new game, they should feel like they are becoming an oyakata — not just selecting a heya from a grid. The current implementation has three critical gaps:

1. **Wizard is orphaned.** `MainMenu.beginWithHeya()` calls `createWorld(seed, heyaId)` and navigates directly to `/dashboard`. The `NewGameWizard` at `/new-game` is never reached. All wizard UI (identity step, faction step, exhibition bout) is dead code in the main flow.

2. **Wizard data is never saved.** `NewGameWizard` collects `oyakataName`, `background`, and `ichimon` into local React state, but `handleFinish()` only passes `selectedHeyaId` to `createWorld()`. The action signature `(seed, playerHeyaId?)` has no slot for oyakata data. Nothing the player types or picks in steps 1–2 persists to the world.

3. **Backstory options are thin.** `wizardConstants.ts` defines 3 backgrounds (yokozuna, ozeki, maegashira) whose `bonuses` are collected but never applied to the world. Real oyakata come from 7–8 meaningfully distinct paths.

**Confirmed by code audit:**
- `grep playerOyakataId src/` → zero matches. No world-level pointer to player oyakata.
- `grep PATCH_OYAKATA src/` → zero matches. No mutation action exists.
- `grep wizardData src/` → zero matches. Wizard state never escapes the component.
- `OyakataPage.tsx` accesses player oyakata via `world.heyas.get(playerHeyaId)?.oyakataId` → `world.oyakata.get(id)`. This chain works and requires no structural change — just correct data.

---

## 2. Goal

On every new game start, the player:
1. **Names their oyakata** (toshiyori-mei / elder name) with a random-generate option.
2. **Picks a backstory** from 7 realistic paths rooted in actual sumo culture, each yielding distinct starting bonuses and setting their oyakata's career fields.
3. These choices **persist into the world** and are immediately visible on the Oyakata page.

Save-file compatibility is explicitly out of scope. Existing saves are not affected.

---

## 3. Architecture Overview

```
MainMenu.beginWithHeya(heyaId)
  │
  └── navigate({ to: "/new-game", search: { heyaId } })
         │
         ▼
  NewGameWizard  (4 steps, heyaId pre-selected — Step 3 hidden or skipped)
  ├── Step 1: IdentityStep  ← Enhanced: richer name + 7 backstory options
  ├── Step 2: FactionStep   ← Unchanged
  ├── Step 3: StableStep    ← Skipped (heyaId from URL param)
  └── Step 4: ExhibitionBout ← Unchanged
         │
         ▼
  handleFinish() dispatches CREATE_WORLD with oyakataConfig
         │
         ▼
  coreSlice CREATE_WORLD handler
  ├── generateInitialWorld(seed)           ← unchanged
  ├── markHeyaAsPlayerOwned(world, heyaId) ← existing
  └── applyOyakataCreationConfig(world, heyaId, config)   ← NEW
         │  writes: oyakata.name, .formerShikona, .highestRank,
         │          .archetype, .traits, .stats, heya.funds,
         │          heya.prestige, heya.ichimon
         ▼
  GameState with correctly populated player oyakata
         │
         ▼
  OyakataPage — reads existing chain, now shows player data ✓
```

---

## 4. Data Model Changes

### 4.1 `OyakataCreationConfig` — New Type
File: `src/engine/types/oyakata.ts`

```typescript
export interface OyakataCreationConfig {
  name: string;         // player-chosen toshiyori name
  backstoryId: string;  // key into OYAKATA_BACKSTORIES
  ichimon?: string;     // faction selected in step 2
}
```

### 4.2 `CREATE_WORLD` Action — Extended
File: `src/contexts/gameTypes.ts`

```typescript
| { type: "CREATE_WORLD"; seed: string; playerHeyaId?: string; oyakataConfig?: OyakataCreationConfig }
```

### 4.3 `GameState` — `playerOyakataId` Added
File: `src/contexts/gameTypes.ts`

```typescript
interface GameState {
  // existing ...
  playerOyakataId: string | null;  // NEW — derived and cached on CREATE_WORLD
}
```

This avoids re-deriving `heya → oyakataId` everywhere and is the canonical reference.

### 4.4 `gameActions.ts` — Updated Signature

```typescript
export const createWorld = (
  seed: string,
  playerHeyaId?: string,
  oyakataConfig?: OyakataCreationConfig
): GameAction => ({
  type: "CREATE_WORLD",
  seed,
  playerHeyaId,
  oyakataConfig,
});
```

---

## 5. New Engine Function: `applyOyakataCreationConfig`

File: `src/engine/systems/generation/applyOyakataConfig.ts` (new)

```typescript
export function applyOyakataCreationConfig(
  world: WorldState,
  playerHeyaId: string,
  config: OyakataCreationConfig
): WorldState
```

**What it does — in order:**
1. Resolve `heya = world.heyas.get(playerHeyaId)` and `oyakata = world.oyakata.get(heya.oyakataId)`.
2. Look up backstory: `backstory = OYAKATA_BACKSTORIES.find(b => b.id === config.backstoryId)`.
3. Generate `formerShikona` using the shikona generation system, filtered to backstory's rank tier.
4. Mutate oyakata (immutably):
   - `name` ← `config.name`
   - `shikona` ← `config.name`
   - `highestRank` ← `backstory.highestRank`
   - `formerShikona` ← generated shikona
   - `archetype` ← `backstory.preferredArchetype ?? existing`
   - `traits` ← blend: archetype base ± backstory `traitModifiers`
   - `stats.scouting` ← `backstory.bonuses.scouting`
   - `stats.training` ← `backstory.bonuses.training`
   - `stats.politics` ← `backstory.bonuses.politics`
5. Mutate heya (immutably):
   - `funds` ← `heya.funds + backstory.bonuses.funds`
   - `prestige` ← `heya.prestige + backstory.bonuses.prestige`
   - `politicalCapital` ← `(heya.politicalCapital ?? 0) + backstory.bonuses.politicalCapital`
   - `ichimon` ← `config.ichimon ?? heya.ichimon`
6. Return patched world.

This function is **pure** — takes world, returns new world. No side effects. Fully testable.

---

## 6. Backstory Definitions (7 Options)

File: `src/components/wizard/wizardConstants.ts` — replaces existing 3-option array.

Each backstory has:
- `id`, `label`, `icon` (Lucide), `flavor` (2-sentence description)
- `highestRank`: string stored on Oyakata.highestRank
- `preferredArchetype`: OyakataArchetype (optional; falls back to existing random)
- `traitModifiers`: partial OyakataTraits (additive deltas to archetype base)
- `bonuses`: `{ funds: yen, prestige: 0-4, scouting: 0-4, training: 0-4, politics: 0-4, politicalCapital: 0-100 }`
- `difficulty`: "Easy" | "Normal" | "Hard" | "Very Hard"
- `startingQuirks`: string[] (1-2 guaranteed quirks from the pool)

| id | Label | Highest Rank | Archetype | Prestige | Funds | Scout | Train | Politic | Difficulty |
|----|-------|-------------|-----------|----------|-------|-------|-------|---------|-----------|
| `yokozuna_champion` | Champion Inheritor | Yokozuna | traditionalist | +4 | +3M | +1 | +1 | +3 | Easy |
| `ozeki_legend` | Tournament Legend | Ozeki | strategist | +3 | +5M | 0 | +2 | +1 | Normal |
| `sanyaku_veteran` | Sanyaku Veteran | Sekiwake | scientist | +1 | +10M | +1 | +2 | 0 | Normal |
| `maegashira_lifer` | Long-Distance Runner | Maegashira | nurturer | -1 | +15M | 0 | +4 | -1 | Hard |
| `injury_comeback` | Comeback King | Ozeki | gambler | +2 | +8M | +1 | +1 | +1 | Normal |
| `international_scout` | International Scout | Maegashira | scientist | 0 | +12M | +5 | +1 | -1 | Hard |
| `council_elder` | Council Elder | Sekiwake | strategist | -1 | +20M | 0 | -1 | +5 | Very Hard |

**Notes on balance:**
- `maegashira_lifer` funds offset prestige penalty — takes longer to attract elite recruits.
- `international_scout` gets the highest scouting bonus (+5) but starts governance-penalised.
- `council_elder` flips the game toward political/governance challenges with less hands-on training.
- Funds range: 3M (yokozuna, already rich) to 20M (elder, compensates for low training). Base heya funds are set during world generation; these are additive.

**Disproved assumption:** Earlier research suggested a separate "Iron Fist Traditionalist" backstory. This is covered by `maegashira_lifer` with `nurturer` archetype override. The `tyrant` archetype is reserved for NPC oyakata generation only — player-controlled archetypes are limited to those that produce viable long-term gameplay. `tyrant` produces 5/100 compassion, which triggers welfare crises immediately.

---

## 7. Toshiyori Name Generation

File: `src/engine/shikona/toshiyoriNames.ts` (new)

### 7.1 Curated name pool (30 entries)
Authentic-sounding toshiyori names following the geographic + nature element pattern (e.g., Kitanoumi, Dewanoumi, Tokitsukaze). These are NOT the real heya names (already used for NPC oyakata) — they are plausible alternatives:

Examples: `"Saganoumi"`, `"Ryogoku"`, `"Azumayama"`, `"Shiranami"`, `"Nishikido"`, `"Kasugaumi"`, `"Otodake"`, `"Tomozuna"`, `"Kumagatani"`, `"Wakamatsu"` ...30 total.

### 7.2 Procedural generation function

```typescript
export function generateToshiyoriName(rng: SeededRNG): string
```

Uses 3 patterns (weighted):
- **Geographic + nature** (50%): direction/prefecture prefix + sea/mountain suffix. E.g., "Nishi" + "noumi" → "Nishiumi"
- **Curated pool pick** (35%): selects from the 30-entry authentic pool
- **Classical compound** (15%): two kanji compounds from a curated set

### 7.3 IdentityStep integration
A `RefreshCw` icon button next to the name input calls `generateToshiyoriName(rng)` with a deterministic seed derived from `Date.now()` (acceptable for UI-only randomness). Each click produces a new candidate name.

**Validation:** Name must be 2–20 characters. No special characters. Leading/trailing whitespace trimmed.

---

## 8. Wizard Flow Changes

### 8.1 MainMenu — Route to Wizard

File: `src/pages/MainMenu.tsx`

```typescript
// Before
const beginWithHeya = (heyaId: string) => {
  createWorld(state.world.seed, heyaId);
  navigate({ to: "/dashboard" });
};

// After
const beginWithHeya = (heyaId: string) => {
  navigate({ to: "/new-game", search: { heyaId } });
};
```

`createWorld()` is no longer called from MainMenu. The wizard owns world creation.

### 8.2 NewGameWizard — Accept `heyaId` Param

File: `src/pages/NewGameWizard.tsx`

- Read `heyaId` from route search params via TanStack Router's `useSearch()`.
- If `heyaId` is present: skip Step 3 (StableStep) — pre-select it and advance to step 4 from step 2.
- Step counter: show 3 dots (not 4) when heyaId pre-selected.

### 8.3 NewGameWizard — `handleFinish()` Updated

```typescript
const handleFinish = () => {
  const config: OyakataCreationConfig = {
    name: oyakataName.trim(),
    backstoryId: background,
    ichimon: ichimon || undefined,
  };
  createWorld(world.seed, selectedHeyaId, config);
  // step 4 (exhibition) renders inline — no navigate needed
};
```

### 8.4 IdentityStep — Enhancements

File: `src/components/wizard/IdentityStep.tsx`

1. **Name input** with `RefreshCw` random-generate button.
2. **7 backstory cards** (replacing 3). Cards show: label, flavor text, difficulty badge, bonus chips (Prestige/Funds/Scout/Train/Politics). Layout: 2-column responsive grid, scrollable.
3. Props: add `onRandomName: () => void` alongside existing.

### 8.5 WizardFooter — Show Background Label

`WizardFooter` currently shows `oyakataName`, `endowment`, `allegiance`. Add `background` as a fourth chip: "Background: Tournament Legend".

---

## 9. Reducer Changes

File: `src/contexts/coreSlice.ts` (the CREATE_WORLD handler)

```typescript
case "CREATE_WORLD": {
  const world = generateInitialWorld(action.seed);
  const playerHeyaId = action.playerHeyaId ?? null;

  let nextWorld = { ...world, playerHeyaId: playerHeyaId ?? undefined };

  if (playerHeyaId) {
    const heya = world.heyas.get(playerHeyaId);
    if (heya) {
      nextWorld.heyas = new Map(world.heyas);
      nextWorld.heyas.set(playerHeyaId, { ...heya, isPlayerOwned: true });
    }

    // NEW: apply player's oyakata config
    if (action.oyakataConfig) {
      nextWorld = applyOyakataCreationConfig(nextWorld, playerHeyaId, action.oyakataConfig);
    }
  }

  const playerOyakataId = playerHeyaId
    ? (nextWorld.heyas.get(playerHeyaId)?.oyakataId ?? null)
    : null;

  return {
    ...state,
    world: nextWorld,
    playerHeyaId,
    playerOyakataId,   // NEW field on GameState
    phase: playerHeyaId ? "interim" : "menu",
  };
}
```

---

## 10. OyakataPage — What Already Works / What Needs Adding

**Already works (no changes needed):**
- Name display: reads `oyakata.name` ✓
- Traits display: reads `oyakata.traits` ✓
- Career section: reads `oyakata.highestRank` and `oyakata.formerShikona` ✓
- Archetype badge: reads `oyakata.archetype` ✓
- Yokozuna legacy display: conditional on `oyakata.highestRank === "yokozuna"` ✓

**Needs adding:**
- **Backstory flavor section**: A short prose card below the identity header quoting the backstory's flavor text (stored on the backstory definition, looked up by `backstoryId` which must be stored on Oyakata). Add `backstoryId?: string` to Oyakata type, set it in `applyOyakataCreationConfig`.
- **Starting bonus history**: The bonuses applied at creation should appear as a one-time historical note (e.g., "Entered with Ozeki-level prestige endowment"). Store as an oyakata `memory` directive.

**Confirmed — no other OyakataPage changes needed.** The career section Yokozuna-tsuna display will automatically fire when the player picks the `yokozuna_champion` backstory.

---

## 11. Tests

### 11.1 Unit Tests (Vitest)

**`src/engine/systems/generation/__tests__/applyOyakataConfig.test.ts`**
- All 7 backstory IDs apply without throwing.
- `oyakata.name` equals the provided config name.
- `heya.funds` increases by the backstory's fund bonus.
- `heya.prestige` increases correctly.
- `oyakata.stats.scouting` equals backstory scouting value.
- `oyakata.highestRank` equals backstory highestRank.
- `oyakata.backstoryId` is set.
- Unknown `backstoryId` falls back gracefully (logs warning, no crash).
- Function is pure: original world is not mutated.

**`src/engine/shikona/__tests__/toshiyoriNames.test.ts`**
- `generateToshiyoriName(rng)` returns a string.
- Length is between 4 and 18 characters.
- Two different RNG seeds produce different names (at least 50% of time across 100 samples).
- Output contains no special characters.

**`src/components/wizard/__tests__/wizardConstants.test.ts`**
- All 7 backstories have required fields: id, label, flavor, highestRank, bonuses.
- `bonuses.funds` is a positive number for all.
- No two backstories share the same `id`.
- `preferredArchetype`, when present, is a valid `OyakataArchetype` key.

### 11.2 Integration Tests (Vitest + in-memory reducer)

**`src/contexts/__tests__/coreSlice.oyakata.test.ts`**
- Dispatching `CREATE_WORLD` with `oyakataConfig` results in `world.oyakata.get(playerOyakataId).name === config.name`.
- `playerOyakataId` is populated in the returned `GameState`.
- Dispatching `CREATE_WORLD` without `oyakataConfig` still succeeds (backward compatibility).
- Ichimon in `config` is applied to the player's heya.

### 11.3 What Is NOT Tested (and Why)
- ExhibitionBout rendering — covered by existing snapshot tests.
- OyakataPage visual output — not testable without a running game world; covered by the integration test proving data flows correctly.

---

## 12. Files Modified / Created

| File | Change |
|------|--------|
| `src/engine/types/oyakata.ts` | Add `OyakataCreationConfig` interface; add `backstoryId?: string` to `Oyakata` |
| `src/contexts/gameTypes.ts` | Extend `CREATE_WORLD` action; add `playerOyakataId` to `GameState` |
| `src/contexts/gameActions.ts` | Update `createWorld()` signature |
| `src/contexts/coreSlice.ts` | Apply `applyOyakataCreationConfig` in CREATE_WORLD handler; set `playerOyakataId` |
| `src/engine/systems/generation/applyOyakataConfig.ts` | **NEW** — pure function |
| `src/engine/shikona/toshiyoriNames.ts` | **NEW** — name pool + generator |
| `src/components/wizard/wizardConstants.ts` | Replace 3-backstory array with 7-backstory array |
| `src/components/wizard/IdentityStep.tsx` | Add random-name button; update to 7-card backstory grid |
| `src/components/wizard/WizardFooter.tsx` | Add background chip |
| `src/pages/NewGameWizard.tsx` | Accept `heyaId` route param; skip StableStep when pre-selected; pass `oyakataConfig` to createWorld |
| `src/pages/MainMenu.tsx` | Change `beginWithHeya` to navigate to `/new-game` with heyaId param |
| `src/pages/OyakataPage.tsx` | Add backstory flavor text section |
| **Tests** | 3 new test files (see §11) |

---

## 13. Explicitly Disproved Assumptions

| Assumption | Result | Evidence |
|-----------|--------|---------|
| "Wizard is accessible from MainMenu" | ❌ WRONG | `beginWithHeya` navigates to `/dashboard`, not `/new-game` |
| "Wizard data is saved to the world" | ❌ WRONG | `createWorld(seed, heyaId)` — no oyakata params; reducer ignores wizard state |
| "playerOyakataId exists on GameState" | ❌ WRONG | Zero grep matches; only `playerHeyaId` exists |
| "An UPDATE_PLAYER_OYAKATA action exists" | ❌ WRONG | Zero grep matches in gameTypes.ts |
| "Background bonuses are applied" | ❌ WRONG | `wizardConstants.ts` has `bonuses` object, but handler never reads them |
| "OyakataPage needs structural refactor" | ✅ WRONG (it's fine) | Already reads via correct `heya → oyakataId → oyakata` chain; just needs correct data fed in |
| "generateOyakataName() is useful for players" | ❌ WRONG | Picks from 15 real heya names — all already used by NPC oyakata; players cannot share these names |
| "Tyrant archetype is safe for player use" | ❌ WRONG | Compassion=5 triggers immediate welfare crises; excluded from player backstories |
| "ichimon from wizard is applied to heya" | ❌ WRONG | FactionStep collects value but `handleFinish()` never uses it |
