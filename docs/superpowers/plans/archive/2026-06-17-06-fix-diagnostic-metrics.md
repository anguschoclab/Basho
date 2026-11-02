# Fix Broken Diagnostic & Tuning Metrics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:test-driven-development` (write the failing test first, run it RED, implement the minimum real code, run it GREEN, commit). Determinism is mandatory — never `Math.random()`, always seeded RNG. Run tests with `npx vitest run` (NOT `bun test -- --run`). Wrap every shell path in double quotes.

## ⚠️ Build order: RUN THIS PLAN FIRST

Three diagnostic/tuning metrics misreport. Until they are fixed, every `simulation-results.json` is untrustworthy and **no balance plan's before/after comparison is valid.** Land this before the lifecycle / progression / recruitment / economy / macro plans.

## Goal

Fix the _measurement_, not the underlying balance:

1. `tuningMetrics.topKimarite` is empty over 150 basho — the cumulative counter is wiped every year boundary before metrics are read.
2. `tuningMetrics.yokozunaVacantBashoCount` is always `0` — it samples only the final world state instead of accumulating per-basho.
3. Per-year snapshot `retiredTotal` is always `0` — it counts the wrong collection (retirees live in `world.historicalRikishi`, not `world.rikishi`).

Plus one investigation result to document (no code change): `averageRetirementAge = 19.6 (min 5)` is **not** a metric artifact — `SimTuningService` reads real retirees from `world.historicalRikishi` correctly. The implausible values are a real lifecycle outcome owned by the separate lifecycle plan. We add a regression test pinning the correct derivation.

## Architecture

Root causes confirmed by reading the code:

- **Kimarite reset:** `src/engine/simulation/TournamentSimulator.ts:215-221` correctly tallies each basho's `m.result.kimarite` into `world.globalKimariteStats`. But `src/engine/systems/meta/EraDriftService.ts:90` (`processYearlyEraDrift`, invoked from `src/engine/tick/phases/phase06_yearly_boundary.ts:44`) calls `builder.updateWorldField("globalKimariteStats", {})` at every year boundary. `scripts/diagnostic-25yr-sim.ts` reads `tuningMetrics` only after the final year (after the last reset), and `SimTuningService.ts:154-158` reads `world.globalKimariteStats` — which is `{}`. The intra-era reset is intentional; the _diagnostic_ needs a cumulative figure the reset can't clobber.
  - **Fix:** maintain a cumulative accumulator inside `runAutoSim` (`src/engine/simulation/AutoSimService.ts`) summed per-basho from `globalKimariteStats` deltas, fed to `SimTuningService.calculateMetrics` via the existing `historyStats` parameter (extended). Era-drift reset stays untouched.
- **Yokozuna vacancy:** `src/engine/simulation/AutoSimService.ts:235` computes a single 0/1 from the final world. Over 150 basho this is one boolean.
  - **Fix:** accumulate a per-basho vacancy count inside the `while` loop and pass the total through `historyStats.yokozunaVacancy`. `SimTuningService.ts:191` already wires it straight into `yokozunaVacantBashoCount`.
- **retiredTotal snapshot:** `scripts/diagnostic-25yr-sim.ts` `snapshot()` filters `Array.from(world.rikishi.values())`, but `src/engine/core/ImpactResolver.ts:248-249` deletes retirees from `world.rikishi` and moves them (with `isRetired: true`, set at `src/engine/core/ImpactBuilder.ts:293`) into `world.historicalRikishi`.
  - **Fix:** count retirees across both maps so `retiredTotal` tracks `historicalTotal`.
- **averageRetirementAge:** `SimTuningService.ts:93-113` already unions `world.rikishi` + `world.historicalRikishi` and computes age from `retirementYear - birthYear`. No artifact. Documented + pinned by test.

## Tech Stack

Vite + React 19 + TypeScript. Vitest (`npx vitest run`), jsdom. Mock factories: `src/tests/unit/engine/utils.ts` — `makeMockWorld`, `mockRikishi`, `makeMockHeya`, `makeMockBasho` (NOTE: CLAUDE.md lists the stale path `src/engine/__tests__/utils.ts`; the live path is `src/tests/unit/engine/utils.ts`).

