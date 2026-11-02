# Bug Registry — v16

> **STALENESS NOTICE:** statuses reflect dispositions at the v16 consolidation commits. Verify with `git log` / re-runs before citing later.

Severity: **P0** data loss/corruption or player-visible breakage · **P1** incorrect simulation semantics · **P2** UI lies/dead controls · **P3** test-quality/debt.

## Fixed (landed `10bd84b2`, `061881a3` + follow-ups)

| ID | Sev | Location | Defect |
|---|---|---|---|
| B01 | P0 | `tick/phases/phase01_basho_bouts.ts` | `PASSTHROUGH_FIELDS` dropped `governanceLog` + heya/staff entity writes → scandal rulings/scandalScore silently discarded |
| B02 | P1 | `tick/phases/phase01_week_governance.ts:45` | `world.week === 52` vs monotonic counter → elections fired once ever |
| B04 | P1 | `tick/phases/phase06_yearly_boundary.ts` | `age = world.year − birthYear` pre-increment → perpetually 1-year-stale ages |
| B05 | P1 | `tick/phases/phase01_week_health.ts:74` | NPC injury recovery multiplied by player's `recoveryMultiplier` |
| B08 | P1 | `history/hallOfFame.ts` | `getRikishi` missed retirees → mid-year retiree legends skipped by induction |
| B09 | P2 | `bard/domains/pre_bout.json` | east record rendered `%WEST_LOSSES%` |
| B11 | P2 | `narrative/glossary/terms.ts:33` | `maegashira` termJa = `幕下` (Makushita) → `前頭` |
| B12 | P0 | `recruitment/overflow.ts:75` | stale-base `rikishiIds` → multi-release kept all but last; perpetual re-trigger |
| B13 | P1 | `governance/ceremonies/dohyoIri.ts:38` | seed lacked rikishi id → all yokozuna same style per seed |
| B16 | P0 | `economy/mergers.ts:241` | merger fallback didn't exclude `playerHeyaId` → NPC could absorb player's stable |
| B17 | P1 | `economy/GlobalCupService.ts:222` | `wasPlayerChampion` compared rikishiId to heyaId → always false |
| B18 | P2 | `EconomyPage.tsx:97` | bailout button `funds < 0` vs engine `-¥5M` → enabled-but-dead range |
| B19 | P2 | `layout/EventLogSections.tsx:105` | `.replace` produced invalid class → category icons uncolored |
| B31 | P2 | `dashboard/YushoRaceWidget.tsx:41` | `params:{id}` vs `/rikishi/$rikishiId` → broken nav |
| B32 | P2 | `rikishi/RikishiGlobalCup.tsx:23` + `types/globalCup.ts` | "Tournaments" stat == "Championships"; added `participantIds` to history entry |
| B33 | P2 | `dashboard/DashboardColumns.tsx:192` | literal quotes around "FATIGUE LEVELS" |
| B34 | P2 | `basho/ScheduleSections.tsx:111,129` | `east?.name` unset → raw ids shown; now `shikona` |
| F49 | P3 | `simulation/schedule.test.ts:98` | heya-block regression test inserted no rikishi → vacuous |
| — | P0 | `.github/workflows/perf-gate.yml` | baseline push hit protected `main` (GH006) → dedicated `perf-baseline` branch |
| — | P3 | `dohyoIri.test.ts`, `phase06.singlePass.test.ts` | pinned the buggy behavior → rewritten against fixed semantics |
| — | P3 | `baseline-orphans.json` | regenerated baseline demoted 101 intentional + 81 genuine entries → reconciled |

## Registered debt — P0/P1 engine

| ID | Sev | Location | Defect |
|---|---|---|---|
| B24 | P2 | `SerializationService.ts:54` | `serializeBashoState` drops `boutMetrics`/`isExhibition`/`results`/`schedule`; mid-basho save loses accumulated metrics |
| B25 | P0 | `lifecycle/retireeOyakataConversion.ts:144` | retiree unconditionally deposes sitting oyakata; stale `oyakataId` if foundStable fires |
| B26 | P0 | `lifecycle/PrizeDistribution.ts` + `concludeBasho.ts:136` | shallow `economics` merge → sansho+yusho winner loses sansho cash |
| B31 | P0 | `legacy/DynastyService.ts:201-349` | `triggerSuccession` skips `removeOyakata`, `retireRikishiFully` cascade, myoseki release |
| B32 | P1 | `lifecycle/BashoHistory.ts:365` | yokozuna deliberation reads pre-index history → lags one basho |
| B33 | P1 | `legacy/DynastyService.ts:89` | `isSummary` successor → yearly no-op forever (trustee never runs) |
| B35 | P2 | `lifecycle/retirementNarrative.ts:42` | `highestRank` misses lower divisions → peak = debut rank |
| B44 | P1 | `matchmaking/DramaMatchmaker.ts:583` | `applyDramaBudget` swap loop no-op (scoreChange always 0) |
| B46 | P1 | `kimarite/kimariteStrategies.ts:432,828` | `forwardMomentum < 0` / `stamina < 0.5` unreachable predicates |
| B47 | P1 | `narrative/postbout2.ts:400` | mono-ii narrative rolls independent of `result.monoiiOutcome` |
| B50 | P2 | `bout/ReplayMetadata.ts:103` | `clamp01(margin)` on raw diff → saturates at 1 |
| B06 | P1 | `scripts/narrative/bard-orchestrator.ts` + `autonomous-narrative.yml` | stale archive schema → weekly job guaranteed crash; same GH006 protected push; no timeout |
| B07 | P1 | `package.json`/`electron.vite.config.ts`/`electron/main.ts`/`ELECTRON.md` | 4 mutually inconsistent output names → packaged app can't launch |
| B14 | P1 | `governance/services/MyosekiTradingService.ts:105` | sale proceeds destroyed (buyer debited, seller never credited); buyerId semantic drift |
| B15 | P1 | `recruitment/YouthAcademyService.ts:313` | `abilityGain = floor(pointsGained/10)` on weekly points → ability never rises |
| B23 | P2 | `stable/StablePageTabs.tsx:72` | nested MentorAssignmentPanel inside navigable Card → click navigates AND mutates |

