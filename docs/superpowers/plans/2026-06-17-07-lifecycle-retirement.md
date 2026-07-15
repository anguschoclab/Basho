# Wrestler Lifecycle Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Each task is a self-contained TDD unit: write the failing test, confirm it fails, implement, confirm it passes, commit. Do not batch tasks. Do not skip the red step.

**Build order:** Run AFTER the diagnostic-metrics plan (`-06`) so demographic verification is trustworthy. This is a root-cause plan; the recruitment plan (`-09`) composes with it.

**Goal:** Fix the broken wrestler lifecycle so the demographic pyramid is realistic: mean retirement age 28–35, no wrestler retires below age 18, mandatory retirement at 45 actually fires (eliminating the 41–45 geriatric wall), and the leftover `console.error` debug line is removed.

**Architecture:** Retirement is evaluated by `checkRetirement` in `src/engine/lifecycle.ts`, called from three orchestration paths:

1. `runRetirements` (`src/engine/systems/governance/governanceReview.ts:319`) → `runPostBashoResolution` (`SimulationRunner.ts:46`). Uses `world.year`.
2. `CareerService.processRetirements` (`src/engine/lifecycle/CareerService.ts:32`) → `phase01_week_governance.ts:44`. Uses `world.year`.
3. `npcRetirementStrategy` rules (`src/engine/npcRetirementStrategy.ts`) → `npcAI.tickYear` → `phase06_yearly_boundary.ts:112`. Uses `ctx.world.calendar?.year ?? 2026` — **the bug**.

`averageRetirementAge` (`SimTuningService.ts:103-113`) computes `retirementYear − birthYear`; `birthYear` is assigned from `world.year` at generation (`CandidateBuilder.ts:183`, `lifecycle.ts:268`).

**Root causes (from code + `simulation-results.json`):**

- **RC1 — inconsistent year source.** Paths 1 & 2 stamp `retirementYear = world.year` (2026→2050); path 3 keys both the age check and recorded `retirementYear` off `ctx.world.calendar?.year ?? 2026` (`npcRetirementStrategy.ts:27,35,37,59,65`). When `calendar.year` lags or falls back to literal `2026`, retirements are stamped far below the wrestler's implied current year — producing impossible ages (5–17) and the 19.6 mean. **Fix:** every path uses `world.year`.
- **RC2 — `FORCE_RETIRE_STAGNANT_RULE` has no min-age guard and uses the wrong year** (`npcRetirementStrategy.ts:48-76`).
- **RC3 — mandatory retirement at 45 never fires** because path 3's deflated year makes `age = currentYear - birthYear` read mid-30s for a real 43-year-old (`lifecycle.ts:56,36`), so the geriatric cohort never clears.
- **RC4 — natural-aging curve `(age-34)*0.05` peaks too low** (`lifecycle.ts:97`) to clear the 35–44 band even with the year fixed.
- **RC5 — leftover debug `console.error`** at `lifecycle.ts:51`.

**Tech Stack:** Vite + React 19 + TS. Vitest (`npx vitest run`). Seeded RNG via `rngFromSeed`/`rngForWorld` (`src/engine/rng.ts`). Mutations via `ImpactBuilder` + `resolveImpacts`. Mock factory `mockRikishi` (`src/tests/unit/engine/utils.ts`, default `birthYear: 1995`).

---

## Task 1 — Remove the debug `console.error`, harden the young-age guard (RC5)

**Files:** Create `src/tests/unit/engine/lifecycleRetirement.test.ts`; Modify `src/engine/lifecycle.ts`

1. Failing test:

```typescript
import { describe, it, expect, vi } from "vitest";
import { checkRetirement } from "@/engine/lifecycle";
import { mockRikishi } from "../utils";

describe("checkRetirement — no debug logging, young guard", () => {
  it("does not call console.error when blocking a young rikishi", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = mockRikishi("y1", { birthYear: 1995, rank: "maegashira" }); // age 25 at 2020
    expect(checkRetirement(r, 2020, "seed-young")).toBeNull();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it("never retires a healthy rikishi under age 18", () => {
    const r = mockRikishi("y2", { birthYear: 2004, rank: "jonokuchi" }); // age 16
    expect(checkRetirement(r, 2020, "seed-16")).toBeNull();
  });
});
```

