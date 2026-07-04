/**
 * LoopDecisionEngine.ts
 * Generates pending decisions based on world state, blocking progression until resolved.
 */

import type { WorldState } from "../types/world";
import { createImpactBuilder, type ImpactBuilder } from "../core/ImpactBuilder";
import type { StateImpact } from "../core/StateImpact";
import { issueBailoutLoanIfNeeded } from "../loans";

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

/** Pure: which decisions are due this tick for the player heya (no world mutation). */
export function detectDueDecisions(world: WorldState): LoopDecision[] {
  const out: LoopDecision[] = [];
  const currentWeek = world.week ?? 1;
  const playerHeyaId = world.playerHeyaId;
  const playerHeya = playerHeyaId ? world.heyas.get(playerHeyaId) : undefined;
  const existing = world.pendingDecisions ?? [];
  if (!playerHeya) return out;

  // Decision 1: Pre-basho readiness (BLOCKING)
  if (world.cyclePhase === "pre_basho") {
    const atRisk = (playerHeya.rikishiIds ?? []).filter((id) => {
      const r = world.rikishi.get(id);
      return !!r && ((r.fatigue ?? 0) > 60 || r.injured === true);
    });
    if (atRisk.length > 0 && !existing.some((d) => d.type === "pre_basho_readiness")) {
      out.push({
        id: makeId("prebasho", world.seed, world),
        type: "pre_basho_readiness",
        description: `${atRisk.length} wrestler(s) enter the basho fatigued or injured. Rest them or push for rank?`,
        deadlineWeek: currentWeek + 1,
        required: true,
        options: [
          {
            id: "rest",
            label: "Rest At-Risk Wrestlers",
            impact: "Lower injury risk; some lost conditioning (-momentum).",
          },
          {
            id: "push",
            label: "Push For Rank",
            impact: "Keep conditioning; accept the injury risk.",
          },
        ],
      });
    }
  }

  // Decision 2: Insolvency response (BLOCKING)
  if (
    (playerHeya.runwayBand === "critical" || playerHeya.runwayBand === "desperate") &&
    !existing.some((d) => d.type === "insolvency_response")
  ) {
    out.push({
      id: makeId("insolvency", world.seed, world),
      type: "insolvency_response",
      description: `Stable finances are ${playerHeya.runwayBand}. Choose a response:`,
      deadlineWeek: currentWeek + 1,
      required: true,
      options: [
        { id: "loan", label: "Take Emergency Loan", impact: "Cash now; monthly debt repayments." },
        { id: "austerity", label: "Austerity Diet", impact: "Cut costs; raises welfare risk." },
      ],
    });
  }

  // Decision 3: Weekly training emphasis (QUEUE)
  if (
    world.cyclePhase === "interim" &&
    world.trainingState?.get(playerHeya.id) &&
    !existing.some((d) => d.type === "weekly_training_emphasis")
  ) {
    out.push({
      id: makeId("training", world.seed, world),
      type: "weekly_training_emphasis",
      description: "Set this week's training emphasis:",
      deadlineWeek: currentWeek + 1,
      required: false,
      options: [
        {
          id: "intensive",
          label: "Intensive",
          impact: "Faster gains; more fatigue and injury risk.",
        },
        { id: "conservative", label: "Conservative", impact: "Slower gains; safer." },
      ],
    });
  }

  // Decision 4: Welfare diet (QUEUE)
  if (
    (playerHeya.welfareState?.welfareRisk ?? 0) > 60 &&
    !existing.some((d) => d.type === "welfare_diet")
  ) {
    out.push({
      id: makeId("welfare", world.seed, world),
      type: "welfare_diet",
      description: `Welfare risk is high (${playerHeya.welfareState?.welfareRisk}). Adjust the diet?`,
      deadlineWeek: currentWeek + 1,
      required: false,
      options: [
        { id: "premium", label: "Premium Diet", impact: "Lowers welfare risk; higher cost." },
        { id: "maintenance", label: "Maintenance Diet", impact: "Cheaper; risk persists." },
      ],
    });
  }

  // Decision 5: Kyujo decision (BLOCKING) — injured player rikishi scheduled today
  if (world.cyclePhase === "active_basho" && world.currentBasho) {
    const bashoDay = world.currentBasho.day;
    const todayMatches = world.currentBasho.matches.filter(
      (m) => m.day === bashoDay && !m.result,
    );
    for (const match of todayMatches) {
      const eastR = match.eastRikishiId ? world.rikishi.get(match.eastRikishiId) : undefined;
      const westR = match.westRikishiId ? world.rikishi.get(match.westRikishiId) : undefined;
      const playerSide = playerHeyaId
        ? eastR?.heyaId === playerHeyaId
          ? "east"
          : westR?.heyaId === playerHeyaId
            ? "west"
            : null
        : null;
      if (!playerSide) continue;

      const rikishiId = playerSide === "east" ? match.eastRikishiId : match.westRikishiId;
      const r = playerSide === "east" ? eastR : westR;
      if (!r || !r.injured || r.isKyujo) continue;

      const severity = r.injuryStatus?.severity ?? "minor";
      if (severity === "minor") continue;

      const decisionId = `kyujo_${rikishiId}_${bashoDay}`;
      if (existing.some((d) => d.id === decisionId)) continue;

      const injuryRiskPct = severity === "serious" ? 40 : 20;
      out.push({
        id: decisionId,
        type: "kyujo_decision",
        description: `${r.shikona} is injured (${severity}). Competing today carries a ~${injuryRiskPct}% injury risk. Withdraw or compete?`,
        deadlineWeek: currentWeek,
        required: true,
        options: [
          {
            id: "compete",
            label: "Compete",
            impact: `Bout proceeds at elevated injury risk (~${injuryRiskPct}%)`,
          },
          {
            id: "withdraw",
            label: "Withdraw (Kyujo)",
            impact: "Forfeit today's bout. Protect long-term health.",
          },
        ],
      });
    }
  }

  return out;
}

