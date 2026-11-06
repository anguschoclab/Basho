# Orphan Catalog — per-entry verdicts

*Auto-regenerated from `baseline-orphans.json` + the classification maps in
`tests/unit/audit/unreferenced-exports.test.ts`. Run `bun scripts/audit/audit-orphans.ts`
first, then regenerate this file if the baseline changed.*

**Legend** — Status: `intentional` (kept on purpose, reason in the Verdict column) /
`genuine` (confirmed dead, `ORPH-####` tracked). Currently **0 genuine** — the
burn-down deleted superseded duplicates and wired unique capabilities into live paths.

## almanac — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0472 | `index` | intentional | — | Domain barrel retained as public API surface — deep-import policy leaves it unconsumed |

## banzuke — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0299 | `computeVariableSanyakuCounts` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |

## bard — 4 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0116 | `checkTriggeredDrama` | intentional | — | Internal drama trigger invoked by processDramaTick; exported for unit testing |
| ORPH-0117 | `checkBashoDayDrama` | intentional | — | Internal helper invoked by checkTriggeredDrama; exported for unit testing |
| ORPH-0118 | `triggerCrisis` | intentional | — | Internal crisis factory invoked by checkTriggeredDrama; exported for unit testing |
| ORPH-0120 | `VENUE_PROFILES` | intentional | — | Venue profile data for narrative generation |

## basho — 3 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0332 | `isExhibitionBasho` | intentional | — | Type-guard predicate paired with isHonbasho on the live ExhibitionBashoService (phase05 jungyo pipeline); pinned by exhibitionBasho.test |
| ORPH-0333 | `isHonbasho` | intentional | — | Name predicate consumed by getExhibitionBashoSchedule and getNextEvent; pinned by exhibitionBasho.test |
| ORPH-0334 | `NAKABI_DAY` | intentional | — | Internal constant consumed by isNakabiDay and generateNakabiSummary; exported for unit testing |

## bout — 21 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0122 | `chooseBaseTactic` | intentional | — | Bout AI tactic selection utility |
| ORPH-0124 | `CornerAdviceContext` | intentional | — | Parameter type of buildRecommendation/getAdvice; pinned by CornerAdvice tests |
| ORPH-0125 | `getBoutAnimationFamily` | intentional | — | Internal helper invoked by buildBoutScript; exported for unit testing |
| ORPH-0126 | `getLeaderWins` | intentional | — | Bout contention leader wins utility |
| ORPH-0127 | `calculateTorque` | intentional | — | Internal helper invoked by computeNetTorque; exported for unit testing |
| ORPH-0128 | `computeNetTorque` | intentional | — | Internal helper invoked by evolveGripGeometry and initBeltBattle; exported for unit testing |
| ORPH-0131 | `applyRivalryToRikishi` | intentional | — | Internal helper invoked by resolveBout; exported for unit testing |
| ORPH-0300 | `resolveTacticalClash` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0212 | `classifyHiwaza` | intentional | — | Internal classifier exercised directly by hiwaza.test.ts |
| ORPH-0302 | `getKimariteByJsaCategory` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0301 | `getKimariteByClass` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0303 | `getKimariteCount` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0304 | `getKimariteForFamily` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0143 | `calculateHansokuChance` | intentional | — | Internal helper invoked by tryHansoku; exported for unit testing |
| ORPH-0144 | `SHINITAI_INSTABILITY_DIFF_THRESHOLD` | intentional | — | Internal constant consumed by tryShinitai; value pinned by shinitai tests |
| ORPH-0215 | `pickTerminalKimarite` | intentional | — | Internal picker exercised directly by terminalKimarite.test.ts |
| ORPH-0145 | `YaochoIndicators` | intentional | — | Return type of evaluateYaochoIndicators consumed by checkYaocho; pinned by yaocho tests |
| ORPH-0146 | `evaluateYaochoIndicators` | intentional | — | Internal helper invoked by checkYaocho; exported for unit testing |
| ORPH-0147 | `calculateYaochoChance` | intentional | — | Internal helper invoked by checkYaocho; exported for unit testing |
| ORPH-0475 | `ReplayMetadata` | intentional | — | Consumed by src/presenters/engineAccess.ts — presenters are outside the unticked scan scope |
| ORPH-0473 | `index` | intentional | — | Domain barrel retained as public API surface — deep-import policy leaves it unconsumed |

