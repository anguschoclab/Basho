/**
 * offSeasonPipeline.ts
 * ====================
 * Phase array for the standard inter-basho training week.
 *
 * Execution order is strict per TDD §4:
 *   1. Economy   — income / upkeep → updates heya.funds
 *   2. Context   — derives ActiveModifiers from post-phase-1 balance
 *   3. Progression — applies training gains using activeModifiers
 *   4. Welfare   — recovery, healing, injury rolls
 *   5. NPC AI    — rival stable decisions
 *   6. Narrative — delta-driven Inbox / news events
 */

import type { PipelinePhase } from "../pipelineRunner";
import { phase01_economy } from "../phases/phase01_economy";
import { phase02_context } from "../phases/phase02_context";
import { phase03_progression } from "../phases/phase03_progression";
import { phase04_welfare } from "../phases/phase04_welfare";
import { phase05_npcAI } from "../phases/phase05_npcAI";
import { phase06_narrative } from "../phases/phase06_narrative";

export const offSeasonPipeline: PipelinePhase[] = [
  phase01_economy,
  phase02_context,
  phase03_progression,
  phase04_welfare,
  phase05_npcAI,
  phase06_narrative,
];
