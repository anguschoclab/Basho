// injuries.ts
// =======================================================
// Injury System v1.0 — Deterministic injury model + recovery + durability
// Canon goals:
// - Injuries are rare, severity-scaled, and influenced by fatigue + intensity + career phase.
// - Recovery is time-based (weeks out) and can be modified by recovery emphasis and facilities.
// - Must be deterministic: no Math.random; use seedrandom with stable salts.
// - JSON-safe: state stored as plain objects/arrays.
// - Integrates cleanly with timeBoundary.ts and training.ts.
//
// Notes on integration with your codebase:
// - Your Rikishi already has `injured: boolean` and `injuryWeeksRemaining: number`.
// - This module supports optional richer injury state stored externally (recommended),
//   while still providing "compat mode" helpers that update those fields.
// =======================================================
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { Id, Rikishi, WorldState, Heya } from "./types";
import type { TrainingProfile } from "./training";
import { computeTrainingMultipliers, getCareerPhase, PHASE_EFFECTS } from "./training";
import { logEngineEvent } from "./events";

/** =========================
 *  Types
 *  ========================= */

export type InjurySeverity = "minor" | "moderate" | "serious";

export type InjuryBodyArea =
  | "shoulder"
  | "elbow"
  | "wrist"
  | "back"
  | "hip"
  | "knee"
  | "ankle"
  | "neck"
  | "rib"
  | "other";

export type InjuryType =
  | "sprain"
  | "strain"
  | "contusion"
  | "inflammation"
  | "tear"
  | "fracture"
  | "nerve"
  | "unknown";

export interface InjuryRecord {
  id: Id;
  rikishiId: Id;

  /** Timing */
  startWeek: number;
  expectedWeeksOut: number;
  remainingWeeks: number;

  /** Classification */
  severity: InjurySeverity;
  area: InjuryBodyArea;
  type: InjuryType;

  /** Narrative */
  title: string;
  description: string;

  /** Metadata */
  causedBy?: "training" | "basho" | "accident";
  fatigueAtInjury?: number; // 0..100
  notes?: string;
}

export interface InjuriesState {
  version: "1.0.0";

  /** Active injuries keyed by rikishiId (one active injury at a time in v1) */
  activeByRikishi: Record<Id, InjuryRecord>;

  /** History log (append-only) */
  history: InjuryRecord[];

  /** Optional per-rikishi durability baseline (0..100). Lower = more fragile. */
  durability: Record<Id, number>;
}

/** For timeBoundary-style simple event output */
export interface InjuryEvent {
  rikishiId: string;
  severity: InjurySeverity;
  weeksOut: number;
  description: string;
}

/** =========================
 *  Defaults / Init
 *  ========================= */

export function createDefaultInjuriesState(): InjuriesState {
  return {
    version: "1.0.0",
    activeByRikishi: {},
    history: [],
    durability: {}
  };
}

/** If you want deterministic default durability when a rikishi is first seen. */
export function getOrInitDurability(args: {
  state: InjuriesState;
  worldSeed: string;
  rikishiId: Id;
}): { state: InjuriesState; durability: number } {
  const existing = args.state.durability[args.rikishiId];
  if (typeof existing === "number") return { state: args.state, durability: clampInt(existing, 0, 100) };

  const rng = rngFromSeed(args.worldSeed, "injuries", `durability::${args.rikishiId}`);
  // Centered around 60, with tails. Clamp 20..95.
  const d = clampInt(Math.round(60 + (rng.next() - 0.5) * 50), 20, 95);

  return {
    state: { ...args.state, durability: { ...args.state.durability, [args.rikishiId]: d } },
    durability: d
  };
}

/** =========================
 *  Core — Injury chance + creation
 *  ========================= */

/**
 * Compute a weekly injury chance given context.
 * - Uses training multipliers (intensity, recovery emphasis, focus mode)
 * - Applies fatigue pressure (0..100) and career phase sensitivity
 * - Optional heya facilities reduce risk slightly (recovery facilities matter most)
 */
