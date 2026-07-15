# Combat System B+ Implementation Plan

> **Scope:** Replace `boutPhysics.ts`, `boutGrip.ts`, `boutCalculations.ts`, `kimariteEvaluator.ts` with the spatial phase-gate model described in `combat-system-approach-b-expanded.md`  
> **Preserve untouched:** `boutResolver.ts`, `boutNarrative.ts`, `boutResultApplier.ts`, `kimariteStrategy.ts` (updated in Phase 5)  
> **RNG convention:** All `rng.next()` calls must use seeded RNG — never `Math.random()`  
> **Test runner:** `bun test -- --run`

---

## Guiding Principles

1. **Spatial first, narrative second** — get the physics state machine correct before touching narrative or BardEngine templates
2. **Kimarite from physics** — never select a technique before the physics determine who won; classifiers read state, they do not produce it
3. **Preserve the public contract** — `boutResolver.ts` calls `resolveBoutPhysics(bout, east, west, basho)` and gets back `{ result: BoutResult, engineSnapshot: EngineSnapshot }`. This signature must not change
4. **Determinism at every step** — same seed → same bout result, byte-for-byte. Add a determinism smoke test in Phase 1 before touching any logic
5. **No dead state** — every new type field must be initialized; no `undefined` lurking in spatial coordinates

---

## Phase 0 — Safety Net (before any logic changes)

**Goal:** Lock in a regression baseline so we know if B+ breaks anything.

### 0.1 — Add determinism smoke test

**File:** `src/engine/bout/__tests__/determinism.test.ts` (new)

```typescript
// Run the same bout 5 times with the same seed — all results must be identical
it("resolveBoutPhysics is deterministic", () => {
  const bout = { id: "test-001", day: 1, rikishiEastId: "r1", rikishiWestId: "r2" };
  const east = mockRikishi("r1");
  const west = mockRikishi("r2");
  const basho = mockBasho();

  const results = Array.from({ length: 5 }, () => resolveBoutPhysics(bout, east, west, basho));
  for (let i = 1; i < results.length; i++) {
    expect(results[i].result.winner).toBe(results[0].result.winner);
    expect(results[i].result.kimarite).toBe(results[0].result.kimarite);
    expect(results[i].result.duration).toBe(results[0].result.duration);
  }
});
```

### 0.2 — Snapshot current BoutResult shape

**File:** `src/engine/bout/__tests__/boutResult.snapshot.test.ts` (new)

```typescript
// Vitest snapshot test — captures current output shape
it("BoutResult shape snapshot", () => {
  const result = resolveBoutPhysics(fixedBout, fixedEast, fixedWest, fixedBasho);
  expect(result.result).toMatchSnapshot();
});
```

Run `bun test -- --run` to establish baseline. All 471 existing tests must pass before proceeding.

---

## Phase 1 — New Type Layer

**Goal:** Add all B+ types to `src/engine/types/` without touching any logic files.

### 1.1 — Create `src/engine/types/combat-spatial.ts`

New file containing:

```typescript
export const RING_RADIUS = 4.55; // meters
export const TAWARA_RADIUS = 4.55; // same — inner edge of tawara
export const SHIKIRISEN_OFFSET = 0.7; // meters from center
export const EDGE_THRESHOLD = 3.8; // meters — edge crisis trigger distance

export interface PhysicalBody {
  /* ...as spec */
}
export interface HandGrip {
  /* ...as spec */
}
export interface BeltBattleState {
  /* ...as spec */
}
export interface PushBattleState {
  /* ...as spec */
}
export interface EdgeCrisisState {
  /* ...as spec */
}

export type CombatPhase =
  | { tag: "approach" }
  | { tag: "tachiai"; impactVelocity: number; contactAngle: number }
  | { tag: "push_battle"; state: PushBattleState }
  | { tag: "belt_battle"; state: BeltBattleState; push: PushBattleState }
  | { tag: "edge_crisis"; crisis: EdgeCrisisState; prev: "push_battle" | "belt_battle" }
  | { tag: "resolved"; winner: Side; exitVector: { x: number; z: number }; technique: KimariteId };

export interface EngineStateV2 {
  /* ...as spec */
}
export interface BoutLogEntryV2 extends BoutLogEntry {
  /* ...as spec */
}
export interface SpatialBoutContext {
  /* ...as spec */
}
export interface KimariteAttempt {
  /* ...as spec */
}
```