## core — 12 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0150 | `updateHeyaImpact` | intentional | — | Impact builder heya update utility |
| ORPH-0151 | `updateRikishiImpact` | intentional | — | Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test |
| ORPH-0152 | `updateWorldFieldImpact` | intentional | — | Impact factory sibling to the live logEventImpact/retireRikishiImpact worker-command factories; pinned by ImpactBuilder.test |
| ORPH-0548 | `ViolationKind` | intentional | — | ORPH-0548: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0546 | `IdIntegrityViolation` | intentional | — | ORPH-0546: idIntegrity audit API type — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0545 | `findDuplicateIds` | intentional | — | ORPH-0545: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0547 | `validateWorldIdIntegrity` | intentional | — | ORPH-0547: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0544 | `assertWorldIdIntegrity` | intentional | — | ORPH-0544: idIntegrity audit API — consumed by simulationInvariants/saveLoadIntegrity tests; test refs don't count as runtime references |
| ORPH-0305 | `getHeyaRosterIds` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0308 | `getEligibleOpponents` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0309 | `getStableFinances` | intentional | — | Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0310 | `getRikishiBashoStats` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |

## economy — 19 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0340 | `KACHI_NOKORI_THRESHOLD` | intentional | — | Internal constant consumed by calculateKachiNokori; value pinned by kachiNokori.test |
| ORPH-0336 | `handleInsolvency` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0339 | `UpgradeResult` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0554 | `KoenkaiDemandKind` | intentional | — | Type export; koenkai demand kind API contract |
| ORPH-0553 | `KoenkaiDemandDef` | intentional | — | Type export; koenkai demand def API contract |
| ORPH-0551 | `KOENKAI_DEMANDS` | intentional | — | Demand table pinned by koenkaiDemands tests |
| ORPH-0550 | `KOENKAI_DEMAND_PROBABILITY` | intentional | — | Internal constant consumed by tickMonthlyKoenkaiDemands; exported for unit testing |
| ORPH-0552 | `koenkaiDemandDecisionId` | intentional | — | Internal helper; pinned by koenkaiDemands tests |
| ORPH-0549 | `applyDemandOutcome` | intentional | — | Internal helper invoked by the resolveKoenkaiDemand path; exported for unit testing |
| ORPH-0344 | `processMonthlyLoanRepayments` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0346 | `StaffBonuses` | intentional | — | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0561 | `STAFF_POST_SLOTS` | intentional | — | Internal slot table consumed by openSlots; pinned by staffPosts tests |
| ORPH-0558 | `SEVERANCE_MONTHS` | intentional | — | Internal constant consumed by severanceCost; pinned by staffPosts tests |
| ORPH-0555 | `CANDIDATE_POOL_SIZE` | intentional | — | Internal constant consumed by refreshStaffCandidatePool; exported for unit testing |
| ORPH-0556 | `filledSlots` | intentional | — | Internal helper invoked by openSlots; exported for unit testing |
| ORPH-0559 | `severanceCost` | intentional | — | Internal helper; pinned by staffPosts tests |
| ORPH-0557 | `monthlyWageBill` | intentional | — | Internal helper; pinned by staffPosts tests |
| ORPH-0560 | `skillFromBands` | intentional | — | Internal helper; pinned by staffPosts tests |
| ORPH-0476 | `awards` | intentional | — | Consumed by components (HoshitoriChart, HoFInductionCeremony, KenshoManagementWidget) — components are outside the unticked scan scope |

## generation — 18 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0352 | `EARLY_SHIKONA_CHANCE` | intentional | — | Config constant for early shikona generation |
| ORPH-0353 | `EARLY_SHIKONA_MOTIVATION_BOOST` | intentional | — | Config constant for early shikona motivation boost |
| ORPH-0355 | `assignPressPersona` | intentional | — | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0354 | `assignPersonalityTraits` | intentional | — | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0356 | `rollBirthday` | intentional | — | Internal helper invoked by applyPersonaAssignment; exported for unit testing |
| ORPH-0357 | `PRE_SUMO_BACKGROUNDS` | intentional | — | Internal table consumed by applyBackgroundStatModifiers and assignPreSumoBackground; exported for unit testing |
| ORPH-0569 | `computePopulationTarget` | intentional | — | Internal helper invoked by computeReplacementGap (live NPC-recruitment equilibrium path); exported for unit testing |
| ORPH-0364 | `INDUSTRY_TAGS` | intentional | — | Sponsor generation industry tags; used by world factory |
| ORPH-0362 | `generateSponsorNameV2` | intentional | — | Sponsor name generation utility |
| ORPH-0361 | `generateSponsorId` | intentional | — | Sponsor ID generation utility |
| ORPH-0366 | `rollSponsorCategory` | intentional | — | Sponsor category rolling utility |
| ORPH-0360 | `generateSponsor` | intentional | — | Sponsor generation function; used by world factory internally |
| ORPH-0363 | `getTierTraitRanges` | intentional | — | Sponsor tier trait range utility |
| ORPH-0367 | `rollTier` | intentional | — | Sponsor tier rolling utility |
| ORPH-0365 | `INITIAL_SPONSOR_TIER_DISTRIBUTION` | intentional | — | Config for initial sponsor tier distribution |
| ORPH-0368 | `materializeCandidateToRikishi` | intentional | — | Consumed by TalentPoolNPCRecruitment (NPC talent materialization); pinned by materialization tests |
| ORPH-0348 | `PLAYER_BACKSTORIES` | intentional | — | Internal table consumed by applyOyakataCreationConfig; exported for unit testing |
| ORPH-0350 | `recruitmentBalanceMultiplier` | intentional | — | Consumed by TalentPoolNPCRecruitment (NPC recruitment pipeline); pinned by competitiveBalance tests |