---

## Task 1 — Characterize the kimarite-reset root cause

**Files:** `src/tests/unit/engine/eraDriftKimariteReset.test.ts` (new)

**Step 1.1 — Write the characterization test (documents the intentional reset):**

```ts
import { describe, it, expect } from "vitest";
import { makeMockWorld } from "./utils";
import { processYearlyEraDrift } from "@/engine/systems/meta/EraDriftService";
import { resolveImpacts } from "@/engine/core/ImpactResolver";

describe("EraDriftService kimarite reset", () => {
  it("wipes globalKimariteStats at the year boundary (root cause of empty topKimarite)", () => {
    const world = makeMockWorld({ globalKimariteStats: { oshidashi: 500, yorikiri: 300 } });
    const impact = processYearlyEraDrift(world);
    const after = resolveImpacts(world, [impact]);
    expect(after.globalKimariteStats).toEqual({});
  });
});
```

**Step 1.2 — Run.** `npx vitest run src/tests/unit/engine/eraDriftKimariteReset.test.ts` — if `ERA_DRIFT_MIN_MOVES` guard (`EraDriftService.ts:49`) blocks the reset for these counts, raise the seeded counts until the reset branch runs; the test ends GREEN, documenting the reset is intentional and the fix lives elsewhere.

**Step 1.3 — Commit.** `test: characterize globalKimariteStats year-boundary reset`

---

## Task 2 — Accumulate cumulative kimarite across the whole run

**Files:** `src/engine/simulation/SimTuningService.ts`, `src/tests/unit/engine/simTuningService.test.ts` (new)

**Step 2.1 — Failing test (RED):**

```ts
import { describe, it, expect } from "vitest";
import { makeMockWorld } from "./utils";
import { SimTuningService } from "@/engine/simulation/SimTuningService";

describe("SimTuningService.topKimarite", () => {
  it("uses cumulative kimarite totals from historyStats when provided", () => {
    const world = makeMockWorld({ globalKimariteStats: {} });
    const metrics = SimTuningService.calculateMetrics(world, {
      yokozunaVacancy: 0,
      uniqueWinners: 0,
      successions: 0,
      cumulativeKimarite: { oshidashi: 120, yorikiri: 90, uwatenage: 30 },
    });
    expect(metrics.topKimarite.length).toBeGreaterThan(0);
    expect(metrics.topKimarite[0]).toEqual({ id: "oshidashi", count: 120 });
  });
  it("falls back to world.globalKimariteStats when no cumulative provided", () => {
    const world = makeMockWorld({ globalKimariteStats: { hatakikomi: 7 } });
    expect(SimTuningService.calculateMetrics(world).topKimarite[0]).toEqual({
      id: "hatakikomi",
      count: 7,
    });
  });
});
```

**Step 2.2 — Run (RED).** `npx vitest run src/tests/unit/engine/simTuningService.test.ts`

**Step 2.3 — Implement** in `src/engine/simulation/SimTuningService.ts`:

- Extend the `historyStats` parameter type (line ~52) to `{ yokozunaVacancy: number; uniqueWinners: number; successions: number; cumulativeKimarite?: Record<string, number> }`.
- Change line 154 from `const kimariteStats = world.globalKimariteStats || {};` to `const kimariteStats = historyStats?.cumulativeKimarite ?? world.globalKimariteStats ?? {};`
- Leave the `Object.entries(...).map(...).sort(...).slice(0,10)` lines unchanged.

**Step 2.4 — Run (GREEN).** Same command.

**Step 2.5 — Commit.** `fix(metrics): derive topKimarite from cumulative run totals`

---

## Task 3 — Sum kimarite per-basho and accumulate yokozuna vacancy in runAutoSim

**Files:** `src/engine/simulation/AutoSimService.ts`, `src/tests/unit/engine/autoSimService.test.ts` (extend)

