# Bound the Runaway NPC Economy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `superpowers:test-driven-development`. Strict red→green→commit. Write the failing test FIRST with real fixtures, `npx vitest run <file>` and SEE it fail, implement real code from the cited files, run again and SEE it pass, commit. Determinism only — never `Math.random`/`Date.now`; use `rngFromSeed`/`rngForWorld`. All mutation via `createImpactBuilder`; reuse `FinanceCalculator`. Do NOT revive the dead `economics.ts#processHeyaFinances`/`tickWeekEconomics`.

**Build order:** Run AFTER the diagnostic-metrics plan (`-06`). The macro-dynamics plan (`-11`) DEPENDS on this — stable closures/mergers need financial stress this plan creates.

## Goal

Stop NPC stable funds compounding without bound. The 25-year sim ends with avg ¥1.3B/stable, 0 bankruptcies, Gini 0.234. After this change, average stable funds must stay bounded (target well under ¥100M, not monotonically exploding) and the distribution must stratify — weak stables should approach insolvency, trip the existing loan/merger machinery (`issueBailoutLoanIfNeeded`, `MERGER_THRESHOLD`), and produce non-trivial `bankruptCount` / higher Gini.

## Root-Cause Analysis (measured from code)

Income is healthy and varied; the **expense side is structurally gutted.**

Income credited to `heya.funds`: JSA weekly grant ¥50k/wk (`economic.ts:113`); per-wrestler subsidy (`economic.ts:66`, `FinanceCalculator.ts:73-83`); koenkai heya-portion up to ~¥4.9M/mo (`economyExtended.ts:99`, `FinanceCalculator.ts:68-70`); sponsor income up to **¥40M/mo uncapped** (`economyExtended.ts:102-117`, `FinanceCalculator.ts:86-96`); kensho stable share per bout (`economics.ts:152-159` via `boutResultApplier.ts:174`); misc gifts/favors.

Expenses debited: daily food (`phase01_daily_economy.ts:26`, ~¥450k/mo); weekly facility upkeep **clamped to never exceed income** (`FinanceCalculator.ts:116-139`); staff upkeep; recruitment ¥100k/wk skipped below DEBT_LIMIT; monthly maintenance (`maintenance.ts:25-27`); loans only if one exists; NPC facility auto-investment that **stops at max level** (`npcInvestment.ts:34,43`) — removing the only large discretionary sink.

**Two structural holes:**

1. **Sekitori/oyakata salaries are NOT a heya expense.** `processHeyaEconomics` (`salaries.ts:20-60`) credits salaries to the _rikishi_ and explicitly does NOT deduct from `heya.funds` (`salaries.ts:58`). There is zero heya cost that scales with roster strength — a stable can field 5 sekitori earning ¥40M/mo in sponsorship and pay almost nothing for them.
2. **Expenses are clamped to income; income is uncapped.** `FinanceCalculator.ts:133-139` caps burn at income so net is ≥0 whenever income ≥ baseBurn. Combined with hole #1, funds rise monotonically and never come back down; facility investment terminates at max level, killing the last sink → ¥1.3B.

**Fix strategy:** introduce roster/rank-scaled operating overhead as a genuine heya expense NOT clamped away, plus a flat fixed overhead, so net can go negative for stables whose income doesn't cover their roster — creating pressure proportional to size and letting weak stables sink toward `LOAN_ISSUANCE_THRESHOLD`/`MERGER_THRESHOLD`.

## Architecture

All new sinks land in live paths only: `FinanceCalculator.calculateHeyaWeeklyFinances` (weekly overhead) and `phase05` monthly economics via `processHeyaEconomics` (`salaries.ts`, rank-scaled). New tunables in `src/constants/engine/economic.ts`. The debt floor (`DEBT_LIMIT = -20M`) and loan/merger thresholds already exist — we only make stables actually reach them.

## Tech Stack

Vite + React 19 + TS, Vitest (`npx vitest run`), `ImpactBuilder`/`resolveImpacts`. Mocks: `src/tests/unit/engine/utils.ts` (`makeMockHeya`, `mockRikishi`, `makeMockWorld`). Diagnostic: `bun scripts/diagnostic-25yr-sim.ts`.

---

## Task 1 — Operating-overhead constants

**Files:** `src/constants/engine/economic.ts`, Create `src/tests/unit/engine/systems/economics/operatingOverhead.test.ts`

