import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { findFiles, SRC } from "@/tests/helpers/fsScan";

const TESTS_DIR = join(SRC, "tests");

/**
 * Factory-discipline gate (docs/test-suite-optimization-plan.md Phase 5.3).
 *
 * ~130 test files grew their own local makeWorld/makeRikishi/makeHeya-style
 * factories alongside the canonical builders (src/tests/helpers/utils/
 * MockFactory.ts and src/tests/unit/engine/utils.ts). Local factories with
 * genuinely custom signatures are legitimate; bare duplicates are drift.
 *
 * This gate is grandfathered: the files below may keep their local factories
 * (migration is opportunistic — shrink the list, never grow it). Any OTHER
 * test file defining a local entity factory fails.
 */
const ALLOWED_LOCAL_FACTORIES = new Set([
  "unit/audit/rngDeterminism.test.ts",
  "unit/audit/saveLoadIntegrity.test.ts",
  "unit/components/ExhibitionBout.test.tsx",
  "unit/components/HeyaPreview.test.tsx",
  "unit/components/KeshoEditor.test.tsx",
  "unit/components/RosterList.test.tsx",
  "unit/components/RosterWidget.test.tsx",
  "unit/components/StableIntelTab.test.tsx",
  "unit/components/dashboard/CalendarWidget.test.tsx",
  "unit/components/dashboard/FinancesWidget.test.tsx",
  "unit/components/dashboard/KenshoManagementWidget.test.tsx",
  "unit/components/dashboard/PromotionPipelineWidget.test.tsx",
  "unit/components/dashboard/ScoutingWidget.test.tsx",
  "unit/components/dashboard/StableWidget.test.tsx",
  "unit/components/dashboard/TrainingWidget.test.tsx",
  "unit/components/game/FacilitiesManagementPanel.test.tsx",
  "unit/components/game/MatchDayViewer.test.tsx",
  "unit/components/game/MentorAssignmentPanel.test.tsx",
  "unit/components/game/SparringPanel.test.tsx",
  "unit/components/layout/TopNavBar.test.tsx",
  "unit/components/stable/SuccessionModal.test.tsx",
  "unit/contexts/gameHelpers.applyImpact.test.ts",
  "unit/engine/academy/YouthAcademyService.test.ts",
  "unit/engine/actions/injuredEncouragement.test.ts",
  "unit/engine/banzuke/BanzukePublisher.absences.test.ts",
  "unit/engine/banzuke/capacity.test.ts",
  "unit/engine/basho/nakabi.test.ts",
  "unit/engine/bout/boutAI.wiring.test.ts",
  "unit/engine/bout/boutAchievements.test.ts",
  "unit/engine/bout/boutContention.test.ts",
  "unit/engine/bout/boutDurationFatigue.test.ts",
  "unit/engine/bout/boutNarrative.birthday.test.ts",
  "unit/engine/bout/boutNarrative.careerHigh.test.ts",
  "unit/engine/bout/boutNarrative.consecutiveKachi.test.ts",
  "unit/engine/bout/boutNarrative.fallsOut.test.ts",
  "unit/engine/bout/boutNarrative.golden.test.ts",
  "unit/engine/bout/boutNarrative.kensho.test.ts",
  "unit/engine/bout/boutNarrative.monoii.test.ts",
  "unit/engine/bout/boutNarrative.rivalry.test.ts",
  "unit/engine/bout/boutNarrative.stats.test.ts",
  "unit/engine/bout/boutNarrative.streak.test.ts",
  "unit/engine/bout/boutNarrative.unified.test.ts",
  "unit/engine/bout/boutNarrative.yusho.test.ts",
  "unit/engine/bout/boutResolver.gyoji.test.ts",
  "unit/engine/bout/boutResultApplier.absences.test.ts",
  "unit/engine/bout/boutResultApplier.dailyOverride.test.ts",
  "unit/engine/bout/boutResultApplier.streaks.test.ts",
  "unit/engine/bout/boutTacticAftermath.test.ts",
  "unit/engine/bout/sevenSevenPressure.test.ts",
  "unit/engine/bout/tacticSymmetry.test.ts",
  "unit/engine/bout/veteranDecline.test.ts",
  "unit/engine/core/ImpactResolver.test.ts",
  "unit/engine/core/SimulationRunner.test.ts",
  "unit/engine/descriptorBands.test.ts",
  "unit/engine/events/queuedEventNarrative.test.ts",
  "unit/engine/generation/CandidatePoolService.test.ts",
  "unit/engine/governance/GovernanceService.test.ts",
  "unit/engine/governance/dohyoIri.test.ts",
  "unit/engine/governance/gomenfuda.test.ts",
  "unit/engine/holidayDigest.test.ts",
  "unit/engine/lifecycle/PlayoffResolver.test.ts",
  "unit/engine/lifecycle/PrizeDistribution.test.ts",
  "unit/engine/lifecycle/checkYokozunaPromotions.test.ts",
  "unit/engine/lifecycle/retirementNarrative.test.ts",
  "unit/engine/lifecycle/yokozunaPromotion.test.ts",
  "unit/engine/loop/LoopDecisionEngine.test.ts",
  "unit/engine/loop/crisisSerialization.test.ts",
  "unit/engine/loop/halt.test.ts",
  "unit/engine/loop/kyujoDecision.test.ts",
  "unit/engine/narrative/holisticAlignment.test.ts",
  "unit/engine/narrative/nhkNarrativeGaps.test.ts",
  "unit/engine/npc/personnelWorkerWithdrawal.test.ts",
  "unit/engine/npcAI/agentExecution.test.ts",
  "unit/engine/npcAI/mediaAgent.test.ts",
  "unit/engine/npcAI/opponentLearning.test.ts",
  "unit/engine/npcAI/planOutcomes.test.ts",
  "unit/engine/npcAI/staffAcademy.test.ts",
  "unit/engine/persistence/SerializationService.sanitizeRikishi.test.ts",
  "unit/engine/queries.getHeyaRoster.test.ts",
  "unit/engine/queries.getPlayerHeya.test.ts",
  "unit/engine/queries.updateHeyaInWorld.test.ts",
  "unit/engine/schedule/kyujoFilter.test.ts",
  "unit/engine/simulation/TournamentSimulatorWalkover.test.ts",
  "unit/engine/stateImpact.metadata.test.ts",
  "unit/engine/systems/bookmark/BookmarkService.test.ts",
  "unit/engine/systems/generation/initializeBasho.test.ts",
  "unit/engine/systems/legacy/BloodlineService.test.ts",
  "unit/engine/systems/legacy/BloodlineServiceStatGuard.test.ts",
  "unit/engine/systems/legacy/legacyService.test.ts",
  "unit/engine/systems/narrative/RivalryService.test.ts",
  "unit/engine/systems/narrative/sparringRivalry.test.ts",
  "unit/engine/tick/phases/npcSparringAssignment.test.ts",
  "unit/engine/tick/phases/phase01_basho_bouts.tactics.test.ts",
  "unit/engine/tick/phases/phase01_basho_bouts.test.ts",
  "unit/engine/tick/phases/phase01_week_academy.test.ts",
  "unit/engine/tick/phases/phase01_week_health.test.ts",
  "unit/engine/tick/phases/phase01_week_welfare.test.ts",
  "unit/engine/tick/phases/phase06_narrative.agent.test.ts",
  "unit/engine/tick/pipelineRunner.hardening.test.ts",
  "unit/engine/tick/pipelineRunner.legacyRemoval.test.ts",
  "unit/engine/tick/pipelineRunner.snapshot.test.ts",
  "unit/engine/training/TrainingService.test.ts",
  "unit/engine/training/weightJourney.test.ts",
  "unit/engine/utils.ts",
  "unit/engine/worker/AcademyCommands.test.ts",
  "unit/engine/world/bashoSlice.integration.test.ts",
  "unit/engine/world/simulateBoutForToday.test.ts",
  "unit/helpers/__audit_verification.test.ts",
  "unit/hooks/useFinancesData.test.tsx",
  "unit/hooks/useKenshoData.test.tsx",
  "unit/hooks/useRosterData.test.tsx",
  "unit/hooks/useSaveSlotManager.test.tsx",
  "unit/hooks/useTrainingProfile.test.tsx",
  "unit/pages/Dashboard.succession.test.tsx",
  "unit/pages/EconomyPage.test.tsx",
  "unit/pages/HistoryDashboard.retiredSummary.test.tsx",
  "unit/pages/HistoryDashboard.test.tsx",
  "unit/pages/HistoryPage.test.tsx",
  "unit/pages/InjuryRecoveryPage.domainsGate.test.tsx",
  "unit/presenters/actionQueue.test.ts",
  "unit/presenters/bashoNakabi.test.ts",
  "unit/presenters/exhibitionProjections.test.ts",
  "unit/presenters/governanceProjections.test.ts",
  "unit/presenters/historyCohortProjections.test.ts",
  "unit/presenters/npcAgentProjections.test.ts",
  "unit/presenters/officialsProjections.test.ts",
  "unit/presenters/projections/bashoProjections.nakabi.test.ts",
  "unit/presenters/projections/historyProjections.cohorts.test.ts",
  "unit/presenters/projections/recapProjections.kachiNokori.test.ts",
  "unit/presenters/recapKihakuProjections.test.ts",
  "unit/presenters/selectMakuuchiStandings.memo.test.ts",
  "unit/presenters/stableSelectionProjections.test.ts",
  "unit/presenters/tsukebitoProjections.test.ts",
  "unit/presenters/uiModels.test.ts",
  "unit/presenters/youthAcademyProjections.test.ts",
]);