export function computeWeeklyInjuryChance(args: {
  rikishi: Rikishi;
  heya?: Heya;
  profile: TrainingProfile;
  individualMode?: "develop" | "push" | "protect" | "rebuild" | null;
  fatigue: number; // 0..100
  durability?: number; // 0..100, higher is safer
}): number {
  const { rikishi, profile, fatigue } = args;

  const mults = computeTrainingMultipliers({
    rikishi,
    heya: args.heya,
    profile,
    individualMode: args.individualMode ?? null
  });

  // Baseline: very low weekly chance
  const base = 0.005; // 0.5% baseline per week (same spirit as your prior code)

  // Career phase sensitivity (already inside mults.injuryRiskMult, but phase also affects durability in v1)
  const phase = getCareerPhase(rikishi.experience);
  const phaseFx = PHASE_EFFECTS[phase];

  // Fatigue pressure: 0..100 -> 1.0..1.5
  const fatigueMult = 1 + clamp(fatigue, 0, 100) / 200;

  // Durability: lower durability increases risk. 60 baseline = 1.0
  const durability = typeof args.durability === "number" ? clamp(args.durability, 0, 100) : 60;
  const durabilityMult = clamp(1.35 - durability / 100, 0.6, 1.35);

  // Facilities: recovery reduces injury likelihood (small but meaningful)
  const recoveryFacility = args.heya?.facilities?.recovery;
  const facilityMult =
    typeof recoveryFacility === "number"
      ? clamp(1.08 - clamp(recoveryFacility, 0, 100) / 250, 0.75, 1.08)
      : 1.0;

  const chance =
    base *
    mults.injuryRiskMult *
    fatigueMult *
    durabilityMult *
    facilityMult *
    // Late careers are riskier; already in injuryRiskMult, but give a small extra push
    clamp(0.9 + phaseFx.injurySensitivity / 2.4, 0.9, 1.5);

  // Hard clamp
  return clamp(chance, 0, 0.12); // never exceed 12% in v1 weekly tick
}

/**
 * Deterministic injury roll.
 * Returns an InjuryRecord if injury occurs, else null.
 */
export function rollWeeklyInjury(args: {
  rng: SeededRNG;
  world: WorldState;
  rikishi: Rikishi;
  heya?: Heya;
  profile: TrainingProfile;
  individualMode?: "develop" | "push" | "protect" | "rebuild" | null;
  fatigue: number;
  durability?: number;
  causedBy?: InjuryRecord["causedBy"];
  currentWeek?: number;
}): InjuryRecord | null {
  const week = typeof args.currentWeek === "number" ? args.currentWeek : (args.world.week ?? 0);

  const chance = computeWeeklyInjuryChance({
    rikishi: args.rikishi,
    heya: args.heya,
    profile: args.profile,
    individualMode: args.individualMode ?? null,
    fatigue: args.fatigue,
    durability: args.durability
  });

  if (args.rng.next() >= chance) return null;

  // Determine severity and weeks out
  const sevRoll = args.rng.next();
  const severity: InjurySeverity = sevRoll < 0.72 ? "minor" : sevRoll < 0.95 ? "moderate" : "serious";

  // Choose body area and type
  const area = pickArea(args.rng);
  const type = pickType(args.rng, severity);

  const weeksOut = getWeeksOut(args.rng, severity, area, type);

  const { title, description } = describeInjury({ rng: args.rng, severity, area, type });

  return {
    id: `inj-${week}-${args.rikishi.id}-${Math.floor(args.rng.next() * 1e9)}`,
    rikishiId: args.rikishi.id,
    startWeek: week,
    expectedWeeksOut: weeksOut,
    remainingWeeks: weeksOut,
    severity,
    area,
    type,
    title,
    description,
    causedBy: args.causedBy ?? "training",
    fatigueAtInjury: clampInt(args.fatigue, 0, 100)
  };
}