/**
 * Evaluate world state and return any new pending decisions as a StateImpact.
 * Non-blocking decisions are appended; blocking decisions set `world.pendingCrisis`.
 */
export function evaluatePendingDecisions(world: WorldState): StateImpact {
  const builder = createImpactBuilder("evaluatePendingDecisions");
  if (world._autonomousSim) return builder.build();

  const existing = world.pendingDecisions ?? [];
  const newDecisions = detectDueDecisions(world);

  if (newDecisions.length > 0) {
    builder.updateWorldField("pendingDecisions", [...existing, ...newDecisions]);
  }

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
 * Write a COMPLETE training profile with the given intensity, preserving the heya's
 * other profile fields. Writing only the nested `activeProfile.intensity` would persist
 * a partial profile (missing focus/styleBias/recovery) onto a heya with no prior
 * trainingState, which crashed the training tick.
 */
function setTrainingIntensity(
  builder: ImpactBuilder,
  world: WorldState,
  heyaId: string,
  intensity: string
): void {
  const current = world.trainingState?.get(heyaId);
  const cp = current?.activeProfile;
  builder.updateTrainingState(heyaId, {
    heyaId,
    activeProfile: {
      intensity: intensity as never,
      focus: (cp?.focus ?? "neutral") as never,
      styleBias: (cp?.styleBias ?? "neutral") as never,
      recovery: (cp?.recovery ?? "normal") as never,
    },
    focusSlots: current?.focusSlots ?? [],
  } as never);
}

/** Apply a decision option's real engine effect to the builder. Shared by the
 *  interactive (resolveLoopDecision) and autonomous (auto-resolve) paths. */
export function applyDecisionEffect(
  world: WorldState,
  builder: ImpactBuilder,
  decisionType: string,
  optionId: string,
  decisionId?: string
): void {
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
  if (!heya) return;

  if (decisionType === "pre_basho_readiness") {
    for (const id of heya.rikishiIds ?? []) {
      const r = world.rikishi.get(id);
      if (!r) continue;
      if (optionId === "rest" && ((r.fatigue ?? 0) > 60 || r.injured)) {
        builder.updateRikishi(id, {
          fatigue: Math.max(0, (r.fatigue ?? 0) - 20),
          momentum: Math.max(0, (r.momentum ?? 50) - 5),
        });
      } else if (optionId === "push") {
        // Accept injury risk: boost fatigue heading into the basho so per-bout
        // injury rolls are more likely to fire throughout the tournament.
        builder.updateRikishi(id, {
          fatigue: Math.min(100, (r.fatigue ?? 0) + 15),
          momentum: Math.min(100, (r.momentum ?? 50) + 8),
        });
      }
    }
  }
  if (decisionType === "insolvency_response") {
    if (optionId === "loan") builder.merge(issueBailoutLoanIfNeeded(world, heya.id));
    else if (optionId === "austerity")
      builder.updateHeya(heya.id, {
        welfareState: { ...heya.welfareState, activeDiet: "austerity" },
      } as never);
  }
  if (
    decisionType === "weekly_training_emphasis" &&
    (optionId === "intensive" || optionId === "conservative")
  ) {
    setTrainingIntensity(builder, world, heya.id, optionId);
  }
  if (decisionType === "welfare_diet" && (optionId === "premium" || optionId === "maintenance")) {
    builder.updateHeya(heya.id, {
      welfareState: { ...heya.welfareState, activeDiet: optionId },
    } as never);
  }
  if (decisionType === "kyujo_decision" && decisionId) {
    const parts = decisionId.split("_");
    const rikishiId = parts.slice(1, -1).join("_");
    if (optionId === "withdraw") {
      const r = world.rikishi.get(rikishiId);
      if (r) {
        builder.updateRikishi(rikishiId, {
          isKyujo: true,
          kyujoReason: "injury",
          medicalCertificate: {
            injury: r.injuryStatus?.type ?? "unknown",
            severity: r.injuryStatus?.severity ?? "moderate",
            treatmentWeeks: r.injuryWeeksRemaining,
            submittedDate: world.calendar?.currentWeek ?? 0,
          },
        });
      }
    } else if (optionId === "compete") {
      const r = world.rikishi.get(rikishiId);
      const mult = r?.injuryStatus?.severity === "serious" ? 2.0 : 1.5;
      builder.updateWorldField("transientContext", {
        ...world.transientContext,
        dailyInjuryRiskOverrides: {
          ...(world.transientContext?.dailyInjuryRiskOverrides ?? {}),
          [rikishiId]: mult,
        },
      } as never);
    }
  }
}

/** Build a human-readable consequence summary from the actual world state. */
function decisionConsequenceSummary(
  world: WorldState,
  decisionType: string,
  optionId: string
): string {
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;
  switch (decisionType) {
    case "pre_basho_readiness": {
      if (optionId !== "rest") return "Pushed for rank — no rest, injury risk accepted.";
      const n = (heya?.rikishiIds ?? []).filter((id) => {
        const r = world.rikishi.get(id);
        return !!r && ((r.fatigue ?? 0) > 60 || r.injured);
      }).length;
      return `Rested ${n} at-risk wrestler${n === 1 ? "" : "s"} (−20 fatigue each, −5 momentum).`;
    }
    case "insolvency_response":
      return optionId === "loan"
        ? "Emergency loan secured — monthly repayments now apply."
        : "Switched to austerity diet to cut costs (welfare risk rises).";
    case "weekly_training_emphasis":
      return `Training emphasis set to ${optionId}.`;
    case "welfare_diet":
      return `Diet set to ${optionId} (welfare risk ${optionId === "premium" ? "eases" : "unchanged"}).`;
    case "kyujo_decision":
      return optionId === "withdraw"
        ? "Withdrew injured wrestler (kyujo). Bout forfeited."
        : "Competed through injury — elevated injury risk accepted.";
    default:
      return "Decision resolved.";
  }
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

  applyDecisionEffect(world, builder, decision.type, optionId, decision.id);

  const summary = decisionConsequenceSummary(world, decision.type, optionId);
  builder.logEvent(
    "DECISION_RESOLVED",
    "narrative",
    { title: "Decision Resolved", summary, decisionType: decision.type, optionId },
    world.playerHeyaId
      ? { heyaId: world.playerHeyaId, importance: "notable" }
      : { importance: "notable" }
  );

  return builder.build();
}

type DelegationPolicy = "conservative" | "balanced" | "aggressive";

/** Default option each policy picks per decision type when auto-delegating. */
const DELEGATION_DEFAULTS: Record<DelegationPolicy, Record<string, string>> = {
  conservative: {
    pre_basho_readiness: "rest",
    insolvency_response: "loan",
    weekly_training_emphasis: "conservative",
    welfare_diet: "premium",
    kyujo_decision: "withdraw",
  },
  balanced: {
    pre_basho_readiness: "rest",
    insolvency_response: "loan",
    weekly_training_emphasis: "intensive",
    welfare_diet: "maintenance",
    kyujo_decision: "withdraw",
  },
  aggressive: {
    pre_basho_readiness: "push",
    insolvency_response: "austerity",
    weekly_training_emphasis: "intensive",
    welfare_diet: "maintenance",
    kyujo_decision: "compete",
  },
};

/** Autonomous path: detect due decisions, apply the policy default, log each. Never leaves anything pending. */
export function autonomouslyResolveDecisions(
  world: WorldState,
  policy: DelegationPolicy
): StateImpact {
  const builder = createImpactBuilder("autonomouslyResolveDecisions");
  const due = detectDueDecisions(world);
  if (due.length === 0) return builder.build();
  const table = DELEGATION_DEFAULTS[policy] ?? DELEGATION_DEFAULTS.balanced;
  const heyaId = world.playerHeyaId;
  for (const d of due) {
    const optionId = table[d.type] ?? d.options[0]?.id;
    if (!optionId) continue;
    applyDecisionEffect(world, builder, d.type, optionId, d.id);
    builder.logEvent(
      "DECISION_AUTO_RESOLVED",
      "narrative",
      {
        title: "Auto-Decided",
        summary: `${d.description} → ${optionId}`,
        status: "auto_resolved",
        decisionType: d.type,
        optionId,
      },
      heyaId ? { heyaId } : undefined
    );
  }
  return builder.build();
}

/** Default option per queue decision type when the player ignores it. */
const QUEUE_DEFAULTS: Record<string, string> = {
  weekly_training_emphasis: "balanced",
  welfare_diet: "maintenance",
};

/**
 * Apply sensible defaults to non-required (queue) decisions whose deadline has
 * passed, then drop them. Keeps blocking decisions untouched (they must be
 * resolved by the player). Deterministic — pure function of world state.
 */
export function applyExpiredQueueDefaults(world: WorldState): StateImpact {
  const builder = createImpactBuilder("applyExpiredQueueDefaults");
  if (world._autonomousSim) return builder.build();
  const decisions = world.pendingDecisions ?? [];
  const currentWeek = world.week ?? 1;
  const heya = world.playerHeyaId ? world.heyas.get(world.playerHeyaId) : undefined;

  const expired = decisions.filter((d) => !d.required && currentWeek > d.deadlineWeek);
  if (expired.length === 0) return builder.build();

  for (const d of expired) {
    const def = QUEUE_DEFAULTS[d.type];
    if (!def || !heya) continue;
    if (d.type === "weekly_training_emphasis") {
      setTrainingIntensity(builder, world, heya.id, def);
    } else if (d.type === "welfare_diet") {
      builder.updateHeya(heya.id, {
        welfareState: { ...heya.welfareState, activeDiet: def },
      } as never);
    }
  }

  const remaining = decisions.filter((d) => !expired.includes(d));
  builder.updateWorldField("pendingDecisions", remaining);
  return builder.build();
}