const LOCAL_FACTORY_RE =
  /(?:function|const)\s+(?:makeWorld|makeRikishi|makeHeya|mockRikishi|mockHeya|makeMockWorld|makeMockHeya|createMockWorld|createWorld)\b/;

describe("factory discipline — no new local entity factories", () => {
  it("test files outside the allowlist use canonical factories", () => {
    const testFiles = findFiles(TESTS_DIR, { exts: [".test.ts", ".test.tsx"] });
    const violations: string[] = [];

    for (const file of testFiles) {
      const rel = file.replace(SRC + "/", "").replace("tests/", "");
      if (ALLOWED_LOCAL_FACTORIES.has(rel)) continue;
      const content = readFileSync(file, "utf-8");
      if (LOCAL_FACTORY_RE.test(content)) {
        violations.push(rel);
      }
    }

    expect(
      violations,
      "New local entity factories detected — use MockFactory " +
        "(src/tests/helpers/utils/MockFactory.ts) or engine/utils.ts factories, " +
        "or document why the local factory is needed:\n" +
        violations.join("\n")
    ).toEqual([]);
  });

  it("allowlist only contains files that still define a local factory", () => {
    // Keeps the allowlist honest — entries for migrated files must be removed.
    const stale = [...ALLOWED_LOCAL_FACTORIES].filter((rel) => {
      try {
        return !LOCAL_FACTORY_RE.test(readFileSync(join(TESTS_DIR, rel), "utf-8"));
      } catch {
        return true; // file gone — entry is stale
      }
    });
    expect(
      stale,
      "Allowlist entries whose file no longer defines a local factory " +
        "(or was deleted) — remove them:\n" +
        stale.join("\n")
    ).toEqual([]);
  });
});
