# V18 Consolidated Findings Registry (working document)

Source: 9-wave deep-dive of all ~1,099 src files + prior validation pass. Every entry carries wave ID + file:line evidence. Triage: **PIN+FIX** (failing test first, then fix this pass), **DEBT** (registered, not fixed), **DISPROVED**.

Baseline context (clean main): fast 9,607 ✓ | slow 77/78 (1 known fail: simulationInvariants MH-* dup ids) | type-check ✓ | build ✓ | determinism-basho byte-identical ✓ | lint/perf/e2e/year-determinism: see Phase A.1 log.

---

## CLASS S1 — Absolute `worldFields` last-wins merges (systemic)

Root: `ImpactBuilder.merge` collects impacts whose `worldFields` are absolute snapshots computed from the same stale base world; last write wins, earlier batched writes silently lost. Shared fix pattern (precedent exists): progressive per-entity resolution (`processNpcMyosekiPurchases`, `sequenceImpacts`, `SimulationRunner.runPostBashoResolution`) or composable read-current-then-write staging.

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S1-1 | `lifecycle/processRetirements.ts` + `history/records.ts` | Batch retirements: all but last active-record removal lost | PIN+FIX |
| S1-2 | `processRetirements.ts` + `legacy/LegacyService.ts` | Only last retiree's bloodline trait registers | PIN+FIX |
| S1-3 | `lifecycle/retireeOyakataConversion.ts` | Multiple merit-stock transfers lose earlier transfers/history | PIN+FIX |
| S1-4 | `legacy/DynastyService.ts` | Succession transfer vs retiree conversion clobber; ghost oyakata w/o stock | PIN+FIX |
| S1-5 | `tick/phases/phase06_yearly_boundary.ts:40-75` | Multiple succession stock transfers lose earlier changes | PIN+FIX |
| S1-6 | `HistoryService.updateAllTimeRecords` | Multiple qualifying rikishi updates → only last survives | PIN+FIX |
| S1-7 | `governance/services/ScandalService.ts:32-39` + `phase01_week_rikishi_agency.ts:57-68` | 2+ scandals same heya/week: one scandalScore bump, all-but-one headline dropped | PIN+FIX |
| S1-8 | `phase01_week_rikishi_agency.ts:71-84` | 2+ welfare escalations same heya: last `+INCIDENT_WELFARE_RISK_DELTA` only | PIN+FIX |
| S1-9 | `governance/services/governanceReview.ts:85-93` | Ichimon bailout benefactor debit reads input funds → clobbers earlier funds writes (money destroyed) | PIN+FIX |
| S1-10 | `economy/staffPosts.ts:219-245` | ≥2 staff expiries: only last removal persists → ghost `staffIds` | PIN+FIX |
| S1-11 | `events/chains/chainService.ts` applyEffects | mediaPressure `heyaPressure` read off pre-impact snapshot → batched effects lost | PIN+FIX |
| S1-12 | `economy/sponsorshipMutations.ts:241-266` | 2 koenkai upgrades same pass pick same `!active` sponsor → dup `sr_*` ids + double membership | PIN+FIX |

Mitigation precedent verified: `welfare/transitions.ts:52-69` composes one final `mediaState` — fragile special-case other producers fail to replicate.

## CLASS S2 — Missing ownership/affordability guards

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S2-1 | `worker/commands/heya.ts` — `assignMentorCmd:141`, `removeMentorCmd:150`, `setTsukebitoCmd:176`, `removeTsukebitoCmd:189` | No `playerHeyaId` guard (neighbors have it: :125,:134,:160,:169,:202). UI exposes controls on NPC stable pages (`StablePageTabs.tsx`) | PIN+FIX — guard via rikishi→heya resolution + UI read-only gating |
| S2-2 | `commands/heya.ts` — `TREAT_INJURY:48-53`, `BUY_PHYSIO:89-94`, `WITHDRAW_RIKISHI:28-45`; `commands/recruitment.ts` — `SEND_SCOUT:152-158`, `OFFER_CONTRACT:26-43`, `POACH_CANDIDATE:78-89` | Crafted command spends/mutates NPC heya resources; `physioPurchase.ts:7` doc claims player-only (false) | PIN+FIX |
| S2-3 | `commands/heya.ts` `setKeshoConfigCmd:213+` | Unguarded AND bypasses `resolveImpacts` (direct `rt.world` spread) | PIN+FIX |
| S2-4 | `components/stable/InfrastructureSections.tsx`; lenient-ruling UI; staff/medical toasts | No affordability disable → silent no-op commands; toasts claim success when `sendCommand` returns false | PIN+FIX (UI) |
| S2-5 | `components/stable/*` NPC pages | Academy/infrastructure controls appear enabled despite worker rejection | PIN+FIX (UI) |

