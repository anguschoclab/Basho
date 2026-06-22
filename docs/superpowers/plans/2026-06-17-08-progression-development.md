# Wrestler Progression & Promotion Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:test-driven-development` — every task is RED → GREEN → COMMIT. Write the failing test against real code, confirm it fails for the stated reason, implement the minimal real change, confirm green, commit. Determinism mandatory: seeded RNG only (`rngFromSeed`/`rngForWorld`), never `Math.random`/`Date.now`. Mutations via `ImpactBuilder` + `resolveImpacts`. Mock with `src/tests/unit/engine/utils.ts` (`mockRikishi`).

**Build order:** Run AFTER the diagnostic-metrics plan (`-06`). Feeds the macro-dynamics plan (`-11`, which needs elite wrestlers to produce yokozuna).

## Goal

Fix progression so that over a 25-year headless sim: (a) max world stat rises well above the current ceiling of 58, (b) makuuchi-tier averages climb, (c) the rank pyramid normalizes (jonokuchi stops being ~69% of the active roster), (d) yokozuna persist in the late years.

Three measured root causes, all in code:

1. **Promotion is structurally impossible for the mass.** `updateBanzuke` (`src/engine/banzuke.ts:199-206`) hard-codes slot counts `{ makuuchi: 42, juryo: 28, makushita: 60, sandanme: 50, jonidan: 40, jonokuchi: 20 }` = 240 total. But `createRosters` (`src/engine/systems/generation/WorldFactory.ts:295-306`) generates ~860 rikishi. The slot loop (`banzuke.ts:259-278`) only iterates `fullTemplate`, so once 240 slots fill, every remaining rikishi is never written into `newBanzuke`; `BanzukePublisher` (`BanzukePublisher.ts:241-270`) only updates rikishi present in `result.newBanzuke`, so the other ~620 keep their generation-time rank forever — frozen at the bottom. That is the inverted pyramid.

2. **Potential ceilings cap low-division wrestlers at ~30.** `PA_BY_RANK` (`src/constants/engine/development.ts`) gives jonokuchi mean PA 32. `getEffectiveCeiling` (`src/engine/systems/training/TrainingMath.ts:57-85`) caps each stat at `PA × ceilingFraction × maturityFactor`, so a jonokuchi can never train above ~32. The observed world-max of 58 is roughly the top makuuchi/ozeki tail. Because the mass is permanently stuck in jonokuchi (cause 1), their PA mean 32 dominates every average.

3. **Weekly growth is negligible against diminishing returns.** `calculateGrowthVector` (`TrainingMath.ts:127-265`) multiplies `BASE_GROWTH = 0.5` (`src/constants/engine/training.ts`) through a cubic `diminishingReturnsMult` (`TrainingMath.ts:88-94`) plus drills (~+0.18/wk/stat). Net weekly gain at half-ceiling is a fraction of a point; `Math.floor` clamping in `applyWeeklyTraining` can erase it entirely.

## Architecture
- **Banzuke** (`banzuke.ts`): make division slot capacity dynamic so it always covers the full active population; jonokuchi is the safety-net overflow so no one is dropped.
- **Generation** (`development.ts`): rebalance `PA_BY_RANK` so lower divisions contain genuine upside (sleepers), preserving high-rank means.
- **Training math** (`training.ts`, `TrainingMath.ts`): raise effective weekly growth and soften diminishing returns so a career produces visible movement.
- **Worldgen distribution** (`WorldFactory.ts`): right-size the initial pyramid.
All mutations via `ImpactBuilder`. No new non-test files. No `Math.random`.

## Tech Stack
Vite + React 19 + TS, Vitest (`npx vitest run`), seeded `SeededRNG`. Diagnostic: `bun scripts/diagnostic-25yr-sim.ts`.

---

## Task 1 — Dynamic division capacity (the frozen-mass fix)

**Files:** Create `src/tests/unit/engine/banzukeCapacity.test.ts`; Modify `src/engine/banzuke.ts`

