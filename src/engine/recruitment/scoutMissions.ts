/**
 * src/engine/recruitment/scoutMissions.ts
 * =======================================
 * Mission-based scouting (P4): dispatch a scout on a timed trip — local /
 * national / international — that returns a batch of revealed candidates
 * into the matching talent pool on return.
 */

import type { WorldState } from "@/engine/types/world";
import type { StateImpact } from "@/engine/core/StateImpact";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { getHeya } from "@/engine/core/queries";
import type { Id } from "@/engine/types/common";
import type { Staff } from "@/engine/types/staff";
import type { TalentPoolType } from "@/engine/types/talent";

export type ScoutMissionTier = "local" | "national" | "international";

export interface ScoutMission {
  id: Id;
  heyaId: Id;
  scoutStaffId: Id;
  tier: ScoutMissionTier;
  startedWeek: number;
  returnsWeek: number;
  costYen: number;
}

export interface ScoutTierDef {
  tier: ScoutMissionTier;
  costYen: number;
  durationWeeks: number;
  /** Target pool the mission feeds on return. */
  pool: TalentPoolType;
  /** Number of candidates revealed on return (base, + network bonus). */
  revealCount: number;
}

export const SCOUT_TIERS: Record<ScoutMissionTier, ScoutTierDef> = {
  local: { tier: "local", costYen: 60_000, durationWeeks: 1, pool: "high_school", revealCount: 3 },
  national: {
    tier: "national",
    costYen: 180_000,
    durationWeeks: 2,
    pool: "university",
    revealCount: 3,
  },
  international: {
    tier: "international",
    costYen: 450_000,
    durationWeeks: 3,
    pool: "foreign",
    revealCount: 2,
  },
};

/** Scout sub-stats derived from competence bands + skill (P2 staff field). */
export interface ScoutStats {
  network: number; // 0–10: volume of leads (reveal count)
  evaluation: number; // 0–10: quality of reveals
  negotiation: number; // 0–10: sign-chance bonus
}

const BAND_NUM: Record<string, number> = {
  feeble: 1,
  limited: 3,
  serviceable: 5,
  strong: 6,
  great: 8,
  dominant: 9,
  monstrous: 10,
};

export function deriveScoutStats(staff: Staff | undefined): ScoutStats {
  if (!staff) return { network: 3, evaluation: 3, negotiation: 3 };
  const skill = staff.skill ?? BAND_NUM[staff.competenceBands?.primary ?? "serviceable"] ?? 5;
  return {
    network: Math.min(10, skill),
    evaluation: Math.min(10, Math.round(skill * 0.9)),
    negotiation: Math.min(10, Math.round(skill * 0.8)),
  };
}

function missionId(world: WorldState, scoutId: Id): string {
  return `scout-mission-${scoutId}-y${world.year ?? 0}-w${world.week ?? 0}`;
}

/** SEND_SCOUT — validate + debit + enqueue a mission. */
export function sendScout(
  world: WorldState,
  heyaId: Id,
  scoutStaffId: Id,
  tier: ScoutMissionTier
): StateImpact {
  const builder = createImpactBuilder("sendScout");
  const heya = getHeya(world, heyaId);
  const def = SCOUT_TIERS[tier];
  if (!heya || !def) return builder.build();
  const scout = world.staff.get(scoutStaffId);
  if (!scout || scout.heyaId !== heyaId || scout.role !== "scout") return builder.build();
  const missions = world.activeScoutMissions ?? [];
  if (missions.some((m) => m.scoutStaffId === scoutStaffId)) return builder.build();
  if ((heya.funds ?? 0) < def.costYen) return builder.build();

  const week = world.week ?? 0;
  const mission: ScoutMission = {
    id: missionId(world, scoutStaffId),
    heyaId,
    scoutStaffId,
    tier,
    startedWeek: week,
    returnsWeek: week + def.durationWeeks,
    costYen: def.costYen,
  };
  builder.updateHeya(heyaId, { funds: Math.round(heya.funds - def.costYen) });
  builder.updateWorldField("activeScoutMissions", [...missions, mission]);
  builder.logEvent(
    "MANAGEMENT_DECISION",
    "scouting",
    {
      title: `Scout dispatched — ${def.tier}`,
      summary: `${scout.name} departs on a ${def.tier} scouting mission (${def.durationWeeks}wk, ¥${def.costYen.toLocaleString("en-US")}).`,
    },
    { heyaId, importance: "minor" }
  );
  return builder.build();
}