## Registered debt — P2 UI

| ID | Location | Defect |
|---|---|---|
| B20 | `stable/facilityMeta.ts:77` | displayed recovery formula ≠ engine (`0.9+l/166` vs `0.8+l·0.004`) — ~2.5× inflated |
| B21 | `economy/FacilityROIChart.tsx:24` | invented `statGain=1+l/100` efficiency axis (no such engine gain) |
| B22 | `SponsorshipHub*.tsx` | 3 dead controls (Industry Breakdown, Details, ATTRACT NEW PATRONS — no onClick) |
| B38 | `governance/GovernancePoliticsTab.tsx:54` | "Spend 100" burns capital for zero benefit |
| B39 | `GovernancePoliticsTab.tsx:29,179` | `rikishiCount` sort → constant 0 |
| B40 | `recap/RecapSections.tsx:218` | YokozunaDeliberation branch permanently dead + fabricates subject |
| B42 | `kesho/keshoEffects.tsx`/`keshoPatterns.tsx` | unreferenced `<defs>` → embroidery/gradient render nothing; "mountain" motif missing |

## Also fixed (post-verdict follow-up commit)

| ID | Sev | Location | Defect |
|---|---|---|---|
| B12b | P0 | `generation/TalentPoolMaterialization.ts:51` + `TalentPoolNPCRecruitment.ts` | stale-base `rikishiIds` — callers now accumulate `rosterAdditions` and re-issue the composed roster; `resolveImpacts` roster reconciliation already masked the drop, but the queued write was dishonest |
| B12c | P0 | `governance/services/governanceReview.ts` | gift written from pre-loan base (principal destroyed); benefactor charged once for N gifts (money created) — now composes on queued funds + per-benefactor cumulative charge |
| B49 | P0 | `simulation/TournamentSimulator.ts:237` | shallow `{...r}` shared `divisionRecords` — now deep-clones the nested record before incrementing |
| B13b | P1 | `governance/ceremonies/yokozunaAttendants.ts:40` | same seed-scope class as B13 — now `::${yokozuna.id}` |
| B27-partial | P1 | `lifecycle/retirementCheck.ts:47` | probabilistic seed lacked time dimension → `retirement::id::year` — checks now vary per evaluation year |
| B29 | P1 | `shikona/rankRules.ts:54` + `generateShikona.ts:49` | sekiwake/komusubi/maegashira unmapped → "rookie"; both ladders extended |
| B30 | P1 | `welfare/harmony.ts:60` | read `heyaRivalryPairs` (heya-level) for rikishi fields → always 0; now reads `pairs` + `sameHeya` |
| B48 | P1 | `bout/physics/resultBuilders.ts:89` | unguarded `combatProfile.archetype`/`.counterFamily` deref → `?.` |
| B27 | P1 | `health/InjuryService.ts:225,278` | bout-injury seed per-week → per-day `dayIndexGlobal` (~4%/bout, not ~4%/week-cluster) |
| B45 | P1 | `calendar/schedule.ts:243` | makushita call-up double-booked same day → `busyToday` filter |
| B36 | P1 | `history/history.ts:91` | milestone exact-match → threshold-crossing with recorded-title dedupe |
| — | P0 | `.github/workflows/autonomous-narrative.yml` | protected-branch push (GH006, same class as perf-gate) → `narrative-updates` branch; `git add` now covers `domains/` too |
| B14 | P1 | `governance/services/MyosekiTradingService.ts` | sale proceeds destroyed — seller (`stock.ownerId`) now credited on purchase |
| B15 | P1 | `recruitment/YouthAcademyService.ts:313` | `floor(pointsGained/10)` on weekly slice never fired → boundary-crossing on accumulated devPoints |
| B25 | P0 | `lifecycle/retireeOyakataConversion.ts` | unconditional handover deposed sitting oyakata / stale oyakataId after founding → `chairVacant` + `!foundedHeya` guards |
| B34 | P1 | `training/SparringService.ts:452` | `ceil(delta/len)` per stat → up to 4× cap → remainder-distributed within delta |
| B03 | P2 | `tick/phases/phase_pre_basho_assessment.ts` | unreachable [7,14] window at ≤6-day entry → reachable gate, week-dedupe retained |
| B37 | P2 | `ceremony/HoFInductionCeremony.tsx` | `StableName id=rikishiId` broken nav → `heyaId` prop resolved from world |
| B41 | P2 | `scouting/CompareModePanel.tsx` | prospect pair = TalentCandidate (no `.id`) → fabricated 0-0 "B wins"; now resolves via `convertCandidateToRikishi`, deterministic seed, honest "unavailable" |
| B43 | P2 | `history/LineageTree.tsx:102` | "2th/3th Generation Ancestor" → `Generation N Ancestor` |

