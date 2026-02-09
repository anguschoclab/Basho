// pbp.ts
// =======================================================
// Play-by-Play (PBP) System v3.x — Fact Layer -> Flavor Layer
// Deterministic commentary builder for bouts + time events
//
// Design goals (canon-aligned):
// - Engine produces FACTS (structured signals, no prose).
// - PBP selects FLAVOR (templated text) deterministically from a phrase library.
// - No Math.random; all randomness via seedrandom with stable salts.
// - No UI framework assumptions: returns plain strings + optional tags.
//
// Integration points:
// - bout.ts emits BoutResult.log with phases + data; buildPbpFromBoutResult derives facts.
// - narrativeDescriptions.ts remains for static bands; pbp.ts is for dynamic commentary.
// =======================================================
import { rngFromSeed, rngForWorld } from "./rng";
import { SeededRNG } from "./utils/SeededRNG";
import type { Side, Stance, Style, TacticalArchetype, BoutResult } from "./types";

/** =========================
 *  Fact Layer Types
 *  ========================= */

export type BoutPhase = "tachiai" | "clinch" | "momentum" | "finish";

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

export type Advantage = "east" | "west" | "none";
export type Position = "front" | "lateral" | "rear";

/** Legacy tolerance (older logs used "frontal") */
type LegacyPosition = "frontal" | "front" | "lateral" | "rear";

export type EdgeEvent =
  | "bales_at_tawara"
  | "steps_out_then_recovers"
  | "heel_on_straw"
  | "dancing_escape"
  | "turns_the_tables"
  | "slips_but_survives";

export type GripEvent =
  | "migi_yotsu_established"
  | "hidari_yotsu_established"
  | "double_inside"
  | "over_under"
  | "no_grip_scramble"
  | "grip_break";

export type StrikeEvent =
  | "tsuppari_barrage"
  | "nodowa_pressure"
  | "harite_slap"
  | "throat_attack"
  | "shoulder_blast";

export type MomentumShiftReason =
  | "tachiai_win"
  | "timing_counter"
  | "grip_change"
  | "footwork_angle"
  | "fatigue_turn"
  | "mistake";

export interface PbpFactBase {
  phase: BoutPhase;
  /** Deterministic ordering within a phase (0..N) */
  beat: number;
  /**
   * Who is "pressing"/dictating at this moment.
   * - If "none", it's even / unclear.
   * - Derived from advantage in clinch/momentum; from winner in tachiai/finish.
   */
  leader: Advantage;
}

export interface TachiaiFact extends PbpFactBase {
  phase: "tachiai";
  tachiaiWinner: Side;
  /** 0..1: how decisive tachiai was */
  tachiaiQuality: number;
  /** observed stance at impact (optional) */
  stance?: Stance;
}

export interface ClinchFact extends PbpFactBase {
  phase: "clinch";
  position: Position;
  advantage: Advantage;
  gripEvent?: GripEvent;
  strikeEvent?: StrikeEvent;
}

export interface MomentumFact extends PbpFactBase {
  phase: "momentum";
  advantage: Advantage;
  reason: MomentumShiftReason;
  edgeEvent?: EdgeEvent;
  position?: Position;
}

export interface FinishFact extends PbpFactBase {
  phase: "finish";
  winner: Side;
  /** finishing kimarite id/name if known */
  kimariteId?: string;
  kimariteName?: string;
  upset?: boolean;
  /** close call / mono-ii vibes */
  closeCall?: boolean;
}

export type PbpFact = TachiaiFact | ClinchFact | MomentumFact | FinishFact;

export interface PbpContext {
  seed: string;
  day?: number;
  bashoName?: string;

  east: {
    id: string;
    shikona: string;
    style?: Style;
    archetype?: TacticalArchetype;
    rankLabel?: string;
  };

  west: {
    id: string;
    shikona: string;
    style?: Style;
    archetype?: TacticalArchetype;
    rankLabel?: string;
  };

  /** Optional: kensho count for vibes */
  kenshoCount?: number;