**No existing files change in this phase.**

### 1.2 — Add `src/engine/types/index.ts` re-export (if not present)

Add: `export * from './combat-spatial';`

### 1.3 — Verify TypeScript compiles

```bash
bun run tsc --noEmit
```

All types should compile. Run `bun test -- --run` — all 471 tests still pass (no logic changed).

---

## Phase 2 — PhysicalBody Initialization & Helper Utilities

**Goal:** Build the foundational spatial utilities that all subsequent phases depend on.

### 2.1 — Create `src/engine/bout/boutSpatial.ts` (new file)

```typescript
// Pure utility functions — no side effects, fully testable
export function initPhysicalBody(rikishi: Rikishi, side: Side): PhysicalBody;
export function isBodyFalling(body: PhysicalBody): boolean;
export function isOutOfRing(body: PhysicalBody): boolean;
export function tawaraBounceResistance(toePos: number): number;
export function computePushForce(
  rikishi: Rikishi,
  action: CombatAction,
  stanceWidth: number,
  fatigue: number
): number;
export function computePushAngle(
  action: CombatAction,
  myBody: PhysicalBody,
  opponentBody: PhysicalBody,
  rng: SeededRNG
): number;
export function deriveGripClass(
  left: HandGrip | null,
  right: HandGrip | null
): BeltBattleState["eastGripClass"];
export function classifyFallKimarite(
  push: PushBattleState,
  st: EngineStateV2,
  fallenSide: Side
): KimariteId;
export function classifyBeltFallKimarite(
  belt: BeltBattleState,
  st: EngineStateV2,
  fallenSide: Side
): KimariteId;
export function classifyEdgeExitKimarite(
  crisis: EdgeCrisisState,
  st: EngineStateV2,
  rng: SeededRNG
): KimariteId;
```

Key implementation notes:

**`initPhysicalBody`:**

- `x`: east starts at `+SHIKIRISEN_OFFSET`, west at `-SHIKIRISEN_OFFSET`
- `facingAngle`: east = `Math.PI` (facing west/opponent), west = `0` (facing east)
- `mass`: derived from `rikishi.weight ?? 120` (kg — assume weight stat maps to ~80–200kg range: `mass = 80 + weight * 1.2`)
- `cogHeight`: `(rikishi.height ?? 180) * 0.01 * 0.54` (meters)
- `footSpread`: `0.35 + (stat(rikishi, 'balance') / 100) * 0.15` (wider base = more stable)
- `leadingFootX`: same as `x` — starts at shikirisen

**`isBodyFalling`:**

```typescript
const maxOffset = body.footSpread / 2;
return Math.abs(body.cogOffset) > maxOffset;
```

**`tawaraBounceResistance`:**

```typescript
if (toePos < 0) return 0;
if (toePos < 0.5) return 15.0;
if (toePos < 1.0) return 8.0;
return 0;
```

### 2.2 — Create `src/engine/bout/__tests__/boutSpatial.test.ts`

Test every utility function:

```typescript
describe('boutSpatial', () => {
  describe('tawaraBounceResistance', () => {
    it('returns 0 before tawara contact', () => expect(tawaraBounceResistance(-0.1)).toBe(0));
    it('returns 15 at heel contact', ()     => expect(tawaraBounceResistance(0.3)).toBe(15));
    it('returns 8 at toe contact', ()       => expect(tawaraBounceResistance(0.7)).toBe(8));
    it('returns 0 when fully out', ()       => expect(tawaraBounceResistance(2.1)).toBe(0));
  });

  describe('isBodyFalling', () => {
    it('stable when cogOffset is small', () => { ... });
    it('falling when cogOffset exceeds footSpread/2', () => { ... });
  });
});
```

Run `bun test -- --run`. Spatial tests pass, all 471 existing tests still pass.

---

## Phase 3 — Grip Engine Replacement

**Goal:** Replace `boutGrip.ts`'s enum-based grip system with the lever arm `BeltBattleState` model.

### 3.1 — Create `src/engine/bout/boutGripV2.ts` (new file, keep old file)

```typescript
export function initBeltBattle(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  tachiaiWinner: Side
): BeltBattleState;
export function evolveGripGeometry(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  belt: BeltBattleState
): void;
export function calculateTorque(grip: HandGrip, force: number): number;
export function computeNetTorque(
  left: HandGrip | null,
  right: HandGrip | null,
  force: number
): number;
```

