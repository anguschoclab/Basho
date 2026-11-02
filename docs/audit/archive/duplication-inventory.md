# Duplication Inventory — Phase 0

> Generated 2026-10-08 by the refactor campaign. Method: AST-free `export <kind> <name>` scan over `src/` (production files only), followed by manual value/semantic comparison for every value-collision. `jscpd` is not installed and network is unavailable, so block-level clone detection is deferred to a follow-up; name collisions + constant values were verified by hand.

## Summary

- 77 exported names declared in more than one production file.
- 20 are type-only collisions (`type`/`interface`/`enum`) — same name, potentially different shapes; each needs a semantic verdict (likely rename, not merge).
- 57 involve at least one value export (`function`/`const`/`class`).

## Verdict legend

- **MERGE** — identical value/implementation; delete all but one canonical site.
- **RENAME** — same name, different domain semantics or shapes; keep both, rename at least one.
- **DIVERGED** — same name, conflicting values; a canonical-behavior decision is required before consolidation.
- **LAYERED** — same name at different architectural layers (e.g., action creator vs engine fn); NOT duplicates — do not touch.
- **OPEN** — semantic comparison not yet performed; Phase 0 registry assigns the verdict.

## Confirmed verdicts (validated this session)

### Constants — MERGE (values verified identical)

| Name                                   | Sites                                                                                    | Notes                                                                     |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `BASHO_DAYS`                           | constants/engine/calendar.ts, constants/engine/generation.ts, engine/bout/kachiNokori.ts | 15 in all three; kachiNokori.ts is itself slated for deletion (see below) |
| `MARKET_DRIFT_RANGE`                   | economy.ts, economyExtended.ts                                                           | 0.06 — merge when the Extended pair is folded                             |
| `MONTHS_PER_YEAR`                      | calendar.ts, economy.ts                                                                  | 12                                                                        |
| `DAYS_PER_WEEK`                        | calendar.ts, time.ts                                                                     | 7                                                                         |
| `DEFAULT_YEAR`                         | calendar.ts, physics.ts                                                                  | 2026 — odd home in physics.ts                                             |
| `INTERIM_DAYS`                         | calendar.ts, npcStrategy.ts                                                              | 42                                                                        |
| `DEBUT_AGE_BASE`                       | career.ts, generation.ts                                                                 | 15                                                                        |
| `DEFAULT_STAT_VALUE`                   | physics.ts, rikishi.ts                                                                   | 50                                                                        |
| `FAT_TAIL_SAMPLING_CHANCE`             | career.ts, generation.ts                                                                 | 0.15                                                                      |
| `RECRUITMENT_FREEZE_WEEKS`             | welfare.ts, welfareTransitions.ts                                                        | 12                                                                        |
| `PROGRESS_GAIN_MIN/MAX/BASE`           | welfare.ts, welfareTransitions.ts                                                        | 2/12/4 — whole block duplicated                                           |
| `WATCH_THRESHOLD_WITH/WITHOUT_NEGLECT` | welfare.ts, welfareTransitions.ts                                                        | 30/45                                                                     |
| `BASHO_FINAL_DAY`                      | rivalry.ts, npcStrategy.ts                                                               | 15                                                                        |
| `HOT_PAIR_HEAT_THRESHOLD`              | media.ts, mediaImpact.ts                                                                 | 30                                                                        |
| `STREAK_MAIN_EVENT_THRESHOLD`          | media.ts, mediaImpact.ts                                                                 | 10                                                                        |
| `STAFF_NAME_RANDOM_RANGE`              | economy.ts, generation.ts                                                                | 1000                                                                      |
| `BASHO_MONTHS`                         | constants/engine/calendarExtended.ts, engine/core/SimulationConfig.ts                    | `[1,3,5,7,9,11]` identical                                                |

### Constants — DIVERGED (canonical decision required)

| Name                                   | Values         | Sites                               |
| -------------------------------------- | -------------- | ----------------------------------- |
| `NATURALIZATION_CAREER_WINS_THRESHOLD` | 300 vs **400** | career.ts vs generation.ts          |
| `SANCTION_RISK_THRESHOLD`              | 85 vs **50**   | welfare.ts vs welfareTransitions.ts |
| `BOUT_DURATION_DOMINATION_DIVISOR`     | 15 vs **10**   | rivalry.ts vs narrative.ts          |
| `BOUT_DURATION_CLOSENESS_DIVISOR`      | 30 vs **12**   | rivalry.ts vs narrative.ts          |

Each may be a genuine domain difference mislabeled with a generic name — check call sites before picking canonical vs rename-both.

### Constants — RENAME (same name, different shape/domain)

