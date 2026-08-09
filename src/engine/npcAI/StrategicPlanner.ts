/**
 * StrategicPlanner.ts
 * ===================
 * Selects a multi-week strategic plan for an NPC heya based on its current
 * perception, league standing, and oyakata archetype. The selection is
 * deterministic and produces a typed `AIPlan` consumed by the
 * `TacticalCoordinator` and stored in oyakata memory.
 */

import type { AIContext, AIPlan, AIGoal, AIConstraint } from "../ai/types";
import type { PerceptionSnapshot } from "../perception";
import type { LeaguePerception } from "../ai/types";
import { getHeya } from "../queries";

interface PlanTemplate {
  planId: string;
  estimatedWeeks: number;
  goals: AIGoal[];
  constraints: AIConstraint[];
  score: (ctx: AIContext, perception: PerceptionSnapshot, league: LeaguePerception) => number;
  reason: string;
}

function hasYushoLeaderInHeya(ctx: AIContext, league: LeaguePerception): boolean {
  const heya = getHeya(ctx.world, ctx.heyaId);
  if (!heya) return false;
  const rikishiIds = new Set(heya.rikishiIds ?? []);
  return league.yushoRace.leaders.some((l) => rikishiIds.has(l.rikishiId));
}

function involvedInRivalryCluster(ctx: AIContext, league: LeaguePerception): boolean {
  const heya = getHeya(ctx.world, ctx.heyaId);
  if (!heya) return false;
  const ids = new Set(heya.rikishiIds ?? []);
  return league.rivalryClusters.some((c) => ids.has(c.keyRikishiId));
}

function hasStrongRoster(perception: PerceptionSnapshot): boolean {
  return perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong";
}

function hasWeakRoster(perception: PerceptionSnapshot): boolean {
  return perception.rosterStrengthBand === "developing" || perception.rosterStrengthBand === "weak";
}

const PLAN_CATALOG: PlanTemplate[] = [
  {
    planId: "yokozuna_push",
    estimatedWeeks: 8,
    goals: [
      { domain: "rank", target: "win_yusho", priority: 10 },
      { domain: "reputation", target: "secure_ichimon_leadership", priority: 7 },
    ],
    constraints: [
      { domain: "finance", type: "min_reserve", value: 6 },
      { domain: "training", type: "max_intensity", value: "intensive" },
    ],
    score: (ctx, perception, league) => {
      let s = 0;
      if (hasStrongRoster(perception)) s += 25;
      if (hasYushoLeaderInHeya(ctx, league)) s += 30;
      if (league.yushoRace.leaders.length > 0 && !league.yushoRace.isClinched) s += 15;
      if (perception.runwayBand === "comfortable" || perception.runwayBand === "secure") s += 10;
      if (ctx.oyakata && ctx.oyakata.traits.ambition >= 70) s += 15;
      if (ctx.oyakata && ctx.oyakata.traits.risk >= 60) s += 10;
      if (ctx.oyakata?.archetype === "tyrant") s += 10;
      if (ctx.oyakata?.archetype === "scientist") s += 5;
      return s;
    },
    reason: "The stable has the depth and ambition to chase the yusho.",
  },
  {
    planId: "rebuilding",
    estimatedWeeks: 24,
    goals: [
      { domain: "rank", target: "develop_sekitori", priority: 9 },
      { domain: "recruitment", target: "sign_youth_talent", priority: 8 },
    ],
    constraints: [
      { domain: "training", type: "max_intensity", value: "balanced" },
      { domain: "rivalry", type: "avoid_rival", value: true },
    ],
    score: (ctx, perception) => {
      let s = 0;
      if (hasWeakRoster(perception)) s += 35;
      if (perception.rosterSize < 12) s += 15;
      if (ctx.oyakata && ctx.oyakata.traits.patience >= 60) s += 10;
      if (ctx.oyakata?.archetype === "nurturer") s += 15;
      if (perception.runwayBand === "critical" || perception.runwayBand === "desperate") s += 10;
      return s;
    },
    reason: "The stable needs to develop young talent rather than chase short-term glory.",
  },
  {
    planId: "financial_consolidation",
    estimatedWeeks: 12,
    goals: [
      { domain: "finance", target: "reach_12_month_runway", priority: 10 },
      { domain: "reputation", target: "reduce_scandal", priority: 6 },
    ],
    constraints: [
      { domain: "finance", type: "min_reserve", value: 12 },
      { domain: "training", type: "max_intensity", value: "balanced" },
      { domain: "rivalry", type: "avoid_rival", value: true },
    ],
    score: (ctx, perception) => {
      let s = 0;
      if (perception.runwayBand === "desperate") s += 60;
      else if (perception.runwayBand === "critical") s += 40;
      else if (perception.runwayBand === "tight") s += 15;
      if (
        perception.governancePressureBand === "moderate" ||
        perception.governancePressureBand === "severe"
      )
        s += 10;
      if (ctx.oyakata?.archetype === "traditionalist") s += 10;
      return s;
    },
    reason: "The stable must stabilize finances before pursuing long-term goals.",
  },
  {
    planId: "rivalry_suppression",
    estimatedWeeks: 10,
    goals: [
      { domain: "rivalry", target: "defeat_key_rival", priority: 10 },
      { domain: "reputation", target: "intimidate_ichimon", priority: 6 },
    ],
    constraints: [
      { domain: "training", type: "max_intensity", value: "intensive" },
      { domain: "rivalry", type: "avoid_rival", value: false },
    ],
    score: (ctx, perception, league) => {
      let s = 0;
      if (involvedInRivalryCluster(ctx, league)) s += 40;
      if (
        perception.rivalryPressureBand === "heated" ||
        perception.rivalryPressureBand === "fierce"
      )
        s += 25;
      if (ctx.oyakata && ctx.oyakata.traits.ambition >= 70) s += 10;
      if (ctx.oyakata?.archetype === "tyrant") s += 15;
      if (ctx.oyakata?.archetype === "gambler") s += 10;
      return s;
    },
    reason: "A key rivalry demands focus and aggression.",
  },
  {
    planId: "recruitment_blitz",
    estimatedWeeks: 8,
    goals: [
      { domain: "recruitment", target: "sign_top_talent", priority: 10 },
      { domain: "rank", target: "fill_roster_holes", priority: 7 },
    ],
    constraints: [
      { domain: "finance", type: "min_reserve", value: 3 },
      { domain: "rivalry", type: "avoid_rival", value: true },
    ],
    score: (ctx, perception, league) => {
      let s = 0;
      if (league.topRecruitAvailable) s += 25;
      if (perception.rosterSize < 12) s += 20;
      if (hasWeakRoster(perception)) s += 15;
      if (perception.runwayBand === "comfortable" || perception.runwayBand === "secure") s += 10;
      if (ctx.oyakata && ctx.oyakata.traits.ambition >= 60) s += 10;
      return s;
    },
    reason: "Market conditions favor aggressive recruitment.",
  },
  {
    planId: "status_quo",
    estimatedWeeks: 4,
    goals: [{ domain: "rank", target: "maintain_position", priority: 5 }],
    constraints: [],
    score: () => 5,
    reason: "No pressing strategic shift required.",
  },
];