**`initBeltBattle`:** Build `HandGrip` objects for each hand. Tachiai winner gets initial inside-arm advantage:

- Winner's preferred hand (from `combatProfile.preferredGrip`): `armReach = 0.12`, `isInside = true`, `leverArm = 0.29`
- Winner's other hand: `armReach = 0.08`, `isInside = false`, `leverArm = 0.26`
- Loser: both outside initially, `armReach = 0.06`, `isInside = false`, `leverArm = 0.24`
- `gripStrength = 1.0` for all initially
- Call `deriveGripClass` to set initial `eastGripClass`/`westGripClass`

**`evolveGripGeometry`:** Per-tick evolution (replaces `contestGripTick`). See spec in `combat-system-approach-b-expanded.md`.

### 3.2 — Tests: `src/engine/bout/__tests__/boutGripV2.test.ts`

```typescript
describe("initBeltBattle", () => {
  it("gives tachiai winner inside arm advantage");
  it("sets initial gripClass correctly for migi-preference east winner");
  it("morozashi when both arms inside");
});

describe("evolveGripGeometry", () => {
  it("arm reach increases when technique margin > 12");
  it("grip strength decays with fatigue");
  it("detects morozashi when both arms inside after evolution");
  it("blocked arm does not generate torque");
});

describe("computeNetTorque", () => {
  it("morozashi produces ~2.6× torque vs single outside");
  it("blocked grip produces 0 torque");
});
```

---

## Phase 4 — Phase State Machine

**Goal:** The core engine replacement — `boutPhysics.ts` becomes `boutPhysicsV2.ts`.

### 4.1 — Create `src/engine/bout/boutPhysicsV2.ts`

Implement the full phase engine. Structure:

```typescript
// Public entry point — same signature as current resolveBoutPhysics
export function resolveBoutPhysicsV2(
  bout: BoutContext,
  east: Rikishi,
  west: Rikishi,
  basho: BashoState
): { result: BoutResult; engineSnapshot: EngineSnapshot };

// Internal phases
function initEngineStateV2(bout: BoutContext, east: Rikishi, west: Rikishi): EngineStateV2;
function resolveTachiaiV2(rng: SeededRNG, east: Rikishi, west: Rikishi, st: EngineStateV2): void;
function runPhaseLoop(
  rng: SeededRNG,
  east: Rikishi,
  west: Rikishi,
  st: EngineStateV2
): { winner: Side; kimarite: KimariteId };
function tickPushBattle(rng, east, west, st, push): { winner?: Side; kimarite?: KimariteId } | void;
function tickBeltBattle(
  rng,
  east,
  west,
  st,
  belt,
  push
): { winner?: Side; kimarite?: KimariteId } | void;
function tickEdgeCrisis(
  rng,
  east,
  west,
  st,
  crisis
): { winner?: Side; kimarite?: KimariteId; escaped?: true } | void;
function buildBoutResultV2(bout, east, west, st, winner, kimarite): BoutResult;
function buildEngineSnapshotV2(st: EngineStateV2): EngineSnapshot;
```

**Critical:** `buildBoutResultV2` and `buildEngineSnapshotV2` must produce output compatible with `boutResolver.ts`'s expectations. Check `boutResolver.ts` for all fields it reads from `BoutResult` and `EngineSnapshot`.

**Max tick guard:** Same as current — 120 ticks max, then resolve by spatial state (whoever is farther from center loses).

**Henka handling:** Henka is resolved at tachiai (tick 0). If tactic = HENKA, call `handleHenkaTactic` from the existing module. If successful, skip to `resolved` phase immediately.

### 4.2 — Kimarite Attempt Evaluator: `src/engine/bout/kimariteClassifier.ts` (new)

```typescript
// Replaces kimariteEvaluator.ts — now mid-fight, not post-physics
export function evaluateKimariteAttempt(
  east: Rikishi,
  west: Rikishi,
  eastAction: CombatAction | null,
  westAction: CombatAction | null,
  push: PushBattleState | null,
  belt: BeltBattleState | null,
  st: EngineStateV2,
  rng: SeededRNG
): KimariteAttempt | null;
```

This function iterates `KIMARITE_STRATEGIES_V2` (see Phase 5) and returns the first technique whose `appliesTo` condition is satisfied, with a success check.

### 4.3 — Wire up via feature flag (safe rollout)

