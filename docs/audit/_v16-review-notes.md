> **STALENESS NOTICE:** grep/regex findings in this document are point-in-time measurements at the cited commits. Re-run the commands before citing them later.

# v16 Consolidation — Review Working Notes

Base HEAD: `2bfc438f`. Convention: each finding gets severity · `file:line` · evidence. Findings are only recorded after personal re-confirmation of agent flags.

## Phase 0 baseline (measured 2026-11-02)

| Gate | Result |
|------|--------|
| `bun run type-check` | ❌ RED — 1 error: `overrideConsumer.test.ts(175,39) TS2339 reasons` |
| `bun run lint:strict` | 0 errors / 37 warnings (all react-refresh in `src/app/routes.tsx`, pre-existing) |
| `bun run build` | ✅ ~29s |
| `bun run test` (fast) | ✅ 1005 files / 9,302 pass / 1 skip |
| Orphan audit | 239 unreferenced exports + 9 unticked services (~+1 vs v15's 247) |
| Determinism greps | ✅ clean — `Math.random`/`Date.now` comment-only; `new Date` only in deterministic calendar math (`calendar.ts:250`), ISO parse (`formatters.ts:25`), save-metadata (`utils/Logger.ts:51`, `MigrationService.ts:55`) |
| `as any` / `as unknown` | 0 / ~15 (unchanged from v15; the two `as any` grep hits are comments) |

## Phase 1 — exhaustive read log

Batches tracked in `_v16-file-coverage.md`. Findings below.

### Findings

(pending — appended per batch)

### Batch ledger

(pending — agent id → file range → files read → findings refs)

## Direct-read findings (priority interleave — files changed since v15)

- **N1 (DEBT)** `src/engine/calendar/schedule.ts:230` — `scheduleJuryoWithCrossover` derives `day` from `basho.day ?? 1`, ignoring the caller's explicit `day` param (boutId stamp, needsScheduleForDay, seed all keyed to basho.day). Consistent during normal play (basho.day tracks the current day) but silently wrong if scheduling a future/catch-up day. Verify callers; unify on explicit param.
- **N2 (DEBT)** `package.json` — `three@0.186.1` vs `@types/three@0.178.1` version skew from the dependabot consolidation.
- **N3 (NOTE)** `bun run test` reports vitest v5.0.3 while package.json declares 5.0.5 — node_modules drift; `bun install` before final gates.
- **N4 (NOTE)** Dual week counters: `world.week` mirrors `world.calendar.currentWeek` (written via `phase00_preflight.ts:50` worldField). Consistent by construction; ~153 `world.week` vs ~30 `calendar.currentWeek` readers. Not a bug; consolidation candidate.
- **N5 (NOTE)** `schedule.ts:100` — `activeDivisionRoster` computed before the `needsScheduleForDay` early-return; wasted work on non-scheduling days only (cosmetic).
- **planOutcomes.ts `.pairs` read CONFIRMED CORRECT** — `RivalriesState` has both `pairs` (rikishi-level, required, aId/bId) and `heyaRivalryPairs?` (heya-level, heyaAId/heyaBId). Not the removed flat field.

## Phase 2 — per-item verdicts

| Item | Verdict | Evidence |
|------|---------|----------|
| PR #1171 mason | **DISPROVED-as-redundant** — correct fix, strict subset of #1173 | Deletes the same `reasons` line at overrideConsumer.test.ts:175 as #1173, without the contract doc |
| PR #1172 bolt | **APPROVED — land npcAIWorkers.ts hunk only** | Equivalence: `Array.sort` stable → desc `[0]` = first-max on ties; strict `>` loop = first-max. Its test-file hunk is the union-removed line → drop |
| PR #1173 scribe | **APPROVED — land doc + line removal** | `MatchPairing.reasons` at `MatchmakingPhases.ts:56`; stripped by projection at `schedule.ts:151-157`,`:272`. Doc wording literally true |
| bard-milestone-flavor-* | **DISPOSED — content on main, delete** | New narrative lines present in post_bout.json (2 hits)/pre_bout.json (4 hits) via `6e95455a` (#1157); tip = bookkeeping commit |
| bolt-fix-set-allocation-* | **DISPOSED — content on main, delete** | Manual `ozekiLeft` loop present at `planOutcomes.ts:225-232` via `a420161b` (#1169) |
| bolt-optimize-npc-deduplication-* | **DISPOSED — content on main, delete** | seenIds dedup loops present at `phase01_week_npc_ai.ts:284-291`,`359-366` via `3d67ca30` (#1154) |
| bolt-optimize-rival-heya-lookup-* | **DISPOSED — content on main, delete** | Single-pass max-heat loop present at `schedule.ts:340-351` via `2a07ef80` (#1158) |
| scout/fix-faction-pressure-id-* | **DISPOSED — obsolete, delete** | Tip commit `6bd74dfb` is empty ("Close PR as obsolete"); v15 disproved the fix — `startsWith` on main is superior |
| scribe-document-schedule-helpers-* | **DISPOSED — content on main, delete** | Contract docs + `day<1` guard present at `scheduleHelpers.ts:96-121` via `875c8cfc` (#1155) |
| polish/stable-not-found (local) | **DISPOSED — landed as `8665cec2`, delete** | EmptyState + 'Stable not found' at `StablePage.tsx:52-69`; `repairInfrastructure` preserved at :31,:80 |
| Comments review | **COMPLETE — all boilerplate** | 0 review comments / 0 non-empty reviews on #1171-#1173 and closed PRs #1153-#1158/#1169-#1170; only google-labs-jules auto-comments |

## Agent batch: tests/slow + perf + e2e (28/28 files) — verified findings

- **V16-F01 (BUG)** `tests/slow/audit/circularDependency.test.ts:18-27` — swallowed `execAsync` failure: if `npx madge` crashes/is unreachable, `stdout=""` → `circles=[]` → PASSES. Tool-failure-vacuous. VERIFIED by reading lines 10-30.
- **V16-F02 (BUG)** `tests/slow/audit/knipGuard.test.ts:13-37` — same class: knip non-zero exit on crash produces no `src/`-prefixed lines → PASSES silently. VERIFIED.
- **V16-F03 (BUG)** `tests/slow/audit/orphan-audit.test.ts` — never diffs a fresh audit against `.windsurf/audit/baseline-orphans.json`; drift gate only validates the committed baseline. New orphans pass everything until manual regen. VERIFIED (agent read whole file; baseline comparison absent).
- **V16-F04 (BUG)** `tests/slow/engine/banzuke/yokozunaPresence.test.ts:88-101` — 12-basho sim computes `bashoWithoutAnyYokozuna`/`bashoWithoutHealthyYokozuna`, console.logs a report, asserts only `totalCountByBasho.length === 12`. Zero yokozuna for 2 years passes. VERIFIED.
- **V16-F05 (BUG, latent Windows)** `tests/slow/audit/commandSurfaceCoverage.test.ts:42-48` — `findFiles` returns `join()`ed paths → backslashes on Windows → `rel.startsWith("engine/worker/")` + `rel === "engine/worker/types.ts"` never match; worker exclusion silently inert on Windows. Dormant today (unquoted handler keys). VERIFIED — we run ON Windows.
- **V16-F06 (BUG)** `tests/slow/audit/bundleBudget.test.ts:44-48` — missing chunk → early `return` → PASSES. Renamed/removed chunks never fail. VERIFIED.
- **V16-F07 (DEBT)** `tests/slow/engine/archival/simulationInvariants.test.ts:123-132` — "full records are archived" asserts only `expect(finalWorld).toBeDefined()`; docstring honestly admits thin scope + delegates to unit tests — title still oversells. Downgraded from BUG.
- **V16-F08 (DEBT)** `tests/slow/engine/banzuke/yokozunaPromotionAutoSim.test.ts:27-35` — title promises per-sekitori careerHistory each basho; asserts `historyLen >= 1` w/ fallback.
- **V16-F09 (DEBT)** `tests/perf/` — `tournamentSimulatorPerf` has zero timing; `yokozunaPromotionAutoSim.perf` title says 12 basho, config uses 18; `simulationDeterminism.perf` checksum covers ~6 scalars only.
- **V16-F10 (DEBT)** `tests/e2e/` — pervasive `waitForTimeout` fixed sleeps (helpers.ts ~15 sites), CSS-coupled selectors `.space-y-6 .grid .cursor-pointer`, headline assertions inside `if (onRecap)` conditionals (full-basho-lifecycle:196-218, year-of-bashos:405), autosave race wait (reload-restore:20), dead helper `waitForAutosaveWorld`, `readAutosaveWorld` reads wrong store (localStorage vs IDB).
- **V16-F11 (DEBT)** `tests/slow/audit/lintStrictGate.test.ts:49-59` — stale `eslint-disable` comments that suppress nothing pass undetected (`reportUnusedDisableDirectives` absent from eslint config).
- **V16-F12 (NOTE)** `tests/slow/audit/orphan-audit.test.ts` — injects `__audit_*` fixture dirs into real `src/engine/utils/`; a mid-suite crash leaves them in the source tree.
- **V16-F13 (NOTE)** `tests/slow/engine/simulation/autoSimCoreLoop.test.ts` — 600-basho cap is likely the suite's dominant cost; `daysSimulated === 64` magic constant.
- **V16-F14 (NOTE)** CLAUDE.md doc drift: says "16 slow" files; 17 exist (determinismDoubleRun/missionDeterminism newer). More drift expected in test counts (986/9,127 vs actual 1005/9,302).
- Good gates confirmed: determinismDoubleRun + engineReviewerGate propagate exit codes; year-of-bashos genuinely thorough.

## Agent batch: tests lifecycle+recruitment+training+generation+kesho+media+shikona+almanac (83 files)

Dominant defect class: **vacuous/name-mismatched assertions** + fixture debt. Verified-class findings (spot-checked by reviewer where cited):
- **V16-F15 (DEBT)** Vacuous tests: `PrizeDistribution.test.ts` (count≤3 tautology), `BashoManager.test.ts` (conditional asserts), `effortLimits.test.ts` (self-assignment assert), `shikona.test.ts` legacy-frequency test never compares frequencies, `tsukebitoPlayerControl.test.ts` silent early-returns, `BashoHistory.test.ts:45-76` toBeDefined-only.
- **V16-F16 (DEBT)** Silent-skip fixtures should throw instead (agent items #6).
- **V16-F17 (DEBT)** Fixture duplication: 3× tsukebito set/clear files, duplicated perceived-bidding files, hand-rolled `as any` Staff/Rikishi/world literals vs MockFactory (`scoutMissions.test.ts:11-30`, `maezumo.test.ts:5-24`, `weightJourney.test.ts:7-27`, `TrainingService.test.ts:14-33`), constants copy-pasted from source, ~36 `generateInitialWorld` calls.
- **V16-F18 (DEBT)** Mock-shape mismatches that silently diverge: `yokozunaPromotion.test.ts:58` `events: []` vs real `{version,log,dedupe}`; `checkYokozunaPromotions.test.ts:42-51`, `retirementNarrative.test.ts:22-25` `as unknown as WorldState` literals.
- **V16-F19 (DEBT)** `retirementColdArchive.test.ts:11-24,56` — `__forceRetire` mock hack + 50ms real sleep (timing-dependent).
- **V16-F20 (DEBT)** `poorEyesightQuirk.test.ts:16-22` — inert 100× retry loop (assignQuirk doesn't override existing).
- **V16-F21 (NOTE)** Succession↔retirement interaction seam untested in-batch (successionTriggers covered elsewhere).
- **V16-F22 (NOTE)** `runRetirements.founding.test.ts:52-63` — seed-shopping coupled to internal RNG labels (fails-loud, acceptable); `HeyaBrandGenerator.test.ts:140-158` shared mutable fixture; `replacementLoop.test.ts` 12-cycle sim in unit tier (timings-budget watch); `worldgenDeterminism.test.ts` asserts resetCache-called not byte-identity (guards V14-B09).
- Confirmed clean: seeded RNG everywhere, zero Math.random/Date.now/window abuse, Map-based trainingState mocks correct.

## Agent batch: engine core+worker+persistence (32/32) — VERIFIED top findings

- **V16-F23 (BUG, latent)** `ImpactResolver.ts:346-361` — `rikishiFromHistorical` deletes `historicalRikishi` entry BEFORE the summary check; `RetiredRikishiSummary` entries are dropped from both maps while `unretireRikishi` still pushes `activeRikishiIdsToAdd` → dangling ref + record loss. Zero prod callers today (test-only) but armed. VERIFIED lines 348-360.
- **V16-F24 (DEBT)** `SerializationService.ts:54-79` — `serializeBashoState` drops `boutMetrics` (accumulated per-bout, consumed by `banzuke/publish/performance.ts`), plus `isExhibition`, `exhibitionName`, `schedule`, `results`, `currentDay`, `id`, `name`; deserialize force-sets `isActive: true`. Mid-basho save/load loses bout metrics → degraded BashoPerformance. `NON_PERSISTED_WORLD_FIELDS` gate can't catch (inside SerializedBashoState). VERIFIED.
- **V16-F25 (DEBT)** `ImpactBuilder.ts:508-516` — `merge()` re-queues events but omits `causalEventId` → causal links dropped through builder merges.
- **V16-F26 (DEBT)** `worker/commands/recruitment.ts:90-95` — `SET_SCOUTING_INVESTMENT` → `setScoutingInvestment` mutates `rt.world` in place (scoutingStore side-effects) bypassing ImpactBuilder. VERIFIED.
- **V16-F27 (DEBT)** Direct world writes bypassing impact pipeline: `commands/heya.ts:206-216` (SET_KESHO_CONFIG — `customKeshoConfigs` not in WritableWorldFields so it CAN'T go through updateWorldField today), `commands/meta.ts:63,168` (pendingExhibitions), `heya.ts:108` + `governance.ts:76-92` (mediaState spread).
- **V16-F28 (DEBT)** `saveload.ts:84` — timestamp fallback reuses previous save's stamp (semantically wrong; all callers pass real stamps today); `quickSave` zero prod callers.
- **V16-F29 (DEBT)** `ImpactResolver` shallow entity merge vs `updateRikishiNestedField` — `h2h[opponentId]` partials replace whole subtree across builders (latent; prod uses single-level fields).
- **V16-F30 (NOTE)** `world.ts` `BashoState.currentDay` write-only dead field; `RNGRegistry.ts:55-58` duplicated system name in seed label + `getTrainingRNG`/`getScoutingRNG` cadence on `calendar.currentWeek` vs `world.week` elsewhere; `retireRikishi` DEFAULT_START_YEAR fallback; `governance.ts:28` misleading narrowing cast; `digestProjections.ts:214` drains `world.rng` if ever set; electronArchive unsanitized ids in fs paths + awards path divergence.
- Command-surface: all ~66 EngineCommand types have handlers. Confirmed-dead exports unchanged per baseline.

## Agent batch: components basho+dashboard+rikishi (110/110) — top findings

- **V16-F31 (BUG)** `dashboard/YushoRaceWidget.tsx:41,45` — `navigate({to:"/rikishi", params:{id}})` — route is `/rikishi/$rikishiId`; param must be `rikishiId` not `id`. Broken navigation on every contender click.
- **V16-F32 (BUG)** `rikishi/RikishiGlobalCup.tsx:23-30` — "Tournaments" stat uses identical filter as "Championships" (`championId === rikishiId`) → counts titles, not participations.
- **V16-F33 (BUG)** `dashboard/DashboardColumns.tsx:192` — renders literal quotes: `"FATIGUE LEVELS"` in JSX text.
- **V16-F34 (BUG)** `basho/ScheduleSections.tsx:111,129` — `{east?.name || match.eastRikishiId}` — `Rikishi.name` usually unset; falls back to raw internal IDs. Should use `shikona`.
- **V16-F35 (DEBT)** Dead props/exports: `MatchDayViewer` unused prop surface; `RikishiPageSections.tsx:195-197` three career sections passed `undefined` (can never render); `selectHeadlineIndex`, `getNarrationLines` (+duplicated fallback strings in feedModel), `getH2HRecord`, `useKimariteDistributionData` unused.
- **V16-F36 (DEBT)** `SponsorRecruitmentWidget.tsx:22-29` local `RECRUITMENT_COSTS` duplicates canonical `SPONSOR_RECRUITMENT_COSTS` (constants/engine/economic.ts:255) — drift trap.
- **V16-F37 (DEBT)** `computeStandingsEvolution`/`BashoStandingsEvolution` — shikona used as data key + React key → collisions on shared shikona; `YushoRaceWidget:104-107` discards real losses before sort; `BanzukeWidget:124-129` ignores east/west at equal rank.
- **V16-F38 (NOTE)** `PreBashoAssessment.tsx:117,124` reads underscore-internal `world._preBashoAssessment`/`_interimDaysRemaining` directly; `BoutNarrativeModal` double onOpenChange; `replayRuntime.ts` fixed 800px canvas; stale header paths in boutReplay files; ~6 sites at exactly 0.15em tracking (at-limit, compliant); `FinancesWidget` SCREAMING risk label (honest data, tone violation).
- Verified NON-issues: exhibition event category filter, injury filter, ActionQueue/Sponsor dispatch paths real; zero `as any`/`as unknown` in the 110 files.

## Agent batch: tests/unit/components A (72/72)

- **V16-F39 (DEBT)** Vacuous/mislabeled: `HolidayDialog.test.tsx:72-79` zero assertions; `AdvisorPanel.test.tsx:31-64` "sorted by priority" never asserts order; `MatchDayViewer.test.tsx:136-156` sort order unverified; `sonner.test.tsx` near-vacuous + duplicated matchMedia shim; `KihakuStatRow`/`OfficialsPanel`/`TsukebitoAssignmentPanel` prop-echo tautologies (interaction fns never invoked); `KenshoManagementWidget.test.tsx:77-81` `{}`-as-WorldState not the real null path.
- **V16-F40 (DEBT)** Factory-gate evasion: `makeWorldWithBasho`/`buildWorldStub` escape `factoryDiscipline.test.ts:162-163` name-enumerated `LOCAL_FACTORY_RE` — regex only catches exact tokens; `makeXWithY`/`buildX` invisible to it.
- **V16-F41 (NOTE)** `SubNavTabs.test.tsx:39` mockLocation.pathname never reset (order hazard); `CareerLine.test.tsx` filename↔component mismatch; `primitiveTokens`/`sidebarLayout` are fs-scan contract tests misplaced outside meta/.
- Clean: no stubGlobal/window redefine, no snapshots, no Math.random, strong honesty-regression family (stableWidget.honesty, infrastructureDashboard.honesty, boutCardHeatBand, BanzukeReveal).

## Agent batch: tests/unit/engine/tick+worker (94/94) — top findings

- **V16-F42 (BUG×7 — tautological files)** `worker.chunk.test.ts:9-38` (re-implements threshold, never imports worker); `digest.memo.test.ts:10-66` (asserts own literals); `AcceptExhibition/BuildAcademy/EnterJungyoCommand.test.ts` (assert literal cmd objects, zero coverage); `monthlyMarket.placement.test.ts:13-23` (test-authored array); `advance.consolidation.test.ts:133-143` (type tautology + dayIndexGlobal-only equivalence); `boundary.gate.test.ts:214-234` (vacuous myosekiMarket assert); `pipelineRunner.hardening.test.ts:57-75` (snapshotWasClone always true).
- **V16-F43 (DEBT — command coverage gap)** ~28 of 66 COMMAND_HANDLERS lack ANY handler-path test: incl. WITHDRAW_RIKISHI gomenfuda side-effect (heya.ts:30-44) and TICK_MULTIPLE_DAYS pause/halt loop (lifecycle.ts:120-160) — the two most bespoke bodies untested. Full list in agent report.
- **V16-F44 (DEBT — dead digest mocks)** 10/13 worker test files `vi.mock("@/presenters/uiDigest")` but runtime.ts:11 imports from `./digestProjections` → mock never intercepts; real BardEngine digest runs in tests. Only engine.worker.test.ts:49 mocks right module.
- **V16-F45 (DEBT)** Copy-paste handler re-implementation instead of dispatch: `exhibitionCommands.test.ts:62-92`, `holidayCommand.test.ts:67-108`, `governanceMediaCommands.test.ts` (33 lines, one weak assert).
- **V16-F46 (NOTE)** `orchestrator.clone.test.ts` can't detect its named regression; `phase05_exhibition.gating.test.ts` tests a test-local helper not the phase; `clearQueryCaches.weekly.test.ts` never inspects the cache; `dead-service-integration.test.ts:91-97,190-199` conditional asserts that can vacuously pass; sendCommand un-awaited in digest tests (fragile); `engine.worker.scoutCandidate.test.ts:92-95` invalid pool literal hidden by cast; RETIRE_RIKISHI ownership gate lacks negative case; ~33 generateInitialWorld calls in unit tier (legal but heavy); `phase06.singlePass.test.ts:40-48` asserts >0 not all-ages; `pipelineRunner.legacyRemoval.test.ts:36-47` title contradicts pinned behavior.
- Clean: zero Math.random/Date.now/subprocess/window-abuse in the batch; core phase tests genuinely behavioral.

## Agent batch: engine/tick (55/55) — VERIFIED BUGs

- **V16-B01 (BUG)** `phase01_basho_bouts.ts:102-124` — `PASSTHROUGH_FIELDS` omits `governanceLog` and no heya-entity diffing. `resolveBout→applyOfficiating→reportScandal` (hansoku/yaocho) writes `updateHeya({scandalScore})` + appends `governanceLog` — both discarded into throwaway `currentWorld`. Scandal events/headlines survive but `scandalScore` never rises and `governanceLog` never gets the ruling. VERIFIED.
- **V16-B02 (BUG)** `phase01_week_governance.ts:45` — `world.week === ELECTION_WEEK(52) && world.year % 2 === 0` compares a constant against a monotonic global week counter → elections fire exactly once ever (week 52). Should derive week-of-year or use modulo. VERIFIED.
- **V16-B03 (BUG)** `phase_pre_basho_assessment.ts:38-51` — unreachable dead code: requires `pre_basho` + `_interimDaysRemaining ∈ [7,14]` but preflight transitions banzuke_reveal→pre_basho at ≤7 and it only decreases. NPC auto-kyujo + triggerPreBashoJournalism can never fire.
- **V16-B04 (BUG)** `phase06_yearly_boundary.ts:191-199` — `age = world.year - r.birthYear` uses pre-increment year (input world is always old year) → rikishi.age perpetually 1 year stale. VERIFIED.
- **V16-B05 (BUG)** `phase01_week_health.ts:74-79` — NPC injury recovery multiplied by `activeModifiers.recoveryMultiplier` which `phase02_context.ts` derives solely from the PLAYER heya's facilities/nutrition. Every injured NPC heals at the player's infra rate; own facility ignored. VERIFIED.
- **V16-F47 (DEBT)** `phase06_narrative.ts:54-112` — `deltas.injuriesSustained`/`statChanges`/`revenue` branches dead (no producers write them); `batchAdvanceCalendar` rollover code unreachable (safeBatch pre-capped); `phase01_week_rivalries.ts:45-50` misleading comment (prunes, not just skips decay); `phase01_daily_economy.ts:29-32` charges per-rikishi diet but `phase01_daily_welfare.ts:54-56` applies only heya diet effects (pays premium, gets austerity); `phase01_week_recruitment.ts:48-52` elapsedWeeks vs hardcoded INTERIM_DURATION_DAYS=42 can never open window on short interims; `advanceWithGates.ts:41` hardcodes 500-day cap vs MAX_DAYS_ADVANCE=365; two interim lengths coexist (fixed 42 vs getInterimWeeks); `phase01_daily_welfare.ts:51` descriptor RNG omits world.seed → same rolls across differently-seeded worlds.
- Confirmed clean: zero Math.random/Date.now in tick/; endBasho never called by tick; boundary accumulation/clearing correct.

## Agent batch: tests systems+simulation+world+loop+ai+agents+rikishiAgency (91/91)

- **V16-F48 (BUG — whole-file tautologies)** `AutoSimYokozunaCheck.test.ts` (AutoSimService never imported; reimplements check inline), `TournamentSimulatorWalkover.test.ts` (walkover fns reimplemented; "fixed" behavior hardcoded), `isKyujoReset.test.ts:95-137` E.5-E.8 (literal asserts + inline reimplementation), `ai/types.test.ts` (literal field asserts), `NarrativeService.getStatLabelForValue` band tests (pin impl's own decomposition).
- **V16-F49 (BUG)** `schedule.test.ts:98-126` "respects heya block" — r1-r4 never inserted into `world.rikishi` → empty pool → zero assertions execute. The only stablemate-pairing regression guard is vacuous. VERIFIED vs my read.
- **V16-F50 (DEBT)** `endBasho.test.ts` 9.1 named-regression untested (admits can't verify call count); `WelfareCalculations.test.ts:315` `not.toContain(/regex/)` dead assert (RegExp never equals string); conditional-assert family (BloodlineService:59-62,86-89, RivalryService:169-185, autoSim.yearBoundary:31-34, staffGeneration:93-112 silent-return probes, phase06_narrative dead guards).
- **V16-F51 (DEBT)** `worldCircuit.test.ts:110-139` — 20× generateInitialWorld in a loop (~heavy); `opponentModel.test.ts:99-115` title says "push" asserts "trick" (name or expectation wrong); `governanceAgent.test.ts:23` off-enum `governanceStatus:"good"`; `requests.test.ts:51` split-world resolveImpacts hazard; `bashoSlice.integration.test.ts` mislabeled (tests engine fns directly).
- **V16-F52 (NOTE)** Recruitment-balance coverage gaps (university/foreign pool boundaries, scarcityBand effects); 3× BookmarkService test files + misplaced generation/ copy; exemplary files noted (adaptiveTorikumi, kyujoDecision, rikishiAgency, characterization goldens).

## Agent batch: tests/unit/components B + presenters (122/122)

- **V16-F53 (BUG — vacuous)** `RikishiCard.ginboshi.test.tsx` — never imports the component; asserts on own fixture literal. Zero coverage masquerading as #728 coverage.
- **V16-F54 (DEBT)** Guarded/mislabeled: `OpponentScoutingTab:175-188` mockNavigate declared never injected + vacuous final assert; `BoutNarrativeModal:240-261,263-278` tautological onClose + crash-only autoplay; `ActionQueueWidget.test.tsx` 10-line smoke file; `RequireWorld.test.tsx:17-24` mocks React's useEffect (anti-pattern); `BeyaWideRegime:41-53` "all have aria-label" asserts `some()`; `heyaUI.test.ts:577-642` vacuous constant pinning.
- **V16-F55 (NOTE)** Two same-named `buildWeeklyDigest` functions (`presenters/uiDigest` vs `engine/worker/digestProjections`) — confusion hazard; `FirstVisitHint` stubGlobal localStorage (letter-compliant); stale "expected RED" comments in careerProjections; ~15 presenter files hand-roll `as any` fixtures vs MockFactory; `WeeklyDrillPlanner` repo-hygiene fs check in unit tier.
- Clean: no window stubbing/snapshots/Math.random; memoization identity tests genuine; uiDigest edge coverage good.

## Agent batch: scripts+workflows+configs (63/63) — top findings

- **V16-B06 (BUG)** `scripts/narrative/bard-orchestrator.ts` — schema-broken vs actual `registry.json` (expects v2.2 `{registry,matrix,domains.events}`, file has `ranks,styles,kimarite`); weekly autonomous-narrative job guaranteed to crash (`archive.registry` undefined → uncaught TypeError at :238). Plus `autonomous-narrative.yml:55` has the SAME GH006 protected-push bug + no permissions block + no timeout.
- **V16-B07 (BUG)** Electron packaging: `package.json#main`="out/main/main.cjs" vs electron.vite `fileName:"index.js"` vs `main.ts:104` "../preload/preload.cjs" vs ELECTRON.md claims — mutually inconsistent; packaged app can't launch. ESM/CJS hazard under `"type":"module"`.
- **V16-F56 (DEBT)** `audit-orphans.ts:207-214` hardcoded scanDirs omits `src/engine/calendar/` — its exports never orphan-audited (explains part of the drift); recommend readdirSync minus denylist.
- **V16-F57 (DEBT)** `emitNarrativeModules.ts`+`analyzeNarrativeDeps.ts` stale codemods — hardcode beat ranges vs now-2280-line boutNarrative.ts; running them today would overwrite curated modules with garbage → delete/archive.
- **V16-F58 (DEBT)** Root configs untyped+unlinted blind spot (tsconfig.node includes only vite.config+scripts; eslint ignores *.config.*) — exactly how B07 drifted; `components.json` stale (tailwind.config.ts + src/index.css paths); `eslint.config.js:158` dead `!@/engine/holiday` exception (file moved to calendar/).
- **V16-F59 (NOTE)** `bench-pipelines.ts` S4 determinism log-only (can't fail); `verify-training-decay.ts` prints FAILURE never sets exitCode; `purity-lint.sh` asymmetric (checks .set not .delete); README.md:21 stale stack claim (React Query/Router DOM — actually TanStack+zustand); index.html Lovable leftovers; ~15 stale `Usage:` paths in script headers; perf-gate also: tee'd bench-output never uploaded, unconditional push after `|| echo`.
- **Perf-gate fix — RECOMMENDED OPTION (a):** push baseline to dedicated unprotected `perf-baseline` branch; check step `git fetch origin perf-baseline && git show FETCH_HEAD:docs/audit/perf-baseline.json`. Only option preserving V13-B02 self-heal invariant with zero new machinery (~4-line change). (b) auto-PR rejected (human in loop + GITHUB_TOKEN PRs don't trigger checks); (c) artifact sync rejected (expiry + collapses to a/b).

## Agent batch: narrative+bard+history+media+events (81/81) — top findings

- **V16-B08 (BUG)** `history/hallOfFame.ts:127,134,164` — processChampions/Technicians/IronMen use `getRikishi` (active only); retirees live in `historicalRikishi` → mid-year retirees with 3+ yusho/3+ ginoSho/30+ basho permanently skipped by year-end induction. Fix: `getRikishiAnywhere`.
- **V16-B09 (BUG)** `bard/domains/pre_bout.json:6,14` — `both_contending`/`both_struggling` render east's record as `%EAST_NAME% at %EAST_WINS% and %WEST_LOSSES%` — wrong token, prints west's losses for east.
- **V16-B10 (BUG)** `history/history.ts:91,142` — career-win milestones fire only on exact `THRESHOLDS.includes(wins)`; a ~15-win basho crossing 95→110 skips the 100-win milestone permanently.
- **V16-B11 (BUG)** `narrative/glossary/terms.ts:33` — `maegashira` termJa = "幕下" (Makushita's kanji; should be 前頭). Duplicated correctly at :201.
- **V16-F60 (DEBT)** `dramaGenerator.ts:85-99` grudge path logs rikishi-rivalry event with oyakata ids; `registry.json:152,302,327` truncated descriptions with stray escapes; `combat.json:430-437` hyphenated kimarite keys unreachable; `CrisisService.ts:63` pendingCrisis overwrite no guard; systemic event-type/category misuse (GOVERNANCE_RULING for non-rulings, FINANCIAL_ALERT for routine actions, ~7 durable duplicate headline events/heya-week); `hallOfFame/historyIndex/history` direct world mutation (contained only by clone wrapper); `NarrativeProse.ts:67-75` unknown potential → per-call warn; competing descriptor vocabularies; `historyCache` no write-path invalidation.
- **V16-F61 (NOTE)** BardEngine test-vs-prod RNG divergence (isTest bypasses LRU); MAX_LANES eviction can alter draw counts; ~10 template copy issues ("beavers away", hardcoded "coach Yamada", "Dolphins Arena" vs "Aichi Prefectural Gymnasium", real company names as kensho sponsors, invented "Isegahama faction"); `junYushoIds` dead field; descriptorBands stub returns.
- Confirmed: all narrative RNG seeded; token context resolution sound; headline named-args correct.

## Agent batch: economy+governance+recruitment+generation (69/69) — SYSTEMIC BUG CLASS found

- **V16-B12 (BUG class — stale-base rikishiIds)** `recruitment/overflow.ts:75` — each release writes `rikishiIds` from ORIGINAL heya → with overflowCount≥2 only last released id removed; deleted rikishi dangle in roster → re-triggers forever. `generation/TalentPoolMaterialization.ts:51` — same pattern for recruits; ≥2 materialized in one batch keeps only last id (invisible to getHeyaRoster + FinanceCalculator subsidy). `governance/services/governanceReview.ts:83-84` — stale-base funds: bailout loan merged then overwritten by `heya.funds + giftAmount` from pre-loan value; multi-insolvent same-ichimon → benefactor charged once while N heyas receive gifts (money created).
- **V16-B13 (BUG)** `ceremonies/dohyoIri.ts:38` — seed `${worldSeed}::dohyo-iri` lacks rikishi id → every yokozuna gets identical style per seed. Same at `yokozunaAttendants.ts:40`.
- **V16-B14 (BUG)** `MyosekiTradingService.ts:105` — purchaseMyoseki debits buyer heya, never credits seller (sale proceeds destroyed); buyerId semantics drift (heyaId vs oyakata/person id between buy paths).
- **V16-B15 (BUG)** `YouthAcademyService.ts:313` — `abilityGain = floor(pointsGained/10)` on a single week's ~1-4 points → ability effectively never rises; should derive from accumulated devPoints.
- **V16-B16 (BUG)** `economy/mergers.ts:241-248` — merger fallback doesn't exclude playerHeyaId → NPC can silently merge INTO player's stable (funds/facilities/roster mutated without consent).
- **V16-B17 (BUG)** `GlobalCupService.ts:222` — `wasPlayerChampion: winnerId === world.playerHeyaId` compares rikishiId to heyaId → always false.
- **V16-F62 (DEBT)** `ScandalService.ts:121` runElections wipes probation/sanctioned to good_standing; issueGovernanceRuling no idempotency guard (worker cmd doesn't check resolved); `YouthAcademyService:509` sub-¥5k investment deducts funds for 0 budget; `scoutingStore.ts:60-64` ensureScoutingTable mutates world directly inside impact fns; `staff.ts` career-phase boundaries off-by-one generateStaff vs tickStaffYear + fire→rehire same role regenerates identical uuid/name; `CandidatePoolService:306-319` signed watchlist entries never removed + surfaced to UI; `YokozunaService` promote on single 14-win basho (doc says 2 consecutive); `KihakuService` metric'd 8-7 scores 0 < default 50; `infrastructure` buildTimeBasho ignored (all complete at yearly boundary); facilities/staff weekly+monthly double-charge model to confirm; `selectBenefactor` too narrow → bailouts rare; `anonymous_patron` threshold=100 always churns; myoseki lease: no affordability check + income to nobody + unbounded history + duplicate base-price constants.

## Agent batch: components stable+layout+ui+economy+training+menu (148/148)

- **V16-B18 (BUG)** `pages/EconomyPage.tsx:97`+`BailoutCard.tsx:40,47` — `canRequestBailout = funds < 0` but engine requires `funds < -¥5M` (LOAN_ISSUANCE_THRESHOLD) → enabled-but-no-op button −¥1..−¥5M.
- **V16-B19 (BUG)** `layout/EventLogSections.tsx:105` — `"text-primary".replace("text-","text-opacity-80 ")` → invalid class; every category icon renders inherited color.
- **V16-B20 (BUG)** `stable/facilityMeta.ts:77` — displayed recovery formula `0.9+level/166` (−10%…+50%) vs engine `0.8+(level/100)*0.4` (−20%…+20%) — inflated ~2.5× at max.
- **V16-B21 (BUG)** `economy/FacilityROIChart.tsx:24-66` — invented `statGain()=1+level/100` per-point efficiency axis (engine grants no such gain) + hand-copied cost fns duplicating facilities.ts (drift).
- **V16-B22 (BUG)** `SponsorshipHub.tsx:37-43`+`SponsorshipHubSections.tsx:166-172,213` — 3 dead controls (Industry Breakdown, per-sponsor Details, ATTRACT NEW PATRONS — no onClick, player-visible on StablePage).
- **V16-B23 (BUG)** `stable/StablePageTabs.tsx:72-84,135-146` — RosterTab Card onClick navigates to /rikishi/$id; nested MentorAssignmentPanel Select/Remove without stopPropagation → clicking assign/remove ALSO navigates away.
- **V16-B24 (BUG)** `menu/HeyaPreviewSections.tsx:57` — `Established {heya.id.slice(0,4)}` renders id prefix as establishment mark — fabricated chrome.
- **V16-F63 (DEBT/NOTE)** `FacilitiesManagementPanel` pendingUpgradeRef written-never-read + toast cost from fund-delta misreports; `WelfarePanelSections` identity math; `TopNavBarSections` cosmetic DAY_PHASES as real date; `InjuryRiskHeatmap` UI-invented risk formula as "Risk Score"; `WeeklyDrillPlannerSections` always-on INTERIM WEEK badge; `GlobalCupSections` hardcoded venue + PRIME VISIBILITY badge; `MobileEventLog`/`FloatingShortcuts` overlapping FABs; `StableStatsTable:266` "Injured — undefined"; `SuccessionModal:125` undefined career wins; widening `& {}` casts on Heya fields; `progress.tsx` no clamp >100; `MainMenuFooter` DOM-coupled archive trigger; `MainMenuSections` in-place sort mutation; page-shell doc advertises nonexistent HeroDossier/SideIndicator.
- Clean: all sendCommand dispatches wired; costs match constants; no `as any`/`Math.random` in batch.

## Agent batch: tests/unit/engine/bout (101/101) — top findings

- **V16-F64 (BUG — vacuous)** `counterActivation.test.ts` whole file (never calls tickPushBattle/tickBeltBattle, write-then-readback asserts); `boutResultApplier.absences.test.ts:278-287` (re-implements kyujo predicate, literal tautology); `boutResolver.test.ts:147-163` (asserts INPUT rikishi.momentum — resolveBout doesn't mutate inputs); `tachiaiCounterBonus.test.ts:224-230` (RNG re-created each iteration → 0-or-50 pseudo-distribution); `boutResolver.officials.test.ts:92-97` `if(result.monoii)` guard; `boutNarrative.stats/yusho/careerPhase/unified/rivalryEnrichment` families (name claims trigger, body asserts only pbpLines defined or conditional guards); `forceDifferentialTies` (named claim uninspected); `boutNarrative.postBout` T16.1 no assertions; `preBout.test.ts` filter on rendered text for template paths (always-empty set).
- **V16-F65 (DEBT)** Static-table tautologies (tacticProfiles, nekodamashi, counterTactic halves); `boutAI` enum-membership asserts; heavyweight snapshots (boutResult 654-line, physicsTrio ~120 float entries, golden narrative) — golden-master intent OK but float noise unreviewable; `boutResultApplier.test.ts` ~700 lines duplicated inline fixtures evading factory gate; h2h shadow merge re-implementation; seeded-outcome-dependent asserts (kinboshi, boutAI:104); `generateInitialWorld` in officials tests (legal but heavy); monoii never forced end-to-end.
- POSITIVE: all 37 resolveBout call sites audited — correct positional-arg usage everywhere (past false-positive class absent); kinboshi.pipeline exemplary; distribution tests (terminalKimarite, positionInvariance, tacticWinRate) are the right pattern; zero nondeterminism/window-abuse in batch.

## Agent batch: lifecycle+shikona+training+legacy+health+keshoMawashi+welfare (56/56)

- **V16-B25 (BUG)** `retireeOyakataConversion.ts:144` — every accomplished retiree DEPOSES the sitting oyakata unconditionally (no vacancy check/removeOyakata/DynastyRecord); if foundStable fires, old heya keeps oyakataId pointing at departing oyakata; passes stock name as person name.
- **V16-B26 (BUG)** `PrizeDistribution.ts`+`concludeBasho.ts:136` — shallow `economics` merge: sansho+yusho winner loses sansho cash; multi-sansho winner banks only last prize.
- **V16-B27 (BUG)** `InjuryService.ts:225,278` — bout-injury seed `bout::id::week` → identical roll per week (2-4%/week not per-bout, biased to first bout of week); early return when loser injured makes winner elevated-risk path unreachable.
- **V16-B28 (BUG)** `retirementCheck.ts:47` — seed has no year/week → `rng.next()` constant per rikishi → probabilistic retirement checks binary (first check or never), NPC monthly evals identical forever.
- **V16-B29 (BUG)** `rankRules.ts:54-61` — sekiwake/komusubi/maegashira unmapped → "rookie" tier (wrong maxLen/prestigeChance/bias); `generateShikona.ts:49` same `includes("makuuchi")` miss → sekitori get 0.3 not 0.6 legacy prob.
- **V16-B30 (BUG)** `harmony.ts:60-81` — iterates `heyaRivalryPairs` looking for rikishi fields → rivalries factor always 0 (+5 constant); intended data in `rivalriesState.pairs`.
- **V16-B31 (BUG)** `DynastyService.ts:201-349` triggerSuccession: no removeOyata predecessor (accumulate forever), bypasses retireRikishiFully cascade (no events/cold-archive/leaderboard cleanup), no myoseki release.
- **V16-B32 (BUG)** `BashoHistory.ts:365-416` checkYokozunaPromotions reads historyIndex before current basho indexed → deliberations lag one basho.
- **V16-B33 (BUG)** `DynastyService.ts:89-97` — summarized (isSummary) successor → empty impact forever; trustee fallback never runs since eligible.length>0.
- **V16-B34 (BUG)** `SparringService.ts:452` — `ceil(delta/4)` applied to EACH of 4 stats → up to 4× intended cap.
- **V16-B35 (BUG)** `retirementNarrative.ts:42-48` — highestRank sort order misses lower divisions → peak rank = debut rank for sub-maegashira careers.
- **V16-B36 (BUG)** `RegistryService.ts:149` — career-win milestones exact-match per basho → 295→310 skips 300 (same class as V16-B10).
- **V16-F66 (DEBT)** Bonus paths bypass effective ceilings (sparring clamp 99, heritage 99, tsukebito no clamp); retirement leaves dangling mentor/tsukebito refs; `tickRikishRecovery` early-exit + `buyPhysioSession` leave stale injury fields; WeightJourney never writes weight; `assignTsukebito` biased sort-shuffle vs rng.shuffle; injured sparring partners deleted not paused; `BashoHistory.ts:234` award archive lags one basho; `rookieFactory._generateRookie` dead+latent bugs; `getHeyaBrand` dead+broken keying; myoseki "sale" narrative-only (no funds move); DynastyService doc drift (yearly not weekly); awards `isJunYusho` topCandidates[1] order bug.

## Agent batch: components non-excluded (116/116)

- **V16-B37 (BUG)** `ceremony/HoFInductionCeremony.tsx:92` — `StableName id={inductee.rikishiId}` links to `/stable/<rikishiId>` — broken nav.
- **V16-B38 (BUG)** `governance/GovernancePoliticsTab.tsx:54-60` — "Spend 100" button burns 100 politicalCapital for ZERO benefit (hostile dead control).
- **V16-B39 (BUG)** `GovernancePoliticsTab.tsx:29,179` — `rikishiCount` sort maps to constant 0 — dead sort option.
- **V16-B40 (BUG)** `recap/RecapSections.tsx:218-228` — YokozunaDeliberation branch permanently dead (showYokozunaDelib always false) AND fabricates subject (first active rikishi, hardcoded verdict/reasoning).
- **V16-B41 (BUG)** `scouting/CompareModePanel.tsx:41-49,91-113` — prospect compare re-reads `world.rikishi.get(id)` which prospects aren't in → "Stats unavailable" + `runBestOfThree` returns {0,0} → verdict card always declares rikishi B winner 0-0 (fabricated).
- **V16-B42 (BUG)** `kesho/keshoEffects.tsx:45-127` + `keshoPatterns.tsx:19-26` — `<defs>`/patterns emitted but never referenced → all 4 embroidery styles + gradient base render nothing; `keshoEditorData` "mountain" motif missing from symbolMap → always ⭕ fallback.
- **V16-B43 (BUG, minor)** `history/LineageTree.tsx:102` — `${index+1}th` renders "2th/3th/4th Generation Ancestor".
- **V16-F67 (DEBT)** `MyStableTab.tsx:47-49` sorts band STRINGS alphabetically not strength order; `YouthAcademyPanelSections`/`AcademyInvestmentControl` hardcode 50k/100k + divergent presets; `StaffPageSections` hardcodes ¥500k vs STAFF_HIRE_COST; `RegionalHubSections` hardcodes 5 regions /5; `AlmanacTabs` "Full House" fabricated + dead HoF placeholder while real route exists; `rivalryUtils.pure.ts` duplicates RIVALRY_HEAT_BANDS; `ClickableName` unsafe id → dead `/rikishi/` link; `ExhibitionInvitationsPanel` eligibleRikishiCount counts injured/retired.
- **V16-F68 (NOTE)** TitleBar 500ms isMaximized poll; `pixelCompose:146` dead `10:10` ternary; `NarrativeCeremonyDialog` step not reset on reopen; `SettingsSections` hardcoded save version; `CrisisModal` isWorldBacked shadow; `PerceptionOverview` query-string nav; `NewGameWizard` step-count mismatch; `CompareModePanel` Date.now seed; `RegionalHubPage` void pendingExhibitions.

## Agent batch: bout+simulation+matchmaking+calendar+banzuke (82/82)

- **V16-B44 (BUG)** `matchmaking/DramaMatchmaker.ts:583-652` — applyDramaBudget swap loop is a TOTAL no-op (swap assigns whole participant sets → scoreChange always 0); only drama_* label tagging survives.
- **V16-B45 (BUG)** `calendar/schedule.ts:223-283` — makushita scheduled BEFORE juryo; scheduleJuryoWithCrossover injects makushita call-ups with no same-day-bout check → double-booked on odd days.
- **V16-B46 (BUG)** `kimariteStrategies.ts:432` ushiromotare requires `forwardMomentum < 0` (never — it's max(0,..)); `:828` ashitori requires `stamina < 0.5` on 0-100 scale → both unreachable via mid-fight selection.
- **V16-B47 (BUG)** `narrative/postbout2.ts:400-491` — mono-ii narrative rolls own outcome independent of `result.monoiiOutcome` → can narrate "reversed" when officials upheld.
- **V16-B48 (BUG)** `physics/resultBuilders.ts:89-93` — unguarded `east.combatProfile.archetype` deref → throws for rikishi without combatProfile.
- **V16-B49 (BUG)** `simulation/TournamentSimulator.ts:237-240` — shallow clone + nested `divisionRecords` mutation → caller's world mutated, second sim double-counts.
- **V16-B50 (BUG)** `ReplayMetadata.ts:103-106` — clamp01 on raw power diff → saturates at 1; <0.35 branch dead, >0.7 always fires. Needs ~margin/30.
- **V16-F69 (DEBT)** gyoji.ts:40 phantom "reversed" credit when no shimpan panel; juryo runs 7-bout logic (15-day division); narrative context.ts:140-146 M1-M4 get sanyaku career-high line; yaocho.ts:88-89 repeatedKimarite only compares lastMatch; SwissAlgorithm DOES apply rivalry-heat (stale note); dead exports buildCandidatePairs/buildPlayoffPairs/buildExhibitionPairs/greedySelectPairs.
- POSITIVE: all 4 resolveBout call sites pass tactic positionally correctly; no `.reasons` reads on MatchSchedule; zero Math.random in batch.

## Agent batch: app+lib+hooks+constants (120/120) — FIXED items noted

- **FIXED (V16-B51)** `hooks/useKeyboardShortcuts.ts:24` — `"6"` → `"/training"` (no such route → 404); now `/stable/training`.
- **FIXED (V16-B52)** `hooks/useRecruitingState.ts:62` — `foreignUsage >= 2` vs engine `FOREIGN_RIKISHI_LIMIT_PER_HEYA = 1` → UI claimed a 2nd foreign recruit legal that engine rejects; `RecruitingTabSections.tsx:139` `/2` display same. Now uses the constant.
- **FIXED (V16-B53)** `constants/ui/welfare.ts:54-75` — DIET_DISPLAY advertises ¥1k/3k/6k/10k per day; real `DIET_COSTS` = ¥350/1k/2k/3.5k (post-rebalance). Updated.
- **FIXED (V16-B31 follow-up)** `YushoRaceWidget` — `/rikishi` is a real route (roster index) but silently drops the param; now `to: "/rikishi/$rikishiId"`.
- **V16-F70 (DEBT — constants drift, ~15 families)** duplicated constant families: welfare.ts≈welfareTransitions.ts near-total dup; career milestones 3× ([100,200,300,500] vs [100,500,700,1000] vs dead MILESTONE_*); kimarite.ts≈physics.ts probability family; rivalry.ts≈narrative.ts decay/heat bands; media.ts≈mediaImpact.ts; economy vs economyExtended (STAFF_HIRE_COST 500k ×2); roster.ts≈npcStrategy RISK_*; "day 15" constant 8× incl. misspelled SENSURAKU_DAY (both dead); ELECTION_WEEK ×2; INTERIM 42 ×2; RETIREMENT_AGE 34 ×2; npcStrategy MAX_ROSTER_SIZE=15 vs roster 25/30 naming clash. Recommend consolidation pass.
- **V16-F71 (DEBT — hook drift)** `useEconomyDerived:40` hardcodes -5M (LOAN_ISSUANCE_THRESHOLD now imported there too? — hook still hardcodes; EconomyPage fixed); `useDashboardDerived:128` threshold:3 = SANCTION_THRESHOLD; `useCrisisDetection:45` ad-hoc 75 vs canonical 65/85; `useBashoPageState:125` day>=15 vs BASHO_FINAL_DAY; `useKenshoData:43` envelopes 15/10/5 match NEITHER canonical table (3 divergent sources); `useRivalriesDerived` 55/80 bands vs canonical 20/40/65/85; `useSaveLoadState:199` i<=10 vs SAVE_SLOT_COUNT; `useTrainingState:29-43` local state never re-syncs → can overwrite worker world; `useMainMenuState:98` autosave re-fires on every context identity change; `useBanzukeDerived` DIVISION_KEYS dup + dead rank sort; `useFinancesData` bypasses engineAccess + unnecessary runwayBand cast; `use-toast` 16.7min remove delay; `useEventSounds` reads log directly, max 1 chirp per N events.
- **V16-F72 (NOTE)** index.css:13 runtime Google Fonts @import (offline Electron risk); routes.tsx all-lazy vs CLAUDE.md eager claim (doc stale); useExhibitionBout fabricated mockBasho.

## Agent batch: docs+.claude+.windsurf+public+root (~170 files)

- **V16-F73 (BUG)** `README.md:21` — stack claim "React Query, React Router DOM" — neither dep exists (actual TanStack Router + zustand).
- **V16-F74 (BUG)** `index.html:11,22,25-26` — Lovable.dev scaffold leftovers: author=Lovable, og:image→lovable.dev placeholder, twitter:site=@Lovable. No manifest link despite PWA metas.
- **V16-F75 (BUG)** `.claude/CLAUDE.md:156` + `docs/TESTING.md` — stale counts (986f/9127t, 16 slow vs actual 17; career-surface missing from smoke lists).
- **V16-F76 (BUG)** `.claude/settings.json:20` — PreToolUse Math.random guard reads `$CLAUDE_TOOL_INPUT` (env var never set by Claude Code hooks → guard never fires); PostToolUse uses `bunx tsc --noEmit` vs repo tsgo `--build --force`.
- **V16-F77 (DEBT)** `docs/bard_engine_architecture.md` describes nonexistent archive.json+grammarDefinitions; `AGENT_ARCHITECTURE_PLAN.md` pre-reorg paths; `worker-command-surface.md` lists removed commands; `phase-dependency-graph.md` stale; `docs/audit/archive/v3-pr-inventory.json` mojibake; `ELECTRON.md` electron:build:mac script doesn't exist + stale routes path; `.claude/launch.json` npx vs bun; run-electron SKILL output dirs reversed; `.env.example` stale script paths; `daily_update.md` stale bot-journal; `_v16-file-coverage.md:18` lists gitignored settings.local.json; `CLAUDE.md:27` narrative/ vs bard/ contradiction.