1. Failing test — with 800 jonokuchi rikishi all going 7-0, `updateBanzuke` must assign a slot to EVERY rikishi (`newBanzuke.length === 800`) and NOT pile >40% into jonokuchi:
```ts
import { describe, it, expect } from "vitest";
import { updateBanzuke } from "@/engine/banzuke";
import type { BanzukeEntry, BashoPerformance } from "@/engine/types/banzuke";
import type { WorldState } from "@/engine/types/world";
import { toRankPosition } from "@/engine/types/index";

function makeWorld(n: number) {
  const banzuke: BanzukeEntry[] = []; const perf = new Map<string, BashoPerformance>();
  for (let i = 0; i < n; i++) {
    const id = `RK${i}`;
    banzuke.push({ rikishiId: id, division: "jonokuchi", position: toRankPosition({ rank: "jonokuchi", rankNumber: i + 1, side: i % 2 ? "west" : "east" }) });
    perf.set(id, { rikishiId: id, wins: 7, losses: 0, absences: 0, yusho: false, junYusho: false, specialPrizes: 0 });
  }
  return { world: { rikishi: new Map(), heyas: new Map() } as unknown as WorldState, banzuke, perf };
}
describe("updateBanzuke division capacity", () => {
  it("assigns a slot to EVERY active rikishi", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    expect(result.newBanzuke.length).toBe(800);
    expect(new Set(result.newBanzuke.map((e) => e.rikishiId)).size).toBe(800);
  });
  it("does not pile everyone into jonokuchi", () => {
    const { world, banzuke, perf } = makeWorld(800);
    const result = updateBanzuke(banzuke, perf, world, {}, undefined);
    expect(result.newBanzuke.filter((e) => e.division === "jonokuchi").length / 800).toBeLessThan(0.4);
  });
});
```
2. Run (FAIL — `newBanzuke.length` is 240). `npx vitest run src/tests/unit/engine/banzukeCapacity.test.ts`
3. Implement — replace the hard-coded `counts` block at `banzuke.ts:199-206` with a field-size-derived template:
```ts
const fieldSize = currentBanzuke.length;
const elite = 42 + 28; // makuuchi + juryo fixed
const lowerPopulation = Math.max(0, fieldSize - elite);
const HEADROOM = 8;
const makushita = Math.max(60, Math.ceil(lowerPopulation * 0.18) + HEADROOM);
const sandanme  = Math.max(60, Math.ceil(lowerPopulation * 0.24) + HEADROOM);
const jonidan   = Math.max(60, Math.ceil(lowerPopulation * 0.28) + HEADROOM);
const jonokuchi = Math.max(40, lowerPopulation - (makushita + sandanme + jonidan)) + HEADROOM;
const fullTemplate = buildFullSlotTemplate(sanyakuCounts, { makuuchi: 42, juryo: 28, makushita, sandanme, jonidan, jonokuchi });
```
This guarantees `fullTemplate.length >= fieldSize` so the loop at `banzuke.ts:259-278` seats everyone and a 7-0 jonokuchi wrestler actually climbs.
4. Run (PASS) + regression: `npx vitest run src/tests/unit/engine/banzukeTemplate.test.ts src/tests/unit/engine/banzukePromotion.test.ts src/tests/unit/engine/banzuke`
5. Commit: `fix(banzuke): scale division capacity to field size so no rikishi is frozen out`

---

## Task 2 — Right-size the initial pyramid

**Files:** Create `src/tests/unit/engine/systems/generation/initialPyramid.test.ts`; Modify `src/engine/systems/generation/WorldFactory.ts`

1. Failing test: `generateInitialWorld` active jonokuchi must be `< 20%` of the field, and total active in `(300, 650)`.
2. Run (FAIL). `npx vitest run src/tests/unit/engine/systems/generation/initialPyramid.test.ts`
3. Implement — edit `rankConfigs` (`WorldFactory.ts:295-306`) to a proper descending pyramid (keep makuuchi/juryo): makushita 120, sandanme 110, jonidan 90, jonokuchi 50 (jonokuchi smallest amateur tier). Field ≈ 488.
4. Run (PASS) + `npx vitest run src/tests/unit/engine/systems/generation`
5. Commit: `fix(worldgen): right-size initial division pyramid so jonokuchi is smallest tier`

---

## Task 3 — Give lower divisions real upside (PA rebalance)

**Files:** Create `src/tests/unit/engine/systems/generation/potentialCeilings.test.ts`; Modify `src/constants/engine/development.ts`