  /** Optional: kinboshi possibility */
  isKinboshiBout?: boolean;

  /** Optional: top-of-banzuke stakes */
  isYushoRaceKeyBout?: boolean;
}

/** Output for UI */
export interface PbpLine {
  phase: BoutPhase;
  text: string;
  tags?: PbpTag[];
}

/** =========================
 *  Phrase Library (Flavor Layer)
 *  ========================= */

type Phrase = {
  id: string;
  weight?: number;
  tags?: PbpTag[];
  /**
   * templated string supports:
   * {east} {west} {winner} {loser} {kimarite} {leader} {trailer}
   */
  text: string;
};

type PhraseBucket = Phrase[];

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
  };

  momentum: {
    edge_dance: PhraseBucket;
    counter_turn: PhraseBucket;
    fatigue_swing: PhraseBucket;
    steady_drive: PhraseBucket;
  };

  finish: {
    normal: PhraseBucket;
    upset: PhraseBucket;
    close_call: PhraseBucket;
    kinboshi: PhraseBucket;
  };

  connective: {
    short: PhraseBucket;
  };
}

/** A compact but expandable default library (you can add thousands later). */
export const DEFAULT_PBP_LIBRARY: PbpLibrary = {
  tachiai: {
    decisive: [
      { id: "t_dec_1", text: "{winner} explodes off the shikirisen!", tags: ["crowd_roar"] },
      { id: "t_dec_2", text: "A thunderous tachiai — {leader} wins the hit!" },
      { id: "t_dec_3", text: "{leader} blasts forward and takes the initiative!" }
    ],
    even: [
      { id: "t_even_1", text: "They collide — neither gives an inch!" },
      { id: "t_even_2", text: "Solid contact at the tachiai, straight into a battle!" },
      { id: "t_even_3", text: "A hard charge from both men — dead even!" }
    ],
    slow: [
      { id: "t_slow_1", text: "A cautious tachiai… feeling for position." },
      { id: "t_slow_2", text: "No wild rush — they meet and measure each other." }
    ]
  },

  clinch: {
    grip_gain: [
      { id: "c_grip_1", text: "{leader} gets a hand on the mawashi!", tags: ["crowd_roar"] },
      { id: "c_grip_2", text: "Grip secured — {leader} wants yotsu!" },
      { id: "c_grip_3", text: "{leader} finds the belt and settles in." }
    ],
    grip_break: [
      { id: "c_break_1", text: "{trailer} breaks the grip — back to the center!" },
      { id: "c_break_2", text: "The hands come free — a reset in close quarters!" }
    ],
    oshi_pressure: [
      { id: "c_oshi_1", text: "{leader} pours on the tsuppari!", tags: ["crowd_roar"] },
      { id: "c_oshi_2", text: "Heavy thrusts from {leader} — driving {trailer} back!" },
      { id: "c_oshi_3", text: "{leader} keeps the chest up and shoves forward!" }
    ],
    scramble: [
      { id: "c_scr_1", text: "No grip — just brute force and footwork!" },
      { id: "c_scr_2", text: "A frantic scramble in the middle!" },
      { id: "c_scr_3", text: "Hands fighting, hips turning — nothing settled yet!" }
    ],
    rear_attack: [
      { id: "c_rear_1", text: "{leader} slips to the side — danger from behind!", tags: ["gasps"] },
      { id: "c_rear_2", text: "Angle taken! {leader} has {trailer} twisted!" }
    ]
  },

  momentum: {
    edge_dance: [
      { id: "m_edge_1", text: "{trailer} teeters at the tawara!", tags: ["gasps", "close_call"] },
      { id: "m_edge_2", text: "Heels on the straw — {trailer} somehow stays in!", tags: ["gasps", "close_call"] },
      { id: "m_edge_3", text: "A tight rope act at the edge!" }
    ],
    counter_turn: [
      { id: "m_ctr_1", text: "A sudden counter — {leader} turns the tables!", tags: ["crowd_roar"] },
      { id: "m_ctr_2", text: "{leader} absorbs it and redirects the force!" },
      { id: "m_ctr_3", text: "That timing! {leader} steals the advantage!" }
    ],
    fatigue_swing: [
      { id: "m_fat_1", text: "You can see the strain — momentum swings!", tags: ["gasps"] },
      { id: "m_fat_2", text: "{trailer} slows… and {leader} surges!" }
    ],
    steady_drive: [
      { id: "m_drv_1", text: "{leader} keeps walking forward — relentless pressure." },
      { id: "m_drv_2", text: "A steady march from {leader} — no room to breathe." }
    ]
  },

  finish: {
    normal: [
      { id: "f_n_1", text: "{winner} finishes it — {kimarite}!" },
      { id: "f_n_2", text: "That’s it! {winner} takes the bout by {kimarite}!", tags: ["crowd_roar"] },
      { id: "f_n_3", text: "{winner} seals the deal — {kimarite}!" }
    ],
    upset: [
      { id: "f_u_1", text: "UPSET! {winner} shocks the arena with {kimarite}!", tags: ["upset", "crowd_roar"] },
      { id: "f_u_2", text: "A stunner — {winner} steals it by {kimarite}!", tags: ["upset"] }
    ],
    close_call: [
      { id: "f_c_1", text: "So close at the edge — but {winner} gets it by {kimarite}!", tags: ["close_call", "gasps"] },
      { id: "f_c_2", text: "A razor-thin finish! {winner} wins with {kimarite}!", tags: ["close_call"] }
    ],
    kinboshi: [
      { id: "f_k_1", text: "KINBOSHI! {winner} claims a gold star with {kimarite}!", tags: ["kinboshi", "crowd_roar"] },
      { id: "f_k_2", text: "A gold star victory! {winner} defeats a Yokozuna by {kimarite}!", tags: ["kinboshi"] }
    ]
  },

  connective: {
    short: [
      { id: "x_1", text: "Now…", weight: 1 },
      { id: "x_2", text: "And then—", weight: 1 },
      { id: "x_3", text: "Still moving…", weight: 1 }
    ]
  }
};