2. Run (FAIL): `npx vitest run src/tests/unit/engine/lifecycleRetirement.test.ts`
3. Implement — in `src/engine/lifecycle.ts` delete line 51 (`console.error(...)`) so the under-28 block reads:

```typescript
if (age < 28) {
  const hasCareerEndingInjury =
    rikishi.injured &&
    rikishi.injuryStatus?.severity === "serious" &&
    (rikishi.injuryWeeksRemaining ?? 0) > 20;
  if (hasCareerEndingInjury) return "Career-Ending Injury";
  return null;
}
```

4. Run (PASS). 5. Commit: `Remove debug console.error from checkRetirement young-age guard`

---

## Task 2 — Make mandatory retirement at 45 fire; steepen the aging curve (RC3, RC4)

**Files:** Modify the test + `src/engine/lifecycle.ts`

1. Add failing tests:

```typescript
describe("checkRetirement — mandatory and natural aging", () => {
  it("forces mandatory retirement at age 45 regardless of seed", () => {
    const r = mockRikishi("m1", { birthYear: 1975, rank: "maegashira", power: 60 }); // 45 at 2020
    expect(checkRetirement(r, 2020, "any-seed-A")).toBe("Mandatory Age Retirement");
    expect(checkRetirement(r, 2020, "any-seed-B")).toBe("Mandatory Age Retirement");
  });
  it("retires >90% of healthy 44-year-olds per year", () => {
    let retired = 0;
    const N = 200;
    for (let i = 0; i < N; i++)
      if (
        checkRetirement(
          mockRikishi(`a44_${i}`, { birthYear: 1976, rank: "maegashira", power: 60 }),
          2020,
          `c44-${i}`
        )
      )
        retired++;
    expect(retired / N).toBeGreaterThan(0.9);
  });
  it("retires ~half of healthy 39-year-olds", () => {
    let retired = 0;
    const N = 300;
    for (let i = 0; i < N; i++)
      if (
        checkRetirement(
          mockRikishi(`a39_${i}`, { birthYear: 1981, rank: "maegashira", power: 60 }),
          2020,
          `c39-${i}`
        )
      )
        retired++;
    expect(retired / N).toBeGreaterThan(0.35);
    expect(retired / N).toBeLessThan(0.65);
  });
  it("rarely retires a healthy 35-year-old", () => {
    let retired = 0;
    const N = 300;
    for (let i = 0; i < N; i++)
      if (
        checkRetirement(
          mockRikishi(`a35_${i}`, { birthYear: 1985, rank: "maegashira", power: 60 }),
          2020,
          `c35-${i}`
        )
      )
        retired++;
    expect(retired / N).toBeLessThan(0.25);
  });
});
```

2. Run (FAIL — 44yo cohort retires ~50% with the current `*0.05`).
3. Implement — keep the mandatory branch at `lifecycle.ts:56` (it only failed in production via the bad year, fixed in Task 4). Change line 97:

```typescript
// Slope 0.10 so a 44-year-old has ~1.0 annual retirement probability.
const baseRetireChance = Math.max(0, (age - 34) * 0.1);
```

4. Run (PASS). 5. Commit: `Steepen natural-aging retirement curve to clear 35-44 cohort`

---

## Task 3 — Unify `npcRetirementStrategy` on `world.year`; guard forced retirement (RC1, RC2)

**Files:** Create `src/tests/unit/engine/npcRetirementStrategy.test.ts`; Modify `src/engine/npcRetirementStrategy.ts`

1. Failing test (build a minimal world where `world.year=2050` but `calendar.year=2026`, assert retirement stamps 2050 not 2026, and that the force-retire rule never targets under-28). See agent draft for the full fixture; key assertions:

```typescript
// natural retirement: age via world.year (2050-2005=45) => "Mandatory Age Retirement", retirementYear 2050 not 2026
// force-retire: 16 healthy age-20 rikishi => no retirement recorded ("stable restructuring" absent)
```

