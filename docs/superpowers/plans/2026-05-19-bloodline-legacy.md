# Bloodline Legacy & Generational Careers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing `LegacyService` and `BloodlineRegistry` actually affect gameplay: attach a combat bonus to rikishi carrying a registered bloodline trait, surface a "dynasty" narrative path in BardEngine when a rikishi shares a surname lineage with a legend, and add a Legacy Hall page that shows the dynasty tree.

**Architecture:** The existing `LegacyService.applyLegacyTrait` already computes stat bonuses but is only called during candidate generation — not during weekly training where the ongoing bonus should be felt. A new `DynastyService` (already scaffolded at `src/engine/systems/legacy/DynastyService.ts`) needs to track active heritages. The weekly training phase applies the `heritageSurge` bonus. BardEngine gets dynasty templates. A `/hall-of-fame` route panel (the route already exists) shows the dynasty tree.

**Tech Stack:** TypeScript, Vitest, existing `LegacyService`, `DynastyService`, `BloodlineRegistry`, `BardEngine`, `ImpactBuilder`, TanStack Router (`/hall-of-fame`), shadcn/ui, Recharts, Tailwind.

---

## File Map

| Action     | Path                                                          | Purpose                                             |
| ---------- | ------------------------------------------------------------- | --------------------------------------------------- |
| Read first | `src/engine/systems/legacy/DynastyService.ts`                 | Understand current scaffold                         |
| Read first | `src/engine/types/dynasty.ts`                                 | Understand BloodlineTrait, BloodlineRegistry shapes |
| Modify     | `src/engine/systems/legacy/DynastyService.ts`                 | Add `applyHeritageBonus`, `checkDynastyNarrative`   |
| Create     | `src/engine/systems/legacy/__tests__/DynastyService.test.ts`  | Unit tests                                          |
| Modify     | `src/engine/tick/phases/phase01_week_training.ts`             | Call `applyHeritageBonus` weekly                    |
| Modify     | `src/engine/narrative/archive.json`                           | Add dynasty narrative templates                     |
| Modify     | `src/engine/bout/boutNarrative.ts`                            | Inject dynasty opening line when applicable         |
| Modify     | `src/pages/HallOfFame.tsx` (or equivalent at `/hall-of-fame`) | Render dynasty tree panel                           |

---

## Task 0: Read Existing Files Before Writing Any Code

This task has no checkboxes — it is mandatory reading before any implementation.

- [ ] Read `src/engine/systems/legacy/DynastyService.ts` in full.
- [ ] Read `src/engine/types/dynasty.ts` in full (or grep: `grep -n "BloodlineTrait\|BloodlineRegistry\|DynastyRecord" src/engine/types/dynasty.ts`).
- [ ] Read `src/engine/systems/legacy/LegacyService.ts` in full (already provided in context — it registers traits and applies bonuses at generation time).
- [ ] Confirm `world.bloodlineRegistry` is typed in `src/engine/types/world.ts`. If not, add: `bloodlineRegistry?: BloodlineRegistry;` following the import pattern for `BloodlineRegistry`.

---

## Task 1: Heritage Bonus in DynastyService

**Files:**