## CLASS S3 — Contract mismatches

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S3-1 | `commands/governance.ts:80-91` `APPLY_PRESS_CONFERENCE` | Writes `mediaHeat[heyaId]`; all consumers read `mediaHeat[rikishiId]` (KenshoService:221, BashoHistory:406, projections). `heyaPressure` field exists as the heya-keyed map | PIN+FIX — write `heyaPressure` (decide during impl after reading heyaPressure consumers) |
| S3-2 | Governance/media resolution | `unresolvedRulings` (playerChoice) vs `pendingRulings` (playerSeverity) projections disagree → ruling actionable in one view after resolved in other | PIN+FIX |
| S3-3 | `matchmaking/DramaMatchmaker.ts:594-602` (B2) | Swap legality checks only `facedSet` → same-heya pairs void `avoidSameHeya` | PIN+FIX |

## CLASS S4 — Non-canonical mutations (bypass ImpactBuilder)

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S4-1 | `economy/GlobalCupService.ts:241-258` | Shallow-copies bracket, mutates shared match objects in place (unrollbackable) | PIN+FIX |
| S4-2 | `economy/economics.ts:128` | `result.kenshoEnvelopes = kenshoCount` mutates live BoutResult | PIN+FIX |
| S4-3 | `shikona/recordShikonaChange` | Direct rikishi mutation instead of ImpactBuilder | PIN+FIX |
| S4-4 | `presenters/uiActions.ts` `setHeyaDietAction` | Dead-but-harmful in-place mutation helper | FIX (delete) — trivial |
| S4-5 | `commands/recruitment.ts:90-95` + `scoutingStore.ts:60-65,185,196,267` | `SET_SCOUTING_INVESTMENT` + `ensureScoutingTable` mutate `world.playerKnowledge` in place | PIN+FIX |
| S4-6 | `simulation/TournamentSimulator.ts:315,325-333` | Non-sekitori rikishi objects shared w/ caller world mutated in place (`++` wins/losses); lower-division never get career records | PIN+FIX |

## CLASS S5 — RNG stream correlation (world.seed omitted)

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S5-1 | `events/helpers.ts` `createRngForEvent` | Label omits `world.seed` → different-seed worlds mint identical event streams | PIN+FIX |
| S5-2 | Event domains: stable facility/roster, economy finance, basho, medical | Seeds omit world.seed and/or time | PIN+FIX |
| S5-3 | `narrative/PostBashoPressService.ts` | Omits world.seed | PIN+FIX |
| S5-4 | `simulation/AutoSimService.ts:96-100,187` | `bashoSeed = seed-basho-year-name` collides when same-named basho runs twice in one year (mid-hatsu roll) | DEBT (low) |
| S5-5 | `EraDriftService.ts:143-145` | `meta-era-${year}-${tone}` unguarded same-year tone re-fire | DEBT (low) |

## CLASS S6 — ID-minting collisions (D01 family)

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S6-1 | `media/MediaEventService.ts:40-50,64` + 5 same-label callers | **V17-D01 CONFIRMED.** `MH-*` = hash of `gov::{heyaId}::{path}::{week}::{dayIndexGlobal}::{salt}`; same-label same-day mints → identical id appended repeatedly (slow suite: `MH-AEA98FF9` ×8 etc.). `ScandalService.ts:52` already salts ruling ids w/ `governanceLog.length` — pattern exists | PIN+FIX — include `headlines.length`/stable discriminator in label |
| S6-2 | `media/MediaPreBashoService.ts:22` + `phase_pre_basho_assessment.ts:42` | Label `pre_basho_{year}_{name}` week-independent; dedupe by `assessedAtWeek` only → re-assessment same phase remints identical ids | PIN+FIX (same mechanism) |
| S6-3 | `economy/MyosekiTradingService.ts:76,135` | `purchase-${id}`/`return-${id}` labels omit time/serial → identical `MT-*` on repeat tx | PIN+FIX |
| S6-4 | `economy/staff.ts:226-227` + `staffPosts.ts:178` | `staff_${heyaId}-${role}-${len+1}` reuses index after mid-list removal → `addStaff` overwrites live entity | PIN+FIX |
| S6-5 | `economy/loans.ts:129` | `loan_${heyaId}_${year}_${week}` — 2nd loan same week collides (mostly unreachable) | DEBT |

