// src/engine/pbp.ts
// =======================================================
// Play-by-Play (PBP) System v4.0 — Narrative Orchestrator
// =======================================================

import { rngFromSeed, SeededRNG } from "./rng";
import type { Side } from "./types/banzuke";
import type { Stance, Style, TacticalArchetype } from "./types/combat";
import type { Advantage, Position } from "./bout/boutPhysics";
import { KIMARITE_REGISTRY } from "./kimarite";
import { DEFAULT_PBP_LIBRARY } from "./pbpPhrases";
import { generateBoutNarrative } from "./bout/boutNarrative";

/** =========================
 *  Fact Layer Types
 *  ========================= */

export type BoutPhase = "tachiai" | "clinch" | "momentum" | "finish" | "tactical" | "injury" | "institutional" | "engagement";

/** Type representing pbp tag. */
export type PbpTag =
  | "crowd_roar"
  | "gasps"
  | "chants"
  | "kensho"
  | "mono_ii"
  | "gyoji_point"
  | "shimpan_discussion"
  | "kinboshi"
  | "yusho_race"
  | "injury_scare"
  | "upset"
  | "dominant"
  | "close_call";

/** Defines the structure for pbp fact base. */
interface PbpFactBase {
  phase: BoutPhase;
  beat: number;
  leader: Advantage;
}

interface TachiaiFact extends PbpFactBase {
  phase: "tachiai";
  tachiaiWinner: Side;
  tachiaiQuality: number;
  stance?: Stance;
  trick?: string;
  eastAction?: any;
  westAction?: any;
}

interface ClinchFact extends PbpFactBase {
  phase: "clinch";
  position: Position;
  advantage: Advantage;
  gripEvent?: string;
  strikeEvent?: string;
}

interface MomentumFact extends PbpFactBase {
  phase: "momentum";
  advantage: Advantage;
  reason: string;
  edgeEvent?: string;
  position?: Position;
}

interface EngagementFact extends PbpFactBase {
  phase: "engagement";
  eastAction: any;
  westAction: any;
  eastPower: number;
  westPower: number;
  advantage: Advantage;
  event?: string;
  moveId?: string;
}

interface FinishFact extends PbpFactBase {
  phase: "finish";
  winner: Side;
  kimariteId?: string;
  kimariteName?: string;
  upset?: boolean;
  closeCall?: boolean;
}

interface TacticalFact extends PbpFactBase {
  phase: "tactical";
  side: Side;
  archetype?: TacticalArchetype;
  strategy: string;
  tacticalResult?: import("./types/combat").TacticalResult;
}

interface InjuryFact extends PbpFactBase {
  phase: "injury";
  injuryType: string;
}

interface InstitutionalFact extends PbpFactBase {
  phase: "institutional";
  eventType: "GOVERNANCE_STATUS_CHANGED" | "GOVERNANCE_RULING" | "WELFARE_ALERT";
  oyakataPersonality?: string;
}

type PbpFact = TachiaiFact | ClinchFact | MomentumFact | FinishFact | TacticalFact | InjuryFact | InstitutionalFact | EngagementFact;

/** Defines the structure for pbp context. */
export interface PbpContext {
  seed: string;
  day?: number;
  bashoName?: string;
  east: { id: string; shikona: string; style?: Style; archetype?: TacticalArchetype; rankLabel?: string; };
  west: { id: string; shikona: string; style?: Style; archetype?: TacticalArchetype; rankLabel?: string; };
  kenshoCount?: number;
  isKinboshiBout?: boolean;
}

/** Defines the structure for pbp library. */
export interface PbpLibrary {
  tachiai: {
    decisive: PhraseBucket;
    even: PhraseBucket;
    slow: PhraseBucket;
  };

  clinch: {
    grip_gain: PhraseBucket;
    grip_break: PhraseBucket;
    oshi_pressure: PhraseBucket;
    scramble: PhraseBucket;
    rear_attack: PhraseBucket;
    tsuppari_barrage: PhraseBucket;
    nodowa_pressure: PhraseBucket;
    harite_slap: PhraseBucket;
    throat_attack: PhraseBucket;
    shoulder_blast: PhraseBucket;
    migi_yotsu_established: PhraseBucket;
    hidari_yotsu_established: PhraseBucket;
    double_inside: PhraseBucket;
    over_under: PhraseBucket;
    no_grip_scramble: PhraseBucket;
  };

  momentum: {
    edge_dance: PhraseBucket;
    counter_turn: PhraseBucket;
    fatigue_swing: PhraseBucket;
    steady_drive: PhraseBucket;
    bales_at_tawara: PhraseBucket;
    steps_out_then_recovers: PhraseBucket;
    heel_on_straw: PhraseBucket;
    dancing_escape: PhraseBucket;
    turns_the_tables: PhraseBucket;
    slips_but_survives: PhraseBucket;
    grip_change: PhraseBucket;
    footwork_angle: PhraseBucket;
    mistake: PhraseBucket;
    tachiai_win: PhraseBucket;
  };

