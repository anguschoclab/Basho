/**
 * YokozunaService.ts
 * ==================
 * Manages the high-stakes politics of Yokozuna promotion and the YDC.
 * (Phase Q: Promotion Politics)
 */

import { WorldState } from "../../types/world";
import type { Rikishi } from "../../types/rikishi";
import type { BashoPerformance } from "../../types/banzuke";
import { createImpactBuilder } from "../../core/ImpactBuilder";
import { StateImpact } from "../../core/StateImpact";
import { getRikishi } from "../../queries";
import { BardEngine } from "../../bard/BardEngine";
import { rngFromSeed } from "../../rng";

const YDC_CHAIRMAN_SURNAMES = [
  "Hanzawa",
  "Morita",
  "Tanahashi",
  "Kuroda",
  "Nakamura",
  "Ishikawa",
  "Fujimoto",
  "Otsuka",
  "Yamamoto",
  "Sato",
];
const YDC_CHAIRMAN_GIVEN_NAMES = [
  "Tadashi",
  "Katsuyoshi",
  "Masahiro",
  "Hirofumi",
  "Noboru",
  "Shigeru",
  "Tatsuo",
  "Kenshin",
  "Yoshiaki",
  "Renji",
];

function getChairmanName(worldSeed: string): string {
  const rng = rngFromSeed(`ydc-chairman-${worldSeed}`, "narrative", "chairman");
  const surname = rng.pick(YDC_CHAIRMAN_SURNAMES);
  const given = rng.pick(YDC_CHAIRMAN_GIVEN_NAMES);
  return `${given} ${surname}`;
}

export interface YDCCandidate {
  rikishiId: string;
  name: string;
  performances: BashoPerformance[];
  sentiment: number; // 0..100
  recommendation: "promote" | "watch" | "reject";
  reasons: string[];
}