## CLASS S7 — Engine logic bugs (discrete)

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S7-1 | `hooks/useCalendarActions.ts` + `useWorkerSync.ts` + `useFlowActions.ts` | `simulateAllBouts()`+`endDay()` then immediate `TICK_DAY`; `LOAD_WORLD` deferred by `pendingTick` → worker ticks stale world, overwrites interactive bout results/tactics | PIN+FIX (HIGH) |
| S7-2 | `narrative/dramaGenerator` + crisis registry + crisis UI | Player `financial_insolvency` written to `heya.activeCrisis`; UI reads `world.pendingCrisis`; not in crisis registry → permanently stuck, `seek_pardon`/`emergency_loan` unreachable. `emergency_loan` grants ¥10M with NO loan entity | PIN+FIX (HIGH) |
| S7-3 | `calendar/schedule.ts:250-275` + `LowerDivisionSwiss.ts:399` | Juryo crossover dead code: callups appended to pool then filtered out by `division:"juryo"` → unscheduled healthy juryo get phantom kyujo absences → make-koshi/demotion (`publish/performance.ts:356`) | PIN+FIX (HIGH) |
| S7-4 | `CandidatePoolService.ts:120,168-178` + `TalentPoolMaterialization.ts:132` + `TalentPoolOffers.ts:228-241` | Player poaching non-functional: weekly `simulateNPCInterest` rebuilds suitors wiping player entry; "signed" watchlist resolutions never materialize (`finalizeSignedCandidates` only scans `talentPool.candidates`); signed entries linger forever | PIN+FIX (HIGH) |
| S7-5 | `calendar/holiday.ts:396` + `advanceWithGates.ts:40` + `commands/meta.ts:75` | `_autonomousSim` leaks into live world post-holiday; nothing un-flags; session runs autonomously (auto-resolves decisions, bypasses `day>15`) until save→load | PIN+FIX (HIGH) |
| S7-6 | `calendar/holiday.ts:46,393-439` | `delegationPolicy` never read; `"roleplay"` not a valid `_autonomousPolicy`; `endOfBasho`/`postBasho` targets unreachable (interactive-only basho termination) + day counter drifts past 15; `computeTargetDays` off-by-one | PIN+FIX (HIGH) |
| S7-7 | `calendar/holiday.ts:219-221` | `rosterOverForeignLimit`: `nationality !== "japanese"` vs data `"Japan"` → EVERY roster ≥2 trips gate; hardcodes `>1` not canonical limit/countsAsForeign | PIN+FIX (HIGH) |
| S7-8 | `persistence/SerializationService.ts:54-91` | `BashoState.id` not persisted (hardcodes `isActive:true` on load); bout seeds use `basho.id ?? "basho"` → mid-basho save/load diverges all remaining-day RNG streams | PIN+FIX (HIGH) |
| S7-9 | `bout/narrative/postbout2.ts:419,454-491` | Mono-ii narrative re-rolls outcome; announced verdict can contradict recorded `monoiiOutcome` (V16-B47 half-landed) | PIN+FIX (MED) |
| S7-10 | `bout/resolution/gyoji.ts:40` | `reversed` defaults `true` → panel-less mono-ii records phantom overturned call | PIN+FIX (MED) |
| S7-11 | `SwissAlgorithm.ts:360-371` + `LowerDivisionSwiss.ts:224-238` | Last-resort pairing forces `avoidSameHeya:false` unflagged/unlogged — JSA hard prohibition silently voided | PIN+FIX — emit bye/fusensho or tag `same_heya_forced` |
| S7-12 | `banzuke/banzukeOps.ts:227-248` + `ozekiLogic.ts:26-30` | Stale kadoban entries never cleared → re-promoted ozeki gets `consecutive=3` → instant demotion w/o grace basho | PIN+FIX (MED) |
| S7-13 | `economy/MyosekiTradingService.ts:57-115` | `purchaseMyoseki` no self-buy guard → same-heya trade destroys funds (debit applies, credit skipped) | PIN+FIX (MED) |
| S7-14 | `governance/services/myosekiMarket.ts:411-443,261-284` | `leaseMyoseki` no self-lease guard → recurring weekly self-drain | PIN+FIX (MED) |
| S7-15 | `training/TsukebitoService.ts:51-55,65-69` | Eligibility uses `rankNumber≤3`/`>10` not rank/division → wrong senior/junior sets (juryo-1 senior; sekitori "junior") | PIN+FIX (MED) |
| S7-16 | `training/WeightJourney.ts:77,119,122` | `progressKg` (from 0) vs absolute `targetKg` (~160) → unreachable; `stats.weight` never updated during journey | PIN+FIX (MED) |
| S7-17 | `simulation/TournamentSimulator.ts:198-199` | In-bout injuries never recorded (fusensho `continue` first); `majorInjury` stop dead; `result.inBoutInjury` populated but unread | PIN+FIX (MED) |
| S7-18 | `worldCircuit/WorldCircuitService.ts:63,83` | `expiresAtWeek` never enforced → unbounded `pendingExhibitions`, stale invitations permanently acceptable | PIN+FIX (MED) |
| S7-19 | `TalentPoolStateService.ts:82-143` | `reinjectToTalentPool` drops citizenship + stats, `isForeign`-only pool classification, birthYear vs maxAge age-out | PIN+FIX (MED) |
| S7-20 | `weeklyTraining.ts:156` + `CandidateBuilder` + `types/rikishi.ts:121` | Prodigy burnout dead: `isEmergentProdigy` never propagated candidate→rikishi | PIN+FIX — propagate field (feature complete) |
| S7-21 | `events/events.ts:97` + `types/events.ts:239` | `EngineEvent.day` stamped `calendar.currentDay` (1-31) vs doc "day of basho 1-15"; `bashoNumber` never assigned → `formatEventTime` B/D branch dead+wrong | PIN+FIX (low-med) |
| S7-22 | `calendar/schedule.ts:124-131,139-149` | `matchmakingOverride` one-shot favor never consumed for juryo-only requesters (early return before :148 clear) → persists into next basho | PIN+FIX (low-med) |
| S7-23 | `simulation/AutoSimService.ts:417` + `schedule.ts:230` | `days:N`→`ceil(N/15)` bashos (~N×4 days); `scheduleJuryoWithCrossover` ignores `day` param | DEBT |
| S7-24 | `worldCircuit/WorldCircuitService.ts:283,367` | Uncapped styleDrift accumulation; `candidateQualityBonus` uncapped; negative budget free | DEBT |
| S7-25 | `media/MediaEventService.ts:89-94` | Unknown `eventId` falls back to `playerHeyaId` → apologize/deny applies to player's own stable | PIN+FIX (cheap: reject unknown) |
| S7-26 | `governance/services/GovernanceService.ts:49-55` | Legacy `resolveCrisis` fallback writes sparse `welfareState` dropping live keys | PIN+FIX (cheap) |
| S7-27 | `officials/GyojiService.ts:127-135` | `recordGyojiBout` appends per-bout entry — career history unbounded, implied per-basho aggregation never happens | DEBT |
| S7-28 | `governance/services/YokozunaService.ts:64-107` | `evaluateCandidate` stub: `isYushoLast = wins>=14` conflates wins/yusho, `performances:[]` never populated | DEBT (documented limitation) |
| S7-29 | `economy/koenkaiDemands.ts:214-217` | Churn removes koenkai member but leaves `SponsorRelationship` — asymmetric two-sided bookkeeping | DEBT |
| S7-30 | `governance/services/PoliticalFavorsService.ts:68-70` | `advance_payout` repeatable money-print (nothing docks stipend) | PIN+FIX (cheap: consume flag/dock) |
| S7-31 | `GomenfudaService.ts:109-121` + `kanrekiCeremony.ts:36-47` | Prior-record checks scan pruned `events.log` → sanctions silently reset in long sims | DEBT |
| S7-32 | `bout/boutResolver.ts:65` | Double-absent fusensho → east wins arbitrarily; should be no-contest | PIN+FIX (cheap) |
| S7-33 | `health/InjuryService.ts:352-366` | `clearInjury` leaves stale `injuryStatus` + legacy `injury` alias | PIN+FIX (cheap) |
| S7-34 | `talentPoolReads.ts:122-124` + `overflow.ts:55` | `countsAsForeignFromRikishi` nationality-only → wrong retention bias post-naturalization | PIN+FIX (cheap) |
| S7-35 | `recruitment/CandidatePoolService.ts:276-279` + `TalentPoolOffers.ts:77` | Negotiation resolves on ANY suitor deadline → shortest deadline wins window | DEBT |
| S7-36 | `SparringService.ts:420-424,462,301` | Injury permanently removes pair (not pause); `weeksActive` resets → 12wk rivalry unreachable; `pair.chemistry` stale after archetype evolution | DEBT |
| S7-37 | `MentorshipService.ts:250-264` + `SparringService.ts:454-458` | Bleed clamps bypass `getEffectiveCeiling` (PA+maturity) | DEBT |
| S7-38 | `academy/YouthAcademyService.ts:475-481` | `promoteIntake` no roster-cap check → can overshoot 30 until next overflow | DEBT |
| S7-39 | `health/RecoveryService.ts:16-51` | `tickRikishiRecovery` mutates input rikishi (callers clone — fragile contract) | DEBT (document) |
| S7-40 | `bout/yaocho.ts:86-89` | `repeatedKimarite` compares `lastMatch` only — "3+ repeats" doc unreachable; 2-in-row falsely triggers at meetings≥3 | PIN+FIX (cheap) |
| S7-41 | `MYOSEKI_NAMES` (`myosekiService.ts`) | Heavy duplicates → ~40-50 generic `Elder_N` shares | DEBT (cosmetic) |
| S7-42 | `CandidateGenerator.ts:219-220` | `rng.next() > 0.8` → ~20% amateur_star rate; constant says 80% — inverted or misnamed | PIN+FIX (cheap: rename constant) |
| S7-43 | `TalentCandidate.isAmateurStar` never set | Dead readers `eventSurfacing.ts:34`, `CandidatePoolPage.tsx:80` | PIN+FIX — set at generation |
| S7-44 | `matchmaking/DramaMatchmaker.ts:296-298,344-348,389-390` + `LowerDivisionSwiss.ts:334-335` | `r.rivalries`/`r.justReturnedFromInjury`/`r.winStreak` not Rikishi fields → streak_breaker/comeback_story/rivalry_renewed permanently dead | DEBT (remove dead branches) |
| S7-45 | `SwissAlgorithm.ts:531-536` + `LowerDivisionSwiss.ts:390-394` | `options.seed`/`options.rules` accepted, never used — API lies | DEBT (document/remove params) |
| S7-46 | `persistence/saveload.ts:158-167` + `useSaveLoadState.ts:120` | Export filename `"Manual Save"` verbatim — no `.json` extension | PIN+FIX (cheap) |
| S7-47 | `persistence/SaveSlotService.ts:123-124,96` | `typeof rikishi === "object"` admits Array → hollow-save passes; `idx()` NaN on `autosave_abc` | PIN+FIX (cheap) |
| S7-48 | `calendar/calendar.ts:150-152` | `getBashoInfo` ignores `_year` — "2nd Sunday" never varies by year | DEBT |
| S7-49 | `world.ts bout loop` — `buildBoutResultV2`/`edgeCrisis` numeric tuning | Structural only | DEBT (n/a) |
| S7-50 | `BashoState.currentDay` write-only; `basho.standings` Map-or-Object question | Verify standings type at scheduling (BanzukePublisher:47 comment) | VERIFY→DEBT/FIX |

