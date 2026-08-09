/**
 * CornerAdvice.ts
 * ===============
 * Read-only, player-facing corner advice generated before a bout. The engine
 * uses the same opponent model and tactical matrix the CPU uses, but emits
 * recommendations instead of state impacts.
 */

import type { Rikishi } from "../types/rikishi";
import type { BoutTactic, TacticalFamily } from "../types/combat";
import type { AIRecommendation } from "../ai/types";
import { buildOpponentModel, type OpponentTacticModel } from "../npcAI/OpponentModel";
import { TACTIC_TO_FAMILY, TACTICAL_MATRIX } from "../types/combat";

export interface CornerAdviceContext {
  playerRikishi: Rikishi;
  opponent: Rikishi;
  bashoDay?: number;
  playerRecord?: { wins: number; losses: number };
}

interface CornerRecommendation {
  /** Suggested player tactic. */
  tactic: BoutTactic;
  /** Why the tactic is recommended. */
  reasoning: string;
  /** Risk of injury/fatigue if the suggested tactic is used. */
  riskLevel: "low" | "medium" | "high";
}

function familyForTactic(tactic: BoutTactic): TacticalFamily | undefined {
  return TACTIC_TO_FAMILY[tactic];
}

function counters(family: TacticalFamily): TacticalFamily[] {
  return TACTICAL_MATRIX[family] ?? [];
}

function dominantFamily(model: OpponentTacticModel): TacticalFamily {
  const entries = Object.entries(model.familyCounts) as [TacticalFamily, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? "push";
}

function pickCounterTactic(opponentFamily: TacticalFamily, player: Rikishi): BoutTactic {
  const counterFamilies = counters(opponentFamily);
  // Pick the first counter family the player's stats can execute well.
  const canBelt = (player.stats?.technique ?? 50) >= 45;
  const canPush = (player.stats?.power ?? 50) >= 45;
  const canTrick = (player.stats?.speed ?? 50) >= 45;

  for (const family of counterFamilies) {
    if (family === "belt" && canBelt) return "YOTSU_BELT";
    if (family === "push" && canPush) return "OSHI_THRUST";
    if (family === "trick" && canTrick) return "HENKA";
  }
  return "STANDARD";
}

function buildRecommendation(ctx: CornerAdviceContext): CornerRecommendation {
  const { playerRikishi, opponent } = ctx;
  const model = buildOpponentModel(opponent);
  const opponentFamily = dominantFamily(model);
  const tactic = pickCounterTactic(opponentFamily, playerRikishi);
  const playerFamily = familyForTactic(tactic) ?? "push";

  const riskLevel: CornerRecommendation["riskLevel"] =
    tactic === "ALL_OUT" || tactic === "OSHI_THRUST"
      ? "high"
      : tactic === "HENKA"
        ? "medium"
        : "low";

  const fatigueWarning =
    (playerRikishi.fatigue ?? 0) > 70
      ? " Your rikishi is fatigued; consider a safer approach."
      : "";

  const recordNote =
    ctx.playerRecord && ctx.bashoDay === 15 && ctx.playerRecord.losses >= 8
      ? " A losing record is on the line — aggression may be necessary."
      : "";

  const reasoning = `Opponent trends ${opponentFamily}; ${tactic} (${playerFamily}) counters it.${fatigueWarning}${recordNote}`;

  return { tactic, reasoning, riskLevel };
}

/**
 * Generate player-facing corner advice for the upcoming bout.
 * Returns one or more `AIRecommendation` objects suitable for UI projection.
 */
export function getAdvice(ctx: CornerAdviceContext): AIRecommendation[] {
  const rec = buildRecommendation(ctx);
  const recommendations: AIRecommendation[] = [
    {
      id: `corner-advice-${ctx.opponent.id}-${ctx.bashoDay ?? 0}`,
      category: "bout",
      priority:
        rec.riskLevel === "high" ? "critical" : rec.riskLevel === "medium" ? "high" : "medium",
      title: `Suggested tactic: ${rec.tactic}`,
      detail: rec.reasoning,
      relatedEntityId: ctx.opponent.id,
      suggestedAction: rec.tactic,
      reasoning: [
        `Opponent model dominant family: ${dominantFamily(buildOpponentModel(ctx.opponent))}`,
        `Player fatigue: ${ctx.playerRikishi.fatigue ?? 0}`,
      ],
    },
  ];

  if ((ctx.playerRikishi.fatigue ?? 0) > 70 && rec.tactic !== "STANDARD") {
    recommendations.push({
      id: `corner-warning-fatigue-${ctx.opponent.id}-${ctx.bashoDay ?? 0}`,
      category: "bout",
      priority: "high",
      title: "Fatigue warning",
      detail: "Your rikishi is exhausted. An aggressive tactic raises injury risk.",
      relatedEntityId: ctx.playerRikishi.id,
      suggestedAction: "STANDARD",
      reasoning: ["High fatigue reduces effectiveness of intensity tactics."],
    });
  }

  return recommendations;
}