/**
 * Weekly mission-return resolver — call inside phase01_week_scouting.
 * Returns due missions: reveals candidates into the tier's pool and logs.
 */
export function tickScoutMissions(world: WorldState): StateImpact {
  const builder = createImpactBuilder("tickScoutMissions");
  const missions = world.activeScoutMissions ?? [];
  const week = world.week ?? 0;
  const due = missions.filter((m) => m.returnsWeek <= week);
  if (due.length === 0) return builder.build();

  const remaining = missions.filter((m) => m.returnsWeek > week);
  builder.updateWorldField("activeScoutMissions", remaining);

  const pool = world.talentPool;
  const nextPool = pool ? { ...pool, pools: { ...pool.pools } } : null;
  {
    for (const m of due) {
      const scout = world.staff.get(m.scoutStaffId);
      const stats = deriveScoutStats(scout);
      const def = SCOUT_TIERS[m.tier];
      const reveals = def.revealCount + Math.floor(stats.network / 4);
      const tp = nextPool?.pools[def.pool];
      if (tp) {
        // Move candidates from the hidden reserve into the visible list.
        const room = Math.max(0, tp.populationCap - (tp.candidatesVisible?.length ?? 0));
        const take = Math.min(reveals, room, tp.candidatesHidden?.length ?? 0);
        if (take > 0 && nextPool) {
          nextPool.pools[def.pool] = {
            ...tp,
            candidatesVisible: [...(tp.candidatesVisible ?? []), ...(tp.candidatesHidden ?? []).slice(0, take)],
            candidatesHidden: (tp.candidatesHidden ?? []).slice(take),
          };
        }
      }
      builder.logEvent(
        "RECRUIT_DISCOVERED",
        "scouting",
        {
          title: `Scouting report — ${def.tier}`,
          summary: `${scout?.name ?? "Your scout"} returns from a ${def.tier} mission with ${reveals} new leads (${def.pool} pool).`,
          scoutId: m.scoutStaffId,
          tier: m.tier,
        },
        { heyaId: m.heyaId, importance: "notable" }
      );
    }
    if (nextPool) builder.updateWorldField("talentPool", nextPool);
  }
  return builder.build();
}

/**
 * Sign-chance model (P4): suitors + prestige + scout negotiation + dormitory.
 * Returns 0..1 probability. Deterministic — caller supplies the rng.
 */
export function computeSignChance(opts: {
  competingSuitors: number;
  heyaPrestige: number; // 0–100
  negotiation: number; // 0–10 scout stat
  hasDormitory: boolean;
  offerType: "standard" | "aggressive";
  interest: "low" | "medium" | "high" | "all_in";
}): number {
  const interestW = { low: -0.1, medium: 0, high: 0.05, all_in: 0.12 }[opts.interest];
  const offerW = opts.offerType === "aggressive" ? 0.08 : 0;
  const prestigeW = (opts.heyaPrestige / 100) * 0.25;
  const negoW = (opts.negotiation / 10) * 0.15;
  const dormW = opts.hasDormitory ? 0.06 : 0;
  const suitorPenalty = Math.min(0.4, opts.competingSuitors * 0.1);
  const p = 0.35 + interestW + offerW + prestigeW + negoW + dormW - suitorPenalty;
  return Math.min(0.95, Math.max(0.02, p));
}