/** =========================
 *  State Mutators (JSON-safe)
 *  ========================= */

export function applyInjuryRecord(state: InjuriesState, injury: InjuryRecord): InjuriesState {
  // v1: one active injury at a time (latest wins)
  const nextActive = { ...state.activeByRikishi, [injury.rikishiId]: injury };
  const nextHist = [...state.history, injury];
  return { ...state, activeByRikishi: nextActive, history: nextHist };
}

export function clearInjury(state: InjuriesState, rikishiId: Id): InjuriesState {
  if (!state.activeByRikishi[rikishiId]) return state;
  const next = { ...state.activeByRikishi };
  delete next[rikishiId];
  return { ...state, activeByRikishi: next };
}

/**
 * Weekly recovery tick for all active injuries.
 * Returns:
 * - updated state
 * - list of recovered rikishiIds
 */
export function processWeeklyRecovery(args: {
  state: InjuriesState;
  world: WorldState;
  /** If provided, facility and recovery emphasis can improve recovery speed */
  getHeyaByRikishiId?: (rikishiId: Id) => Heya | undefined;
  /** If provided, recovery emphasis can improve recovery speed */
  getTrainingProfileByHeyaId?: (heyaId: Id) => TrainingProfile | undefined;
}): { state: InjuriesState; recovered: Id[] } {
  const week = args.world.week ?? 0;

  const recovered: Id[] = [];
  const nextActive: Record<Id, InjuryRecord> = { ...args.state.activeByRikishi };

  for (const [rikishiId, inj] of Object.entries(args.state.activeByRikishi)) {
    // Determine recovery speed multiplier
    const heya = args.getHeyaByRikishiId?.(rikishiId);
    const profile = heya ? args.getTrainingProfileByHeyaId?.(heya.id) : undefined;

    const facilityRecovery = typeof heya?.facilities?.recovery === "number" ? clamp(heya!.facilities.recovery, 0, 100) : 50;

    // base recovery = 1 week per week
    // recovery emphasis can accelerate, facilities can accelerate slightly
    const recoveryMult =
      (profile ? computeTrainingMultipliers({ rikishi: dummyRikishiForRecovery(), heya, profile, individualMode: null }).injuryRecoveryMult : 1.0) *
      clamp(0.9 + facilityRecovery / 200, 0.9, 1.4);

    // Convert multiplier to "weeks reduced" integer in a deterministic, conservative way.
    // We always reduce by at least 1.
    const weeksReduced = recoveryMult >= 1.25 ? 2 : 1;

    const remaining = Math.max(0, inj.remainingWeeks - weeksReduced);

    if (remaining <= 0) {
      recovered.push(rikishiId);
      delete nextActive[rikishiId];
      continue;
    }

    nextActive[rikishiId] = {
      ...inj,
      remainingWeeks: remaining,
      notes: inj.notes
    };
  }

  return { state: { ...args.state, activeByRikishi: nextActive }, recovered };
}

/** =========================
 *  Compatibility helpers (Rikishi fields)
 *  ========================= */

/**
 * Sync active injuries into your existing Rikishi fields:
 * - rikishi.injured
 * - rikishi.injuryWeeksRemaining
 */
export function syncRikishiInjuryFlags(args: {
  world: WorldState;
  state: InjuriesState;
}): void {
  for (const r of args.world.rikishi.values()) {
    const inj = args.state.activeByRikishi[r.id];
    (r as any).injured = Boolean(inj);
    (r as any).injuryWeeksRemaining = inj ? inj.remainingWeeks : 0;
  }
}

/**
 * If you only have rikishi.injured/weeksRemaining and want to build InjuryRecords lazily.
 */