## governance — 6 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0311 | `KANREKI_AGE` | intentional | — | Internal constant consumed by isEligibleForKanreki and performKanrekiCeremony; value pinned by kanreki tests |
| ORPH-0312 | `KANREKI_POPULARITY_BOOST` | intentional | — | Internal constant consumed by performKanrekiCeremony; value pinned by kanreki tests |
| ORPH-0313 | `ATTENDANT_POPULARITY_BOOST` | intentional | — | Internal constant consumed by assignYokozunaAttendants; value pinned by yokozunaAttendants tests |
| ORPH-0314 | `isEligibleAttendant` | intentional | — | Internal validation helper used by assignYokozunaAttendants (same file); audit's same-file exclusion is a false positive |
| ORPH-0316 | `GOMENFUDA_REPUTATION_PENALTY` | intentional | — | Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests |
| ORPH-0315 | `CONSECUTIVE_WITHDRAWAL_MULTIPLIER` | intentional | — | Internal constant consumed by recordGomenfuda; value pinned by GomenfudaService tests |

## health — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0372 | `ENCOURAGEMENT_MOTIVATION_BOOST` | intentional | — | Config constant for encouragement action |
| ORPH-0373 | `calculateWeeklyInjuryChance` | intentional | — | Internal helper invoked by rollWeeklyInjury; exported for unit testing |
| ORPH-0374 | `clearInjury` | intentional | — | Internal helper invoked by onBoutResolvedInjury; exported for unit testing |
| ORPH-0375 | `toInjuryEvent` | intentional | — | Internal helper invoked by clearInjury; exported for unit testing |
| ORPH-0562 | `PHYSIO_WEEKS_PER_SESSION` | intentional | — | Internal constant consumed by physio purchase flow; exported for unit testing |

## history — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0378 | `tryAddInductee` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0379 | `generateCareerSnapshot` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0381 | `ArchivedYear` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0382 | `BashoKey` | intentional | — | Live module surface — referenced outside its file (6 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0388 | `computeStatureBand` | intentional | — | Internal helper invoked by runPrestigeDecay; exported for unit testing |

## keshoMawashi — 2 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0390 | `getHeyaBrand` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0477 | `KeshoMawashiGenerator` | intentional | — | Compatibility barrel re-exporting the kesho-mawashi generator pipeline — pinned by dedicated tests |

## lifecycle — 2 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0570 | `evaluateFoundingEligibility` | intentional | — | Internal helper invoked by maybeFoundStable (live retiree→oyakata founding path); exported for unit testing |
| ORPH-0478 | `CareerService` | intentional | — | Compatibility facade delegating to the unified retirement processor — pinned by dedicated tests |

## matchmaking — 6 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0159 | `isMakuuchiDebut` | intentional | — | Internal helper invoked by checkDebutShowcase; exported for unit testing |
| ORPH-0160 | `scoreDrama` | intentional | — | Internal helper invoked by applyDramaBudget and isMakuuchiDebut; exported for unit testing |
| ORPH-0161 | `DEFAULT_MATCHMAKING_RULES` | intentional | — | Default matchmaking rules; used by basho setup |
| ORPH-0163 | `buildCandidatePairs` | intentional | — | Internal helper invoked by generatePairs; exported for unit testing |
| ORPH-0164 | `buildPlayoffPairs` | intentional | — | Matchmaking playoff pair builder utility |
| ORPH-0165 | `buildExhibitionPairs` | intentional | — | Matchmaking exhibition pair builder utility |