export const YokozunaService = {
  /**
   * Evaluates an Ozeki for potential Yokozuna promotion.
   * Standard requirement: 2 consecutive Yusho.
   * "Equivalent" requirement: 1 Yusho + 1 Jun-Yusho + High Dignity (Media/Reputation).
   */
  evaluateCandidate(world: WorldState, rikishi: Rikishi): YDCCandidate | null {
    if (rikishi.rank !== "yokozuna" && rikishi.rank !== "ozeki") {
      // Only Ozeki can be candidates, but let's check recent history
    }
    if (rikishi.rank !== "ozeki") return null;

    const history = world.history.slice(-2); // Last 2 basho
    if (history.length < 2) return null;

    // In a real implementation, we'd look at specifically this rikishi's performance record
    // For now, we simulate the 'equivalent' check
    const winsLast = rikishi.currentBashoWins ?? 0;
    const isYushoLast = winsLast >= 14; // Simplified check

    // We'll need a way to look back further, but for this Phase P logic:
    const reputation = rikishi.economics?.popularity ?? 50;

    let sentiment = 0;
    const reasons: string[] = [];

    // Base sentiment on wins
    sentiment += (winsLast - 8) * 5;

    if (isYushoLast) {
      sentiment += 40;
      reasons.push("Recent Tournament Champion");
    }

    // Add Political/Dignity factors
    sentiment += reputation / 4;
    if (reputation > 80) reasons.push("High Public Dignity (Hinkaku)");

    let recommendation: "promote" | "watch" | "reject" = "reject";
    if (sentiment >= 85) recommendation = "promote";
    else if (sentiment >= 65) recommendation = "watch";

    return {
      rikishiId: rikishi.id,
      name: rikishi.shikona,
      performances: [], // Should be populated from historical banzuke records
      sentiment,
      recommendation,
      reasons,
    };
  },

  /**
   * Process the YDC Meeting during the post-basho transition.
   */
  processYDCCouncil(world: WorldState): StateImpact {
    const builder = createImpactBuilder("processYDCCouncil");

    // Find Ozeki candidates
    for (const rikishiId of world.activeRikishiIds) {
      const rikishi = getRikishi(world, rikishiId);
      if (!rikishi || rikishi.rank !== "ozeki") continue;
      const evaluation = this.evaluateCandidate(world, rikishi);
      if (evaluation && evaluation.recommendation !== "reject") {
        builder.logEvent(
          "GOVERNANCE_RULING",
          "promotion",
          {
            rikishiId: rikishi.id,
            status: evaluation.recommendation,
            incident:
              evaluation.recommendation === "promote"
                ? `The YDC recommends ${rikishi.shikona} for promotion to Yokozuna.`
                : `The YDC is monitoring ${rikishi.shikona} for potential promotion.`,
            score: Math.floor(evaluation.sentiment),
          },
          { heyaId: rikishi.heyaId, importance: "headline" }
        );

        if (evaluation.recommendation === "promote") {
          // High-stakes promotion trigger
          // Note: Banzuke update will handle the actual rank flip next cycle
          builder.addMetadata("yokozuna_recommendation", rikishi.id);
        }
      }
    }

    // YDC Accountability: evaluate existing Yokozuna for warnings, encouragement, or retirement pressure
    this.evaluateActiveYokozuna(world, builder);

    return builder.build();
  },

  /**
   * Evaluate active Yokozuna for YDC accountability statements.
   * Generates public and private YDC statements based on:
   * - Win/loss record (make-koshi triggers warning)
   * - absentFinalDay (triggers absence criticism)
   * - kihakuIsenScore (high score triggers praise)
   * - consecutiveMakeKoshi (high count triggers private cynicism)
   */
  evaluateActiveYokozuna(world: WorldState, builder: ReturnType<typeof createImpactBuilder>): void {
    const chairmanName = getChairmanName(`${world.year}-${world.currentBashoName ?? "hatsu"}`);

    for (const rikishiId of world.activeRikishiIds) {
      const rikishi = getRikishi(world, rikishiId);
      if (!rikishi || rikishi.rank !== "yokozuna") continue;

      const wins = rikishi.currentBashoWins ?? 0;
      const losses = rikishi.currentBashoLosses ?? 0;
      const isMakeKoshi = losses > wins;
      const isKachiKoshi = wins > losses;
      const absentFinalDay = rikishi.absentFinalDay === true;
      const consecutiveMK = rikishi.consecutiveMakeKoshi ?? 0;
      const kihakuScore = rikishi.kihakuIsenScore ?? 50;

      const ydcRng = rngFromSeed(
        `ydc-${rikishiId}-${world.year}-${world.currentBashoName ?? "hatsu"}`,
        "narrative",
        "ydc"
      );

      // Build references array — specific items the YDC statement references
      const references: string[] = [];
      if (isKachiKoshi && kihakuScore >= 75) references.push("Kihaku Isen");
      if (absentFinalDay) references.push("absence on final day");
      if (isMakeKoshi) references.push("make-koshi record");
      if (consecutiveMK >= 2) references.push("promotion pledge");

      // Praise for high fighting spirit and kachi-koshi
      if (isKachiKoshi && kihakuScore >= 75) {
        const line = BardEngine.resolve(ydcRng, "ydc_accountability.praise", {
          SHIKONA: rikishi.shikona,
          rikishiId: rikishi.id,
          CHAIRMAN: chairmanName,
        });
        if (line.text) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "promotion",
            {
              rikishiId: rikishi.id,
              shikona: rikishi.shikona,
              status: "praise",
              incident: "YDC Praise",
              statement: line.text,
              score: kihakuScore,
              chairmanName,
              references,
              publicStatement: line.text,
              privateSentiment: "genuine satisfaction",
            },
            { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "notable" }
          );
        }
      }

      // Absence criticism for missing final day
      if (absentFinalDay) {
        const line = BardEngine.resolve(ydcRng, "ydc_accountability.absence_criticism", {
          SHIKONA: rikishi.shikona,
          rikishiId: rikishi.id,
          CHAIRMAN: chairmanName,
        });
        if (line.text) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "discipline",
            {
              rikishiId: rikishi.id,
              shikona: rikishi.shikona,
              status: "absence_criticism",
              incident: "YDC Absence Criticism",
              statement: line.text,
              chairmanName,
              references,
              publicStatement: line.text,
              privateSentiment: "displeasure",
            },
            { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "major" }
          );
        }
      }

      // Warning for make-koshi
      if (isMakeKoshi) {
        let templatePath = "ydc_accountability.warning";
        if (consecutiveMK >= 2) {
          templatePath = "ydc_accountability.demand_reflection";
        }
        const line = BardEngine.resolve(ydcRng, templatePath, {
          SHIKONA: rikishi.shikona,
          rikishiId: rikishi.id,
          CHAIRMAN: chairmanName,
        });
        if (line.text) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "discipline",
            {
              rikishiId: rikishi.id,
              shikona: rikishi.shikona,
              status: consecutiveMK >= 2 ? "demand_reflection" : "warning",
              incident: "YDC Warning",
              statement: line.text,
              consecutiveMakeKoshi: consecutiveMK,
              chairmanName,
              references,
              publicStatement: line.text,
              privateSentiment: consecutiveMK >= 2 ? "frustration" : "concern",
            },
            { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "major" }
          );
        }

        // Private cynicism for repeated make-koshi — divergence between public and private sentiment
        if (consecutiveMK >= 3) {
          const cynicismLine = BardEngine.resolve(ydcRng, "ydc_accountability.private_cynicism", {
            SHIKONA: rikishi.shikona,
            rikishiId: rikishi.id,
            CHAIRMAN: chairmanName,
          });
          if (cynicismLine.text) {
            builder.logEvent(
              "GOVERNANCE_RULING",
              "discipline",
              {
                rikishiId: rikishi.id,
                shikona: rikishi.shikona,
                status: "private_cynicism",
                incident: "YDC Private Cynicism",
                statement: cynicismLine.text,
                consecutiveMakeKoshi: consecutiveMK,
                chairmanName,
                references,
                publicStatement: line.text,
                privateSentiment: cynicismLine.text,
              },
              { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "minor" }
            );
          }
        }
      } else if (isKachiKoshi && kihakuScore < 75 && kihakuScore >= 50) {
        // Encouragement for adequate but not spectacular performance
        const line = BardEngine.resolve(ydcRng, "ydc_accountability.encouragement", {
          SHIKONA: rikishi.shikona,
          rikishiId: rikishi.id,
          CHAIRMAN: chairmanName,
        });
        if (line.text) {
          builder.logEvent(
            "GOVERNANCE_RULING",
            "promotion",
            {
              rikishiId: rikishi.id,
              shikona: rikishi.shikona,
              status: "encouragement",
              incident: "YDC Encouragement",
              statement: line.text,
              score: kihakuScore,
              chairmanName,
              references,
              publicStatement: line.text,
              privateSentiment: "cautious optimism",
            },
            { rikishiId: rikishi.id, heyaId: rikishi.heyaId, importance: "minor" }
          );
        }
      }
    }
  },
};
