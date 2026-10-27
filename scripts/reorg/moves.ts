/**
 * moves.ts — the explicit old→new move map for the reorg.
 *
 * Entries are repo-relative prefixes: a file move is an exact path pair,
 * a directory move is a dir→dir prefix pair covering everything beneath it.
 * Longest-prefix matching wins so a specific file entry can override its
 * parent dir mapping.
 *
 * PROTECTED: the applier refuses any path under AI-artifact dirs.
 */
export const PROTECTED_PREFIXES = [
  ".claude/",
  ".devin/",
  ".windsurf/",
  ".github/",
  "docs/superpowers/",
  "docs/audit/",
];

export type MoveEntry = [oldPath: string, newPath: string];

/** Barrels dissolved into new homes: symbols whose TRUE origin is the barrel
 *  file itself emit the redirect target instead. */
export const BARREL_REDIRECTS: Record<string, string> = {
  "src/engine/banzuke.ts": "src/engine/banzuke/banzukeOps.ts",
  "src/engine/rivalries.ts": "src/engine/narrative/rivalry/rivalriesState.ts",
};

/** Phase 3a — barrel relocations (EventBus facade moves; pure barrels are
 *  deleted via expand-barrels, not moved). */
export const P3A_MOVES: MoveEntry[] = [
  ["src/engine/banzuke.ts", "src/engine/banzuke/banzukeOps.ts"],
  ["src/engine/rivalries.ts", "src/engine/narrative/rivalry/rivalriesState.ts"],
  ["src/engine/EventBus.ts", "src/engine/events/EventBus.ts"],
  ["src/engine/eventBus", "src/engine/events/domains"],
  ["src/engine/events.ts", "src/engine/events/events.ts"],
  ["src/engine/eventHelpers.ts", "src/engine/events/helpers.ts"],
];