## narrative — 10 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0405 | `hydrateDescriptor` | intentional | — | Narrative prose hydration utility |
| ORPH-0406 | `PressConferenceContext` | intentional | — | Parameter type of generatePressConference; pinned by PostBashoPress tests |
| ORPH-0407 | `bumpTrigger` | intentional | — | Rivalry heat bump trigger utility |
| ORPH-0571 | `KadobanStatus` | intentional | — | Parameter type of the live promotionBands.kadobanDramaBand API; pinned by promotionBands tests |
| ORPH-0574 | `resolveOzekiRunBand` | intentional | — | Internal resolver invoked by promotionBands.ozekiRunBand; exported for unit testing |
| ORPH-0576 | `resolveYokozunaSupportBand` | intentional | — | Internal resolver invoked by resolveYokozunaRunBand and promotionBands; exported for unit testing |
| ORPH-0575 | `resolveYokozunaRunBand` | intentional | — | Internal resolver invoked by promotionBands.yokozunaRunBand; exported for unit testing |
| ORPH-0573 | `resolveKadobanDramaBand` | intentional | — | Internal resolver invoked by promotionBands.kadobanDramaBand; exported for unit testing |
| ORPH-0484 | `narrativeDescriptions` | intentional | --- AUTHORITATIVE DELEGATION --- | Consumed by src/presenters/uiDigest.ts — presenters are outside the unticked scan scope |
| ORPH-0572 | `promotionBands` | intentional | — | Consumed by src/presenters/projections/promotionProjections.ts — presenters are outside the unticked scan scope |