- Modify: `src/engine/systems/legacy/DynastyService.ts`
- Create: `src/engine/systems/legacy/__tests__/DynastyService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// src/engine/systems/legacy/__tests__/DynastyService.test.ts
import { describe, it, expect } from "vitest";
import { DynastyService } from "../DynastyService";
import { mockRikishi } from "../../../__tests__/utils";
import type { BloodlineTrait } from "../../../types/dynasty";
import type { WorldState } from "../../../types/world";

const mockTrait: BloodlineTrait = {
  traitId: "bl_legend1",
  label: "Iron Wrists",
  description: "Test trait",
  statFloorBonus: { technique: 6 },
  ceilingBonus: 5,
  ancestorShikona: "Hakuryu",
  registeredYear: 2020,
};

function makeWorld(rikishi: ReturnType<typeof mockRikishi>, trait: BloodlineTrait): WorldState {
  return {
    id: "w1",
    seed: "s",
    year: 2025,
    week: 5,
    dayIndexGlobal: 35,
    cyclePhase: "interim",
    rikishi: new Map([[rikishi.id, rikishi]]),
    heyas: new Map(),
    events: [],
    trainingState: new Map(),
    governanceLog: [],
    currentBasho: null,
    bloodlineRegistry: { traits: { [trait.traitId]: trait } },
  } as unknown as WorldState;
}

describe("DynastyService.applyHeritageBonus", () => {
  it("adds technique bonus to rikishi carrying the bloodline trait", () => {
    const r = mockRikishi("r1", { technique: 60 });
    r.lineage = { bloodlineTraitId: "bl_legend1" };
    const world = makeWorld(r, mockTrait);

    const impact = DynastyService.applyHeritageBonus(world);
    const updates = impact.rikishiUpdates ?? [];
    const upd = updates.find((u: { id: string }) => u.id === r.id);
    expect(upd?.technique).toBeGreaterThan(60);
  });

  it("does not double-apply bonus beyond ceiling", () => {
    const r = mockRikishi("r1", { technique: 99 });
    r.lineage = { bloodlineTraitId: "bl_legend1" };
    const world = makeWorld(r, mockTrait);

    const impact = DynastyService.applyHeritageBonus(world);
    const updates = impact.rikishiUpdates ?? [];
    const upd = updates.find((u: { id: string }) => u.id === r.id);
    // technique is already maxed — no update expected for this stat
    expect(upd?.technique ?? 99).toBeLessThanOrEqual(99);
  });

  it("skips rikishi with no lineage bloodlineTraitId", () => {
    const r = mockRikishi("r1", { technique: 60 });
    r.lineage = {};
    const world = makeWorld(r, mockTrait);

    const impact = DynastyService.applyHeritageBonus(world);
    const updates = impact.rikishiUpdates ?? [];
    expect(updates).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/engine/systems/legacy/__tests__/DynastyService.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement `applyHeritageBonus` in DynastyService**

Open `src/engine/systems/legacy/DynastyService.ts`. Add or replace content with:

```typescript
// src/engine/systems/legacy/DynastyService.ts
import type { WorldState } from "../../types/world";
import type { BloodlineTrait } from "../../types/dynasty";
import type { Rikishi } from "../../types/rikishi";
import { EntityCollection } from "../../core/EntityCollection";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import type { StateImpact } from "../../core/StateImpact";
import { clampInt } from "../../utils/math";

const WEEKLY_HERITAGE_BONUS = 1; // points per stat floor key, per week

