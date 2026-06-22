# Recruitment Under-Replacement (Population Erosion) Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:test-driven-development` — every task is RED→GREEN→COMMIT. Write the failing test first, run it, confirm the exact failure, implement with real code from the cited files, re-run to green, commit. Determinism mandatory: `rngFromSeed`/`rngForWorld`/`RNGRegistry` only — never `Math.random`/`Date.now`. State mutations via `createImpactBuilder` + `builder.merge(...)`.

**Build order:** Run AFTER the diagnostic-metrics plan (`-06`). COMPOSES with the lifecycle plan (`-07`) — land lifecycle first if both are in flight; this plan self-stabilizes around whatever attrition rate exists.

## Goal
Make NPC recruitment intake match attrition so the **active** population stays within ±10% of its starting value (~1084) across 25 years, instead of eroding ~30% to 763. The fix is a closed-loop replacement target (intake = function of attrition/target population), not a bigger hardcoded cap, so it composes with the lifecycle plan rather than fighting it.

## Architecture — root causes (cited)
1. **Recruitment only runs during `interim`.** In `phase01_week_recruitment.ts:76-108` the primary/secondary NPC fill blocks are both wrapped in `if (isInterim)`. Retirements fire every `post_basho` (`phase01_week_governance.ts:40-46`, 6×/year), so attrition has 6 windows/year; routine recruitment has fewer.
2. **The only always-on path is emergency-gated at a fixed floor of 800.** `phase01_week_recruitment.ts:110-125` only recruits outside interim when `world.activeRikishiIds.size < TOTAL_ACTIVE_THRESHOLD` (800, `recruitmentExtended.ts:12`). Between 1084 and 800 there is no continuous replacement — exactly the erosion band.
3. **Visible-candidate starvation throttles intake.** `fillVacanciesForNPCWithBidding` (`TalentPoolNPCRecruitment.ts:120-239`) can only sign `availabilityState === "available"` visible candidates; passive discovery reveals only `rng.int(20,30)`/pool/week (`TalentPoolMaintenance.ts:62`); the full-dump only triggers below 700.
4. **Target/throttle mismatch.** `TARGET_ROSTER_SIZE = 30` (`recruitmentExtended.ts:6`) but the start is ~24/stable; windows are too sparse to ever reach 30, so the loop drifts down.

Fix: a **replacement-rate controller** computing a per-tick global replacement target from active population vs an equilibrium target captured at generation, filled every weekly tick (not just interim, not just below 800). `world._populationTarget` is the single coupling point with the lifecycle plan (this plan only reads it + falls back; lifecycle may own it).

## Tech Stack
Vite + React 19 + TS. Vitest (`npx vitest run`). Mock `src/tests/unit/engine/utils.ts` (`mockRikishi`). Impacts via `createImpactBuilder`/`resolveImpacts`. RNG `rngFromSeed`/`RNGRegistry`.

---

## Task 1 — Capture an equilibrium population target at world generation
**Files:** `src/engine/types/world.ts`, `src/engine/systems/generation/WorldFactory.ts`, Create `src/tests/unit/engine/recruitment/populationTarget.test.ts`
1. Failing test: `generateInitialWorld("pop-target-seed")._populationTarget === activeCount`.
2. Run (FAIL — undefined).
3. Implement: add `_populationTarget?: number;` to `WorldState` (beside other `_`-prefixed fields). In `WorldFactory.generateInitialWorld`, after the roster is built, set `world._populationTarget` = count of non-retired rikishi on the returned world object.
4. Run (PASS). 5. Commit: `feat(recruitment): capture equilibrium population target at worldgen`

## Task 2 — Replacement-gap helper
**Files:** Create `src/engine/systems/generation/RecruitmentController.ts`, `src/tests/unit/engine/recruitment/recruitmentController.test.ts`
1. Failing test: `computeReplacementGap(world)` = `max(0, target - active)`; 0 when over target; 0 when target unset.
2. Run (FAIL).
3. Implement:
```ts
export function computeReplacementGap(world: WorldState): number {
  const target = world._populationTarget;
  if (target == null) return 0;
  return Math.max(0, target - world.activeRikishiIds.size);
}
```
4. Run (PASS). 5. Commit: `feat(recruitment): add replacement-gap controller`

## Task 3 — Allocate the gap into per-stable vacancies
**Files:** extend `RecruitmentController.ts` + its test
1. Failing test: `allocateVacancies(world, gap)` returns `Record<heyaId, number>` excluding the player heya and sanctioned heyas, summing to `min(gap, total headroom)`, giving more to the most-depleted stable; deterministic.
2. Run (FAIL).
3. Implement `allocateVacancies(world, gap)`: iterate `world.heyas.values()`, skip `world.playerHeyaId` and `welfareState?.complianceState === "sanctioned"`, `headroom = max(0, TARGET_ROSTER_SIZE - roster.length)`, distribute `gap` proportionally to headroom via largest-remainder (deterministic), capped at headroom. Import `TARGET_ROSTER_SIZE` from `recruitmentExtended.ts`.
4. Run (PASS). 5. Commit: `feat(recruitment): allocate replacement gap across NPC stables by depletion`