/** =========================
 *  Public API
 *  ========================= */

export function buildPbp(
  facts: PbpFact[],
  ctx: PbpContext,
  lib: PbpLibrary = DEFAULT_PBP_LIBRARY
): PbpLine[] {
  const ordered = [...facts].sort((a, b) => {
    if (a.phase !== b.phase) return phaseOrder(a.phase) - phaseOrder(b.phase);
    return a.beat - b.beat;
  });

  const finish = [...ordered].reverse().find((f) => f.phase === "finish") as FinishFact | undefined;
  const winnerSide = finish?.winner;

  const winnerName = winnerSide ? sideName(ctx, winnerSide) : "";
  const loserName =
    winnerSide === "east" ? ctx.west.shikona : winnerSide === "west" ? ctx.east.shikona : "";

  const lines: PbpLine[] = [];

  for (const fact of ordered) {
    const salt = `${ctx.seed}-pbp-${fact.phase}-${fact.beat}-${ctx.east.id}-${ctx.west.id}`;
    const rng = rngFromSeed(salt, "pbp", "salt");

    const { phrase, tags } = selectPhraseForFact(fact, ctx, lib, rng);

    const leaderName = advantageName(ctx, fact.leader, winnerSide);
    const trailerName = trailerFromLeader(ctx, fact.leader, winnerSide);

    const text = renderTemplate(phrase.text, {
      east: ctx.east.shikona,
      west: ctx.west.shikona,
      winner: winnerName,
      loser: loserName,
      kimarite: getKimariteLabel(fact),
      leader: leaderName,
      trailer: trailerName
    });

    lines.push({ phase: fact.phase, text, tags });
  }

  return lines;
}