2. Run (FAIL — current code uses `calendar.year ?? 2026`).
3. Implement in `src/engine/npcRetirementStrategy.ts`: replace every `ctx.world.calendar?.year ?? 2026` with `ctx.world.year`; in `FORCE_RETIRE_STAGNANT_RULE` filter candidates by `const age = ctx.world.year - r.birthYear; return age >= 28 && age > 32;` and record `builder.retireRikishi(candidates[0].id, ctx.world.year, "Forced retirement due to stable restructuring")`.
4. Run (PASS). 5. Commit: `Unify NPC retirement on world.year and guard forced retirement to age 28+`

---

## Task 4 — Regression lock: all paths stamp `world.year` (RC1)

**Files:** Create `src/tests/unit/engine/retirementYearConsistency.test.ts`; verify `CareerService.ts`, `governanceReview.ts`

1. Test asserting `CareerService.processRetirements` and `runRetirements` both stamp `retirementYear = world.year` (2050), not `calendar.year` (2026), on a divergent-year world.
2. Run — expected PASS (both already use `world.year` per `CareerService.ts:38`, `governanceReview.ts:328,346`). This is a regression lock; if FAIL, change the offending call site to `world.year`.
3. (Conditional) fix any call site still using `calendar.year`.
4. Run (PASS). 5. Commit: `Add regression lock: all retirement paths stamp world.year`

---

## Task 5 — Harden the SimTuningService retirement-age metric (defensive)

**Files:** Create `src/tests/unit/engine/simTuningRetirementAge.test.ts`; Modify `src/engine/simulation/SimTuningService.ts`

1. Failing test: a world with one valid retiree (age 30) and one corrupt (`retirementYear 2026`, `birthYear 2044` → age −18) → `averageRetirementAge` should be 30 and `retirementAges` `[30]`.
   > Confirm the public entry name by reading `SimTuningService.ts` (the exported method returning `{ averageRetirementAge, retirementAges }`); adjust the test call accordingly.
2. Run (FAIL — current loop pushes every age including −18).
3. Implement — in the retirement-age loop (`SimTuningService.ts:103-111`) discard implausible ages:

```typescript
const age = r.retirementYear - r.birthYear;
if (age < 15 || age > 70) continue;
```

4. Run (PASS). 5. Commit: `Filter impossible retirement ages out of tuning metric`

---

## Verification

1. `npx vitest run` — all five new test files pass; no new failures beyond the documented pre-existing ones.
2. `bun scripts/diagnostic-25yr-sim.ts`, then assert against `simulation-results.json`:
   - `retirementAges` mean in `[28, 35]`, **min ≥ 18**, no cap stuck at 32.
   - The 41–45 active-roster cohort is drastically reduced; active `avgAge` sits in a normal 23–29 band.
     Quick check: `node -e "const r=require('./simulation-results.json'); const a=r.tuningMetrics.retirementAges; const m=a.reduce((x,y)=>x+y,0)/a.length; console.log('mean',m.toFixed(1),'min',Math.min(...a)); console.assert(Math.min(...a)>=18 && m>=28 && m<=35)"`
3. `grep -rn "DEBUG checkRetirement" src/engine` and `grep -rn "calendar?.year ?? 2026" src/engine/npcRetirementStrategy.ts` → both empty.

## Self-review

- Determinism: no `Math.random`/`Date.now`; `checkRetirement` keeps `rngFromSeed(seed, "lifecycle", ...)`, tests vary only by seed string.
- All three paths key off `world.year`; Task 4 fails loudly if `calendar.year` is reintroduced.
- The age-5 bug is a recorded-`retirementYear` defect (RC1), not a `birthYear` defect — `CandidateBuilder` birthYear assignment is correct and untouched.
- If the diagnostic mean improves ONLY because Task 5's filter discards records, the year-source fix (Tasks 3-4) is incomplete — re-investigate.
- Don't claim a clean suite if the 4 known-failing files still fail; they're out of scope.

### Critical Files

- src/engine/lifecycle.ts
- src/engine/npcRetirementStrategy.ts
- src/engine/lifecycle/CareerService.ts
- src/engine/systems/governance/governanceReview.ts
- src/engine/simulation/SimTuningService.ts