1. Failing test:
```ts
import { describe, it, expect } from "vitest";
import { PA_BY_RANK } from "@/constants/engine/development";
import { getStatCeiling } from "@/engine/systems/training/TrainingMath";
describe("lower-division potential", () => {
  it("gives amateur divisions headroom to reach sekitori", () => {
    expect(PA_BY_RANK.makushita.mean).toBeGreaterThanOrEqual(54);
    expect(PA_BY_RANK.sandanme.mean).toBeGreaterThanOrEqual(48);
    expect(PA_BY_RANK.jonidan.mean).toBeGreaterThanOrEqual(44);
    expect(PA_BY_RANK.jonokuchi.mean).toBeGreaterThanOrEqual(42);
  });
  it("keeps the top genuinely elite", () => {
    expect(PA_BY_RANK.yokozuna.mean).toBeGreaterThanOrEqual(88);
    expect(PA_BY_RANK.yokozuna.mean + 2 * PA_BY_RANK.yokozuna.stdDev).toBeGreaterThan(95);
  });
  it("getStatCeiling tracks talent into the elite range", () => {
    expect(getStatCeiling(95, "power")).toBeGreaterThan(80);
  });
});
```
2. Run (FAIL — current lower means 46/40/35/32). `npx vitest run src/tests/unit/engine/systems/generation/potentialCeilings.test.ts`
3. Implement — edit `PA_BY_RANK` in `development.ts`, raising lower-division means with generous σ (preserves sleepers/busts):
```ts
yokozuna: { mean: 88, stdDev: 5 }, ozeki: { mean: 82, stdDev: 6 }, sekiwake: { mean: 76, stdDev: 7 },
komusubi: { mean: 72, stdDev: 7 }, maegashira: { mean: 64, stdDev: 9 }, juryo: { mean: 58, stdDev: 9 },
makushita: { mean: 54, stdDev: 10 }, sandanme: { mean: 50, stdDev: 10 }, jonidan: { mean: 46, stdDev: 11 }, jonokuchi: { mean: 44, stdDev: 12 },
```
4. Run (PASS) + `npx vitest run src/tests/unit/engine/systems/generation`
5. Commit: `fix(development): raise lower-division PA means so amateurs can develop into sekitori`

---

## Task 4 — Make weekly growth meaningful

**Files:** Create `src/tests/unit/engine/training/growthMagnitude.test.ts`; Modify `src/constants/engine/training.ts` + `src/engine/systems/training/TrainingMath.ts`

1. Failing test — a young far-from-ceiling prospect gains `> 0.05/wk` on the focused stat, and `diminishingReturnsMult(40,80) > 0.4`, `diminishingReturnsMult(78,80)` in `(0, 0.2)`. (See agent draft for full fixture using `mockRikishi` with `talentSeed: 90`, `power: 40`.)
2. Run (FAIL — growth too low after multipliers + floor). `npx vitest run src/tests/unit/engine/training/growthMagnitude.test.ts`
3. Implement — two minimal data-first changes:
   - `src/constants/engine/training.ts`: `export const BASE_GROWTH = 1.1;`
   - `src/engine/systems/training/TrainingMath.ts`: soften cubic→quadratic:
```ts
export function diminishingReturnsMult(currentStat: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  const ratio = Math.min(currentStat / ceiling, 1);
  return Math.max(0, 1 - ratio * ratio);
}
```
   The ceiling clamp in `applyWeeklyTraining` (`Math.min(getEffectiveCeiling(...), ...)`) remains authoritative.
4. Run (PASS) + `npx vitest run src/tests/unit/engine/training src/tests/unit/engine/systems`
5. Commit: `fix(training): raise base growth and soften diminishing returns`

---

## Verification
1. `npx vitest run` — green except the documented pre-existing failures.
2. `bun scripts/diagnostic-25yr-sim.ts`; assert against `simulation-results.json` `tuningMetrics`:
   - `entropyAudit.maxStat` rises well above 58 (target ≥ 80).
   - `statAverages` climb above the 27-30 band.
   - `rankDistribution`: jonokuchi `< 25%` of active (no longer ~69%).
   - Yokozuna persist: `yokozunaVacantBashoCount` drops; late-year `yokozunaCount >= 1` in the majority of the final 8 years.
3. Determinism: run the diagnostic twice with the unchanged seed; `maxStat` and `rankDistribution` byte-identical.

## Self-review
- Each task RED→GREEN→COMMIT with a real failing test.
- No `Math.random`/`Date.now`.
- Task 1 keeps explicit-`counts` callers working (only the internal default changed); verify `fullTemplate.length >= fieldSize` eliminates the dropped-overflow path.
- Tasks 2-4 are coordinated: evaluate the COMBINED sim, not units in isolation.
- Coupling: teen washout (lifecycle plan `-07`) is out of scope; if yokozuna gaps persist after these four tasks, the residual cause is lifecycle/recruitment — don't widen scope here.
- `Math.floor` clamping checked: with `BASE_GROWTH=1.1` + quadratic DR, sub-ceiling weekly growth exceeds floor erasure — reconfirm field averages move in the diagnostic.

### Critical Files
- src/engine/banzuke.ts
- src/engine/systems/generation/WorldFactory.ts
- src/constants/engine/development.ts
- src/constants/engine/training.ts
- src/engine/systems/training/TrainingMath.ts