## CLASS S8 — UI honesty / projections

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S8-1 | `presenters/heyaUI.ts` | Fabricated/stale fields (per presenters wave) | PIN+FIX |
| S8-2 | `presenters` history cohort projection | Uses active-only rikishi → undercounts historical retirees | PIN+FIX |
| S8-3 | UI displays | SCREAMING_SNAKE enums, raw entity ids, `/history`+`/museum` redirect links, stale selectedDay, render-phase setState, per-keystroke dispatch, hardcoded 0.8 multiplier | DEBT (batch cleanup pass) |
| S8-4 | `StablePage`/NPC pages read-only gating | See S2 | merged into S2 |

## CLASS S9 — Test infra / gates / mocks

| # | Site | Evidence | Triage |
|---|------|----------|--------|
| S9-1 | `tests/unit/engine/utils.ts` `mockRikishi` | Missing required `Rikishi` fields hidden by `as Rikishi`; invalid archetype/koenkaiBand literals | PIN+FIX |
| S9-2 | `scripts/audit/engine-reviewer.ts` | Zero-arg-only regex for legacy finance calls — parameterized reintroductions pass | PIN+FIX |
| S9-3 | `testTimeoutBudget` meta-gate | Allows up to 5 violations despite flat-ban docs | PIN+FIX (threshold→0 or update docs) |
| S9-4 | `weakAssertionAudit` | Misses ≥3 `toBeTruthy()` files + weak patterns | PIN+FIX |
| S9-5 | `factoryDiscipline` | Covers only limited factory-name set | DEBT (expand list) |
| S9-6 | knip/circular/bundleBudget | Fail-open gaps noted by wave | DEBT |
| S9-7 | `tsconfig.node.json` excludes configs | Type-check blind spot | DEBT |
| S9-8 | Determinism `year` horizon | Not gate-enforced (basho only in CI) | DEBT |
| S9-9 | `test-timings.json` + ratchet manifest | Regen after suite settles | Phase D task |

