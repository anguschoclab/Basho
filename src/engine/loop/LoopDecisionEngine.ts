/**
 * LoopDecisionEngine.ts
 * Generates pending decisions based on world state, blocking progression until resolved.
 */

import type { WorldState } from "../types/world";
import { createImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { rngFromSeed } from "../rng";

export interface LoopDecision {
  id: string;
  type: string;
  description: string;
  deadlineWeek: number;
  options: Array<{ id: string; label: string; impact: string }>;
  required: boolean;
}

// Deterministic ID: a decision of a given type/seed within a (year, week) is unique.
function makeId(prefix: string, seed: string, world: WorldState): string {
  return `${prefix}-${seed}-y${world.year ?? 0}-w${world.week ?? 0}`;
}

/**
 * Evaluate world state and return any new pending decisions as a StateImpact.
 * Non-blocking decisions are appended; blocking decisions set `world.pendingCrisis`.
 */
export function evaluatePendingDecisions(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluatePendingDecisions");
  const currentWeek = world.week ?? 1;
  const currentYear = world.year ?? 1;
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;

  const existing = world.pendingDecisions ?? [];
  const newDecisions: LoopDecision[] = [];

  // Decision 1: Recruit or Develop (interim phase, no sekitori)
  if (world.cyclePhase === "interim" && playerHeya) {
    const sekitoriCount = (playerHeya.rikishiIds ?? []).filter((id) => {
      const r = world.rikishi.get(id);
      if (!r) return false;
      const rank = r.rank ?? "";
      return rank === "yokozuna" || rank === "ozeki" || rank === "sekiwake" || rank === "komusubi" || rank === "maegashira";
    }).length;

    if (sekitoriCount === 0 && !existing.some((d) => d.type === "recruit_or_develop")) {
      const decision: LoopDecision = {
        id: makeId("recruit", world.seed, world),
        type: "recruit_or_develop",
        description:
          "Your stable has no sekitori. Choose a path to rebuild:",
        deadlineWeek: currentWeek + 4,
        required: false,
        options: [
          {
            id: "scout_youth",
            label: "Scout Youth Talent",
            impact: "Unlocks a high-potential recruit event next week.",
          },
          {
            id: "train_current",
            label: "Focus on Current Roster",
            impact: "+5% stat growth for all current rikishi this interim.",
          },
          {
            id: "recruit_veteran",
            label: "Recruit Veteran",
            impact: "Adds a 28-year-old journeyman with juryo experience.",
          },
        ],
      };
      newDecisions.push(decision);
    }
  }

  // Decision 2: Ozeki Promotion (post-basho, player rikishi at 33+ wins over 3 basho)
  if (world.cyclePhase === "post_basho" && playerHeya) {
    for (const rikishiId of playerHeya.rikishiIds ?? []) {
      const r = world.rikishi.get(rikishiId);
      if (!r || r.rank !== "sekiwake") continue;

      // Count wins over last 3 basho from rikishi per-basho records (stored in transientContext)
      const tc = world.transientContext as Record<string, unknown> | undefined;
      const bashoHistory = (tc?.bashoHistory as Record<string, { wins: number; losses: number }>[]) ?? [];
      const recentBasho = bashoHistory.slice(-3);
      const totalWins = recentBasho.reduce((sum, record) => sum + (record[rikishiId]?.wins ?? 0), 0);

      if (
        totalWins >= 33 &&
        !existing.some((d) => d.type === "ozeki_promotion" && d.description.includes(r.shikona ?? ""))
      ) {
        const decision: LoopDecision = {
          id: makeId(`ozeki-${r.id}`, world.seed, world),
          type: "ozeki_promotion",
          description: `${r.shikona ?? "Your rikishi"} has ${totalWins} wins over the last 3 basho and is eligible for ozeki promotion. Do you petition the JSA?`,
          deadlineWeek: currentWeek + 2,
          required: true,
          options: [
            {
              id: "petition",
              label: "Petition for Promotion",
              impact: "High chance of ozeki promotion; if denied, -5 mental.",
            },
            {
              id: "wait",
              label: "Wait Another Basho",
              impact: "No change; eligibility preserved.",
            },
          ],
        };
        newDecisions.push(decision);
        break; // Only one ozeki decision at a time
      }
    }
  }

  // Decision 3: Training Regime Shift (annual, pre-basho)
  if (
    world.cyclePhase === "pre_basho" &&
    currentWeek % 12 === 0 && // roughly annual
    !existing.some((d) => d.type === "training_regime")
  ) {
    const decision: LoopDecision = {
      id: makeId("train", world.seed, world),
      type: "training_regime",
      description: `Year ${currentYear}: Review your stable's training regime.`,
      deadlineWeek: currentWeek + 2,
      required: false,
      options: [
        {
          id: "power_focus",
          label: "Power Focus",
          impact: "+5% power growth, +3% injury risk for 12 weeks.",
        },
        {
          id: "technique_focus",
          label: "Technique Focus",
          impact: "+5% technique growth, -2% speed growth for 12 weeks.",
        },
        {
          id: "balanced",
          label: "Balanced Regime",
          impact: "+2% all stats, no side effects.",
        },
      ],
    };
    newDecisions.push(decision);
  }

  // Append new decisions to existing
  if (newDecisions.length > 0) {
    builder.updateWorldField("pendingDecisions", [...existing, ...newDecisions]);
  }

  // If any blocking (required) decision exists, set a pending crisis so Dashboard blocks
  const blocking = [...existing, ...newDecisions].filter((d) => d.required);
  if (blocking.length > 0 && !world.pendingCrisis) {
    const first = blocking[0];
    builder.updateWorldField("pendingCrisis", {
      id: first.id,
      type: "loop_decision",
      title: first.description,
      description: first.description,
      options: first.options.map((o) => ({
        id: o.id,
        label: o.label,
        description: o.impact,
        impactGenerator: () => createImpactBuilder("loopDecision").build(),
      })),
    } as never);
  }

  return builder.build();
}

/**
 * Resolve a loop decision by ID with a chosen option.
 * Returns StateImpact that updates the world accordingly.
 */
export function resolveLoopDecision(
  world: WorldState,
  decisionId: string,
  optionId: string
): StateImpact {
  const builder = createImpactBuilder("resolveLoopDecision");
  const decisions = world.pendingDecisions ?? [];
  const decision = decisions.find((d) => d.id === decisionId);

  if (!decision) return builder.build();

  // Remove the resolved decision
  const remaining = decisions.filter((d) => d.id !== decisionId);
  builder.updateWorldField("pendingDecisions", remaining);

  // Clear pendingCrisis if this was the blocking decision
  if (world.pendingCrisis?.id === decisionId) {
    builder.updateWorldField("pendingCrisis", undefined as never);
  }

  // Apply option-specific effects (simplified)
  if (decision.type === "training_regime") {
    // Deterministic regime flag consumed by phase01_week_training.
    builder.updateWorldField("transientContext", {
      ...world.transientContext,
      trainingRegime: optionId, // "power_focus" | "technique_focus" | "balanced"
    } as never);
  }

  if (decision.type === "recruit_or_develop") {
    if (optionId === "train_current") {
      // Apply +5% growth buff to all player rikishi (stored in transientContext)
      builder.updateWorldField("transientContext", {
        ...world.transientContext,
        trainingGrowthBuff: 1.05,
      } as never);
    } else if (optionId === "scout_youth" || optionId === "recruit_veteran") {
      // Flag a recruitment intent the recruitment phase can act on next tick.
      builder.updateWorldField("transientContext", {
        ...world.transientContext,
        recruitmentIntent: optionId,
      } as never);
    }
  }

  if (decision.type === "ozeki_promotion" && optionId === "petition") {
    // 80% success chance
    const rng = rngFromSeed(`loop_ozeki_${world.seed}_${decisionId}`, "loop", "petition");
    const success = rng.next() < 0.8;
    if (success) {
      // Find the rikishi and promote
      const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
      if (heya) {
        for (const rid of heya.rikishiIds ?? []) {
          const r = world.rikishi.get(rid);
          if (r && r.rank === "sekiwake") {
            builder.updateRikishi(rid, { rank: "ozeki" as never });
            break;
          }
        }
      }
    } else {
      // Denied: -5 mental to the candidate
      const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
      if (heya) {
        for (const rid of heya.rikishiIds ?? []) {
          const r = world.rikishi.get(rid);
          if (r && r.rank === "sekiwake") {
            builder.updateRikishi(rid, {
              stats: { ...r.stats, mental: Math.max(0, r.stats.mental - 5) },
            });
            break;
          }
        }
      }
    }
  }

  return builder.build();
}