## Task 4 — Run replacement EVERY weekly tick
**Files:** `src/engine/tick/phases/phase01_week_recruitment.ts` (rewrite the NPC fill section `:75-125`), Create/extend `src/tests/unit/engine/recruitment/phase01_week_recruitment.test.ts`
1. Failing test: in `cyclePhase: "pre_basho"` (NOT interim) with active above 800 but below `_populationTarget` and visible available candidates, running the phase + `resolveImpacts` adds active rikishi; at `active === _populationTarget` it adds none.
2. Run (FAIL).
3. Implement — replace the three conditional fill blocks with a single controller-driven block that runs every weekly invocation:
```ts
const gap = computeReplacementGap(world);
if (gap > 0) {
  const vacancies = allocateVacancies(world, gap);
  if (Object.keys(vacancies).length > 0) builder.merge(talentpool.fillVacanciesForNPCWithBidding(world, vacancies));
}
```
Keep window-closing (`:26-43`), player window (`:45-73`), `finalizeSignedCandidates` (`:128`), mentor loop (`:130-174`). Remove now-dead `CRITICAL_ROSTER_THRESHOLD`/`TOTAL_ACTIVE_THRESHOLD` imports if unreferenced (grep first).
4. Run (PASS). 5. Commit: `fix(recruitment): drive NPC replacement every weekly tick via gap controller`

## Task 5 — Guarantee visible-candidate supply meets the gap
**Files:** `src/engine/systems/generation/TalentPoolMaintenance.ts` (`:54-88`), Create `src/tests/unit/engine/recruitment/talentPoolSupply.test.ts`
1. Failing test: below `_populationTarget` by gap 60, all candidates hidden, active above 700 (full-dump not firing) → after `tickWeekTalentPool` the total visible across pools ≥ gap.
2. Run (FAIL).
3. Implement — in the passive-discovery loop (`:58-72`), reveal `max(rng.int(20,30), ceil(gap / 3))` per pool (3 pools → ≥ gap), bounded by `candidatesHidden.length`, using the existing `RNGRegistry.getSystemRNG(world, "scouting", \`discovery_${world.week}\`)`. Keep the below-700 full-dump as safety net.
4. Run (PASS). 5. Commit: `fix(recruitment): reveal enough candidates to cover the weekly gap`

## Task 6 — Align roster constants with equilibrium
**Files:** `src/constants/engine/recruitmentExtended.ts` (`:6,12`), extend controller test
1. Test the equilibrium invariant: `TARGET_ROSTER_SIZE >= ceil(1084/45) (≈25)`; `TOTAL_ACTIVE_THRESHOLD` in `(600, 1084)`.
2. Run — current `30`/`800` likely pass; the real fix is the controller. The `Math.max(0, target-active)` clamp prevents over-growth toward 45×30 — verify via Task 4's "no growth at target".
3. Implement — add comments documenting these as headroom cap + safety net under the controller. Change values only if the integration sim shows drift.
4. Run (PASS). 5. Commit: `chore(recruitment): document roster constants under gap controller`

## Task 7 — Closed-loop stability regression test
**Files:** Create `src/tests/unit/engine/recruitment/replacementLoop.test.ts`
1. Test: `_populationTarget=60`, 5 NPC heyas, full hidden pool; simulate ~12 cycles of (remove K active = attrition) → `tickWeekTalentPool` → `phase01_week_recruitment` → `resolveImpacts`; assert active stays within ±10% of 60.
2. Run (FAIL if wiring off). 3. No new production code. 4. Run (PASS). 5. Commit: `test(recruitment): lock closed-loop population stability`

---

## Verification
1. `npx vitest run` — green except documented pre-existing failures.
2. `bun scripts/diagnostic-25yr-sim.ts`; assert: first-year `rikishiActive` ≈ 1084; final-year within ±10% (~976–1192), vs current 763; no `WARN: Active rikishi dropped >30 in one year` (`diagnostic-25yr-sim.ts:127`); `heyaCount` still 45; no `[RECRUIT ERROR]` spam.
3. Determinism: run twice with fixed seed; `rikishiActive` series byte-identical.

## Self-review
- Intake derived from `_populationTarget − active`, never a hardcoded yearly count (grep the diff for literal intake numbers).
- No unbounded growth: `Math.max(0, target-active)` clamp + "no growth at target" assertion.
- Read-only consumption of `_populationTarget` (lifecycle plan may own it); no retirement logic touched.
- After Task 4, grep `CRITICAL_ROSTER_THRESHOLD`/`TOTAL_ACTIVE_THRESHOLD` — no orphaned imports.
- Player heya excluded from NPC auto-fill (`allocateVacancies`).

### Critical Files
- src/engine/tick/phases/phase01_week_recruitment.ts
- src/engine/systems/generation/TalentPoolNPCRecruitment.ts
- src/engine/systems/generation/TalentPoolMaintenance.ts
- src/constants/engine/recruitmentExtended.ts
- src/engine/systems/generation/WorldFactory.ts