## CLASS S10 — Dead code (batch removal pass)

| Items | Triage |
|-------|--------|
| `almanac/` barrel + `generateCareerRecord`/`generateHeyaRecord`/`getRikishiCareerSummary` (test-only), `coach_criticism` narrative path, `BardEngine` dead branches, `SIM_FULL_BASHO` reducer, `digestStale`, `uiActions.ts`, `validatePath.ts`, `favorTarget`, `shouldHireStaff` hardcode, `rpPerception`, `phase-dependencies.json`, dead codemod scripts, perf artifacts | FIX — remove in dead-code pass (each verified zero-production-caller) |
| `injectRikishiAsCandidate` (TalentPoolStateService:150-192) — self-defeating (guard would never mint), `warmScoutingForRikishiList`, public `materializeCandidateToRikishi` wrapper, `getHeyaBrand` (broken keying), `archiveBoutLog`/`retrieveBoutLog`/`archiveGazette`/`retrieveGazette`/`retrieveAwards`/`retrieveBanzuke` + full `electronArchive.ts` mirror, `historyCache.getYear` (LRU never populated), `capitalize`/`formatShikona`/`localClampInt`/`isAtForeignLimit`, `getDivisionBelow`/`greedySelectPairs`, `ChronicleService.addRecord`+`recordsBroken`, dead migration bodies (`migrateToV1_3_0` no-op loops, `migrateToV1_4_0` undefined writes), `matchmakingOverride` leftover check, `ensureCandidatePoolState` dead statement (`phase01_week_candidate_pool.ts:33`), `processMediaDecision` (verify test-only first), `runRetirements` deprecated delegate, `RegionalHubPage.tsx:38-39` void statement, `EngineEvent.bashoNumber` never assigned, `BashoState.currentDay` write-only, `_year`/`_step`/`_world`/`_oyakata` dead params, `SwissAlgorithm` unused options, DramaMatchmaker dead-field branches, `handleInsolvency` (documented orphan), `expiresAtWeek` dead data (until S7-18 fix) | FIX — remove; archive writers+readers go together (BashoHistory:230,242 write, nothing reads) |
| Migration machinery whole-chain | **Keep** — zero-backcompat charter permits deletion BUT `isValidSave` version gate + saveLoadIntegrity test depend on it; simplify to version-reject instead of delete (Phase C decision) |