  injury: {
    sprain: PhraseBucket;
    strain: PhraseBucket;
    contusion: PhraseBucket;
    inflammation: PhraseBucket;
    tear: PhraseBucket;
    fracture: PhraseBucket;
    nerve: PhraseBucket;
    unknown: PhraseBucket;
  };

  institutional: {
    GOVERNANCE_STATUS_CHANGED: { default: PhraseBucket; strict: PhraseBucket; indulgent: PhraseBucket; [key: string]: PhraseBucket };
    GOVERNANCE_RULING: { default: PhraseBucket; strict: PhraseBucket; indulgent: PhraseBucket; [key: string]: PhraseBucket };
    WELFARE_ALERT: { default: PhraseBucket; strict: PhraseBucket; indulgent: PhraseBucket; [key: string]: PhraseBucket };
  };

  finish: {
    normal: PhraseBucket;
    upset: PhraseBucket;
    close_call: PhraseBucket;
    kinboshi: PhraseBucket;
  };

  tactical: {
    oshi_strategy: PhraseBucket;
    yotsu_strategy: PhraseBucket;
    speedster_strategy: PhraseBucket;
    adaptive_strategy: PhraseBucket;
    blitzer_fatigue: PhraseBucket;
    mountain_resilience: PhraseBucket;
    stalwart_counter: PhraseBucket;
    trickster_agility: PhraseBucket;
  };

  connective: {
    short: PhraseBucket;
  };
}

/** Output for UI */
export interface PbpLine {
  phase: BoutPhase;
  text: string;
  tags?: PbpTag[];
}

/** =========================
 *  Phrase Library Types (Flavor Layer)
 *  ========================= */

export type Phrase = {
  id: string;
  weight?: number;
  tags?: PbpTag[];
  /**
   * templated string supports:
   * {east} {west} {winner} {loser} {kimarite} {leader} {trailer}
   */
  text: string;
};

export type PhraseBucket = Phrase[];

/** =========================
 *  Public API
 *  ========================= */

/**
 * Build dynamic commentary for a completed bout.
 */
export function buildPbpFromBoutResult(args: {
  result: import("./types/basho").BoutResult;
  east: any;
  west: any;
  bashoName?: import("./types/basho").BashoName;
  day?: number;
  seed?: string;
}): string[] {
  const { result, east, west, bashoName, day, seed } = args;
  const actualSeed = seed || `${result.boutId}-pbp`;

  // Delegate bout-specific narrative to specialized module
  generateBoutNarrative(result, east, west, bashoName, day || 1, actualSeed);

  return result.pbp || [];
}

/**
 * Orchestrator for rendering a single fact (primarily non-bout events).
 */
function renderFact(fact: PbpFact, ctx: PbpContext, lib: PbpLibrary = DEFAULT_PBP_LIBRARY): PbpLine {
  const rng = rngFromSeed(ctx.seed, fact.phase, String(fact.beat));
  
  let bucket: PhraseBucket = lib.connective.short;

  switch (fact.phase) {
    case "injury": {
      const inj = fact as InjuryFact;
      bucket = lib.injury[inj.injuryType as keyof typeof lib.injury] || lib.injury.unknown;
      break;
    }
    case "institutional": {
      const inst = fact as InstitutionalFact;
      const group = lib.institutional[inst.eventType];
      const personality = inst.oyakataPersonality || "default";
      bucket = group[personality as keyof typeof group] || group.default || [];
      break;
    }
    default:
      return { phase: fact.phase, text: "" };
  }

  const chosen = weightedPick(bucket, rng);
  const vars = {
    east: ctx.east.shikona,
    west: ctx.west.shikona,
    leader: advantageName(ctx, fact.leader),
    trailer: trailerFromLeader(ctx, fact.leader)
  };

  return {
    phase: fact.phase,
    text: renderTemplate(chosen.text, vars),
    tags: mergeTags(chosen.tags)
  };
}

/** =========================
 *  Utilities
 *  ========================= */

function advantageName(ctx: PbpContext, adv: Advantage): string {
  if (adv === "east") return ctx.east.shikona;
  if (adv === "west") return ctx.west.shikona;
  return "";
}

function trailerFromLeader(ctx: PbpContext, adv: Advantage): string {
  if (adv === "east") return ctx.west.shikona;
  if (adv === "west") return ctx.east.shikona;
  return "";
}

function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => (vars[key] ?? `{${key}}`));
}

function mergeTags(...lists: Array<PbpTag[] | undefined>): PbpTag[] {
  const out: PbpTag[] = [];
  const seen = new Set<PbpTag>();
  for (const list of lists) {
    if (!list) continue;
    for (const t of list) {
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
  }
  return out;
}

function weightedPick(bucket: PhraseBucket, rng: SeededRNG): Phrase {
  if (!bucket || !bucket.length) return { id: "fallback", text: "…" };
  const total = bucket.reduce((s, p) => s + (p.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const p of bucket) {
    roll -= p.weight ?? 1;
    if (roll <= 0) return p;
  }
  return bucket[bucket.length - 1];
}

function normalizeAdvantage(v: any): Advantage {
  if (v === "east" || v === "west" || v === "none") return v;
  return "none";
}