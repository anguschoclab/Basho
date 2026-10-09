/**
 * CI Gate: function-length budget (ratchet)
 *
 * Phase-2 refactoring gate — authored RED before any split lands.
 *
 * Budget model:
 * - No function/arrow/method may exceed 150 LOC.
 * - No const-object service or data literal may exceed 250 LOC without a
 *   `// refactor-budget-waiver: <reason>` comment in its file.
 * - KNOWN_OVERBUDGET lists the current inventory. It is a RATCHET:
 *   entries may only be removed (as splits land), never added or inflated.
 * - The gate fails if (a) any over-budget symbol is missing from the list
 *   (new debt), or (b) a listed symbol got LONGER (drift), or (c) a listed
 *   symbol no longer exists at all without its removal being committed here
 *   (stale entries are allowed to linger one wave for bookkeeping, so a
 *   missing symbol is reported as info — but shrinking it below budget and
 *   leaving it listed is fine since the check is existence+length only).
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { scanFunctions, type Measurement } from "../../../../scripts/measureFunctions";

const __filename = fileURLToPath(import.meta.url);
const ROOT = join(__filename, "..", "..", "..", "..", "..");

const FUNCTION_BUDGET = 150;
const OBJECT_BUDGET = 250;

const isObj = (m: Measurement) => m.kind === "const-obj" || m.kind === "const-arr";

/**
 * Ratchet list — generated from docs/audit/function-lengths.csv (AST scan,
 * 2026-10-08). Every entry must shrink or be removed as its wave lands.
 */
const KNOWN_OVERBUDGET: Record<string, { loc: number; kind: string }> = {
  // boutNarrative.ts::generateBoutNarrative — split 2026-10 into bout/narrative/ beat modules


  "src/engine/bout/boutResultApplier.ts::applyBoutResult": { loc: 404, kind: "function" },
  "src/engine/systems/training/TrainingService.ts::applyWeeklyTraining": { loc: 359, kind: "function" },
  "src/engine/bout/boutResolver.ts::resolveBout": { loc: 355, kind: "function" },
  "src/engine/persistence/SerializationService.ts::SerializationService": { loc: 370, kind: "const-obj" },
  "src/engine/systems/narrative/CrisisService.ts::CrisisService": { loc: 325, kind: "const-obj" },
  "src/engine/systems/governance/YokozunaService.ts::YokozunaService": { loc: 314, kind: "const-obj" },
  "src/engine/systems/legacy/DynastyService.ts::DynastyService": { loc: 396, kind: "const-obj" },

  "src/engine/lifecycle/CompetitionService.ts::concludeBashoCompetition": { loc: 311, kind: "function" },
  "src/engine/systems/economy/GlobalCupService.ts::GlobalCupService": { loc: 299, kind: "const-obj" },
  "src/pages/TalentPoolPage.tsx::TalentPoolPage": { loc: 298, kind: "function" },
  "src/engine/systems/worldCircuit/WorldCircuitService.ts::WorldCircuitService": { loc: 292, kind: "const-obj" },
  "src/engine/bout/physics/tachiai.ts::resolveTachiaiV2": { loc: 277, kind: "function" },
  "src/engine/simulation/TournamentSimulator.ts::simulateEntireBasho": { loc: 273, kind: "function" },
  "src/engine/systems/narrative/CrisisService.ts::getRegistry": { loc: 270, kind: "method" },
  "src/engine/systems/governance/governanceReview.ts::runGovernanceReview": { loc: 264, kind: "function" },
  "src/engine/lifecycle/BashoHistory.ts::recordBashoHistory": { loc: 265, kind: "function" },
  "src/engine/matchmaking/DramaMatchmaker.ts::scoreDrama": { loc: 255, kind: "function" },
  "src/engine/simulation/SimTuningService.ts::SimTuningService": { loc: 253, kind: "const-obj" },
  "src/engine/simulation/SimTuningService.ts::calculateMetrics": { loc: 248, kind: "method" },
  "src/engine/npcAI/execution.ts::executeAgentDecisions": { loc: 251, kind: "function" },
  "src/engine/bout/physics/tickBeltBattle.ts::tickBeltBattle": { loc: 241, kind: "function" },
  "src/engine/bout/physics/tickPushBattle.ts::tickPushBattle": { loc: 231, kind: "function" },
  "src/engine/systems/governance/YokozunaService.ts::evaluateActiveYokozuna": { loc: 212, kind: "method" },
  "src/engine/simulation/AutoSimService.ts::runAutoSim": { loc: 207, kind: "function" },
  "src/engine/core/ImpactResolver.ts::_applyImpact": { loc: 206, kind: "function" },
  "src/engine/tick/phases/phase06_yearly_boundary.ts::phase06_yearly_boundary": { loc: 199, kind: "function" },




  "src/engine/tick/phases/phase05_monthly_boundary.ts::phase05_monthly_boundary": { loc: 183, kind: "function" },
  "src/engine/banzuke.ts::updateBanzuke": { loc: 182, kind: "function" },

  "src/engine/bout/KimariteSelectionEngine.ts::evaluate": { loc: 181, kind: "method" },


  "src/engine/bout/boutGrip.ts::evolveGripGeometry": { loc: 178, kind: "function" },

  "src/pages/SchedulePage.tsx::SchedulePage": { loc: 176, kind: "function" },
  "src/components/scouting/OpponentScoutingTab.tsx::OpponentScoutingTab": { loc: 174, kind: "function" },
  "src/components/rikishi/RankBadge.tsx::RankBadge": { loc: 173, kind: "function" },
  "src/engine/lifecycle/rookieFactory.ts::_generateRookie": { loc: 173, kind: "function" },
  "src/engine/lifecycle/PrizeDistribution.ts::distributePrizes": { loc: 173, kind: "function" },
  "src/engine/tick/phases/phase01_week_governance.ts::phase01_week_governance": { loc: 172, kind: "function" },
  "src/components/layout/EventLogPanel.tsx::EventLogPanel": { loc: 170, kind: "function" },
  "src/components/game/CrisisModal.tsx::CrisisModal": { loc: 170, kind: "function" },
  "src/components/dashboard/ActionQueueWidget.tsx::ActionQueueWidget": { loc: 169, kind: "function" },
  "src/engine/agents/CrisisAgent.ts::spawnCrisisAgent": { loc: 168, kind: "function" },
  "src/components/economy/DebtSection.tsx::DebtSection": { loc: 166, kind: "function" },
  "src/contexts/bashoSlice.ts::bashoSlice": { loc: 162, kind: "function" },
  "src/components/dashboard/CalendarWidget.tsx::CalendarWidget": { loc: 160, kind: "function" },
  "src/components/wizard/IdentityStep.tsx::IdentityStep": { loc: 159, kind: "function" },
  "src/components/dashboard/PromotionPipelineWidget.tsx::PromotionPipelineWidget": { loc: 156, kind: "function" },
  "src/components/game/InstitutionPanel.tsx::InstitutionPanel": { loc: 155, kind: "function" },
  "src/components/kesho/keshoPatterns.tsx::renderBasePattern": { loc: 153, kind: "function" },
  "src/engine/bout/physics/edgeCrisis.ts::tickEdgeCrisis": { loc: 153, kind: "function" },
  "src/components/game/BanzukeReveal.tsx::BanzukeReveal": { loc: 151, kind: "function" },
  "src/engine/bout/boutGrip.ts::initBeltBattle": { loc: 151, kind: "function" },
};