| Name           | Shapes                                                                                | Sites                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `BASHO_NAMES`  | `Record<string,string>` display map vs `readonly string[]`                            | constants/ui/calendar.ts vs engine/core/SimulationConfig.ts                                             |
| `PHASE_LABELS` | replay-phase labels (ritual/tachiai/…) vs calendar-phase labels (interim/pre_basho/…) | boutReplay/constants.ts vs constants/ui/calendar.ts                                                     |
| `HEAT_CONFIG`  | `icon: ReactNode` vs `icon: string` (emoji)                                           | boutCardTypes.tsx vs ui/colorMaps.ts — same data, different icon repr; either unify icon repr or rename |

### Functions — MERGE / DELETE

| Name                                                                                                                           | Sites                                                                                          | Verdict                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getRikishi`, `getHeya`                                                                                                        | engine/queries.ts, engine/utils/entityAccess.ts, presenters/worldAccess.ts                     | MERGE — bodies verified identical (`world.rikishi.get(id)` / `world.heyas.get(id)`); canonical = entityAccess.ts; worldAccess re-export or adapt `id: string` vs `Id`                                                                      |
| `getActiveRikishi`                                                                                                             | queries.ts, selectors.ts, entityAccess.ts                                                      | MERGE — canonical = entityAccess.ts                                                                                                                                                                                                        |
| `getAllHeyas`, `getHeyaRoster`, `getOyakataForHeya`, `getRetiredRikishiSummary`, `getRikishiAnywhere`, `loadFullRikishiRecord` | queries.ts vs presenters/worldAccess.ts                                                        | MERGE — canonical = queries.ts; worldAccess becomes a thin re-export or is absorbed                                                                                                                                                        |
| `selectRetiredRikishi`, `selectMergerCandidates`, `selectHeyasWithCriticalWelfare`                                             | engine/selectors.ts vs presenters/selectors.ts                                                 | MERGE — canonical = presenters/selectors.ts; delete engine/selectors.ts dups                                                                                                                                                               |
| `calculateKachiNokori`                                                                                                         | bout/kachiNokori.ts `(wins,losses,absences)` vs systems/economy/KachiNokoriService.ts `(wins)` | DIVERGED — semantic pin (Phase 1 characterization) decides canonical behavior; wired consumers use the Service variant (CompetitionService, MochikyukinService, phase05) — likely verdict: canonical = Service, delete bout/kachiNokori.ts |
| `makeDeterministicSeed`                                                                                                        | engine/utils/seed.ts vs utils/engineUtils.ts                                                   | OPEN — compare bodies                                                                                                                                                                                                                      |
| `applyImpact`                                                                                                                  | contexts/gameHelpers.ts vs engine/core/ImpactResolver.ts                                       | OPEN — likely layered (UI helper vs engine resolver), verify                                                                                                                                                                               |
| `projectTsukebito`                                                                                                             | presenters/projections/trainingProjections.ts vs presenters/tsukebitoProjections.ts            | OPEN — same-layer candidate merge                                                                                                                                                                                                          |
| `tickYear`                                                                                                                     | npcAI/ticks.ts vs systems/generation/TalentPoolStateService.ts                                 | OPEN — different domains? rename candidate                                                                                                                                                                                                 |
| `generateCandidate`                                                                                                            | shikona/generation.ts vs systems/generation/CandidateGenerator.ts                              | OPEN — legacy vs service overlap                                                                                                                                                                                                           |
| `leaseMyoseki`                                                                                                                 | myosekiMarket.ts vs systems/governance/MyosekiTradingService.ts                                | OPEN — legacy vs service overlap                                                                                                                                                                                                           |
| `issueGovernanceRuling`                                                                                                        | systems/governance/ScandalService.ts (fn) vs engine/world.ts (const)                           | OPEN                                                                                                                                                                                                                                       |
| `getHeatBand`                                                                                                                  | boutCardTypes.tsx vs rivalryUtils.pure.ts                                                      | OPEN — one may just be a re-impl                                                                                                                                                                                                           |
| `getCurrentBasho`                                                                                                              | lifecycle/BashoManager.ts vs queries.ts                                                        | OPEN                                                                                                                                                                                                                                       |
| `RankBadge`                                                                                                                    | layout/control-center/RankBadge.tsx vs rikishi/RankBadge.tsx                                   | OPEN — component merge or rename                                                                                                                                                                                                           |
| `PressConference`                                                                                                              | game/PressConference.tsx vs media/PressConference.tsx                                          | OPEN                                                                                                                                                                                                                                       |

### Layered — NOT duplicates (recorded to prevent false dedupe)

| Name                                                        | Why not a dup                                                                                                                                                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `startBasho` (3x), `advanceDay`, `simulateBout`, `endBasho` | contexts/gameActions.ts exports are action creators returning `GameAction` (dispatch layer); world.ts/BashoManager/boutResolver fns are engine implementations. Different layers, different contracts. |

### Types — OPEN (20 same-name collisions, likely renames)

`BashoPerformance`, `ConfidenceLevel`, `EngineEvent` (interface vs type across events.ts/worker types), `GovernanceSummary`, `KimariteClass`, `KoenkaiBandType`, `NarrativeContext`, `PerceptionSnapshot`, `PreBashoAssessment` (interface vs a React component fn of same name!), `RankTier`, `ReplayPhase`, `ReputationBand`, `RikishiKihakuDTO`, `RivalryHeatBand`, `RunwayBand`, `ScandalBand`, `ScoutingInvestment`, `Season`, `StandingEntry`, `TsukebitoProjection`, `YouthAcademyState`.

## Notes for the dedupe gate

- The gate should flag exported value-name collisions across production files, with an explicit allowlist for LAYERED pairs and intentional same-name domain APIs.
- Diverged scalars must be resolved _before_ the constants merge wave — codemoding imports onto the wrong value would silently change behavior.
- Scanner caveat: `export { X }` re-export sites and object-literal method exports are not counted above; the orphan-audit `fsScan` covers those paths.

## Phase 3 outcome — executed (dedupe wave complete)

`duplicateExportGate.test.ts` + `scripts/duplicateExports.ts` landed: TS-API
scanner counts only true definitions (`export` decls; re-exports excluded),
plus a constants-uniqueness check over `constants/engine/*`. Gate is GREEN:
85 collisions → 0 (5 allowlisted layered APIs: `startBasho`, `advanceDay`,
`simulateBout`, `endBasho`, `applyImpact`).

Verdicts executed:

- **Constants**: all 23 `constants/engine/*` collisions eliminated —
  canonical homes calendar.ts / generation.ts / economy.ts / media.ts /
  welfare.ts; divergent dead copies removed (`BOUT_DURATION_*` in
  rivalry.ts, `SANCTION_RISK_THRESHOLD` in welfareTransitions.ts,
  `NATURALIZATION_CAREER_WINS_THRESHOLD` duplicates kept per call-site
  analysis — naturalization.ts consumes the generation value).
- **calculateKachiNokori**: canonical = KachiNokoriService (pin confirmed);
  bout/kachiNokori.ts deleted, helpers moved to the Service, tests repointed.
- **Accessors**: entityAccess.ts deleted (dead); worldAccess.ts → re-export
  adapters; queries.ts `getActiveRikishi` → re-export of selectors' cached impl.
- **Renames (different domains)**: `BashoPerformance`→`AlmanacBashoPerformance`
  (almanac/); worker `EngineEvent`→`WorkerEvent`; staff `ReputationBand`→
  `StaffReputationBand`, `LoyaltyBand`→`StaffLoyaltyBand`; rikishiAgency
  `LoyaltyBand`→`RikishiLoyaltyBand`; RankBadge `RankTier`→`RankBadgeTier`;
  debtMeta `Loan`→`LoanRow`; bard `NarrativeContext`→`BoutNarrativeContext`;
  useCrisisDetection `ActiveCrisis`→`DetectedCrisis`; InstitutionPanelSections
  `WelfareState`→`WelfarePanelState`; governanceProjections `GovernanceSummary`→
  `GovernancePageSummary`; selectors `StandingEntry`→`EngineStandingEntry`;
  sonner `Toaster`→`SonnerToaster`; useGovernanceDerived `GovernanceDerived`→
  `GovernanceHookResult`; control-center `RankBadge`→`SimpleRankBadge`;
  media `PressConference`→`MediaPressConference`; dashboard
  `PreBashoAssessment`→`PreBashoAssessmentPanel`.
- **Identical-type merges** (canonical def + import/re-export):
  `ReputationBand` (NarrativeBands), `KoenkaiBandType` (narrative.ts),
  `RunwayBand` (narrative.ts), `ScandalBand` (NarrativeBands), `Season`
  (basho.ts), `ReplayPhase` (ReplayMetadata via presenters/engineAccess),
  `RikishiKihakuDTO` (presenters/rikishi/types.ts), `YouthAcademyState`
  (types/academy.ts).
- **Dead decls deleted**: combat.ts `KimariteClass` (different union,
  zero consumers), uiDigestTypes `PerceptionSnapshot`/`PrestigeChange`
  (both unreferenced), SimulationConfig `BASHO_MONTHS`/`BASHO_NAMES`,
  `getCurrentBasho` in BashoManager, `projectTsukebito` in
  trainingProjections, `tickYear`→`tickTalentPoolYear`,
  `getHeatBand`→`getDisplayHeatBand` (rivalryUtils.pure),
  `generateCandidate` (shikona)→`generateShikonaCandidate`,
  `makeDeterministicSeed` timestamp impl removed (canonical = seed.ts).
- **Unexported**: `OfficiatingOutcome`, `ResolvedTactics` (internal
  resolution helper shapes — no external consumers).

Trap recorded: `export *` barrels do NOT create local bindings — deleting a
local definition whose consumers relied on the barrel re-export chain needs a
local import + explicit re-export (see `rivalries.ts`/`makeRivalryKey`).