1. Failing test: import `FIXED_OPERATING_OVERHEAD_WEEKLY`, `SEKITORI_OVERHEAD_MONTHLY`, `NON_SEKITORI_OVERHEAD_MONTHLY`; assert fixed `> 0`; the sekitori record has `yokozuna > ozeki > … > juryo` and `yokozuna >= 1_000_000`; non-sekitori `> 0`; regression-guard `DEBT_LIMIT === -20_000_000` and `MERGER_THRESHOLD === -15_000_000`.
2. Run (FAIL — undefined).
3. Implement in `economic.ts` (after the upkeep block ~`:99`): `FIXED_OPERATING_OVERHEAD_WEEKLY = 250_000`; `SEKITORI_OVERHEAD_MONTHLY = { yokozuna: 1_500_000, ozeki: 1_000_000, sekiwake: 700_000, komusubi: 550_000, maegashira: 400_000, juryo: 250_000 }`; `NON_SEKITORI_OVERHEAD_MONTHLY = 40_000`. JSDoc them as intentional roster-scaled sinks.
4. Run (PASS). 5. Commit: `feat(economy): add roster-scaled operating overhead constants`

## Task 2 — Weekly fixed overhead, exempt from the solvency clamp

**Files:** `src/engine/systems/economy/FinanceCalculator.ts`, Create `src/tests/unit/engine/systems/economics/FinanceCalculator.test.ts`

1. Failing test: (a) a heya's `result.totalBurn` includes `FIXED_OPERATING_OVERHEAD_WEEKLY`; (b) a heya whose income < roster+facilities+fixed overhead has `result.nextFunds < heya.funds` (clamp does NOT zero the loss for essential overhead), using positive `funds` so the debt floor isn't under test.
2. Run (FAIL — `baseBurn` excludes fixed overhead at `:129`; clamp floors net at 0 at `:133-139`).
3. Implement in `FinanceCalculator.ts`: import `FIXED_OPERATING_OVERHEAD_WEEKLY`; at `:129` `const baseBurn = facilityUpkeep + staffUpkeep + FIXED_OPERATING_OVERHEAD_WEEKLY;` (admin discount applies only to facility/staff, not fixed overhead). Change the clamp (`:133-139`) so it only suppresses discretionary `recruitmentCost`, never `baseBurn`: pay recruitment only if income covers it after baseBurn; baseBurn always paid in full even when net goes negative. Keep the debt floor (`:146-148`).
4. Run (PASS) + `npx vitest run src/tests/unit/engine/systems/economics`. 5. Commit: `feat(economy): charge fixed weekly operating overhead, exempt from solvency clamp`

## Task 3 — Monthly rank-scaled overhead deducted from heya

**Files:** `src/engine/tick/phases/monthly/economics/salaries.ts`, Create `src/tests/unit/engine/systems/economics/heyaMonthlyOverhead.test.ts`

1. Failing test: a heya (`funds: 50_000_000`) with 1 yokozuna + 1 maegashira + 3 non-sekitori; after `processHeyaEconomics` + resolve, `funds` decreased by exactly `SEKITORI_OVERHEAD_MONTHLY.yokozuna + .maegashira + 3*NON_SEKITORI_OVERHEAD_MONTHLY`; sekitori still receive their salary credit.
2. Run (FAIL — `salaries.ts:58` never touches heya funds).
3. Implement in `salaries.ts`: import the constants; in the roster loop accumulate `totalHeyaOverhead` (sekitori: `SEKITORI_OVERHEAD_MONTHLY[r.rank]`; others: `NON_SEKITORI_OVERHEAD_MONTHLY`); after the loop debit `heyaUpdates.funds = (heyaUpdates.funds ?? heya.funds ?? 0) - totalHeyaOverhead` (rename `_heyaUpdates` → `heyaUpdates` since now used); update the misleading comment at `:16-19,58`; return `totalJsaSalaries + totalHeyaOverhead` so `phase05` runway burn (`phase05_monthly_boundary.ts:62`) reflects real burn.
4. Run (PASS). 5. Commit: `feat(economy): deduct rank-scaled monthly operating overhead from heya funds`

## Task 4 — Monthly path clamps to DEBT_LIMIT; runway reflects new burn

**Files:** `src/engine/tick/phases/phase05_monthly_boundary.ts`, Create `src/tests/unit/engine/tick/phase05MonthlyOverhead.test.ts`