/** Adjust a template score based on memory of past plan outcomes. */
function scoreWithMemory(template: PlanTemplate, ctx: AIContext, baseScore: number): number {
  const history = ctx.memory?.planHistory ?? [];
  const failures = history.filter(
    (h) => h.planId === template.planId && (h.outcome === "abandoned" || h.outcome === "partial")
  ).length;
  return baseScore - failures * 8;
}

/** Create a strategic plan from the current AI context. */
export function createPlan(ctx: AIContext): AIPlan | undefined {
  const perception = ctx.perception;
  const league = ctx.leaguePerception;
  if (!perception || !league) return undefined;

  const archetype = ctx.oyakata?.archetype ?? "traditionalist";
  const week = ctx.world.week;

  let best: { template: PlanTemplate; score: number } | undefined;
  for (const template of PLAN_CATALOG) {
    const score = scoreWithMemory(template, ctx, template.score(ctx, perception, league));
    if (!best || score > best.score) {
      best = { template, score };
    }
  }

  const statusQuo = PLAN_CATALOG[PLAN_CATALOG.length - 1];
  const chosen = best && best.score > 10 ? best.template : statusQuo;
  const runnerUpScore = Math.max(
    0,
    ...PLAN_CATALOG.filter((p) => p.planId !== chosen.planId).map((p) =>
      p.score(ctx, perception, league)
    )
  );

  const reasoning = [
    `Selected ${chosen.planId} (score ${best?.score ?? 0}, runner-up ${runnerUpScore}).`,
    chosen.reason,
  ];

  return {
    heyaId: ctx.heyaId,
    archetype,
    planId: chosen.planId,
    goals: chosen.goals,
    constraints: chosen.constraints,
    estimatedWeeks: chosen.estimatedWeeks,
    startedWeek: week,
    reasoning,
  };
}

/**
 * Determine whether the current plan should be refreshed.
 * Replan when no plan exists, when the current week exceeds the plan horizon,
 * or when a major state shift occurs (financial emergency, yusho win, etc.).
 */
export function shouldReplan(
  ctx: AIContext,
  currentPlan?: { planId: string; startedWeek: number }
): boolean {
  if (!currentPlan) return true;

  const planAge = ctx.world.week - currentPlan.startedWeek;
  if (planAge >= 8) return true;

  const perception = ctx.perception;
  if (!perception) return false;

  if (
    currentPlan.planId !== "financial_consolidation" &&
    (perception.runwayBand === "desperate" || perception.runwayBand === "critical")
  ) {
    return true;
  }

  if (
    currentPlan.planId !== "yokozuna_push" &&
    ctx.leaguePerception?.yushoRace.isClinched &&
    hasYushoLeaderInHeya(ctx, ctx.leaguePerception)
  ) {
    return true;
  }

  return false;
}