export function hydrateFromRikishiFlags(args: {
  state: InjuriesState;
  world: WorldState;
}): InjuriesState {
  let state = args.state;
  for (const r of args.world.rikishi.values()) {
    const injured = Boolean((r as any).injured);
    const weeks = typeof (r as any).injuryWeeksRemaining === "number" ? Math.max(0, Math.trunc((r as any).injuryWeeksRemaining)) : 0;
    if (!injured || weeks <= 0) continue;

    if (state.activeByRikishi[r.id]) continue; // already hydrated

    // Create a generic record
    const rng = rngForWorld(args.world, "injuries", `hydrate::week${args.world.week}::${r.id}`);
    const severity: InjurySeverity = weeks <= 2 ? "minor" : weeks <= 5 ? "moderate" : "serious";
    const area = pickArea(rng);
    const type = pickType(rng, severity);
    const { title, description } = describeInjury({ rng, severity, area, type });

    const rec: InjuryRecord = {
      id: `inj-hydrated-${args.world.week}-${r.id}`,
      rikishiId: r.id,
      startWeek: args.world.week ?? 0,
      expectedWeeksOut: weeks,
      remainingWeeks: weeks,
      severity,
      area,
      type,
      title,
      description,
      causedBy: "training"
    };

    state = applyInjuryRecord(state, rec);
  }
  return state;
}

/** =========================
 *  Bridge to timeBoundary.ts style events
 *  ========================= */

export function toInjuryEvent(injury: InjuryRecord): InjuryEvent {
  return {
    rikishiId: injury.rikishiId,
    severity: injury.severity,
    weeksOut: injury.expectedWeeksOut,
    description: injury.description
  };
}


/** =========================
 *  Weekly Integration (WorldState)
 *  ========================= */

function ensureWorldInjuriesState(world: WorldState): InjuriesState {
  const anyW = world as any;
  if (anyW.injuriesState && anyW.injuriesState.version === "1.0.0") return anyW.injuriesState as InjuriesState;
  anyW.injuriesState = createDefaultInjuriesState();
  return anyW.injuriesState as InjuriesState;
}

function getHeyaByRikishiId(world: WorldState, rikishiId: Id): Heya | undefined {
  const r = world.rikishi.get(rikishiId);
  if (!r) return undefined;
  return world.heyas.get(r.heyaId);
}

function getTrainingProfileByHeyaId(world: WorldState, heyaId: Id): TrainingProfile | undefined {
  // training.ts ensures per-heya training state in world.trainingState
  const anyW = world as any;
  const ts = anyW.trainingState?.[heyaId] || world.heyas.get(heyaId)?.trainingState;
  return ts?.activeProfile as TrainingProfile | undefined;
}

function getIndividualMode(world: WorldState, rikishiId: Id): "develop" | "push" | "protect" | "rebuild" | null {
  const r = world.rikishi.get(rikishiId);
  if (!r) return null;
  const anyW = world as any;
  const ts = anyW.trainingState?.[r.heyaId] || world.heyas.get(r.heyaId)?.trainingState;
  const slots = ts?.focusSlots as any[] | undefined;
  const slot = slots?.find(s => s?.rikishiId === rikishiId);
  return slot?.mode ?? null;
}