## DISPROVED draft/nested claims

| Claim | Verdict |
|-------|---------|
| Positional-arg `generateGovernanceHeadline` call sites exist | DISPROVED — all 8 sites named-args |
| MH-* dups are cross-year/week-reset collisions | DISPROVED — week/dayIndexGlobal monotonic in label; dups arise within a single day and accumulate |
| Koenkai 30% double-counts heya funds | DISPROVED — 30% sourced from external supporter club (FinanceCalculator:110-112 consistent w/ distributeKoenkaiToSekitori) |
| Advisor foreign-slot divergence (V17-D03) | RESOLVED — `AdvisorService:369-372` uses canonical `getForeignCountInHeya` (documented fix) |
| V17-D04 roster staleness | RESOLVED — `impactAffectsRosterQueries`+`clearQueryCaches` (ImpactResolver:17-40,620) covers all canonical mutations; generation wave confirmed zero non-canonical roster mutations in scope |
| Live "LIVE/SECURE" fabricated telemetry, `Math.random` in UI, orphan routes | DISPROVED — none found |
| Command-surface gaps | DISPROVED — all ~66 variants have handlers + UI dispatch |
| Determinism violations in engine | CLEAN — zero `Math.random`/`Date.now`/`new Date` sim-path hits across all waves (only metadata/log/save-stamp + world-seed minting) |

