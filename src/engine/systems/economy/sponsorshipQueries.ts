import { SeededRNG } from "../../rng";
import type { Heya } from "../../types/heya";
import type {
  Sponsor,
  SponsorPool,
  Koenkai,
  KoenkaiBandType,
  SponsorRelationship,
} from "../../types/sponsors";
import type { WorldState } from "../../types/world";
import { getRikishi } from "../../queries";
import {
  KOENKAI_INCOME_NONE,
  KOENKAI_INCOME_WEAK,
  KOENKAI_INCOME_MODERATE,
  KOENKAI_INCOME_STRONG,
  KOENKAI_INCOME_POWERFUL,
  SPONSOR_TIER_INCOME_T0,
  SPONSOR_TIER_INCOME_T1,
  SPONSOR_TIER_INCOME_T2,
  SPONSOR_TIER_INCOME_T3,
  SPONSOR_TIER_INCOME_T4,
  SPONSOR_TIER_INCOME_T5,
  KOENKAI_MEMBER_COUNT_BASE,
  KOENKAI_MEMBER_COUNT_MAX,
  KOENKAI_PILLAR_STRENGTH,
  KOENKAI_MEMBER_STRENGTH,
} from "../../../constants/engine/economyExtended";

export const KOENKAI_MONTHLY_INCOME: Record<KoenkaiBandType, number> = {
  none: KOENKAI_INCOME_NONE,
  weak: KOENKAI_INCOME_WEAK,
  moderate: KOENKAI_INCOME_MODERATE,
  strong: KOENKAI_INCOME_STRONG,
  powerful: KOENKAI_INCOME_POWERFUL,
};

export const SPONSOR_TIER_INCOME: Record<import("../../types/sponsors").SponsorTier, number> = {
  T0: SPONSOR_TIER_INCOME_T0,
  T1: SPONSOR_TIER_INCOME_T1,
  T2: SPONSOR_TIER_INCOME_T2,
  T3: SPONSOR_TIER_INCOME_T3,
  T4: SPONSOR_TIER_INCOME_T4,
  T5: SPONSOR_TIER_INCOME_T5,
};

/** Prestige score weights per rank. */
const PRESTIGE_WEIGHTS: Record<string, number> = {
  yokozuna: 40,
  ozeki: 30,
  sekiwake: 20,
  komusubi: 15,
  maegashira: 8,
  juryo: 4,
};

/** Prestige score cap. */
const PRESTIGE_CAP = 100;

/**
 * Compute a heya's prestige score based on its roster's ranks.
 * Capped at 100. Non-sekitori contribute 0.
 */
export function computeHeyaPrestigeScore(heya: Heya, world: WorldState): number {
  let score = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rId);
    if (!r) continue;
    score += PRESTIGE_WEIGHTS[r.rank] || 0;
  }
  return Math.min(score, PRESTIGE_CAP);
}

/**
 * Map a prestige score to a kōenkai band.
 */
export function targetKoenkaiBandFromPrestige(prestige: number): KoenkaiBandType {
  if (prestige >= 80) return "powerful";
  if (prestige >= 55) return "strong";
  if (prestige >= 30) return "moderate";
  if (prestige >= 10) return "weak";
  return "none";
}

/**
 * Recalculate kōenkai band based on heya prestige score (roster ranks).
 * Called after sponsor recruitment or churn to update band tier.
 */
export function recalculateKoenkaiBand(heya: Heya, world: WorldState): KoenkaiBandType {
  const prestige = computeHeyaPrestigeScore(heya, world);
  return targetKoenkaiBandFromPrestige(prestige);
}

/**
 * Manage Koenkai (Supporter Association) creation and strength.
 */
export function createKoenkai(
  heyaId: string,
  sponsorPool: SponsorPool,
  prestigeBand: string,
  rng: SeededRNG,
  currentTick: number
): Koenkai {
  const koenkaiId = rng.uuid("KN");
  const memberCount = KOENKAI_MEMBER_COUNT_BASE + Math.floor(rng.next() * KOENKAI_MEMBER_COUNT_MAX);

  const eligibleSponsors = Array.from(sponsorPool.sponsors.values())
    .filter((s) => s.active && (s.tier === "T1" || s.tier === "T2" || s.tier === "T3"))
    .sort(
      (a, b) => b.prestigeAffinity - a.prestigeAffinity || a.sponsorId.localeCompare(b.sponsorId)
    );

  const picked = eligibleSponsors.slice(0, Math.min(memberCount, eligibleSponsors.length));
  const members: SponsorRelationship[] = picked.map((sponsor, idx) => {
    const isPillar = idx === 0 && sponsor.tier !== "T1";
    return {
      relId: rng.uuid("SR"),
      sponsorId: sponsor.sponsorId,
      targetType: "heya",
      targetId: heyaId,
      role: isPillar ? "koenkai_pillar" : "koenkai_member",
      strength: isPillar ? KOENKAI_PILLAR_STRENGTH : KOENKAI_MEMBER_STRENGTH,
      startedAtTick: currentTick,
    };
  });

  const pb = (prestigeBand || "").toLowerCase();
  let strengthBand: KoenkaiBandType = "moderate";
  if (pb.includes("elite") || pb.includes("legend")) strengthBand = "powerful";
  else if (pb.includes("respected") || pb.includes("prestig")) strengthBand = "strong";
  else if (pb.includes("struggling") || pb.includes("weak")) strengthBand = "weak";
  else if (pb.includes("unknown") || pb.includes("none")) strengthBand = "none";

  return {
    koenkaiId,
    heyaId,
    strengthBand,
    members,
    createdAtTick: currentTick,
    lastChangedTick: currentTick,
  };
}

/**
 * Calculate recurring income from a Koenkai.
 */
export function calculateKoenkaiIncome(strengthBand: KoenkaiBandType): number {
  return KOENKAI_MONTHLY_INCOME[strengthBand] || 0;
}

/**
 * Procedural benefactor selection logic.
 */
export function selectBenefactor(
  _heyaId: string,
  sponsorPool: SponsorPool,
  koenkai: Koenkai | undefined
): Sponsor | null {
  if (koenkai) {
    const pillars = koenkai.members
      .filter((m) => m.role === "koenkai_pillar")
      .map((m) => sponsorPool.sponsors.get(m.sponsorId))
      .filter((s): s is Sponsor => s !== undefined)
      .sort((a, b) => b.riskAppetite - a.riskAppetite || a.sponsorId.localeCompare(b.sponsorId));

    if (pillars.length > 0 && pillars[0].riskAppetite >= 50) return pillars[0];
  }
  return null;
}

/**
 * Compute star power for a heya based on its roster.
 */
export function computeStarPower(heya: Heya, world: WorldState): number {
  let starPower = 0;
  for (const rId of heya.rikishiIds ?? []) {
    const r = getRikishi(world, rId);
    if (!r) continue;
    if (r.rank === "yokozuna") starPower += 30;
    else if (r.rank === "ozeki") starPower += 20;
    else if (r.rank === "sekiwake" || r.rank === "komusubi") starPower += 10;
    else if (r.division === "makuuchi") starPower += 5;
  }
  return Math.min(100, starPower);
}