export function buildPbpFromBoutResult(
  result: BoutResult,
  ctx: Omit<PbpContext, "seed"> & { seed: string },
  lib: PbpLibrary = DEFAULT_PBP_LIBRARY
): PbpLine[] {
  const facts: PbpFact[] = [];

  // Tachiai
  facts.push({
    phase: "tachiai",
    beat: 0,
    tachiaiWinner: result.tachiaiWinner,
    tachiaiQuality: 0.7,
    stance: result.stance,
    leader: result.tachiaiWinner // leader = tachiai winner
  });

  // Beats (IMPORTANT: beats must increment so salts differ)
  let clinchBeat = 0;
  let momentumBeat = 0;

  if (Array.isArray((result as any).log)) {
    for (const entry of (result as any).log) {
      if (entry.phase === "clinch") {
        const advantage = normalizeAdvantage(entry.data?.advantage);
        facts.push({
          phase: "clinch",
          beat: ++clinchBeat,
          position: normalizePosition(entry.data?.position),
          advantage,
          gripEvent: normalizeGripEvent(entry.data?.gripEvent),
          strikeEvent: normalizeStrikeEvent(entry.data?.strikeEvent),
          leader: advantage
        });
      } else if (entry.phase === "momentum") {
        const advantage = normalizeAdvantage(entry.data?.advantage);
        facts.push({
          phase: "momentum",
          beat: ++momentumBeat,
          advantage,
          reason: normalizeMomentumReason(entry.data?.reason),
          edgeEvent: normalizeEdgeEvent(entry.data?.edgeEvent),
          position: normalizePosition(entry.data?.position),
          leader: advantage
        });
      }
    }
  }

  // Finish
  facts.push({
    phase: "finish",
    beat: 0,
    winner: result.winner,
    kimariteId: result.kimarite,
    kimariteName: result.kimariteName,
    upset: !!result.upset,
    closeCall: false,
    leader: result.winner // leader = winner at the end
  });

  return buildPbp(facts, ctx, lib);
}

/** =========================
 *  Fact -> Phrase Selection
 *  ========================= */

function selectPhraseForFact(
  fact: PbpFact,
  ctx: PbpContext,
  lib: PbpLibrary,
  rng: SeededRNG
): { phrase: Phrase; tags: PbpTag[] } {
  switch (fact.phase) {
    case "tachiai": {
      const bucket =
        fact.tachiaiQuality >= 0.75
          ? lib.tachiai.decisive
          : fact.tachiaiQuality >= 0.45
          ? lib.tachiai.even
          : lib.tachiai.slow;

      const chosen = weightedPick(bucket, rng);
      return { phrase: chosen, tags: mergeTags(chosen.tags, ctx.kenshoCount ? ["kensho"] : []) };
    }

    case "clinch": {
      let bucket = lib.clinch.scramble;
      if (fact.position === "rear") bucket = lib.clinch.rear_attack;
      else if (fact.gripEvent === "grip_break") bucket = lib.clinch.grip_break;
      else if (fact.gripEvent && fact.gripEvent !== "no_grip_scramble") bucket = lib.clinch.grip_gain;
      else if (fact.strikeEvent) bucket = lib.clinch.oshi_pressure;

      const chosen = weightedPick(bucket, rng);
      return { phrase: chosen, tags: mergeTags(chosen.tags) };
    }

    case "momentum": {
      let bucket = lib.momentum.steady_drive;
      if (fact.edgeEvent) bucket = lib.momentum.edge_dance;
      else if (fact.reason === "timing_counter") bucket = lib.momentum.counter_turn;
      else if (fact.reason === "fatigue_turn") bucket = lib.momentum.fatigue_swing;

      const chosen = weightedPick(bucket, rng);
      return { phrase: chosen, tags: mergeTags(chosen.tags) };
    }

    case "finish": {
      const kimariteText = getKimariteLabel(fact) || "a winning move";
      const isKinboshi = !!ctx.isKinboshiBout && !!fact.upset;

      let bucket = lib.finish.normal;
      if (isKinboshi) bucket = lib.finish.kinboshi;
      else if (fact.closeCall) bucket = lib.finish.close_call;
      else if (fact.upset) bucket = lib.finish.upset;

      const chosen = weightedPick(bucket, rng);

      const extra: PbpTag[] = [];
      if (ctx.isYushoRaceKeyBout) extra.push("yusho_race");
      if (isKinboshi) extra.push("kinboshi");
      if (fact.upset) extra.push("upset");
      if (fact.closeCall) extra.push("close_call");

      return {
        phrase: { ...chosen, text: chosen.text.replace("{kimarite}", kimariteText) },
        tags: mergeTags(chosen.tags, extra)
      };
    }
  }
}