In `boutResolver.ts`, add a temporary flag to switch between old and new engine:

```typescript
const USE_PHYSICS_V2 = false; // flip to true when ready

export function resolveBout(bout, east, west, basho) {
  const physicsResult = USE_PHYSICS_V2
    ? resolveBoutPhysicsV2(bout, east, west, basho)
    : resolveBoutPhysics(bout, east, west, basho);
  // ... rest of boutResolver unchanged
}
```

This lets the old system run while V2 is being tested.

### 4.4 — Tests: `src/engine/bout/__tests__/boutPhysicsV2.test.ts`

```typescript
describe("resolveBoutPhysicsV2", () => {
  it("is deterministic across 5 runs with same seed");
  it("returns a valid KimariteId");
  it("winner side is east or west");
  it("duration is within 1–240 seconds");
  it("does not exceed 120 ticks");
  it("resolves henka tactic immediately");
  it("triggers edge_crisis when lead foot reaches TAWARA_RADIUS");
  it("edge crisis can resolve with escaped: true (tawara drama)");
  it("morozashi grip produces higher torque than single-hand grip");
  it("heavier rikishi has harder-to-move cogOffset");
});

describe("kimarite emergence", () => {
  it("isamiashi occurs when winner momentum carries them out after opponent sidesteps");
  it("yorikiri requires belt grip AND edge proximity");
  it("hatakikomi requires slap-pull action at critical range");
});
```

---

## Phase 5 — Kimarite Strategy Migration

**Goal:** Update `kimariteStrategy.ts` conditions from balance-based to spatial.

### 5.1 — Add spatial condition interface to existing strategies

`kimariteStrategy.ts` currently exports `KIMARITE_STRATEGIES: KimariteStrategy[]` where each strategy has a `condition(winner, loser, ctx)` function.

Add a parallel `appliesTo` field:

```typescript
interface KimariteStrategyV2 extends KimariteStrategy {
  // New: spatial condition for mid-fight evaluation
  // Returns the Side that would perform this technique, or null if not applicable
  appliesTo?: (ctx: SpatialBoutContext, east: Rikishi, west: Rikishi) => Side | null;
}
```

This is additive — strategies without `appliesTo` fall back to the old `condition` system. Migrate incrementally:

**Priority order for migration (highest real-world frequency first):**

1. `yorikiri` — belt + push + edge (~32.4% of real bouts — most common by far)
2. `oshidashi` — pure push + edge (~20.9–25.8%)
3. `hatakikomi` — slap-down on overextended opponent (~7.8–8.5%)
4. `tsukidashi` — thrust push-out (~5.7%)
5. `yoritaoshi` — belt + CoG fall (~4.7%)
6. `uwatenage` — belt + torque throw (~3%, currently overweighted in V1)
7. `shitatenage` — lower belt + torque throw (~2%)
8. `hikiotoshi` — pull-down after dodge (~2%)
9. `oshitaoshi` — push-down fall
10. `isamiashi` — winner momentum out after opponent dodges
11. `sotogake` / `uchigake` — stance width + facing angle + torque

> **Weight calibration note:** `weight` values within a phase bucket are a selection bias, not a frequency proxy. The primary frequency driver is how often each phase tag is reached. Calibrate **phase entry probabilities** (tachiai belt establishment rate, `push_battle → belt_battle` transition threshold) against the real-world distribution, not individual `weight` values. Within a bucket, weight should reflect relative frequency among same-phase techniques only.

### 5.2 — Export `KIMARITE_STRATEGIES_V2`

```typescript
// At the bottom of kimariteStrategy.ts
export const KIMARITE_STRATEGIES_V2: KimariteStrategyV2[] = KIMARITE_STRATEGIES.map((s) => ({
  ...s,
  appliesTo: SPATIAL_CONDITIONS[s.id] ?? null,
}));

// Separate map for clarity
const SPATIAL_CONDITIONS: Partial<
  Record<KimariteId, (ctx: SpatialBoutContext, e: Rikishi, w: Rikishi) => Side | null>
> = {
  yorikiri: (ctx, e, w) => {
    /* ... */
  },
  oshidashi: (ctx, e, w) => {
    /* ... */
  },
  // etc.
};
```

### 5.3 — Tests: `src/engine/bout/__tests__/kimariteStrategiesV2.test.ts`