/** Phase 3b — engine domain consolidation. */
export const P3B_MOVES: MoveEntry[] = [
  // systems/* promotion (each domain dir)
  ["src/engine/systems/basho", "src/engine/basho"],
  ["src/engine/systems/bookmark", "src/engine/bookmark"],
  ["src/engine/systems/economy", "src/engine/economy"],
  ["src/engine/systems/generation", "src/engine/generation"],
  ["src/engine/systems/governance", "src/engine/governance/services"],
  ["src/engine/governance/dohyoIri.ts", "src/engine/governance/ceremonies/dohyoIri.ts"],
  ["src/engine/governance/kanrekiCeremony.ts", "src/engine/governance/ceremonies/kanrekiCeremony.ts"],
  ["src/engine/governance/yokozunaAttendants.ts", "src/engine/governance/ceremonies/yokozunaAttendants.ts"],
  ["src/engine/systems/health", "src/engine/health"],
  ["src/engine/systems/keshoMawashi", "src/engine/keshoMawashi"],
  ["src/engine/systems/legacy", "src/engine/legacy"],
  ["src/engine/systems/media", "src/engine/media"],
  ["src/engine/systems/meta", "src/engine/history"],
  ["src/engine/systems/narrative", "src/engine/narrative"],
  ["src/engine/systems/officials", "src/engine/officials"],
  ["src/engine/systems/recruitment", "src/engine/recruitment"],
  ["src/engine/systems/training", "src/engine/training"],
  ["src/engine/systems/tutorial", "src/engine/tutorial"],
  ["src/engine/systems/welfare", "src/engine/welfare"],
  ["src/engine/systems/worldCircuit", "src/engine/worldCircuit"],
  ["src/engine/systems/NPCPersonaService.ts", "src/engine/npc/personas/NPCPersonaService.ts"],

  // NPC cluster merge
  ["src/engine/npcAI", "src/engine/npc"],
  ["src/engine/agents", "src/engine/npc/agents"],
  ["src/engine/strategy", "src/engine/npc/strategy"],
  ["src/engine/advisor", "src/engine/npc/advisor"],
  ["src/engine/ai/types.ts", "src/engine/npc/types.ts"],
  ["src/engine/loop", "src/engine/npc/decision"],
  ["src/engine/rikishiAgency", "src/engine/npc/agency"],
  ["src/engine/npcAIWorkers.ts", "src/engine/npc/npcAIWorkers.ts"],
  ["src/engine/npcRecruitmentStrategy.ts", "src/engine/npc/strategy/npcRecruitmentStrategy.ts"],
  ["src/engine/npcRetirementStrategy.ts", "src/engine/npc/strategy/npcRetirementStrategy.ts"],
  ["src/engine/npcSponsorStrategy.ts", "src/engine/npc/strategy/npcSponsorStrategy.ts"],
  ["src/engine/npcSponsorStrategyHelpers.ts", "src/engine/npc/strategy/npcSponsorStrategyHelpers.ts"],
  ["src/engine/perception.ts", "src/engine/npc/perception.ts"],
  ["src/engine/oyakataPersonalities.ts", "src/engine/npc/personas/oyakataPersonalities.ts"],
  ["src/engine/oyakataStylePreferences.ts", "src/engine/npc/personas/oyakataStylePreferences.ts"],

  // persistence merge
  ["src/engine/storage", "src/engine/persistence/storage"],
  ["src/engine/saveload.ts", "src/engine/persistence/saveload.ts"],
  ["src/engine/storageProvider.ts", "src/engine/persistence/storageProvider.ts"],

  // economy loose files
  ["src/engine/economics.ts", "src/engine/economy/economics.ts"],
  ["src/engine/economics_awards.ts", "src/engine/economy/awards.ts"],
  ["src/engine/facilities.ts", "src/engine/economy/facilities.ts"],
  ["src/engine/loans.ts", "src/engine/economy/loans.ts"],
  ["src/engine/mergers.ts", "src/engine/economy/mergers.ts"],
  ["src/engine/staff.ts", "src/engine/economy/staff.ts"],

  // history cluster
  ["src/engine/archival.ts", "src/engine/history/archival.ts"],
  ["src/engine/history.ts", "src/engine/history/history.ts"],
  ["src/engine/historyCache.ts", "src/engine/history/historyCache.ts"],
  ["src/engine/historyIndex.ts", "src/engine/history/historyIndex.ts"],
  ["src/engine/hallOfFame.ts", "src/engine/history/hallOfFame.ts"],
  ["src/engine/records.ts", "src/engine/history/records.ts"],
  ["src/engine/prestige/prestigeSystem.ts", "src/engine/history/prestige.ts"],
  ["src/engine/lineage.ts", "src/engine/legacy/lineage.ts"],
  ["src/engine/naturalization.ts", "src/engine/lifecycle/naturalization.ts"],

  // calendar cluster
  ["src/engine/calendar.ts", "src/engine/calendar/calendar.ts"],
  ["src/engine/schedule.ts", "src/engine/calendar/schedule.ts"],
  ["src/engine/scheduleHelpers.ts", "src/engine/calendar/scheduleHelpers.ts"],
  ["src/engine/holiday.ts", "src/engine/calendar/holiday.ts"],

  // bout loose files
  ["src/engine/kimariteEnrichment.ts", "src/engine/bout/kimarite/kimariteEnrichment.ts"],
  ["src/engine/kimariteRegistry.ts", "src/engine/bout/kimarite/kimariteRegistry.ts"],
  ["src/engine/kimariteStrategies.ts", "src/engine/bout/kimarite/kimariteStrategies.ts"],
  ["src/engine/h2h.ts", "src/engine/bout/h2h.ts"],
  ["src/engine/archetype.ts", "src/engine/bout/archetype.ts"],

  // misc loose files
  ["src/engine/myosekiMarket.ts", "src/engine/governance/myosekiMarket.ts"],
  ["src/engine/overflow.ts", "src/engine/recruitment/overflow.ts"],
  ["src/engine/scoutingStore.ts", "src/engine/recruitment/scoutingStore.ts"],
  ["src/engine/narrativeDescriptions.ts", "src/engine/narrative/narrativeDescriptions.ts"],
  ["src/engine/descriptorBands.ts", "src/engine/narrative/descriptorBands.ts"],
  ["src/engine/glossary", "src/engine/narrative/glossary"],
  ["src/engine/actions/InjuredEncouragement.ts", "src/engine/health/InjuredEncouragement.ts"],
  ["src/engine/actions/OyakataIntervention.ts", "src/engine/npc/OyakataIntervention.ts"],
  ["src/engine/data/sumo_geography.ts", "src/engine/generation/data/sumo_geography.ts"],
  ["src/engine/avatarGenerator.ts", "src/engine/generation/avatarGenerator.ts"],

  // core loose files
  ["src/engine/rng.ts", "src/engine/core/rng.ts"],
  ["src/engine/world.ts", "src/engine/core/world.ts"],
  ["src/engine/queries.ts", "src/engine/core/queries.ts"],
  ["src/engine/selectors.ts", "src/engine/core/selectors.ts"],

  // training merge
  ["src/engine/training/WeightJourney.ts", "src/engine/training/WeightJourney.ts"],
];

