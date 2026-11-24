---
name: manage-stable
description: Work on heya (stable) management systems — finances, sponsors, loans, facilities, staff, governance/welfare standing, recruitment, myoseki elder stock, succession. Use whenever changing anything that affects a stable's money, roster size, reputation, facilities, or compliance — maps every subsystem, tick phase, worker command, and constants file, plus the two traps (removed legacy finance fns, FinanceCalculator is the only breakdown source).
---

# Stable (Heya) Management Domain

`Heya` (`src/engine/types/heya.ts`) key fields: `funds`, `activeLoans: Loan[]`, `facilities { training, recovery, nutrition }`, `facilitiesBand`, `staffIds`, `scandalScore`, `governanceStatus`, `welfareState`, `politicalCapital`, `ichimon`, `rikishiIds`, `reputation`, `riskIndicators`, `activeCrisis`.

## Money flow — the tick schedule

- **Daily** (`phase01_daily_micro` — fused economy/welfare/sponsors/drama): economy micro-tick, sponsor accrual, welfare decay.
- **Weekly** (`phase01_week_economy`, every 7 days, inside `bashoPipeline`/`offSeasonPipeline`): financial settlement.
- **Monthly** (`phase05_monthly_boundary`, appended to the weekly tick that carries the month boundary): salaries, rent, loan payments.
- **Canonical breakdown:** `FinanceCalculator.calculateHeyaWeeklyFinances(heya, world)` is the *only* income/expense source of truth — UI (e.g. `IncomeExpensesCards`) must bind to it, never hand-sum.
- **Removed, do not reintroduce:** `processHeyaFinances()` / `tickWeekEconomics()` — `scripts/audit/engine-reviewer.ts` flags any new call site.

## Subsystems (`src/engine/economy/`)

`SponsorshipService`/`SponsorContractService` (sponsor relationships + contracts), `KenshoService` (kensho envelopes on bouts), `MochikyukinService` (sekitori bonus points), `KachiNokoriService`, `InfrastructureService` + `infrastructureValidation` (buildings), `GlobalCupService`, `TravelAllowanceService`.

Facilities' three axes feed `ActiveModifiers` in `phase02_context`, which multiplies training/recovery/etc. downstream — facility investment is how the player buys growth.

## Worker commands (see `add-engine-command` skill for the full path)

- `commands/economy.ts`: `BUY_MYOSEKI`, `LEASE_MYOSEKI`, `LIST_MYOSEKI_FOR_SALE`, `RETURN_MYOSEKI_LEASE`, `RENEW_SPONSOR`, `RECRUIT_SPONSOR`, `REQUEST_BAILOUT`, `PREPAY_LOAN`, `HIRE_STAFF`, `FIRE_STAFF`
- `commands/heya.ts`: `INVEST_IN_FACILITY`, `BUILD_INFRASTRUCTURE`, `REPAIR_INFRASTRUCTURE`, `BUY_PHYSIO`, `SET_HEYA_DIET`, `SET_RIKISHI_DIET`, `TRIGGER_SUCCESSION`, `PLAYER_FOUND_STABLE` (player branches off to found a new heya — `lifecycle/playerFounding.ts`), `SET_KESHO_CONFIG` (writes `world.customKeshoConfigs`), `RETIRE_RIKISHI`
- `commands/governance.ts`: `ISSUE_RULING`, `REQUEST_POLITICAL_FAVOR`, `SPEND_POLITICAL_CAPITAL`, `RESOLVE_CRISIS`, `HANDLE_MEDIA_EVENT`, `APPLY_PRESS_CONFERENCE`, `CHANGE_ICHIMON`, `PROPOSE_COUNCIL_MOTION`, `VOTE_COUNCIL_MOTION`, plus academy commands (`BUILD_YOUTH_ACADEMY`, `BUILD_FOREIGN_ACADEMY`, `INVEST_ACADEMY`, `UPGRADE_YOUTH_ACADEMY`, `HIRE_ACADEMY_STAFF`, `MANAGE_ACADEMY`)

## Governance & welfare

`governanceStatus`: `"good_standing" | "warning" | "probation" | "sanctioned"`. `welfareState`: `{ welfareRisk (0–100), complianceState, weeksInState, morale, activeDiet }`. Services in `src/engine/governance/` (`GovernanceService`, `ScandalService`, `PoliticalFavorsService`) and `src/engine/welfare/`; risk scoring + compliance transitions run in `phase01_week_welfare`.

## Recruitment

`src/engine/recruitment/` — `ScoutingService` and `FogOfWarService` (candidates start fogged; scouting reveals info). Commands: `SCOUT_POOL`, `SCOUT_CANDIDATE`, `SEND_SCOUT`, `SET_SCOUTING_INVESTMENT`, `OFFER_CONTRACT`, `POACH_CANDIDATE`. Hard rule: `FOREIGN_RIKISHI_LIMIT_PER_HEYA` in `src/constants/engine/recruitment` (enforced + checked by the 25-yr diagnostic). See the `scout-recruit` skill for the CA/PA fog channel and talent-pool pipeline.

## Stable lifecycle — founding, closure, custody, elections

- **Founding:** `lifecycle/playerFounding.ts` handles `PLAYER_FOUND_STABLE`; NPC retirees can found heyas through the founding funnel (founder brings deshi on branch-out; JSA-backed waiver for dead/dying parents; founding gate + credentials in constants). A retired founder converts via `lifecycle/retireeOyakataConversion.ts`.
- **Closure & custody:** `economy/mergers.ts` — disciplinary closure, merger absorption (stamps `grandfatheredForeignCount` on absorbed foreigners), `azukari` custody placements, insolvency as a terminal-debt line unified with succession.
- **JSA board & clans:** `governance/elections.ts` — clan-quota JSA elections persisted on `world.jsaBoard`, three-tier elder ladder, kabu-weighted board seats; `governance/ichimon.ts` — ichimon membership + defection path. Council motions are player commands (`PROPOSE_COUNCIL_MOTION`/`VOTE_COUNCIL_MOTION`).

## Tuning knobs

`src/constants/engine/`: `economic.ts`, `economy.ts`, `economyExtended.ts`, `facilities.ts`, `governance.ts`, `governanceExtended.ts`, `recruitment*`. Long-horizon balance check: `bun scripts/sim/diagnostic-25yr-sim.ts` (see `sim-diagnostics`).