export function tickWeek(world: WorldState): { recoveredCount: number; newCount: number } {
  let state = ensureWorldInjuriesState(world);

  // Hydrate from legacy flags if any
  state = hydrateFromRikishiFlags({ state, world });

  // 1) Recovery
  const rec = processWeeklyRecovery({
    state,
    world,
    getHeyaByRikishiId: (rid) => getHeyaByRikishiId(world, rid),
    getTrainingProfileByHeyaId: (hid) => getTrainingProfileByHeyaId(world, hid)
  });
  state = rec.state;

  // 2) New injuries
  let newCount = 0;
  for (const r of world.rikishi.values()) {
    const active = state.activeByRikishi[r.id];
    if (active) continue;

    const heya = world.heyas.get(r.heyaId);
    const profile = getTrainingProfileByHeyaId(world, r.heyaId);
    if (!profile) continue;

    const { durability } = getOrInitDurability({ state, worldSeed: world.seed, rikishiId: r.id });
    // ensure durability persisted
    state = { ...state, durability: { ...state.durability, [r.id]: durability } };

    const rng = rngForWorld(world, "injuries", `week${world.week}::${r.id}`);
    const injury = rollWeeklyInjury({
      rng,
      world,
      rikishi: r,
      heya,
      profile,
      individualMode: getIndividualMode(world, r.id),
      fatigue: typeof r.fatigue === "number" ? r.fatigue : 30,
      durability,
      causedBy: "training",
      currentWeek: world.week ?? 0
    });

    if (!injury) continue;

    state = applyInjuryRecord(state, injury);
    newCount += 1;

    // Lightweight event emission (avoids import cycles by dynamic import via require pattern)
    logEngineEvent(world, {
        type: "INJURY_OCCURRED",
        category: "injury",
        importance: injury.severity === "serious" ? "headline" : injury.severity === "moderate" ? "major" : "notable",
        scope: "rikishi",
        rikishiId: r.id,
        heyaId: r.heyaId,
        title: injury.title,
        summary: injury.description,
        data: { severity: injury.severity, weeksOut: injury.expectedWeeksOut, area: injury.area, kind: injury.type }
      });
  }

  // 3) Sync into rikishi flags + UI-friendly injuryStatus
  for (const r of world.rikishi.values()) {
    const inj = state.activeByRikishi[r.id];
    (r as any).injured = Boolean(inj);
    (r as any).injuryWeeksRemaining = inj ? inj.remainingWeeks : 0;
    (r as any).injuryStatus = inj
      ? { type: inj.type, isInjured: true, severity: inj.severity, location: inj.area, weeksRemaining: inj.remainingWeeks }
      : { type: "none", isInjured: false, severity: "none", weeksRemaining: 0 };
    // Some UI code looks at r.injury
    (r as any).injury = (r as any).injuryStatus;
  }

  (world as any).injuriesState = state;

  return { recoveredCount: rec.recovered.length, newCount };
}

/** =========================
 *  Internal — Injury tables
 *  ========================= */

function pickArea(rng: SeededRNG): InjuryBodyArea {
  const roll = rng.next();
  if (roll < 0.18) return "knee";
  if (roll < 0.30) return "ankle";
  if (roll < 0.42) return "back";
  if (roll < 0.52) return "shoulder";
  if (roll < 0.60) return "elbow";
  if (roll < 0.68) return "wrist";
  if (roll < 0.76) return "hip";
  if (roll < 0.84) return "rib";
  if (roll < 0.90) return "neck";
  return "other";
}

function pickType(rng: SeededRNG, severity: InjurySeverity): InjuryType {
  const roll = rng.next();
  if (severity === "serious") {
    if (roll < 0.35) return "tear";
    if (roll < 0.65) return "fracture";
    if (roll < 0.85) return "nerve";
    return "unknown";
  }
  if (severity === "moderate") {
    if (roll < 0.35) return "sprain";
    if (roll < 0.70) return "strain";
    if (roll < 0.90) return "inflammation";
    return "contusion";
  }
  // minor
  if (roll < 0.35) return "contusion";
  if (roll < 0.70) return "strain";
  if (roll < 0.90) return "sprain";
  return "inflammation";
}

function getWeeksOut(rng: SeededRNG, severity: InjurySeverity, area: InjuryBodyArea, type: InjuryType): number {
  // Baselines
  let min = 1, max = 2;
  if (severity === "moderate") { min = 2; max = 5; }
  if (severity === "serious") { min = 6; max = 13; }

  // Area adjustments
  if (area === "knee" || area === "back") { min += 1; max += 2; }
  if (area === "ankle" || area === "hip") { min += 0; max += 1; }

  // Type adjustments
  if (type === "fracture") { min += 3; max += 5; }
  if (type === "tear") { min += 2; max += 4; }
  if (type === "nerve") { min += 2; max += 4; }

  // Deterministic roll
  const span = Math.max(0, max - min + 1);
  return clampInt(min + Math.floor(rng.next() * span), 1, 26);
}

