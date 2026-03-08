// npcAI.ts
// =======================================================
// NPC Manager AI & Personas (Canon A7/A8/A11)
// - Deterministic Oyakata persona quirks + operational modifiers
// - Weekly decision loop: training, recovery, scouting (A7.1 compliant)
// - All decisions derived from banded PerceptionSnapshot, never raw stats
// =======================================================

import { rngForWorld } from "./rng";
import { getOyakataStyleProfile, type RecruitmentPhilosophy } from "./oyakataStylePreferences";
import type {
  WorldState, Style, OyakataArchetype, Oyakata, Id,
  TrainingIntensity, TrainingFocus, RecoveryEmphasis
} from "./types";
import { ensureHeyaTrainingState } from "./training";
import {
  getCachedPerception,
  type PerceptionSnapshot,
  type HealthBand,
  type WelfareRiskBand,
  type MoraleBand,
  type RosterStrengthBand,
  type RikishiPerception
} from "./perception";
import { logEngineEvent } from "./events";

// ─── Persona ────────────────────────────────────────────

export function determineNPCStyleBias(world: WorldState, stableId: string): Style | "neutral" {
  const stable = world.heyas.get(stableId);
  if (!stable) return "neutral";

  let oshi = 0;
  let yotsu = 0;

  for (const rId of stable.rikishiIds) {
    const rikishi = world.rikishi.get(rId);
    if (!rikishi) continue;
    if (rikishi.style === "oshi") oshi += 1;
    if (rikishi.style === "yotsu") yotsu += 1;
  }

  if (oshi === yotsu) return "neutral";
  return oshi > yotsu ? "oshi" : "yotsu";
}

const QUIRK_POOL = [
  "Old-School Stickler",
  "Gambler's Instinct",
  "Welfare Hawk",
  "Discipline Hawk",
  "Media Operator",
  "Sleeper Scout",
  "Nepotist",
  "Weight-Cutter",
  "Keiko Romantic",
  "Cold Pragmatist",
  "Family First",
  "Numbers Guy"
] as const;