/** =========================
 *  Utilities
 *  ========================= */

function phaseOrder(p: BoutPhase): number {
  switch (p) {
    case "tachiai":
      return 0;
    case "clinch":
      return 1;
    case "momentum":
      return 2;
    case "finish":
      return 3;
  }
}

function sideName(ctx: PbpContext, side: Side): string {
  return side === "east" ? ctx.east.shikona : ctx.west.shikona;
}

function advantageName(ctx: PbpContext, adv: Advantage, winnerSide?: Side): string {
  if (adv === "east") return ctx.east.shikona;
  if (adv === "west") return ctx.west.shikona;
  // If unknown/even, prefer "winner" label if we know it, else blank.
  if (winnerSide) return sideName(ctx, winnerSide);
  return "";
}

function trailerFromLeader(ctx: PbpContext, adv: Advantage, winnerSide?: Side): string {
  if (adv === "east") return ctx.west.shikona;
  if (adv === "west") return ctx.east.shikona;
  // If even, use loser if we know winner.
  if (winnerSide === "east") return ctx.west.shikona;
  if (winnerSide === "west") return ctx.east.shikona;
  return "";
}

function getKimariteLabel(f: PbpFact): string {
  if (f.phase !== "finish") return "";
  return f.kimariteName || f.kimariteId || "";
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
  if (!bucket.length) return { id: "fallback", text: "…" };
  const total = bucket.reduce((s, p) => s + (p.weight ?? 1), 0);
  let roll = rng.next() * total;
  for (const p of bucket) {
    roll -= p.weight ?? 1;
    if (roll <= 0) return p;
  }
  return bucket[bucket.length - 1];
}

/** =========================
 *  Normalizers for BoutLogEntry integration
 *  ========================= */

function normalizeAdvantage(v: any): Advantage {
  if (v === "east" || v === "west" || v === "none") return v;
  return "none";
}

function normalizePosition(v: any): Position {
  // accept older "frontal"
  if (v === "front" || v === "lateral" || v === "rear") return v;
  if (v === "frontal") return "front";
  return "front";
}

function normalizeMomentumReason(v: any): MomentumShiftReason {
  if (
    v === "tachiai_win" ||
    v === "timing_counter" ||
    v === "grip_change" ||
    v === "footwork_angle" ||
    v === "fatigue_turn" ||
    v === "mistake"
  )
    return v;
  return "mistake";
}

function normalizeEdgeEvent(v: any): EdgeEvent | undefined {
  if (
    v === "bales_at_tawara" ||
    v === "steps_out_then_recovers" ||
    v === "heel_on_straw" ||
    v === "dancing_escape" ||
    v === "turns_the_tables" ||
    v === "slips_but_survives"
  )
    return v;
  return undefined;
}

function normalizeGripEvent(v: any): GripEvent | undefined {
  if (
    v === "migi_yotsu_established" ||
    v === "hidari_yotsu_established" ||
    v === "double_inside" ||
    v === "over_under" ||
    v === "no_grip_scramble" ||
    v === "grip_break"
  )
    return v;
  return undefined;
}

function normalizeStrikeEvent(v: any): StrikeEvent | undefined {
  if (
    v === "tsuppari_barrage" ||
    v === "nodowa_pressure" ||
    v === "harite_slap" ||
    v === "throat_attack" ||
    v === "shoulder_blast"
  )
    return v;
  return undefined;
}