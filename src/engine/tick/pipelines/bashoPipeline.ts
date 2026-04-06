/**
 * bashoPipeline.ts
 * ================
 * Phase array for an active-tournament week.
 *
 * During a basho the economic and progression cadence is lighter — no
 * full training occurs (rikishi are competing), and welfare only handles
 * bout-sustained injuries processed separately by boutResolver.
 *
 * Phases included:
 *   1. Economy   — income / upkeep still applies during basho weeks
 *   2. Context   — recompute ActiveModifiers (financialPenalty may still hit)
 *   5. NPC AI    — rival stables still make strategic decisions
 *   6. Narrative — financial crisis events still fire if applicable
 *
 * Phases 3 (progression) and 4 (welfare) are intentionally excluded:
 *   - Training gains are paused; rikishi do not train during competition.
 *   - Injury rolling is handled by boutResolver per bout outcome.
 */

import type { PipelinePhase } from "../pipelineRunner";
import { phase01_economy } from "../phases/phase01_economy";
import { phase02_context } from "../phases/phase02_context";
import { phase05_npcAI } from "../phases/phase05_npcAI";
import { phase06_narrative } from "../phases/phase06_narrative";

export const bashoPipeline: PipelinePhase[] = [
  phase01_economy,
  phase02_context,
  phase05_npcAI,
  phase06_narrative,
];
