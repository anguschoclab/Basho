---
name: manage-stable
description: Work on heya (stable) management systems — finances, sponsors, loans, facilities, staff, governance/welfare standing, recruitment, myoseki elder stock, succession. Use whenever changing anything that affects a stable's money, roster size, reputation, facilities, or compliance — maps every subsystem, tick phase, worker command, and constants file, plus the two traps (removed legacy finance fns, FinanceCalculator is the only breakdown source).
---

# Stable (Heya) Management Domain

`Heya` (`src/engine/types/heya.ts`) key fields: `funds`, `activeLoans: Loan[]`, `facilities { training, recovery, nutrition }`, `facilitiesBand`, `staffIds`, `scandalScore`, `governanceStatus`, `welfareState`, `politicalCapital`, `ichimon`, `rikishiIds`, `reputation`, `riskIndicators`, `activeCrisis`.

## Money flow — the tick schedule

- **Daily** (`phase01_daily_*`): economy micro-tick, sponsor accrual, welfare decay.
- **Weekly** (`phase01_economy`, every 7 days): financial settlement.
- **Monthly** (`phase05_monthly_*`, every 30 days): salaries, rent, loan payments.
- **Canonical breakdown:** `FinanceCalculator.calculateHeyaWeeklyFinances(heya, world)` is the *only* income/expense source of truth — UI (e.g. `IncomeExpensesCards`) must bind to it, never hand-sum.
- **Removed, do not reintroduce:** `processHeyaFinances()` / `tickWeekEconomics()` — `scripts/audit/engine-reviewer.ts` flags any new call site.

## Subsystems (`src/engine/economy/`)

`SponsorshipService`/`SponsorContractService` (sponsor relationships + contracts), `KenshoService` (kensho envelopes on bouts), `MochikyukinService` (sekitori bonus points), `KachiNokoriService`, `InfrastructureService` + `infrastructureValidation` (buildings), `GlobalCupService`, `TravelAllowanceService`.

Facilities' three axes feed `ActiveModifiers` in `phase02_context`, which multiplies training/recovery/etc. downstream — facility investment is how the player buys growth.

## Worker commands (see `add-engine-command` skill for the full path)

- `commands/economy.ts`: `BUY_MYOSEKI`, `LEASE_MYOSEKI`, `LIST_MYOSEKI_FOR_SALE`, `RETURN_MYOSEKI_LEASE`, `RENEW_SPONSOR`, `RECRUIT_SPONSOR`, `REQUEST_BAILOUT`, `PREPAY_LOAN`, `HIRE_STAFF`, `FIRE_STAFF`
- `commands/heya.ts`: `INVEST_IN_FACILITY`, `BUILD_INFRASTRUCTURE`, `SET_HEYA_DIET`, `TRIGGER_SUCCESSION`, `SET_KESHO_CONFIG` (writes `world.customKeshoConfigs`), `RETIRE_RIKISHI`
- `commands/governance.ts`: `ISSUE_RULING`, `REQUEST_POLITICAL_FAVOR`, `SPEND_POLITICAL_CAPITAL`, `RESOLVE_CRISIS`, `HANDLE_MEDIA_EVENT`, `APPLY_PRESS_CONFERENCE`

## Governance & welfare

`governanceStatus`: `"good_standing" | "warning" | "probation" | "sanctioned"`. `welfareState`: `{ welfareRisk (0–100), complianceState, weeksInState, morale, activeDiet }`. Services in `src/engine/governance/` (`GovernanceService`, `ScandalService`, `PoliticalFavorsService`) and `src/engine/welfare/`; risk scoring + compliance transitions run in `phase04_welfare`.

## Recruitment

`src/engine/recruitment/` — `ScoutingService` and `FogOfWarService` (candidates start fogged; scouting reveals info). Commands: `SCOUT_POOL`, `SCOUT_CANDIDATE`, `OFFER_CONTRACT`, `POACH_CANDIDATE`. Hard rule: `FOREIGN_RIKISHI_LIMIT_PER_HEYA` in `src/constants/engine/recruitment` (enforced + checked by the 25-yr diagnostic).

## Tuning knobs

`src/constants/engine/`: `economic.ts`, `economy.ts`, `economyExtended.ts`, `facilities.ts`, `governance.ts`, `governanceExtended.ts`, `recruitment*`. Long-horizon balance check: `bun scripts/sim/diagnostic-25yr-sim.ts` (see `sim-diagnostics`).