```typescript
describe("spatial kimarite conditions", () => {
  it("yorikiri fires when belt grip + east lead foot near tawara");
  it("yorikiri does NOT fire without belt grip");
  it("isamiashi fires when winner foot past ring radius AND opponent not at edge");
  it("hatakikomi fires when opponent is overextended and momentum is forward");
  it("sotogake fires when narrow stance + appropriate facing angle + negative torque");
});
```

---

## Phase 6 — BardEngine Template Additions

**Goal:** Add narrative templates for new edge_crisis events.

### 6.1 — Extend `src/engine/narrative/archive.json`

New paths needed:

```json
{
  "combat": {
    "phases": {
      "edge_crisis": {
        "entry": ["...", "..."],
        "tawara_escape": ["...", "..."],
        "extended_tension": ["...", "..."],
        "utchari_reversal": ["...", "..."]
      }
    }
  }
}
```

Token convention: `%DEFENDER%`, `%ATTACKER%`, `%TICKS%` (no `%HEYA_NAME%` — use `%HEYA%` per CLAUDE.md)

### 6.2 — Wire edge_crisis log entries to narrative

In `boutNarrative.ts`, add cases for `phase: "edge_crisis"` log entries:

```typescript
if (entry.phase === "edge_crisis") {
  const path = entry.data?.escaped
    ? "combat.phases.edge_crisis.tawara_escape"
    : "combat.phases.edge_crisis.entry";
  const line = BardEngine.resolve(rng, path, context);
  pbpLines.push({ text: line.text, id: `${boutId}-edge-${entry.tick}` });
}
```

---

## Phase 7 — Flip Feature Flag & Retire Old Code

**Goal:** Switch `USE_PHYSICS_V2 = true`, validate, delete old files.

### 7.1 — Enable V2 engine

In `boutResolver.ts`: set `USE_PHYSICS_V2 = true`.

Run full test suite: `bun test -- --run`. All tests pass.

### 7.2 — Run cross-engine comparison

Write a one-time script (`scripts/compare-engines.ts`):

- Run 1000 bouts with both engines using matching seeds
- Compare: winner distributions, kimarite frequency distributions, duration distributions
- Acceptable variance: ±5% on any kimarite frequency, winner distribution within ±2%
- Flag if any kimarite drops to 0 frequency (means a condition is never satisfied)

### 7.3 — Delete old files

Once comparison passes:

- Delete `src/engine/bout/boutPhysics.ts`
- Delete `src/engine/bout/boutGrip.ts`
- Delete `src/engine/bout/kimariteEvaluator.ts`
- Remove `USE_PHYSICS_V2` flag from `boutResolver.ts`
- Rename `boutPhysicsV2.ts` → `boutPhysics.ts`
- Rename `boutGripV2.ts` → `boutGrip.ts`
- Update imports throughout

### 7.4 — Update `kimariteStrategy.ts`

- Remove the old `condition` field from `KimariteStrategy` (now only `appliesTo` used)
- Remove `KIMARITE_STRATEGIES` and rename `KIMARITE_STRATEGIES_V2` → `KIMARITE_STRATEGIES`

---

## Phase 8 — Verification & Acceptance

### Functional tests

```bash
bun test -- --run
# Expected: all tests pass (including 471 existing + new spatial tests)
```

### Determinism check

```bash
# Same seed → same 100 bouts
bun run scripts/compare-engines.ts --seed test-001 --count 100 --mode determinism
```

### Kimarite distribution check

```bash
# Run 10,000 bouts — verify distribution matches real-world targets
bun run scripts/compare-engines.ts --seed perf-001 --count 10000 --mode distribution
```

**Acceptance criteria (real-world professional sumo distribution):**

| Technique             | Real Frequency | Acceptance Range |
| --------------------- | -------------- | ---------------- |
| Yorikiri              | ~32.4%         | 27–38%           |
| Oshidashi             | ~20.9–25.8%    | 17–28%           |
| Hatakikomi            | ~7.8–8.5%      | 5–12%            |
| Tsukidashi            | ~5.7%          | 3–9%             |
| Yoritaoshi            | ~4.7%          | 2–8%             |
| Uwatenage             | ~3%            | 1–6%             |
| Shitatenage           | ~2%            | 1–5%             |
| Hikiotoshi            | ~2%            | 1–5%             |
| Top 10 total          | ~85%           | ≥80%             |
| Fusensho / edge cases | —              | ≤3%              |

**Henka verification:**

