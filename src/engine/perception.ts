// perception.ts
// =======================================================
// PerceptionSnapshot — Canon A7.1
// NPC managers and the player see banded data only.
// No raw weights, injury probabilities, or secret thresholds.
// =======================================================

import type {
  WorldState, Id, Heya, Rikishi, Style,
  StatureBand, PrestigeBand, RunwayBand, KoenkaiBandType,
  ComplianceState
} from "./types";

// === Band types for perception ===

export type HealthBand = "peak" | "good" | "fair" | "worn" | "fragile";
export type WelfareRiskBand = "safe" | "cautious" | "elevated" | "critical";
export type GovernancePressureBand = "none" | "mild" | "moderate" | "severe";
export type MediaHeatBand = "cold" | "warm" | "hot" | "blazing";
export type RivalryPerceptionBand = "dormant" | "simmering" | "heated" | "fierce";
export type RosterStrengthBand = "dominant" | "strong" | "competitive" | "developing" | "weak";
export type MoraleBand = "inspired" | "content" | "neutral" | "disgruntled" | "mutinous";

/** Per-rikishi banded view available to managers */
export interface RikishiPerception {
  rikishiId: Id;
  shikona: string;
  rank: string;
  style: Style;
  healthBand: HealthBand;
  mediaHeatBand: MediaHeatBand;
  /** Qualitative momentum descriptor */
  momentum: "rising" | "steady" | "declining";
}

/** The complete banded snapshot a manager (NPC or player) sees for a heya */
export interface PerceptionSnapshot {
  heyaId: Id;
  heyaName: string;
  generatedAtWeek: number;
  generatedAtYear: number;

  // Stable-level bands (A7.1)
  statureBand: StatureBand;
  prestigeBand: PrestigeBand;
  runwayBand: RunwayBand;
  koenkaiBand: KoenkaiBandType;

  // Welfare & compliance (banded, not raw numbers)
  welfareRiskBand: WelfareRiskBand;
  complianceState: ComplianceState;

  // Governance pressure
  governancePressureBand: GovernancePressureBand;

  // Media
  stableMediaHeatBand: MediaHeatBand;

  // Rivalry
  rivalryPressureBand: RivalryPerceptionBand;

  // Roster overview
  rosterStrengthBand: RosterStrengthBand;
  rosterSize: number;
  moraleBand: MoraleBand;

  // Per-rikishi banded views
  rikishiPerceptions: RikishiPerception[];

  // Style tilt of the stable
  styleBias: Style | "neutral";
}

// === Band derivation helpers ===

function bandHealth(r: Rikishi): HealthBand {
  const c = r.condition ?? 100;
  if (c >= 90) return "peak";
  if (c >= 70) return "good";
  if (c >= 50) return "fair";
  if (c >= 30) return "worn";
  return "fragile";
}

function bandWelfareRisk(risk: number): WelfareRiskBand {
  if (risk <= 20) return "safe";
  if (risk <= 44) return "cautious";
  if (risk <= 69) return "elevated";
  return "critical";
}

function bandGovernancePressure(scandalScore: number, status: string): GovernancePressureBand {
  if (status === "sanctioned") return "severe";
  if (status === "probation" || scandalScore >= 60) return "moderate";
  if (status === "warning" || scandalScore >= 30) return "mild";
  return "none";
}

function bandMediaHeat(heat: number): MediaHeatBand {
  if (heat >= 75) return "blazing";
  if (heat >= 50) return "hot";
  if (heat >= 25) return "warm";
  return "cold";
}

function bandRivalry(world: WorldState, heyaId: Id): RivalryPerceptionBand {
  // Check if any rikishi in the heya has active rivalries
  const heya = world.heyas.get(heyaId);
  if (!heya) return "dormant";

  let maxIntensity = 0;
  for (const rId of heya.rikishiIds) {
    const r = world.rikishi.get(rId);
    if (!r || !r.rivalries) continue;
    for (const rv of r.rivalries) {
      const intensity = rv.intensity ?? 0;
      if (intensity > maxIntensity) maxIntensity = intensity;
    }
  }

  if (maxIntensity >= 75) return "fierce";
  if (maxIntensity >= 50) return "heated";
  if (maxIntensity >= 25) return "simmering";
  return "dormant";
}

function bandRosterStrength(heya: Heya, world: WorldState): RosterStrengthBand {
  const RANK_WEIGHT: Record<string, number> = {
    yokozuna: 100, ozeki: 85, sekiwake: 70, komusubi: 60,
    maegashira: 40, juryo: 25, makushita: 15, sandanme: 10,
    jonidan: 5, jonokuchi: 2
  };

  let total = 0;
  for (const rId of heya.rikishiIds) {
    const r = world.rikishi.get(rId);
    if (r) total += RANK_WEIGHT[r.rank] ?? 5;
  }

  const avg = heya.rikishiIds.length > 0 ? total / heya.rikishiIds.length : 0;
  if (avg >= 60) return "dominant";
  if (avg >= 40) return "strong";
  if (avg >= 25) return "competitive";
  if (avg >= 12) return "developing";
  return "weak";
}