/** Anonymous over-budget functions are tracked as a per-file count (line-keyed names are unstable). */
const ANON_ALLOWANCE: Record<string, number> = {
  "src/components/game/BoutCard.tsx": 1,
  "src/engine/bout/boutNarrative.ts": 1,
  "src/engine/systems/training/TrainingService.ts": 1,
  "src/pages/HistoryPage.tsx": 1,
};

const WAIVER = "refactor-budget-waiver";

function hasWaiver(file: string): boolean {
  const abs = join(ROOT, file);
  return existsSync(abs) && readFileSync(abs, "utf8").includes(WAIVER);
}

const all = scanFunctions(30);
const byKey = new Map<string, Measurement>();
for (const m of all) byKey.set(`${m.file}::${m.symbol}`, m);

describe("CI Gate: function-length budget (ratchet)", () => {
  it("no NEW over-budget symbols beyond the known list", () => {
    const over = all.filter((m) => (isObj(m) ? m.loc > OBJECT_BUDGET : m.loc > FUNCTION_BUDGET));
    const unknown = over.filter(
      (m) =>
        !m.symbol.startsWith("anonymous@") &&
        !KNOWN_OVERBUDGET[`${m.file}::${m.symbol}`] &&
        !hasWaiver(m.file),
    );
    expect(
      unknown.map((m) => `${m.file}::${m.symbol} (${m.kind}, ${m.loc} LOC)`),
      `new over-budget symbols must be split, not listed`,
    ).toEqual([]);
  });

  it("anonymous over-budget functions stay within per-file allowance", () => {
    const counts = new Map<string, number>();
    for (const m of all) {
      if (!m.symbol.startsWith("anonymous@")) continue;
      const budget = isObj(m) ? OBJECT_BUDGET : FUNCTION_BUDGET;
      if (m.loc <= budget) continue;
      counts.set(m.file, (counts.get(m.file) ?? 0) + 1);
    }
    const excess = [...counts].filter(([f, n]) => n > (ANON_ALLOWANCE[f] ?? 0));
    expect(excess.map(([f, n]) => `${f}: ${n} (allowed ${ANON_ALLOWANCE[f] ?? 0})`)).toEqual([]);
  });

  it("listed symbols must not exceed their recorded length (no drift up)", () => {
    const drifted: string[] = [];
    for (const [key, info] of Object.entries(KNOWN_OVERBUDGET)) {
      const m = byKey.get(key);
      if (m && m.loc > info.loc) drifted.push(`${key}: ${info.loc} -> ${m.loc}`);
    }
    expect(drifted).toEqual([]);
  });

  it("listed symbols that still exist must remain in KNOWN_OVERBUDGET only if still over budget", () => {
    // A symbol that shrank below budget must be removed from the list when its
    // wave lands — flagging keeps the ratchet honest.
    const staleOk: string[] = [];
    for (const [key, info] of Object.entries(KNOWN_OVERBUDGET)) {
      const m = byKey.get(key);
      const budget = info.kind === "const-obj" || info.kind === "const-arr" ? OBJECT_BUDGET : FUNCTION_BUDGET;
      if (m && m.loc <= budget) staleOk.push(`${key} now ${m.loc} LOC — remove from list`);
    }
    expect(staleOk).toEqual([]);
  });

  it("files >250 LOC const-objects without budget waiver are flagged", () => {
    const unwaived = all.filter(
      (m) => isObj(m) && m.loc > OBJECT_BUDGET && !KNOWN_OVERBUDGET[`${m.file}::${m.symbol}`] && !hasWaiver(m.file),
    );
    expect(unwaived.map((m) => `${m.file}::${m.symbol}`)).toEqual([]);
  });
});