/** Phase 4 — UI & state layer. */
export const P4_MOVES: MoveEntry[] = [
  // utils → lib
  ["src/utils/engineUtils.ts", "src/lib/engineUtils.ts"],
  ["src/utils/storageKeyValidation.ts", "src/lib/storageKeyValidation.ts"],
  ["src/utils/validatePath.ts", "src/lib/validatePath.ts"],

  // contexts + store → state/
  ["src/contexts", "src/state/game"],
  ["src/store", "src/state/stores"],

  // entry files → app/
  ["src/App.tsx", "src/app/App.tsx"],
  ["src/main.tsx", "src/app/main.tsx"],
  ["src/bootstrap.tsx", "src/app/bootstrap.tsx"],
  ["src/routes.tsx", "src/app/routes.tsx"],
  ["src/routes-helpers.ts", "src/app/routes-helpers.ts"],
  ["src/index.css", "src/app/index.css"],
  ["src/vite-env.d.ts", "src/app/vite-env.d.ts"],

  // components root loose files
  ["src/components/SplashScreen.tsx", "src/components/app-shell/SplashScreen.tsx"],
  ["src/components/ThemeProvider.tsx", "src/components/app-shell/ThemeProvider.tsx"],
  ["src/components/ErrorBoundary.tsx", "src/components/app-shell/ErrorBoundary.tsx"],
  ["src/components/RequireWorld.tsx", "src/components/app-shell/RequireWorld.tsx"],
  ["src/components/PageLoader.tsx", "src/components/app-shell/PageLoader.tsx"],
  ["src/components/TitleBar.tsx", "src/components/app-shell/TitleBar.tsx"],
  ["src/components/OpfsQuotaListener.tsx", "src/components/app-shell/OpfsQuotaListener.tsx"],
  ["src/components/ClickableName.tsx", "src/components/shared/ClickableName.tsx"],
  ["src/components/MentionText.tsx", "src/components/shared/MentionText.tsx"],
  ["src/components/EventDetailDialog.tsx", "src/components/shared/EventDetailDialog.tsx"],

  // components/game → domain dirs
  ["src/components/game/BanzukeReveal.tsx", "src/components/banzuke/BanzukeReveal.tsx"],
  ["src/components/game/BanzukeRevealSections.tsx", "src/components/banzuke/BanzukeRevealSections.tsx"],
  ["src/components/game/BoutCard.tsx", "src/components/basho/BoutCard.tsx"],
  ["src/components/game/BoutLog.tsx", "src/components/basho/BoutLog.tsx"],
  ["src/components/game/BoutNarrativeModal.tsx", "src/components/basho/BoutNarrativeModal.tsx"],
  ["src/components/game/BoutNarrativeModalSections.tsx", "src/components/basho/BoutNarrativeModalSections.tsx"],
  ["src/components/game/BoutPreMatchOverlay.tsx", "src/components/basho/BoutPreMatchOverlay.tsx"],
  ["src/components/game/BoutReplayViewer.tsx", "src/components/basho/BoutReplayViewer.tsx"],
  ["src/components/game/BoutResultDisplay.tsx", "src/components/basho/BoutResultDisplay.tsx"],
  ["src/components/game/BoutResultDisplaySections.tsx", "src/components/basho/BoutResultDisplaySections.tsx"],
  ["src/components/game/CornerAdvicePanel.tsx", "src/components/basho/CornerAdvicePanel.tsx"],
  ["src/components/game/HoshitoriChart.tsx", "src/components/basho/HoshitoriChart.tsx"],
  ["src/components/game/KeyBoutsSection.tsx", "src/components/basho/KeyBoutsSection.tsx"],
  ["src/components/game/MatchDayViewer.tsx", "src/components/basho/MatchDayViewer.tsx"],
  ["src/components/game/PbpLineText.tsx", "src/components/basho/PbpLineText.tsx"],
  ["src/components/game/PlayoffBracket.tsx", "src/components/basho/PlayoffBracket.tsx"],
  ["src/components/game/boutCardComponents.tsx", "src/components/basho/boutCardComponents.tsx"],
  ["src/components/game/boutCardTypes.tsx", "src/components/basho/boutCardTypes.tsx"],
  ["src/components/game/boutModalConstants.ts", "src/components/basho/boutModalConstants.ts"],
  ["src/components/game/boutReplay", "src/components/basho/boutReplay"],
  ["src/components/game/CrisisModal.tsx", "src/components/governance/CrisisModal.tsx"],
  ["src/components/game/CrisisModalSections.tsx", "src/components/governance/CrisisModalSections.tsx"],
  ["src/components/game/GomenfudaStatusBadge.tsx", "src/components/governance/GomenfudaStatusBadge.tsx"],
  ["src/components/game/FacilitiesManagementPanel.tsx", "src/components/stable/FacilitiesManagementPanel.tsx"],
  ["src/components/game/FacilitiesManagementPanelSections.tsx", "src/components/stable/FacilitiesManagementPanelSections.tsx"],
  ["src/components/game/InfrastructurePanel.tsx", "src/components/stable/InfrastructurePanel.tsx"],
  ["src/components/game/facilityMeta.ts", "src/components/stable/facilityMeta.ts"],
  ["src/components/game/StableHealthPanel.tsx", "src/components/stable/StableHealthPanel.tsx"],
  ["src/components/game/StableHealthPanelSections.tsx", "src/components/stable/StableHealthPanelSections.tsx"],
  ["src/components/game/StableStatsTable.tsx", "src/components/stable/StableStatsTable.tsx"],
  ["src/components/game/WelfarePanel.tsx", "src/components/stable/WelfarePanel.tsx"],
  ["src/components/game/WelfarePanelSections.tsx", "src/components/stable/WelfarePanelSections.tsx"],
  ["src/components/game/GlobalCupBracket.tsx", "src/components/economy/GlobalCupBracket.tsx"],
  ["src/components/game/GlobalCupParticipant.tsx", "src/components/economy/GlobalCupParticipant.tsx"],
  ["src/components/game/GlobalCupSections.tsx", "src/components/economy/GlobalCupSections.tsx"],
  ["src/components/game/SponsorContractsPanel.tsx", "src/components/economy/SponsorContractsPanel.tsx"],
  ["src/components/game/SponsorsPanel.tsx", "src/components/economy/SponsorsPanel.tsx"],
  ["src/components/game/SponsorsPanelSections.tsx", "src/components/economy/SponsorsPanelSections.tsx"],
  ["src/components/game/HoFInductionCeremony.tsx", "src/components/ceremony/HoFInductionCeremony.tsx"],
  ["src/components/game/HoFTimeline.tsx", "src/components/ceremony/HoFTimeline.tsx"],
  ["src/components/game/IntaiCeremony.tsx", "src/components/ceremony/IntaiCeremony.tsx"],
  ["src/components/game/NarrativeCeremonyDialog.tsx", "src/components/ceremony/NarrativeCeremonyDialog.tsx"],
  ["src/components/game/YokozunaDeliberation.tsx", "src/components/ceremony/YokozunaDeliberation.tsx"],
  ["src/components/game/SaveLoadDialog.tsx", "src/components/menu/SaveLoadDialog.tsx"],
  ["src/components/game/SaveLoadDialogComponents.tsx", "src/components/menu/SaveLoadDialogComponents.tsx"],
  ["src/components/game/SaveLoadDialogSections.tsx", "src/components/menu/SaveLoadDialogSections.tsx"],
  ["src/components/game/saveLoadDialogSignal.ts", "src/components/menu/saveLoadDialogSignal.ts"],
  ["src/components/game/KeshoEditor.tsx", "src/components/kesho/KeshoEditor.tsx"],
  ["src/components/game/KeshoEditorSections.tsx", "src/components/kesho/KeshoEditorSections.tsx"],
  ["src/components/game/keshoEditorData.ts", "src/components/kesho/keshoEditorData.ts"],
  ["src/components/game/MentorAssignmentPanel.tsx", "src/components/training/MentorAssignmentPanel.tsx"],
  ["src/components/game/SparringPanel.tsx", "src/components/training/SparringPanel.tsx"],
  ["src/components/game/ProgressionTracker.tsx", "src/components/training/ProgressionTracker.tsx"],
  ["src/components/game/InjuryRecoveryPanel.tsx", "src/components/training/InjuryRecoveryPanel.tsx"],
  ["src/components/game/InjuryRecoveryPanelSections.tsx", "src/components/training/InjuryRecoveryPanelSections.tsx"],
  ["src/components/game/PerceptionOverview.tsx", "src/components/scouting/PerceptionOverview.tsx"],
  ["src/components/game/perceptionComponents.tsx", "src/components/scouting/perceptionComponents.tsx"],
  ["src/components/game/RecruitSigningDialog.tsx", "src/components/recruitment/RecruitSigningDialog.tsx"],
  ["src/components/game/RikishiCard.tsx", "src/components/rikishi/RikishiCard.tsx"],
  ["src/components/game/RikishiCardSections.tsx", "src/components/rikishi/RikishiCardSections.tsx"],
  ["src/components/game/LineageTree.tsx", "src/components/history/LineageTree.tsx"],
  ["src/components/game/InboxNewsTicker.tsx", "src/components/media/InboxNewsTicker.tsx"],
  ["src/components/game/decisionFeedback.ts", "src/components/shared/decisionFeedback.ts"],
  ["src/components/game/searchFocusSignal.ts", "src/components/shared/searchFocusSignal.ts"],
  ["src/components/game/severityHelpers.tsx", "src/components/shared/severityHelpers.tsx"],

  // presenters loose projections → projections/
  ["src/presenters/academyManagementProjections.ts", "src/presenters/projections/academyManagementProjections.ts"],
  ["src/presenters/avatarProjections.ts", "src/presenters/projections/avatarProjections.ts"],
  ["src/presenters/banzukeUI.ts", "src/presenters/projections/banzukeUI.ts"],
  ["src/presenters/bashoUI.ts", "src/presenters/projections/bashoUI.ts"],
  ["src/presenters/boutPreviewUI.ts", "src/presenters/projections/boutPreviewUI.ts"],
  ["src/presenters/eraTone.ts", "src/presenters/projections/eraTone.ts"],
  ["src/presenters/exhibitionProjections.ts", "src/presenters/projections/exhibitionProjections.ts"],
  ["src/presenters/heyaUI.ts", "src/presenters/projections/heyaUI.ts"],
  ["src/presenters/kachiNokori.ts", "src/presenters/projections/kachiNokori.ts"],
  ["src/presenters/nakabiProjections.ts", "src/presenters/projections/nakabiProjections.ts"],
  ["src/presenters/npcAgentProjections.ts", "src/presenters/projections/npcAgentProjections.ts"],
  ["src/presenters/officialsProjections.ts", "src/presenters/projections/officialsProjections.ts"],
  ["src/presenters/PerceptionPresenter.ts", "src/presenters/projections/PerceptionPresenter.ts"],
  ["src/presenters/rivalStablesProjections.ts", "src/presenters/projections/rivalStablesProjections.ts"],
  ["src/presenters/tsukebitoProjections.ts", "src/presenters/projections/tsukebitoProjections.ts"],
  ["src/presenters/youthAcademyProjections.ts", "src/presenters/projections/youthAcademyProjections.ts"],
];