function bandMorale(heya: Heya, world: WorldState): MoraleBand {
  // Derive from welfare risk + recent momentum
  const welfareRisk = heya.welfareState?.welfareRisk ?? 10;
  let momentumSum = 0;
  let count = 0;
  for (const rId of heya.rikishiIds) {
    const r = world.rikishi.get(rId);
    if (r) { momentumSum += r.momentum ?? 0; count++; }
  }
  const avgMomentum = count > 0 ? momentumSum / count : 0;

  const score = (100 - welfareRisk) * 0.6 + (avgMomentum + 5) * 4; // normalize momentum (-5..5) to 0..40
  if (score >= 85) return "inspired";
  if (score >= 65) return "content";
  if (score >= 45) return "neutral";
  if (score >= 25) return "disgruntled";
  return "mutinous";
}

function bandRikishiMomentum(m: number): "rising" | "steady" | "declining" {
  if (m >= 2) return "rising";
  if (m <= -2) return "declining";
  return "steady";
}

function getStableMediaHeat(world: WorldState, heyaId: Id): number {
  const mediaState = (world as any).mediaState;
  if (!mediaState?.heyaPressure) return 0;
  return mediaState.heyaPressure[heyaId] ?? 0;
}

function getRikishiMediaHeat(world: WorldState, rikishiId: Id): number {
  const mediaState = (world as any).mediaState;
  if (!mediaState?.mediaHeat) return 0;
  return mediaState.mediaHeat[rikishiId] ?? 0;
}

// === Main builder ===

/**
 * buildPerceptionSnapshot
 * Produces a banded, non-cheating view of a heya's state.
 * Used by NPC AI decision-making and player UI surfaces.
 * Constitution A7.1: "AI uses the same information layers as the player."
 */
export function buildPerceptionSnapshot(world: WorldState, heyaId: Id): PerceptionSnapshot {
  const heya = world.heyas.get(heyaId);
  if (!heya) {
    return {
      heyaId,
      heyaName: "Unknown",
      generatedAtWeek: world.week,
      generatedAtYear: world.year,
      statureBand: "new",
      prestigeBand: "unknown",
      runwayBand: "comfortable",
      koenkaiBand: "none",
      welfareRiskBand: "safe",
      complianceState: "compliant",
      governancePressureBand: "none",
      stableMediaHeatBand: "cold",
      rivalryPressureBand: "dormant",
      rosterStrengthBand: "weak",
      rosterSize: 0,
      moraleBand: "neutral",
      rikishiPerceptions: [],
      styleBias: "neutral"
    };
  }

  const welfareRisk = heya.welfareState?.welfareRisk ?? 10;

  // Build per-rikishi perceptions
  const rikishiPerceptions: RikishiPerception[] = heya.rikishiIds
    .map(rId => {
      const r = world.rikishi.get(rId);
      if (!r) return null;
      return {
        rikishiId: r.id,
        shikona: r.shikona,
        rank: r.rank,
        style: r.style,
        healthBand: bandHealth(r),
        mediaHeatBand: bandMediaHeat(getRikishiMediaHeat(world, r.id)),
        momentum: bandRikishiMomentum(r.momentum ?? 0)
      };
    })
    .filter((x): x is RikishiPerception => x !== null);

  // Determine style bias
  let oshi = 0, yotsu = 0;
  for (const rId of heya.rikishiIds) {
    const r = world.rikishi.get(rId);
    if (r?.style === "oshi") oshi++;
    if (r?.style === "yotsu") yotsu++;
  }
  const styleBias: Style | "neutral" = oshi === yotsu ? "neutral" : oshi > yotsu ? "oshi" : "yotsu";

  return {
    heyaId,
    heyaName: heya.name,
    generatedAtWeek: world.week,
    generatedAtYear: world.year,
    statureBand: heya.statureBand,
    prestigeBand: heya.prestigeBand,
    runwayBand: heya.runwayBand,
    koenkaiBand: heya.koenkaiBand,
    welfareRiskBand: bandWelfareRisk(welfareRisk),
    complianceState: heya.welfareState?.complianceState ?? "compliant",
    governancePressureBand: bandGovernancePressure(heya.scandalScore, heya.governanceStatus),
    stableMediaHeatBand: bandMediaHeat(getStableMediaHeat(world, heyaId)),
    rivalryPressureBand: bandRivalry(world, heyaId),
    rosterStrengthBand: bandRosterStrength(heya, world),
    rosterSize: heya.rikishiIds.length,
    moraleBand: bandMorale(heya, world),
    rikishiPerceptions,
    styleBias
  };
}

/**
 * buildAllPerceptionSnapshots
 * Generates snapshots for every heya. Called at weekly boundary per A3.3.
 */
export function buildAllPerceptionSnapshots(world: WorldState): Map<Id, PerceptionSnapshot> {
  const snapshots = new Map<Id, PerceptionSnapshot>();
  for (const heya of world.heyas.values()) {
    snapshots.set(heya.id, buildPerceptionSnapshot(world, heya.id));
  }
  return snapshots;
}