## npc — 20 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0409 | `MetaAdaptationState` | intentional | — | Exported for unit testing; consumed via evaluateAdaptation in production |
| ORPH-0410 | `updateMetaAdaptation` | intentional | — | Internal helper invoked by evaluateAdaptation; exported for unit testing |
| ORPH-0417 | `emptyLeaguePerception` | intentional | — | Empty league perception factory utility |
| ORPH-0418 | `emptyOyakataMemory` | intentional | — | Internal helper invoked by getMemory; exported for unit testing |
| ORPH-0456 | `CoordinationInput` | intentional | — | Parameter type of applyPlanConstraints; pinned by TacticalCoordinator tests |
| ORPH-0412 | `detectDueDecisions` | intentional | — | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0563 | `PENDING_DECISION_SOFT_CAP` | intentional | — | Internal constant consumed by decisionQueue; exported for unit testing |
| ORPH-0414 | `applyCrisisRescue` | intentional | — | Internal rescue handler invoked in-module; exported for unit testing |
| ORPH-0415 | `consolidateOyakataMemory` | intentional | — | Live module surface — referenced outside its file (5 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0420 | `MAX_OPPONENT_MODELS` | intentional | — | Config constant for the opponent-model eviction cap |
| ORPH-0424 | `MediaHeatBand` | intentional | — | Live module surface — referenced outside its file (13 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0429 | `scoreRecruitForOyakata` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0430 | `getFinanceStrategy` | intentional | — | NPC finance strategy getter utility |
| ORPH-0431 | `getGovernanceStrategy` | intentional | — | NPC governance strategy getter utility |
| ORPH-0454 | `TraitCheck` | intentional | — | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0450 | `evaluateRule` | intentional | — | Live module surface — referenced outside its file (4 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0448 | `calculateMoodAdjustedThreshold` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0455 | `trySpendResource` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0447 | `adjustScore` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0433 | `DefaultRetirementStrategy` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |

## persistence — 4 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0461 | `ElectronArchiveService` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0462 | `ArchiveConflictError` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0463 | `OPFSArchiveService` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0465 | `resetStorageProvider` | intentional | — | Live module surface — referenced outside its file (3 consumer(s) via deep path or type-position import the auditor cannot resolve) |

## recruitment — 7 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0466 | `getConfidenceFromLevel` | intentional | — | Internal helper invoked by getConfidenceLevel; exported for unit testing |
| ORPH-0467 | `getEstimatedValue` | intentional | — | Internal helper invoked by resolveScoutedAttribute; exported for unit testing |
| ORPH-0470 | `getQualityBonus` | intentional | — | Public helper exercised directly by youthAcademy.test.ts |
| ORPH-0468 | `HARD_CAP_ROSTER_SIZE` | intentional | — | Live module surface — referenced outside its file (1 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0469 | `scoutingNoiseSpread` | intentional | — | Internal helper invoked by perceivedTalentSeed; exported for unit testing |
| ORPH-0565 | `ScoutTierDef` | intentional | — | Type export; scout mission tier API contract |
| ORPH-0564 | `ScoutStats` | intentional | — | Type export; scout stats API contract |

## rikishi — 1 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0566 | `signatureKimarite` | intentional | — | Unticked service consumed via presenters/engineAccess + RikishiCarePanel; not tick-phase-bound |

## shikona — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0320 | `generateRikishiName` | intentional | — | Live module surface — referenced outside its file (2 consumer(s) via deep path or type-position import the auditor cannot resolve) |
| ORPH-0171 | `extractLegacyPrefix` | intentional | — | Internal helper invoked by generateLegacyShikona; exported for unit testing |
| ORPH-0172 | `extractLegacySuffix` | intentional | — | Internal helper invoked by generateLegacyShikona; exported for unit testing |
| ORPH-0173 | `RANK_RULES` | intentional | — | Rank rules table for shikona generation |
| ORPH-0174 | `resolveRankTier` | intentional | — | Rank tier resolution utility |

## training — 17 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0323 | `getStatCeiling` | intentional | — | Internal helper invoked by getEffectiveCeiling; exported for unit testing |
| ORPH-0322 | `diminishingReturnsMult` | intentional | — | Internal helper invoked by calculateGrowthWithModifiers; exported for unit testing |
| ORPH-0324 | `normalizeTrainingProfile` | intentional | — | Internal helper invoked by calculateFatigueDelta and calculateGrowthWithModifiers; exported for unit testing |
| ORPH-0321 | `calculateGrowthWithModifiers` | intentional | — | Internal helper invoked by calculateGains and calculateGrowthVector; exported for unit testing |
| ORPH-0329 | `TSUKEBITO_SENIOR_RANK_THRESHOLD` | intentional | — | Policy constant consumed by isEligibleForTsukebito; value pinned by TsukebitoService tests |
| ORPH-0331 | `TSUKEBITO_TRAINING_BOOST` | intentional | — | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0328 | `TSUKEBITO_MORALE_BOOST` | intentional | — | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0330 | `TSUKEBITO_TECHNIQUE_EXPOSURE` | intentional | — | Policy constant consumed by applyWeeklyTsukebitoBenefits; value pinned by TsukebitoService tests |
| ORPH-0326 | `OTOTODESHI_FATIGUE_PENALTY` | intentional | — | Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests |
| ORPH-0327 | `OTOTODESHI_MENTAL_GAIN` | intentional | — | Policy constant consumed by applyWeeklyOtotodeshiEffects; value pinned by TsukebitoService tests |
| ORPH-0325 | `isEligibleTsukebito` | intentional | — | Internal helper invoked by assignTsukebito, isJuniorTsukebitoEligible, and setTsukebito; exported for unit testing |
| ORPH-0181 | `WEIGHT_JOURNEY_MIN_GAP` | intentional | — | Config constant for weight journey min gap |
| ORPH-0182 | `WEIGHT_JOURNEY_WEEKLY_GAIN` | intentional | — | Internal constant consumed by applyWeightJourneyTick; value pinned by WeightJourney tests |
| ORPH-0183 | `WEIGHT_JOURNEY_POWER_BOOST` | intentional | — | Config constant for weight journey power boost |
| ORPH-0184 | `WEIGHT_JOURNEY_BALANCE_BOOST` | intentional | — | Config constant for weight journey balance boost |
| ORPH-0185 | `shouldEnterWeightJourney` | intentional | — | Internal helper invoked by applyWeightJourneyTick; exported for unit testing |
| ORPH-0567 | `getRestFatigueFloor` | intentional | — | Internal helper invoked by weeklyTraining; pinned by dormitory tests |

## utils — 5 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0187 | `logger` | intentional | — | Shared singleton backing the live debug/info/warn/error wrappers (consumed by bootstrap, useFlowActions, BanzukePublisher); pinned by logger tests |
| ORPH-0577 | `isAtForeignLimit` | intentional | — | Canonical foreign-limit predicate pinned by the foreign-limit-consistency audit test; runtime callers use getForeignCountInHeya |
| ORPH-0204 | `localClampInt` | intentional | — | Math utility for clamping integers |
| ORPH-0205 | `seededWeightedPick` | intentional | — | Random utility for seeded weighted picking |
| ORPH-0206 | `formatShikona` | intentional | — | String formatting utility for shikona |

## welfare — 2 entries (0 genuine)

| ID | Symbol | Status | What it does | Verdict |
|---|---|---|---|---|
| ORPH-0471 | `getSeverityWeight` | intentional | — | Internal helper invoked by computeInjuryPressure; exported for unit testing |
| ORPH-0568 | `harmonyBandFor` | intentional | — | Internal helper invoked by harmony module; pinned by harmony tests |