## Registered debt — P3 test-quality / tooling

- **Tautological test files** (whole-file or per-test): `worker.chunk`, `digest.memo`, `Accept/Build/Enter*Command`, `AutoSimYokozunaCheck`, `TournamentSimulatorWalkover`, `counterActivation`, `isKyujoReset` E.5-8, `ai/types`, `RikishiCard.ginboshi`, `HolidayDialog:72`, `AdvisorPanel` sort, `MatchDayViewer` sort, `sonner`, `heyaUI:577` constants block, `monthlyMarket.placement`, `advance.consolidation:133`, `boundary.gate:214`, `pipelineRunner.hardening:57`, `orchestrator.clone`, `phase05_exhibition.gating`, `boutResolver:147` input-momentum, `tachiaiCounterBonus:224` pseudo-distribution, `WelfareCalculations:315` regex-toContain, `NarrativeService` band decomposition, `OfficialsPanel`/`KihakuStatRow`/`TsukebitoPanel` prop-echo.
- **Conditional/guarded asserts** (silently vacuous): `BloodlineService:59-89`, `RivalryService:169`, `autoSim.yearBoundary:31`, `staffGeneration:93`, `dead-service-integration:91,190`, `dead-assert` family in boutNarrative.*, `boutResolver.officials:92`, `digestProjections:173`, `junYushoIdBug` early-return, `full-basho-lifecycle` + `year-of-bashos` e2e conditional recaps.
- **Slow-audit swallowers**: `circularDependency` (madge failure → pass), `knipGuard` (nonzero → pass), `orphan-audit` (never diffs generated vs baseline), `simulationInvariants:123` archive-calls unasserted, `yokozunaPresence` no health criterion, `commandSurfaceCoverage` backslash paths, `bundleBudget` missing-chunk silent pass + stale vendor-radix entries, `simulationDeterminism.perf` hashes subset only, `headless-playthrough` `as any` fixtures, `autoSimCoreLoop` 600-basho cap + magic 64, `junYushoIdBug` vacuous path.
- **Coverage gaps**: ~28/66 worker commands untested (incl. `WITHDRAW_RIKISHI` gomenfuda, `TICK_MULTIPLE_DAYS` pause loop); monoii never forced end-to-end; recruitment foreign/university pool boundaries; succession↔retirement seam.
- **Test-infra**: 10/13 worker tests mock wrong digest module (`@/presenters/uiDigest` vs real `./digestProjections`); `factoryDiscipline` regex evaded by `makeXWithY`/`buildX`/inline `as` literals; ~50 `generateInitialWorld` calls in unit tier.
- **Scripts/tooling**: `audit-orphans` scanDirs omits `calendar/`; `emitNarrativeModules`/`analyzeNarrativeDeps` stale codemods (would corrupt boutNarrative if run); root configs untyped+unlinted; `components.json` stale; `eslint.config.js:158` dead holiday exception; `bench-pipelines` S4 can't fail; `verify-training-decay` no exitCode; `purity-lint` checks `.set` not `.delete`; ~15 stale `Usage:` paths; README stack claim; index.html Lovable leftovers; `audit-orphans` `quickSave`/`advanceDay`/`getRikishiBashoStats` etc. confirmed dead.
- **Docs drift**: CLAUDE.md "16 slow tests" (actual 17); `prestige.ts` header path; `check-jsdoc` advertises unimplemented check #3.

## Verified NON-issues (disproven)

- `planOutcomes.ts` `world.rivalriesState?.pairs` — correct field (rikishi-level `pairs` vs heya-level `heyaRivalryPairs` both real).
- `calendar.currentWeek` — real field, synced to `world.week` via `phase00_preflight.ts:50` (dual-storage, consistent).
- `applyImpacts`/`applyImpactToGameState` — NOT dead (2 test callers); classified test-support.
- All 4 `resolveBout` call sites — correct positional-arg usage.
- `MatchSchedule.reasons` — correctly absent by design (projection contract).
- Exhibition event category filters, injury filter, ActionQueue/Sponsor dispatch — real paths.
- Zero `as any` in production code (2 grep hits were comments); ~15 `as unknown` at legitimate migration/codec/cast sites.
- Zero `Math.random`/`Date.now` in engine tick/narrative/bout batches.