**Step 3.1 — Failing test (RED):**

```ts
import { describe, it, expect } from "vitest";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import { runAutoSim } from "@/engine/simulation/AutoSimService";

describe("runAutoSim diagnostic metrics", () => {
  it("accumulates topKimarite across the full run despite year-boundary resets", () => {
    const world = { ...generateInitialWorld("kimarite-accum-test"), playerHeyaId: undefined };
    const result = runAutoSim(world, {
      duration: { type: "years", count: 2 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    expect(result.tuningMetrics.topKimarite.length).toBeGreaterThan(0);
    expect(result.tuningMetrics.topKimarite.reduce((s, k) => s + k.count, 0)).toBeGreaterThan(50);
  });
  it("counts every basho with no yokozuna, not just the final world", () => {
    const world = { ...generateInitialWorld("yoko-vacancy-test"), playerHeyaId: undefined };
    const result = runAutoSim(world, {
      duration: { type: "years", count: 1 },
      stopConditions: [],
      verbosity: "minimal",
      delegationPolicy: "balanced",
      observerMode: true,
    });
    expect(result.tuningMetrics.yokozunaVacantBashoCount).toBeGreaterThan(1);
    expect(result.tuningMetrics.yokozunaVacantBashoCount).toBeLessThanOrEqual(6);
  });
});
```

**Step 3.2 — Run (RED).** `npx vitest run src/tests/unit/engine/autoSimService.test.ts`

**Step 3.3 — Implement** in `src/engine/simulation/AutoSimService.ts`:

- Before the `while` loop (near line 84): `const cumulativeKimarite: Record<string, number> = {};` and `let yokozunaVacantBashoCount = 0;`
- Just before `simulateEntireBasho` (line ~96): `const preKimarite = { ...(currentWorld.globalKimariteStats ?? {}) };`
- After `currentWorld = bashoResult.finalWorld;` (line ~100), sum reset-proof positive deltas:

```ts
const postKimarite = bashoResult.finalWorld.globalKimariteStats ?? {};
for (const [id, count] of Object.entries(postKimarite)) {
  const delta = count - (preKimarite[id] ?? 0);
  if (delta > 0) cumulativeKimarite[id] = (cumulativeKimarite[id] ?? 0) + delta;
}
```

- After the banzuke update each basho (`currentWorld = resolveImpacts(worldWithStandings, [banzukeImpact]);`, line ~181):

```ts
const hasYokozuna = Array.from(currentWorld.activeRikishiIds).some(
  (id) => currentWorld.rikishi.get(id)?.rank === "yokozuna"
);
if (!hasYokozuna) yokozunaVacantBashoCount++;
```

- Delete the final-state one-shot (line 235) and change the `calculateMetrics` call to pass `{ yokozunaVacancy: yokozunaVacantBashoCount, uniqueWinners: championCounts.size, successions, cumulativeKimarite }`.

**Step 3.4 — Run (GREEN).** Same command.

**Step 3.5 — Commit.** `fix(metrics): accumulate kimarite and yokozuna-vacancy per basho`

---

## Task 4 — Pin averageRetirementAge derivation (characterization, no behavior change)

**Files:** `src/tests/unit/engine/simTuningService.test.ts` (extend)

**Step 4.1 — Test:**

```ts
import { mockRikishi } from "./utils";
it("computes averageRetirementAge from historicalRikishi retirees (not a metric artifact)", () => {
  const retiredOld = mockRikishi("ret-1", {
    isRetired: true,
    birthYear: 1990,
    retirementYear: 2025,
  }); // 35
  const retiredYoung = mockRikishi("ret-2", {
    isRetired: true,
    birthYear: 2020,
    retirementYear: 2025,
  }); // 5
  const world = makeMockWorld({
    rikishi: new Map(),
    historicalRikishi: new Map([
      [retiredOld.id, retiredOld],
      [retiredYoung.id, retiredYoung],
    ]),
  });
  const metrics = SimTuningService.calculateMetrics(world);
  expect(metrics.retirementAges.sort((a, b) => a - b)).toEqual([5, 35]);
  expect(metrics.averageRetirementAge).toBe(20);
});
```