export const DynastyService = {
  /**
   * Called weekly in training phase.
   * Rikishi carrying a bloodline trait gain a small weekly stat nudge
   * toward their heritage stat floor — but only if below the floor.
   */
  applyHeritageBonus(world: WorldState): StateImpact {
    const builder = createImpactBuilder("applyHeritageBonus");
    const registry = world.bloodlineRegistry;
    if (!registry) return builder.build();

    const activeRikishi = EntityCollection.getActiveRikishi(world);
    for (const rikishi of activeRikishi) {
      const traitId = rikishi.lineage?.bloodlineTraitId;
      if (!traitId) continue;
      const trait = registry.traits[traitId];
      if (!trait) continue;

      const updates: Partial<Rikishi> = {};
      let changed = false;

      for (const [stat, floor] of Object.entries(trait.statFloorBonus)) {
        const current = (rikishi as any)[stat] ?? 0;
        if (current < floor) {
          (updates as any)[stat] = clampInt(current + WEEKLY_HERITAGE_BONUS, 0, 99);
          changed = true;
        }
      }

      if (changed) {
        builder.updateRikishi(rikishi.id, updates);
      }
    }

    return builder.build();
  },

  /**
   * Returns the ancestor's shikona if the rikishi's shikona shares the same
   * surname fragment as their bloodline's ancestorShikona.
   * Japanese names: check last segment when split by space.
   */
  checkDynastyNarrative(rikishi: Rikishi, world: WorldState): string | null {
    const traitId = rikishi.lineage?.bloodlineTraitId;
    if (!traitId) return null;
    const trait = world.bloodlineRegistry?.traits[traitId];
    if (!trait?.ancestorShikona) return null;

    const ancestorSurname = trait.ancestorShikona.split(" ").at(-1) ?? "";
    const rikishiSurname = rikishi.shikona.split(" ").at(-1) ?? "";

    if (ancestorSurname.length >= 3 && rikishiSurname.startsWith(ancestorSurname)) {
      return trait.ancestorShikona;
    }
    return null;
  },
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/engine/systems/legacy/__tests__/DynastyService.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/legacy/DynastyService.ts src/engine/systems/legacy/__tests__/DynastyService.test.ts
git commit -m "feat(legacy): implement DynastyService.applyHeritageBonus and checkDynastyNarrative"
```

---

## Task 2: Wire Heritage Bonus into Weekly Training Tick

**Files:**

- Modify: `src/engine/tick/phases/phase01_week_training.ts`

- [ ] **Step 1: Import and call `applyHeritageBonus`**

Open `src/engine/tick/phases/phase01_week_training.ts`. After all other weekly training impacts are applied, add:

```typescript
import { DynastyService } from "../../systems/legacy/DynastyService";

const heritageImpact = DynastyService.applyHeritageBonus(world);
// apply heritageImpact using the existing StateImpact application pattern in this file
```

- [ ] **Step 2: Run existing training tests**

```
npx vitest run src/engine/tick/phases/
npx vitest run src/engine/systems/training/
```

Expected: All pre-existing tests still PASS (new call is additive).

- [ ] **Step 3: Commit**

```bash
git add src/engine/tick/phases/phase01_week_training.ts
git commit -m "feat(legacy): call DynastyService.applyHeritageBonus in weekly training tick"
```

---

## Task 3: Dynasty Narrative Templates

**Files:**

- Modify: `src/engine/narrative/archive.json`
- Modify: `src/engine/bout/boutNarrative.ts`

- [ ] **Step 1: Add dynasty templates to archive.json**

Open `src/engine/narrative/archive.json`. Find the top-level structure. Add a `dynasty` section under an appropriate domain (e.g., under `combat` or at the top-level `narrative`):

```json
"dynasty": {
  "opening": [
    "The bloodline of %ANCESTOR% flows through this bout.",
    "A descendant of the great %ANCESTOR% takes the dohyo.",
    "History watches as the heir of %ANCESTOR% faces the clay."
  ],
  "registered": [
    "A new bloodline enters the registry: the legacy of %HEYA% lives on.",
    "The JSA records a new dynasty: %HEYA%'s heir carries the torch.",
    "Future generations will carry this heritage forward."
  ],
  "milestone": [
    "%ANCESTOR%'s bloodline claims its first yusho in a new era.",
    "The %ANCESTOR% dynasty extends its reach across divisions.",
    "Three generations of the %ANCESTOR% line now compete."
  ]
}
```

- [ ] **Step 2: Add dynasty opening line to bout narrative**

Open `src/engine/bout/boutNarrative.ts`. Find the function that constructs the `narrative: string[]` array on a bout result.

Add near the top of that function (before the bout begins):

```typescript
import { DynastyService } from "../systems/legacy/DynastyService";
import { BardEngine } from "../narrative/BardEngine";

// Check if either rikishi carries a dynasty lineage
const dynastyAncestor =
  DynastyService.checkDynastyNarrative(eastRikishi, world) ??
  DynastyService.checkDynastyNarrative(westRikishi, world);

if (dynastyAncestor) {
  const dynastyLine = BardEngine.resolve(rng, "dynasty.opening", {
    ancestor: dynastyAncestor,
  }).text;
  narrative.push(dynastyLine);
}
```

The `%ANCESTOR%` token in the template maps to `ancestor` context key — confirm this matches BardEngine's token resolution convention (tokens like `%ANCESTOR%` map to context keys `ancestor`). If BardEngine uses a different casing convention, check `archive.json` examples and adjust.

- [ ] **Step 3: Run bout tests**

```
npx vitest run src/engine/bout/
```

Expected: All existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/engine/narrative/archive.json src/engine/bout/boutNarrative.ts
git commit -m "feat(narrative): add dynasty bout opening line and archive.json templates"
```

---

## Task 4: Dynasty Tree UI in Hall of Fame

**Files:**

- Modify: `src/pages/HallOfFame.tsx` (or whichever file renders the `/hall-of-fame` route)

- [ ] **Step 1: Find the Hall of Fame page**

```
grep -rn "hall-of-fame\|HallOfFame\|halloffame" src/routes.tsx src/pages/
```

Open the identified file.

- [ ] **Step 2: Add a Dynasty Registry panel below existing content**

```tsx
// Add this component inline or as a named function at the top of the file:
import type { BloodlineRegistry, BloodlineTrait } from "@/engine/types/dynasty";

function DynastyRegistryPanel({ registry }: { registry: BloodlineRegistry | undefined }) {
  const traits = Object.values(registry?.traits ?? {});

  if (traits.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic p-4">
        No bloodlines registered yet. Ozeki and above leave a lasting legacy on retirement.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {traits.map((trait) => (
        <div key={trait.traitId} className="border rounded-md p-3 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{trait.ancestorShikona}</span>
            <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{trait.label}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              Est. {trait.registeredYear}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{trait.description}</p>
          <div className="flex gap-3 text-xs">
            {Object.entries(trait.statFloorBonus).map(([stat, bonus]) => (
              <span key={stat} className="text-green-500">
                +{bonus} {stat}
              </span>
            ))}
            <span className="text-blue-400">+{trait.ceilingBonus} ceiling</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

In the Hall of Fame page JSX, add:

```tsx
<section>
  <h2 className="text-lg font-semibold mb-3">Dynasty Registry</h2>
  <DynastyRegistryPanel registry={world.bloodlineRegistry} />
</section>
```

Pass `world` from `useGameContext()` or whichever context hook is used in the existing page.

- [ ] **Step 3: Manual smoke test**

Start dev server (`bun run dev`). Navigate to `/hall-of-fame`.

1. Confirm Dynasty Registry panel renders with placeholder text on a fresh world.
2. Advance until an ozeki retires — confirm their trait appears.
3. Confirm stat floor bonuses and ceiling are displayed correctly.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HallOfFame.tsx
git commit -m "feat(ui): add Dynasty Registry panel to Hall of Fame page"
```

---

## Task 5: Dynasty Narrative Event on Trait Registration

**Files:**

- Modify: `src/engine/systems/legacy/LegacyService.ts`

- [ ] **Step 1: Add BardEngine dynasty headline to `registerLegacyTrait`**

Open `src/engine/systems/legacy/LegacyService.ts`. The existing `registerLegacyTrait` function logs an event. After the event log, add a BardEngine narrative headline:

```typescript
import { BardEngine } from "../../narrative/BardEngine";
import { rngForWorld } from "../../rng";

// After builder.logEvent(...):
const rng = rngForWorld(world, "legacy", `register_${rikishi.id}`);
const headline = BardEngine.resolve(rng, "dynasty.registered", {
  heya: world.heyas.get(rikishi.heyaId)?.name ?? "Unknown Heya",
}).text;

builder.logEvent(
  "DYNASTY_REGISTERED",
  "career",
  {
    rikishiId: rikishi.id,
    shikona: rikishi.shikona,
    headline,
    traitLabel: trait.label,
  },
  { importance: "major" }
);
```

- [ ] **Step 2: Write a test for `registerLegacyTrait` narrative**

```typescript
// src/engine/systems/legacy/__tests__/legacyRegistration.test.ts
import { describe, it, expect } from "vitest";
import { LegacyService } from "../LegacyService";
import { mockRikishi } from "../../../__tests__/utils";
import type { WorldState } from "../../../types/world";

describe("LegacyService.registerLegacyTrait", () => {
  it("logs a DYNASTY_REGISTERED event with a headline", () => {
    const r = mockRikishi("r1", { rank: "ozeki", shikona: "Testzan" });
    r.stats = {
      strength: 85,
      technique: 80,
      speed: 70,
      stamina: 75,
      mental: 78,
      adaptability: 65,
      balance: 72,
    };
    const world = {
      id: "w1",
      seed: "s",
      year: 2025,
      week: 1,
      dayIndexGlobal: 1,
      cyclePhase: "interim",
      rikishi: new Map([[r.id, r]]),
      heyas: new Map([["h1", { id: "h1", name: "Fuji-beya" }]]),
      events: [],
      trainingState: new Map(),
      governanceLog: [],
      currentBasho: null,
      records: { allTime: { yusho: [], careerWins: [] } },
    } as unknown as WorldState;

    r.heyaId = "h1";
    const impact = LegacyService.registerLegacyTrait(world, r);
    const events = impact.events ?? [];
    const dynastyEvent = events.find((e: { type: string }) => e.type === "DYNASTY_REGISTERED");
    expect(dynastyEvent).toBeDefined();
    expect(dynastyEvent?.data?.headline).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run test**

```
npx vitest run src/engine/systems/legacy/__tests__/legacyRegistration.test.ts
```

Expected: PASS.

- [ ] **Step 4: Run all legacy tests**

```
npx vitest run src/engine/systems/legacy/
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/systems/legacy/LegacyService.ts src/engine/systems/legacy/__tests__/legacyRegistration.test.ts
git commit -m "feat(legacy): add dynasty narrative headline to registerLegacyTrait event"
```

---

## Verification Checklist

- [ ] `npx vitest run src/engine/systems/legacy/` — all tests pass
- [ ] `npx vitest run src/engine/bout/` — existing bout tests pass
- [ ] `npx vitest run src/engine/tick/` — existing tick tests pass
- [ ] Heritage bonus only nudges stats toward floor — never exceeds `clampInt(current + 1, 0, 99)` per week
- [ ] `world.bloodlineRegistry` is `undefined`-safe everywhere (use `?? {}` defaults)
- [ ] `npx tsc --noEmit` — zero type errors
- [ ] Manual: retire an ozeki, confirm trait appears in Dynasty Registry UI and future rikishi generation can inherit it