## Resolved during Phase A.4 (parent verification)

- `basho.standings`: Map-form only in the scheduling path (`.values()` iteration at phase01_basho_npc_tactics:79); BanzukePublisher:47 "Map or Object" comment is defensive, not a producer. CLOSED.
- Fusensho/bye for odd pools: NO bye mechanism exists in `matchmaking/` — unscheduled rikishi currently accrue phantom absences (performance.ts:356) = same bug class as S7-3. B5/S7-11 fix direction: tag `same_heya_forced` when forced AND add absence-exemption for legitimately unpairable rikishi. CLOSED → folded into S7-3/S7-11 fix notes.
- S3-1 direction: **write `heyaPressure[heyaId]`** — live heya-keyed field consumed by MediaPreBashoService (:199-201 distributes to rikishi heat), npc perception, chainService. `mediaHeat` stays rikishi-keyed. CLOSED.
- `TournamentSimulator` aliasing: CONFIRMED partial — non-sekitori rikishi objects shared with caller world are mutated in place (S4-6).

## Open verification items for parent

1. `basho.standings` Map-vs-Object at scheduling time (`BanzukePublisher.ts:47` comment) — grep object-form producers.
2. `TournamentSimulator` `workingWorld` aliasing — partially answered by F7 (non-sekitori shared objects mutated).
3. `processMediaDecision` test-only status before removal.
4. Whether a fusensho/bye mechanism exists elsewhere for odd pools (B5 consequence check).
5. `mediaHeat` vs `heyaPressure` consumer semantics before S3-1 fix direction.

---

## Phase A.1 Baseline log (clean main @ consolidation/v18 base)

| Gate | Result |
|------|--------|
| `bun run type-check` | PASS — 0 errors |
| `bun run build` | PASS — 23.2s |
| `bun run lint:commit` | PASS — 0 violations |
| `bun run test` (fast) | PASS — 1,037 files / 9,607 tests / 1 skipped |
| `bun run test:slow` | 16/17 files, 77/78 tests — 1 PRE-EXISTING FAIL: `simulationInvariants` ID-integrity, duplicate `MH-*` headlines (`MH-AEA98FF9`×8, `MH-ABA98B40`×8, `MH-181E79AE`, `MH-171E781B`) = V17-D01 live evidence. 1264s |
| `bun run test:perf` | 4/5 files, 13/14 tests — `yokozunaPromotionAutoSim` 300s env timeout (~16 bashos in 316s on this hardware; slow-suite equivalent passes → environment-bound, not product) |
| `bun run test:e2e:smoke` | rerun pending (browsers re-installed v1254 after headless-shell missing) |
| `determinism-double-run basho` | PASS — 18,511,833 bytes ×2 byte-identical |
| `determinism-double-run year` | PASS — 25,089,892 bytes ×2 byte-identical |
| `Math.random`/`Date.now` in `src/engine` | 0 call-site hits |

New baseline findings: (a) `.cache/` not gitignored — channel for PR junk artifacts; (b) playwright browser version drift after dep bumps → `npx playwright install` needed; (c) perf gate is hardware-bound on this box (yokozuna test needs ~360s vs 300s cap).
| `bun run test:e2e:smoke` | PASS — 4/4 (1.2m). Console shows S7-1-adjacent command-dropping: `TICK_MULTIPLE_DAYS`/`SIMULATE_ALL_BOUTS` dropped "tick in progress" |