**Step 4.2 — Run.** Expected PASS with current logic (`SimTuningService.ts:93-113`), confirming the implausible `min 5 / avg 19.6` is a real lifecycle outcome owned by the lifecycle plan, not a measurement bug. If it FAILS, the metric has a real defect — fix it here.

**Step 4.3 — Commit.** `test(metrics): pin averageRetirementAge to real historicalRikishi data`

---

## Task 5 — Fix `retiredTotal` in the diagnostic snapshot

**Files:** `scripts/diagnostic-25yr-sim.ts`, `src/tests/unit/engine/diagnosticSnapshot.test.ts` (new)

**Step 5.1 — Test encoding the corrected rule:**

```ts
import { describe, it, expect } from "vitest";
import { makeMockWorld, mockRikishi } from "./utils";
function countRetired(world: ReturnType<typeof makeMockWorld>): number {
  const active = Array.from(world.rikishi.values()).filter((r) => r.isRetired).length;
  return active + (world.historicalRikishi?.size ?? 0);
}
describe("diagnostic retiredTotal counting", () => {
  it("counts retirees that live in historicalRikishi", () => {
    const world = makeMockWorld({
      rikishi: new Map([["a-1", mockRikishi("a-1", { isRetired: false })]]),
      historicalRikishi: new Map([
        ["h-1", mockRikishi("h-1", { isRetired: true })],
        ["h-2", mockRikishi("h-2", { isRetired: true })],
      ]),
    });
    expect(countRetired(world)).toBe(2);
  });
});
```

**Step 5.2 — Run.** `npx vitest run src/tests/unit/engine/diagnosticSnapshot.test.ts` (GREEN — encodes the target rule).

**Step 5.3 — Implement** in `scripts/diagnostic-25yr-sim.ts` `snapshot()`: change
`retiredTotal: allRikishi.filter((r) => r.isRetired).length,` to
`retiredTotal: allRikishi.filter((r) => r.isRetired).length + (world.historicalRikishi?.size ?? 0),`
Leave `historicalTotal` unchanged.

**Step 5.4 — Commit.** `fix(diagnostic): count retirees from historicalRikishi`

---

## Verification

1. `npx vitest run` — all new tests pass; no new failures beyond the 4 documented pre-existing ones.
2. `bun scripts/diagnostic-25yr-sim.ts`, then inspect `simulation-results.json`:
   - `tuningMetrics.topKimarite` non-empty, descending integer counts summing to hundreds+.
   - `yokozunaVacantBashoCount` a real total in `[0,150]` consistent with per-year snapshots (dozens if late years show 0 yokozuna).
   - Each `yearSnapshots[i].retiredTotal` equals `historicalTotal` and climbs 5 → ~948.
   - `averageRetirementAge` unchanged behavior (if still ~19.6 that is the lifecycle plan's defect, out of scope here).
     Quick check: `node -e "const r=require('./simulation-results.json'); console.log(r.tuningMetrics.topKimarite.length, r.tuningMetrics.yokozunaVacantBashoCount, r.yearSnapshots.every(s=>s.retiredTotal>=s.historicalTotal))"`
3. `npx vitest run src/tests/unit/engine/eraDriftKimariteReset.test.ts` still GREEN (intended reset preserved).

## Self-review

- `EraDriftService.ts:90` reset is bypassed for diagnostics, not removed; `grep -rn "globalKimariteStats" src/` confirms no other consumer needs whole-run cumulative.
- `historyStats.cumulativeKimarite?` is optional so existing callers type-check.
- Yokozuna vacancy read AFTER the per-basho banzuke update so freshly-promoted yokozuna aren't falsely counted vacant.
- Kimarite delta uses positive deltas (reset-proof); `preKimarite` snapshotted before each `simulateEntireBasho`.
- Diagnostic change touches only the `retiredTotal` expression.
- Measurement-only plan; no balance constants altered. Prerequisite for all balance plans.