function describeInjury(args: {
  rng: SeededRNG;
  severity: InjurySeverity;
  area: InjuryBodyArea;
  type: InjuryType;
}): { title: string; description: string } {
  const areaLabel = areaToLabel(args.area);
  const typeLabel = typeToLabel(args.type);

  const titlesBySev: Record<InjurySeverity, string[]> = {
    minor: [
      `Minor ${typeLabel} (${areaLabel})`,
      `Training Knock (${areaLabel})`,
      `Nagging ${areaLabel} Issue`
    ],
    moderate: [
      `${areaLabel} ${typeLabel} Requires Rest`,
      `Setback: ${areaLabel} ${typeLabel}`,
      `Recovery Needed After ${areaLabel} Injury`
    ],
    serious: [
      `Serious ${areaLabel} Injury`,
      `${areaLabel} Damage — Extended Recovery`,
      `Medical Team Rules Out Competition`
    ]
  };

  const descBySev: Record<InjurySeverity, string[]> = {
    minor: [
      `A minor ${typeLabel} picked up in keiko. The staff recommends light work.`,
      `A small ${areaLabel.toLowerCase()} issue surfaced during training. Monitoring is advised.`,
      `A bruise and discomfort around the ${areaLabel.toLowerCase()} — should clear with rest.`
    ],
    moderate: [
      `A ${typeLabel} to the ${areaLabel.toLowerCase()} will keep them out for several weeks.`,
      `The ${areaLabel.toLowerCase()} needs time. Rehab begins immediately.`,
      `A noticeable ${typeLabel} means reduced workload and careful recovery.`
    ],
    serious: [
      `A severe problem in the ${areaLabel.toLowerCase()} requires extended rehabilitation.`,
      `Doctors recommend a long recovery window before returning to full contact.`,
      `The injury is significant. Training will be suspended during recovery.`
    ]
  };

  const title = titlesBySev[args.severity][Math.floor(args.rng.next() * titlesBySev[args.severity].length)];
  const description = descBySev[args.severity][Math.floor(args.rng.next() * descBySev[args.severity].length)];

  return { title, description };
}

function areaToLabel(area: InjuryBodyArea): string {
  switch (area) {
    case "shoulder": return "Shoulder";
    case "elbow": return "Elbow";
    case "wrist": return "Wrist";
    case "back": return "Back";
    case "hip": return "Hip";
    case "knee": return "Knee";
    case "ankle": return "Ankle";
    case "neck": return "Neck";
    case "rib": return "Ribs";
    default: return "Body";
  }
}

function typeToLabel(t: InjuryType): string {
  switch (t) {
    case "sprain": return "Sprain";
    case "strain": return "Strain";
    case "contusion": return "Contusion";
    case "inflammation": return "Inflammation";
    case "tear": return "Tear";
    case "fracture": return "Fracture";
    case "nerve": return "Nerve Issue";
    default: return "Injury";
  }
}

/** computeTrainingMultipliers requires a Rikishi, but recovery tick may not have one. */
function dummyRikishiForRecovery(): Rikishi {
  return {
    // minimal fields used by computeTrainingMultipliers: experience
    id: "dummy",
    shikona: "Dummy",
    heyaId: "dummy",
    nationality: "JP",
    height: 180,
    weight: 140,
    power: 50,
    speed: 50,
    balance: 50,
    technique: 50,
    aggression: 50,
    experience: 50,
    momentum: 0,
    stamina: 100,
    injured: false,
    injuryWeeksRemaining: 0,
    style: "hybrid",
    archetype: "all_rounder",
    division: "makuuchi",
    rank: "maegashira",
    rankNumber: 10,
    side: "east",
    careerWins: 0,
    careerLosses: 0,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    favoredKimarite: [],
    weakAgainstStyles: []
  };
}

/** =========================
 *  Utils
 *  ========================= */

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}