1. Failing test: a near-insolvent heya (`funds: -19_000_000`) with sekitori so overhead would push below DEBT_LIMIT → after `phase05_monthly_boundary` + resolve, `funds >= DEBT_LIMIT`; a thin-income wealthy heya's `runwayBand` reflects burn including overhead.
2. Run (FAIL — monthly path doesn't floor funds).
3. Implement: before `builder.updateHeya(id, heyaUpdates)` (`:75`), clamp `heyaUpdates.funds` to `DEBT_LIMIT` via `clampFundsToDebtLimit` (`economic.ts:132`, import it). Runway calc (`:62-63`) already divides by `burn` (now includes overhead from Task 3).
4. Run (PASS). 5. Commit: `fix(economy): clamp monthly heya funds to debt limit after overhead`

## Task 5 — Insolvency pressure integration test

**Files:** Create `src/tests/unit/engine/systems/economics/insolvencyPressure.test.ts` (behavior-lock; no prod change unless under-tuned)

1. Test: a weak heya (`koenkaiBand: "weak"`/`"none"`, low sponsors, roster-heavy, `funds: 0`) advanced several deterministic months via `calculateHeyaWeeklyFinances` (weekly) + `processHeyaEconomics` (monthly) → funds trend strictly downward and cross `LOAN_ISSUANCE_THRESHOLD` (−5M), proving `issueBailoutLoanIfNeeded` (`loans.ts:109`) would fire; a strong heya (powerful koenkai + T4/T5 sponsors) stays solvent (stratification).
2. Run — if the weak heya doesn't decline, overhead is too small → fix in Task 6. 3. No new prod code unless it fails. 4. PASS. 5. Commit: `test(economy): lock insolvency pressure and wealth stratification`

## Task 6 — Tune constants against the 25-year sim (empirical)

**Files:** `src/constants/engine/economic.ts` (values only)

1. `bun scripts/diagnostic-25yr-sim.ts`; read `Economic Health`, `Wealth Gini`, `tuningMetrics.stableWealth`.
2. Adjust the three overhead constants so across 25 years: `avgFunds` bounded and non-exploding (avg well under ¥100M, plateau/oscillate not monotonic climb); `stableWealth.bankruptCount > 0` for some years; `wealthGini` ≥ ~0.35. Guardrails: `heyaCount >= 3`, `rikishiActive >= 100`.
3. Re-run `npx vitest run src/tests/unit/engine/systems/economics` (retune within Task 1's asserted ranges, or widen those assertions deliberately with documentation).
4. Commit: `tune(economy): calibrate operating overhead so NPC funds stay bounded and stratify`

---

## Verification

1. `npx vitest run` — all new tests pass; no NEW failures (especially `npcFinanceParity.test.ts`, `financeSlice.test.ts`, `src/tests/unit/engine/tick`).
2. `bun scripts/diagnostic-25yr-sim.ts`; assert: `stableWealth.mean` bounded (well under ¥100M) and per-year `avgFunds` NOT monotonically increasing (compute deltas; require some negative steps or a plateau); `stableWealth.bankruptCount > 0` and/or `negativeHeyas > 0` in some year; `entropyAudit.wealthGini` ≥ ~0.35; guardrails hold (`heyaCount >= 3`, `rikishiActive >= 100`, no `CRASH:`, weekly tick verified).
3. Determinism: run twice with fixed seed; `stableWealth.mean`/`bankruptCount` identical.

## Self-review

- No dead `economics.ts` functions revived; all via `FinanceCalculator` + live `phase05`.
- All mutations via `createImpactBuilder`/`resolveImpacts`; no `Math.random`/`Date.now`.
- Fixed overhead exempt from solvency clamp (net can go negative); discretionary recruitment still clamped.
- `DEBT_LIMIT` floor enforced weekly (`:146`) and monthly (Task 4); loan/merger thresholds unchanged.
- Stale `salaries.ts:16-19,58` comments updated.
- Strong vs weak stables diverge (Task 5); Task 6 guardrails prevent world collapse.

### Critical Files

- src/engine/systems/economy/FinanceCalculator.ts
- src/engine/tick/phases/monthly/economics/salaries.ts
- src/constants/engine/economic.ts
- src/engine/tick/phases/phase05_monthly_boundary.ts
- scripts/diagnostic-25yr-sim.ts