function pickUnique<T>(rng: { next: () => number }, items: readonly T[], count: number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (pool.length && out.length < count) {
    const idx = Math.floor(rng.next() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function ensurePersonaForOyakata(world: WorldState, oyakata: Oyakata): void {
  if (Array.isArray(oyakata.quirks) && oyakata.quirks.length) return;

  const rng = rngForWorld(world, "oyakataPersona", oyakata.id);

  const baseCount = oyakata.archetype === "tyrant" || oyakata.archetype === "gambler" ? 3 : 2;
  const quirks = pickUnique(rng, QUIRK_POOL, baseCount);

  const flags = {
    welfareHawk: quirks.includes("Welfare Hawk") || oyakata.traits.compassion >= 75,
    disciplineHawk: quirks.includes("Discipline Hawk") || oyakata.archetype === "tyrant" || oyakata.traits.tradition >= 80,
    publicityHawk: quirks.includes("Media Operator") || oyakata.traits.ambition >= 80,
    nepotist: quirks.includes("Nepotist")
  };

  oyakata.quirks = quirks as unknown as string[];
  oyakata.managerFlags = flags;
}

export function getManagerPersona(world: WorldState, heyaId: string): {
  archetype: OyakataArchetype | "unknown";
  traits: { ambition: number; patience: number; risk: number; tradition: number; compassion: number };
  quirks: string[];
  flags: { welfareHawk: boolean; disciplineHawk: boolean; publicityHawk: boolean; nepotist: boolean };
  styleBias: Style | "neutral";
  welfareDiscipline: number;
  riskAppetite: number;
  perception: PerceptionSnapshot;
} {
  const heya = world.heyas.get(heyaId);
  const oyakata = heya ? world.oyakata.get(heya.oyakataId) : undefined;
  const perception = getCachedPerception(world, heyaId);

  if (!heya || !oyakata) {
    return {
      archetype: "unknown",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      quirks: [],
      flags: { welfareHawk: false, disciplineHawk: false, publicityHawk: false, nepotist: false },
      styleBias: "neutral",
      welfareDiscipline: 0.4,
      riskAppetite: 0.5,
      perception
    };
  }

  ensurePersonaForOyakata(world, oyakata);

  const traits = oyakata.traits;
  const flags = {
    welfareHawk: Boolean(oyakata.managerFlags?.welfareHawk),
    disciplineHawk: Boolean(oyakata.managerFlags?.disciplineHawk),
    publicityHawk: Boolean(oyakata.managerFlags?.publicityHawk),
    nepotist: Boolean(oyakata.managerFlags?.nepotist)
  };

  const welfareDiscipline =
    Math.max(0, Math.min(1,
      (traits.compassion / 120) +
      (flags.welfareHawk ? 0.25 : 0) -
      (traits.risk / 220)
    ));

  const riskAppetite =
    Math.max(0, Math.min(1,
      (traits.risk / 100) * 0.65 +
      (traits.ambition / 100) * 0.35
    ));

  return {
    archetype: oyakata.archetype,
    traits,
    quirks: oyakata.quirks ?? [],
    flags,
    styleBias: determineNPCStyleBias(world, heyaId),
    welfareDiscipline,
    riskAppetite,
    perception
  };
}

// ─── NPC Weekly Decision Loop (Canon A7.1) ──────────────

/** Decision output for a single NPC heya per week */
export interface NPCWeeklyDecision {
  heyaId: Id;
  archetype: OyakataArchetype | "unknown";
  trainingIntensity: TrainingIntensity;
  trainingFocus: TrainingFocus;
  recovery: RecoveryEmphasis;
  scoutingPriority: "none" | "passive" | "active" | "aggressive";
  individualProtects: Id[];  // rikishi to set to "protect" focus
  reasoning: string[];       // audit log entries (A7.3)
}

/**
 * Decide training intensity from perception bands + persona.
 * Uses welfare risk, morale, roster health — never raw numbers.
 */
function decideTrainingIntensity(
  perception: PerceptionSnapshot,
  riskAppetite: number,
  welfareDiscipline: number,
  complianceCap: TrainingIntensity | undefined
): { intensity: TrainingIntensity; reason: string } {
  // Welfare override: compliance sanctions cap intensity
  const INTENSITY_RANK: TrainingIntensity[] = ["conservative", "balanced", "intensive", "punishing"];
  const rank = (i: TrainingIntensity) => INTENSITY_RANK.indexOf(i);

  // Count injured/fragile wrestlers
  const fragileCount = perception.rikishiPerceptions.filter(
    r => r.healthBand === "fragile" || r.healthBand === "worn"
  ).length;
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  let intensity: TrainingIntensity;
  let reason: string;

  // Critical welfare → conservative no matter what
  if (perception.welfareRiskBand === "critical") {
    intensity = "conservative";
    reason = "Welfare risk critical — forced conservative training";
  }
  // Elevated welfare + welfare-conscious manager → conservative
  else if (perception.welfareRiskBand === "elevated" && welfareDiscipline > 0.5) {
    intensity = "conservative";
    reason = "Elevated welfare risk — cautious approach";
  }
  // Many fragile wrestlers → dial back
  else if (fragileRatio >= 0.4) {
    intensity = "conservative";
    reason = `${fragileCount} wrestlers worn/fragile — reducing intensity`;
  }
  // Mutinous morale → ease off
  else if (perception.moraleBand === "mutinous" || perception.moraleBand === "disgruntled") {
    intensity = "balanced";
    reason = "Low morale — maintaining balanced training";
  }
  // High risk appetite + strong roster → push hard
  else if (riskAppetite > 0.7 && (perception.rosterStrengthBand === "dominant" || perception.rosterStrengthBand === "strong")) {
    intensity = "intensive";
    reason = "Strong roster + ambitious manager — intensive training";
  }
  // Very high risk appetite → punishing
  else if (riskAppetite > 0.85 && perception.welfareRiskBand === "safe") {
    intensity = "punishing";
    reason = "Extremely ambitious manager — punishing regimen";
  }
  // Default
  else {
    intensity = "balanced";
    reason = "Standard balanced training";
  }

  // Apply compliance cap if active
  if (complianceCap && rank(intensity) > rank(complianceCap)) {
    intensity = complianceCap;
    reason += ` (capped by sanctions to ${complianceCap})`;
  }

  return { intensity, reason };
}

/**
 * Decide training focus from style bias + roster composition.
 */
function decideTrainingFocus(
  perception: PerceptionSnapshot,
  styleBias: Style | "neutral",
  tradition: number
): { focus: TrainingFocus; reason: string } {
  // Traditionalists emphasize power/balance (yotsu fundamentals)
  if (tradition >= 75 && styleBias === "yotsu") {
    return { focus: "balance", reason: "Traditionalist yotsu — emphasizing balance" };
  }
  if (tradition >= 75) {
    return { focus: "power", reason: "Traditionalist approach — power focus" };
  }

  // If roster is developing/weak, focus on technique (fundamentals)
  if (perception.rosterStrengthBand === "developing" || perception.rosterStrengthBand === "weak") {
    return { focus: "technique", reason: "Developing roster — building technique fundamentals" };
  }

  // Style-aligned focus
  if (styleBias === "oshi") {
    return { focus: "power", reason: "Oshi-biased stable — power focus" };
  }
  if (styleBias === "yotsu") {
    return { focus: "technique", reason: "Yotsu-biased stable — technique focus" };
  }

  return { focus: "neutral", reason: "Balanced training focus" };
}

/**
 * Decide recovery emphasis from roster health + welfare.
 */
function decideRecovery(
  perception: PerceptionSnapshot,
  welfareDiscipline: number
): { recovery: RecoveryEmphasis; reason: string } {
  const fragileCount = perception.rikishiPerceptions.filter(
    r => r.healthBand === "fragile" || r.healthBand === "worn"
  ).length;
  const fragileRatio = perception.rosterSize > 0 ? fragileCount / perception.rosterSize : 0;

  if (perception.welfareRiskBand === "critical" || fragileRatio >= 0.5) {
    return { recovery: "high", reason: "Critical health situation — maximum recovery" };
  }
  if (perception.welfareRiskBand === "elevated" || fragileRatio >= 0.3 || welfareDiscipline > 0.7) {
    return { recovery: "high", reason: "Elevated welfare concern — high recovery" };
  }
  if (fragileRatio <= 0.1 && perception.welfareRiskBand === "safe") {
    return { recovery: "low", reason: "Healthy roster — minimal recovery allocation" };
  }

  return { recovery: "normal", reason: "Standard recovery emphasis" };
}

/**
 * Decide scouting priority from runway, prestige, roster size.
 */
function decideScoutingPriority(
  perception: PerceptionSnapshot,
  ambition: number,
  hasSleeperScoutQuirk: boolean
): { priority: "none" | "passive" | "active" | "aggressive"; reason: string } {
  // Desperate finances → no scouting
  if (perception.runwayBand === "desperate" || perception.runwayBand === "critical") {
    return { priority: "none", reason: "Financial crisis — scouting suspended" };
  }

  // Small or weak roster → need recruits
  if (perception.rosterSize < 8 || perception.rosterStrengthBand === "weak") {
    return { priority: "aggressive", reason: "Roster needs rebuilding — aggressive scouting" };
  }

  // Sleeper Scout quirk → always at least active
  if (hasSleeperScoutQuirk) {
    return { priority: "active", reason: "Sleeper Scout personality — active scouting" };
  }

  // Ambitious managers scout more
  if (ambition >= 75 && perception.rosterStrengthBand !== "dominant") {
    return { priority: "active", reason: "Ambitious manager seeking talent" };
  }

  // Dominant roster → passive monitoring
  if (perception.rosterStrengthBand === "dominant") {
    return { priority: "passive", reason: "Dominant roster — passive scouting" };
  }

  return { priority: "passive", reason: "Standard scouting activity" };
}

/**
 * Identify rikishi who should be put on "protect" focus.
 * Managers protect fragile/worn wrestlers, especially high-rank ones.
 */
function identifyProtects(
  perception: PerceptionSnapshot,
  welfareDiscipline: number
): { protectIds: Id[]; reason: string } {
  const HIGH_RANKS = new Set(["yokozuna", "ozeki", "sekiwake", "komusubi"]);
  const protectIds: Id[] = [];

  for (const rp of perception.rikishiPerceptions) {
    if (rp.healthBand === "fragile") {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && HIGH_RANKS.has(rp.rank)) {
      protectIds.push(rp.rikishiId);
    } else if (rp.healthBand === "worn" && welfareDiscipline > 0.6) {
      protectIds.push(rp.rikishiId);
    }
  }

  const reason = protectIds.length > 0
    ? `Protecting ${protectIds.length} wrestler(s) due to health concerns`
    : "No wrestlers require protection";

  return { protectIds, reason };
}

/**
 * makeNPCWeeklyDecision
 * Core decision function for a single NPC-managed heya.
 * All inputs are banded (PerceptionSnapshot) — AI does not cheat (A7.1).
 */
export function makeNPCWeeklyDecision(world: WorldState, heyaId: Id): NPCWeeklyDecision {
  const persona = getManagerPersona(world, heyaId);
  const perception = persona.perception;
  const reasoning: string[] = [];

  // Get compliance cap from sanctions
  const heya = world.heyas.get(heyaId);
  const complianceCap = heya?.welfareState?.sanctions?.trainingIntensityCap as TrainingIntensity | undefined;

  // 1. Training intensity
  const intensityDecision = decideTrainingIntensity(
    perception, persona.riskAppetite, persona.welfareDiscipline, complianceCap
  );
  reasoning.push(`[Training] ${intensityDecision.reason}`);

  // 2. Training focus
  const focusDecision = decideTrainingFocus(
    perception, persona.styleBias, persona.traits.tradition
  );
  reasoning.push(`[Focus] ${focusDecision.reason}`);

  // 3. Recovery emphasis
  const recoveryDecision = decideRecovery(perception, persona.welfareDiscipline);
  reasoning.push(`[Recovery] ${recoveryDecision.reason}`);

  // 4. Scouting priority
  const hasSleeperScout = persona.quirks.includes("Sleeper Scout");
  const scoutingDecision = decideScoutingPriority(
    perception, persona.traits.ambition, hasSleeperScout
  );
  reasoning.push(`[Scouting] ${scoutingDecision.reason}`);

  // 5. Individual protections
  const protectDecision = identifyProtects(perception, persona.welfareDiscipline);
  if (protectDecision.protectIds.length > 0) {
    reasoning.push(`[Protect] ${protectDecision.reason}`);
  }

  return {
    heyaId,
    archetype: persona.archetype,
    trainingIntensity: intensityDecision.intensity,
    trainingFocus: focusDecision.focus,
    recovery: recoveryDecision.recovery,
    scoutingPriority: scoutingDecision.priority,
    individualProtects: protectDecision.protectIds,
    reasoning
  };
}

/**
 * applyNPCDecision
 * Writes a decision into the world state (training profile + individual focus slots).
 */
function applyNPCDecision(world: WorldState, decision: NPCWeeklyDecision): void {
  const state = ensureHeyaTrainingState(world, decision.heyaId);

  state.activeProfile = {
    ...state.activeProfile,
    intensity: decision.trainingIntensity,
    focus: decision.trainingFocus,
    recovery: decision.recovery
  };

  // Update individual focus slots for protected wrestlers
  if (decision.individualProtects.length > 0) {
    const existingFocus = state.focusSlots.filter(
      f => !decision.individualProtects.includes(f.rikishiId)
    );
    const protectSlots = decision.individualProtects.map(id => ({
      rikishiId: id,
      focusType: "protect" as const
    }));
    state.focusSlots = [...existingFocus, ...protectSlots];
  }
}

// ─── Weekly Tick (Orchestrator Entry Point) ─────────────

/**
 * tickWeek(world)
 * NPC Manager AI weekly decision loop:
 * 1. For each NPC heya, build PerceptionSnapshot
 * 2. Make decisions using banded data only
 * 3. Apply decisions to world state
 * 4. Log decisions to audit trail (A7.3)
 * 5. Enforce compliance sanctions
 */
export function tickWeek(world: WorldState): number {
  const playerHeyaId = world.playerHeyaId;
  let decisionsApplied = 0;

  // Initialize scouting priorities map for this week (consumed by talentpool)
  if (!world.npcScoutingPriorities) world.npcScoutingPriorities = {};
  const scoutingMap: Record<Id, "none" | "passive" | "active" | "aggressive"> = {};

  for (const heya of world.heyas.values()) {
    // Skip player-owned heya — player makes their own decisions
    if (heya.id === playerHeyaId) continue;

    const decision = makeNPCWeeklyDecision(world, heya.id);

    // Apply the decision to world state
    applyNPCDecision(world, decision);
    decisionsApplied++;

    // Publish scouting priority for talentpool consumption
    scoutingMap[heya.id] = decision.scoutingPriority;

    // Audit log (A7.3): manager decision log
    logEngineEvent(world, {
      type: "NPC_MANAGER_DECISION",
      category: "training",
      importance: "minor",
      scope: "heya",
      heyaId: heya.id,
      title: `${heya.name} weekly plan`,
      summary: decision.reasoning[0] || "Weekly training plan updated",
      data: {
        archetype: decision.archetype,
        intensity: decision.trainingIntensity,
        focus: decision.trainingFocus,
        recovery: decision.recovery,
        scouting: decision.scoutingPriority,
        protectedCount: decision.individualProtects.length,
        reasoningLog: decision.reasoning.join(" | ")
      }
    });
  }

  // Commit scouting priorities to world state for talentpool to read
  world.npcScoutingPriorities = scoutingMap;

  return decisionsApplied;
}