```bash
# 500 bouts with henka tactic forced — verify success rate 55–95% (historical 63–92%)
bun run scripts/test-henka.ts --count 500
```

### Edge crisis validation

```bash
# Force a bout with extreme weight mismatch — heavy pusher vs light defender at tachiai
# Expected: edge_crisis phase triggered within 5 ticks
bun run scripts/test-edge-crisis.ts
```

### Manual smoke test

- Start dev server, play 10 bouts in the UI
- Verify: pbp lines show edge crisis events when they occur
- Verify: morozashi grip produces noticeably shorter bouts vs outside-only grip
- Verify: yorikiri and oshidashi are the two most common kimarite, together ≥45% of bouts

---

## File Change Summary

| File                                    | Action               | Notes                                    |
| --------------------------------------- | -------------------- | ---------------------------------------- |
| `src/engine/types/combat-spatial.ts`    | **Create**           | All new spatial types                    |
| `src/engine/bout/boutSpatial.ts`        | **Create**           | Pure spatial utilities                   |
| `src/engine/bout/boutGripV2.ts`         | **Create**           | Lever arm grip engine                    |
| `src/engine/bout/boutPhysicsV2.ts`      | **Create**           | Phase state machine                      |
| `src/engine/bout/kimariteClassifier.ts` | **Create**           | Mid-fight kimarite evaluator             |
| `src/engine/bout/kimariteStrategy.ts`   | **Extend**           | Add `appliesTo` + spatial conditions     |
| `src/engine/narrative/archive.json`     | **Extend**           | edge_crisis narrative paths              |
| `src/engine/bout/boutNarrative.ts`      | **Extend**           | Handle edge_crisis log entries           |
| `src/engine/bout/boutResolver.ts`       | **Minor edit**       | Feature flag only                        |
| `src/engine/bout/boutPhysics.ts`        | **Delete** (Phase 7) | Replaced by V2                           |
| `src/engine/bout/boutGrip.ts`           | **Delete** (Phase 7) | Replaced by V2                           |
| `src/engine/bout/kimariteEvaluator.ts`  | **Delete** (Phase 7) | Replaced by classifier                   |
| `src/engine/types/combat.ts`            | **Untouched**        | Existing types still valid               |
| `src/engine/types/basho.ts`             | **Untouched**        | BoutResult shape preserved               |
| `src/engine/bout/boutCalculations.ts`   | **Untouched**        | `pickMoveFromClass` still used for henka |
| `src/engine/bout/boutResolver.ts`       | **Untouched**        | Except feature flag                      |
| `src/engine/bout/boutNarrative.ts`      | **Untouched**        | Except edge_crisis cases                 |

---

## Risks & Mitigations

| Risk                                                                | Mitigation                                                                                        |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Kimarite distribution shifts dramatically                           | Phase 7 cross-engine comparison script with 5000 bouts                                            |
| CoG math produces NaN/Infinity                                      | Guard all division with safe denominators; `footSpread` always > 0                                |
| EdgeCrisis recovery probability too high → no one loses at the edge | Cap `recoveryProbability` at 0.25 per tick; tune `tawaraBounceResistance`                         |
| Grip torque too dominant → all bouts are belt-dominant              | Separate `EDGE_THRESHOLD` for edge_crisis trigger so push bouts still resolve quickly             |
| Determinism breaks between runs                                     | Smoke test in Phase 0; run it again in Phase 7 before deleting old code                           |
| `boutResolver.ts` reads fields from `EngineSnapshot` that changed   | Read all `buildEngineSnapshot` usages in `boutResolver.ts` before writing `buildEngineSnapshotV2` |
| `boutNarrative.ts` expects `phase: "engagement"` entries            | Keep logging engagement entries in addition to new spatial phases                                 |

---

## Estimated Phases and Dependencies

```
Phase 0 (tests)         → independent, do first
Phase 1 (types)         → depends on Phase 0
Phase 2 (spatial utils) → depends on Phase 1
Phase 3 (grip V2)       → depends on Phase 2
Phase 4 (phase engine)  → depends on Phase 3 + Phase 2
Phase 5 (kimarite)      → can start alongside Phase 4
Phase 6 (narrative)     → depends on Phase 4
Phase 7 (flip + delete) → depends on ALL previous phases
Phase 8 (verify)        → depends on Phase 7
```

Phases 4 and 5 can proceed in parallel once Phase 3 is done.
