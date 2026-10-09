import type { WorldState } from "../../types/world";
import type { Id } from "../../types/common";
import type { PerceptionSnapshot } from "../../perception";
import {
  spawnTrainingWorker,
  spawnScoutingWorker,
  spawnPersonnelWorker,
  spawnGlobalWorker,
  rpPerception,
  type TrainingWorkerContext,
  type ScoutingWorkerContext,
  type PersonnelWorkerContext,
  type GlobalWorkerContext,
} from "../../npcAIWorkers";
import type { WeeklyContext } from "./context";

export interface WorkerProposals {
  trainingProposal: ReturnType<typeof spawnTrainingWorker>;
  scoutingProposal: ReturnType<typeof spawnScoutingWorker>;
  personnelProposal: ReturnType<typeof spawnPersonnelWorker>;
  globalProposal: ReturnType<typeof spawnGlobalWorker>;
}

export function runWeeklyWorkers(
  world: WorldState,
  heyaId: Id,
  ctx: WeeklyContext
): WorkerProposals {
  const { persona, perception, complianceCap, styleProfile, reasoning } = ctx;

  const trainingCtx: TrainingWorkerContext = {
    perception: rpPerception(perception) as PerceptionSnapshot,
    riskAppetite: persona.riskAppetite,
    welfareDiscipline: persona.welfareDiscipline,
    mood: persona.mood,
    complianceCap,
    philosophy: styleProfile?.philosophy,
    styleBias: persona.styleBias,
    tradition: persona.traits.tradition,
  };
  const trainingProposal = spawnTrainingWorker(trainingCtx);
  reasoning.push(...trainingProposal.reasoning);

  const scoutingCtx: ScoutingWorkerContext = {
    runwayBand: perception.runwayBand,
    rosterSize: perception.rosterSize,
    rosterStrengthBand: perception.rosterStrengthBand,
    ambition: persona.traits.ambition,
    hasSleeperScout: persona.quirks.includes("Sleeper Scout"),
  };
  const scoutingProposal = spawnScoutingWorker(scoutingCtx);
  reasoning.push(scoutingProposal.reason);

  const personnelCtx: PersonnelWorkerContext = {
    rikishiPerceptions: perception.rikishiPerceptions,
    welfareDiscipline: persona.welfareDiscipline,
    styleProfile,
    world,
    riskTolerance: persona.traits.risk ?? 50,
  };
  const personnelProposal = spawnPersonnelWorker(personnelCtx);
  reasoning.push(...personnelProposal.reasoning);

  const globalCtx: GlobalWorkerContext = {
    heyaId,
    ambition: persona.traits.ambition,
    riskAppetite: persona.riskAppetite,
    perception,
    pendingExhibitions: world.pendingExhibitions || [],
    world,
  };
  const globalProposal = spawnGlobalWorker(globalCtx);
  reasoning.push(...globalProposal.reasoning);

  return { trainingProposal, scoutingProposal, personnelProposal, globalProposal };
}