/** Phase 5a — tests + e2e to top level. */
export const P5A_MOVES: MoveEntry[] = [
  ["src/tests", "tests"],
  ["e2e", "tests/e2e"],
];

/** Phase 5b — scripts grouping. */
export const P5B_MOVES: MoveEntry[] = [
  ["scripts/audit-orphans.ts", "scripts/audit/audit-orphans.ts"],
  ["scripts/orphanTracker.ts", "scripts/audit/orphanTracker.ts"],
  ["scripts/engine-reviewer.ts", "scripts/audit/engine-reviewer.ts"],
  ["scripts/find-dead-test-subjects.ts", "scripts/audit/find-dead-test-subjects.ts"],
  ["scripts/duplicateExports.ts", "scripts/audit/duplicateExports.ts"],
  ["scripts/measureFunctions.ts", "scripts/audit/measureFunctions.ts"],
  ["scripts/report-test-timings.ts", "scripts/audit/report-test-timings.ts"],
  ["scripts/perf-gate-check.ts", "scripts/audit/perf-gate-check.ts"],
  ["scripts/designScan.ts", "scripts/audit/designScan.ts"],
  ["scripts/check-jsdoc.ts", "scripts/audit/check-jsdoc.ts"],
  ["scripts/purity-lint.sh", "scripts/audit/purity-lint.sh"],
  ["scripts/measure-breakdown.ts", "scripts/measure/measure-breakdown.ts"],
  ["scripts/measure-events.ts", "scripts/measure/measure-events.ts"],
  ["scripts/measure-growth.ts", "scripts/measure/measure-growth.ts"],
  ["scripts/measure-kimarite-distribution.ts", "scripts/measure/measure-kimarite-distribution.ts"],
  ["scripts/measure-rikishi.ts", "scripts/measure/measure-rikishi.ts"],
  ["scripts/bench-pipelines.ts", "scripts/measure/bench-pipelines.ts"],
  ["scripts/compare-engines.ts", "scripts/measure/compare-engines.ts"],
  ["scripts/verify-training-decay.ts", "scripts/measure/verify-training-decay.ts"],
  ["scripts/bard-orchestrator.ts", "scripts/narrative/bard-orchestrator.ts"],
  ["scripts/analyzeNarrativeDeps.ts", "scripts/narrative/analyzeNarrativeDeps.ts"],
  ["scripts/emitNarrativeModules.ts", "scripts/narrative/emitNarrativeModules.ts"],
  ["scripts/list-models.ts", "scripts/narrative/list-models.ts"],
  ["scripts/diagnostic-25yr-sim.ts", "scripts/sim/diagnostic-25yr-sim.ts"],
  ["scripts/determinism-double-run.ts", "scripts/sim/determinism-double-run.ts"],
  ["scripts/repro-year.ts", "scripts/sim/repro-year.ts"],
  ["scripts/yokozuna_sim.ts", "scripts/sim/yokozuna_sim.ts"],
  ["scripts/test-agents.ts", "scripts/sim/test-agents.ts"],
];
