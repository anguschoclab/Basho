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
import { rngFromSeed, rngForWorld, SeededRNG } from "./rng";
import { getVoiceMatrix } from "./pbpMatrix";
import type { Side } from "./types/banzuke";
import type { Stance, Style, TacticalArchetype } from "./types/combat";
import type { BoutResult } from "./types/basho";
import type { Advantage, Position } from "./bout";

/** =========================
 *  Fact Layer Types
 *  ========================= */

export type BoutPhase = "tachiai" | "clinch" | "momentum" | "finish" | "tactical";

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

// Re-export canonical types from bout.ts
export type { Advantage, Position } from "./bout";

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

export interface TacticalFact extends PbpFactBase {
  phase: "tactical";
  side: Side;
  archetype?: TacticalArchetype;
  opponentArchetype?: TacticalArchetype;
  clinchPreference?: "belt" | "push" | "neutral";
  strategy: string;
}

export type PbpFact = TachiaiFact | ClinchFact | MomentumFact | FinishFact | TacticalFact;

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

  tactical: {
    oshi_strategy: PhraseBucket;
    yotsu_strategy: PhraseBucket;
    speedster_strategy: PhraseBucket;
    trickster_strategy: PhraseBucket;
    counter_strategy: PhraseBucket;
    adaptive_strategy: PhraseBucket;
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

  tactical: {
    oshi_strategy: [
      { id: "tac_oshi_1", text: "📋 {leader}'s game plan: deny the belt, full forward pressure." },
      { id: "tac_oshi_2", text: "📋 {leader} comes in with a clear oshi strategy — no belt wrestling today." },
      { id: "tac_oshi_3", text: "📋 The commentators note {leader} is set up for relentless pushing." },
      { id: "tac_oshi_4", text: "📋 {leader} wants to keep both hands on {trailer}'s chest — pure oshi." },
      { id: "tac_oshi_5", text: "📋 Forward pressure is the order of the day for {leader}." },
      { id: "tac_oshi_6", text: "📋 {leader} will try to blast {trailer} out before any grip is established." },
      { id: "tac_oshi_7", text: "📋 The pre-bout analysis: {leader} will go tsuppari from the jump." },
      { id: "tac_oshi_8", text: "📋 {leader} doesn't want this on the belt — straight-line attack incoming." },
      { id: "tac_oshi_9", text: "📋 All push, no pull — that's {leader}'s philosophy today." },
      { id: "tac_oshi_10", text: "📋 {leader} is looking to turn this into a sprint, not a marathon." },
      { id: "tac_oshi_11", text: "📋 Chest-to-chest, palms forward — {leader}'s stance says it all." },
      { id: "tac_oshi_12", text: "📋 The game plan is simple: overwhelm with forward energy." },
      { id: "tac_oshi_13", text: "📋 {leader} will keep the arms extended — denying any belt access." },
      { id: "tac_oshi_14", text: "📋 Commentators expect a short, explosive oshi bout from {leader}." },
      { id: "tac_oshi_15", text: "📋 {leader} looks coiled and ready — maximum aggression from the tachiai." },
      { id: "tac_oshi_16", text: "📋 No grip, no problem — {leader} plans to push {trailer} right out." },
      { id: "tac_oshi_17", text: "📋 {leader}'s corner wants relentless tsuppari — keep {trailer} off balance." },
      { id: "tac_oshi_18", text: "📋 The scouting report says {leader} will hammer the chest early." },
      { id: "tac_oshi_19", text: "📋 {leader} aims to end this before {trailer} can settle into position." },
      { id: "tac_oshi_20", text: "📋 Pure pushing sumo from {leader} — crowd expects fireworks." },
      { id: "tac_oshi_21", text: "📋 {leader} plants wide and low — the oshi stance of a bulldozer." },
      { id: "tac_oshi_22", text: "📋 Speed and thrust — that's {leader}'s recipe today." },
      { id: "tac_oshi_23", text: "📋 The plan: make contact at the throat and never let go." },
      { id: "tac_oshi_24", text: "📋 {leader}'s coach wants nodowa pressure from the first second." },
      { id: "tac_oshi_25", text: "📋 Don't let {trailer} get inside — {leader}'s mantra for this match." },
      { id: "tac_oshi_26", text: "📋 {leader} has been drilling tsuppari all week for this opponent." },
      { id: "tac_oshi_27", text: "📋 The commentators whisper: '{leader} wants a quick demolition.'" },
      { id: "tac_oshi_28", text: "📋 Flat palms, forward drive — {leader} won't compromise on the approach." },
      { id: "tac_oshi_29", text: "📋 {leader} wants separation — oshi thrives on distance." },
      { id: "tac_oshi_30", text: "📋 {trailer} needs the belt; {leader} plans to make sure that never happens." },
      { id: "tac_oshi_31", text: "📋 Full-throttle oshi — {leader} is betting everything on the initial blast." },
      { id: "tac_oshi_32", text: "📋 The approach: use raw power to push {trailer} past the bales." },
      { id: "tac_oshi_33", text: "📋 {leader} focuses on foot placement — oshi needs a solid base." },
      { id: "tac_oshi_34", text: "📋 Commentators note {leader}'s hands are already up — classic oshi ready stance." },
      { id: "tac_oshi_35", text: "📋 {leader}'s strategy: keep {trailer}'s hips far away at all costs." },
      { id: "tac_oshi_36", text: "📋 Expect a volley of thrusts — {leader} trains for exactly this matchup." },
      { id: "tac_oshi_37", text: "📋 The gameplan: push like a freight train, ask questions later." },
      { id: "tac_oshi_38", text: "📋 {leader}'s oshi is calibrated for {trailer}'s height — this should be interesting." },
      { id: "tac_oshi_39", text: "📋 A low tachiai into chest thrusts — {leader}'s textbook play." },
      { id: "tac_oshi_40", text: "📋 {leader} has chosen aggression over patience today." },
      { id: "tac_oshi_41", text: "📋 Shove early, shove often — that's the oshi blueprint." },
      { id: "tac_oshi_42", text: "📋 {leader} is going to try to make this a pushing battle from start to finish." },
      { id: "tac_oshi_43", text: "📋 The analyst says {leader} must keep moving forward — any pause and {trailer} recovers." },
      { id: "tac_oshi_44", text: "📋 {leader} squares up wide — ready to deliver maximum forward force." },
      { id: "tac_oshi_45", text: "📋 No tricks, no misdirection — {leader} believes in pure oshi power." },
      { id: "tac_oshi_46", text: "📋 The crowd senses it: {leader} is going full assault from the whistle." },
      { id: "tac_oshi_47", text: "📋 {leader}'s hands are poised at shoulder height — the oshi telltale." },
      { id: "tac_oshi_48", text: "📋 {leader} will try to keep this bout under five seconds with explosive pushing." },
      { id: "tac_oshi_49", text: "📋 Arms like pistons — {leader} is built for this style of sumo." },
      { id: "tac_oshi_50", text: "📋 The tactical read: {leader} believes forward pressure nullifies {trailer}'s strengths." },
      { id: "tac_oshi_51", text: "📋 {leader} is zeroed in — a violent oshi tachiai is coming." },
      { id: "tac_oshi_52", text: "📋 Don't blink — {leader} plans to end this with oshi before anyone settles." },
    ],
    yotsu_strategy: [
      { id: "tac_yotsu_1", text: "📋 {leader}'s approach: get to the belt at all costs." },
      { id: "tac_yotsu_2", text: "📋 {leader} wants this on the mawashi — a patient belt-hunting plan." },
      { id: "tac_yotsu_3", text: "📋 Classic yotsu preparation from {leader} — absorb and grapple." },
      { id: "tac_yotsu_4", text: "📋 {leader} aims to establish migi-yotsu early — right hand inside." },
      { id: "tac_yotsu_5", text: "📋 The commentators see {leader} adjusting the mawashi — belt sumo on the menu." },
      { id: "tac_yotsu_6", text: "📋 {leader} wants to slow this down and fight on the belt." },
      { id: "tac_yotsu_7", text: "📋 Patience is the name of the game — {leader} will hunt that grip." },
      { id: "tac_yotsu_8", text: "📋 {leader}'s plan: survive the tachiai, then take it to yotsu." },
      { id: "tac_yotsu_9", text: "📋 The pre-bout read: {leader} needs to neutralize the push and find the belt." },
      { id: "tac_yotsu_10", text: "📋 {leader} is a belt fighter through and through — expect grip attempts." },
      { id: "tac_yotsu_11", text: "📋 The strategy: absorb the initial charge, then lock in a grip." },
      { id: "tac_yotsu_12", text: "📋 {leader} drops the hips and prepares — classic yotsu foundation." },
      { id: "tac_yotsu_13", text: "📋 Commentators say {leader} needs mawashi contact within the first three seconds." },
      { id: "tac_yotsu_14", text: "📋 {leader} likes this fight long and technical — belt wrestling favors experience." },
      { id: "tac_yotsu_15", text: "📋 The scouting report: {leader} will sacrifice tachiai speed for grip position." },
      { id: "tac_yotsu_16", text: "📋 {leader} extends the left hand — seeking that hidari-yotsu foundation." },
      { id: "tac_yotsu_17", text: "📋 Belt, belt, belt — {leader}'s singular obsession in this bout." },
      { id: "tac_yotsu_18", text: "📋 {leader} will try to close the distance and lock hips." },
      { id: "tac_yotsu_19", text: "📋 The veteran move: let {trailer} expend energy, then take over on the belt." },
      { id: "tac_yotsu_20", text: "📋 {leader} is prepared for a long bout — the yotsu specialist thrives in extended grappling." },
      { id: "tac_yotsu_21", text: "📋 Hip-to-hip, chest-to-chest — {leader} wants maximum body contact." },
      { id: "tac_yotsu_22", text: "📋 The plan: deny space and convert to a mawashi battle." },
      { id: "tac_yotsu_23", text: "📋 {leader}'s base is immovable — setting up to receive and grapple." },
      { id: "tac_yotsu_24", text: "📋 Commentators note {leader}'s calm demeanor — this is a wrestler who likes the clinch." },
      { id: "tac_yotsu_25", text: "📋 {leader} has been working grips in practice all week." },
      { id: "tac_yotsu_26", text: "📋 Inside position is everything — {leader} will fight for it." },
      { id: "tac_yotsu_27", text: "📋 {leader} wants to make this ugly and close — yotsu territory." },
      { id: "tac_yotsu_28", text: "📋 The tactical approach: get underneath and control the mawashi." },
      { id: "tac_yotsu_29", text: "📋 {leader} plants the feet wide — a grappler's stance from the start." },
      { id: "tac_yotsu_30", text: "📋 {leader} intends to use superior technique once on the belt." },
      { id: "tac_yotsu_31", text: "📋 The first goal: establish double-inside position and squeeze." },
      { id: "tac_yotsu_32", text: "📋 {leader}'s hips are low — that's the yotsu signature." },
      { id: "tac_yotsu_33", text: "📋 Commentators predict a methodical, grip-focused approach from {leader}." },
      { id: "tac_yotsu_34", text: "📋 {leader} is ready to weather the storm to get that mawashi grip." },
      { id: "tac_yotsu_35", text: "📋 Once {leader} gets the belt, the bout changes completely." },
      { id: "tac_yotsu_36", text: "📋 {leader}'s training partner says the grip work this week was exceptional." },
      { id: "tac_yotsu_37", text: "📋 The analysis: {leader}'s best path to victory runs through the belt." },
      { id: "tac_yotsu_38", text: "📋 {leader} crouches deeper than usual — extra emphasis on hip control." },
      { id: "tac_yotsu_39", text: "📋 Left hand seeks the belt, right hand blocks — {leader}'s opening gambit." },
      { id: "tac_yotsu_40", text: "📋 {leader} wants to negate {trailer}'s strengths by making this a grapple." },
      { id: "tac_yotsu_41", text: "📋 The crowd knows: when {leader} fights yotsu, the bout gets technical." },
      { id: "tac_yotsu_42", text: "📋 {leader} has a size advantage — the belt is where that pays off." },
      { id: "tac_yotsu_43", text: "📋 Step one: absorb. Step two: grip. Step three: throw. That's {leader}'s plan." },
      { id: "tac_yotsu_44", text: "📋 {leader} will eat a hard tachiai to get chest-to-chest." },
      { id: "tac_yotsu_45", text: "📋 The mawashi is everything — {leader} reaches for it immediately." },
      { id: "tac_yotsu_46", text: "📋 {leader} prepares for a war of attrition on the belt." },
      { id: "tac_yotsu_47", text: "📋 Inside or outside grip — {leader} will take whatever belt access comes." },
      { id: "tac_yotsu_48", text: "📋 The longer this goes, the more {leader}'s yotsu game takes over." },
      { id: "tac_yotsu_49", text: "📋 {leader}'s eyes are locked on {trailer}'s mawashi — tunnel vision." },
      { id: "tac_yotsu_50", text: "📋 Belt wrestling is an art — and {leader} is a master craftsman." },
      { id: "tac_yotsu_51", text: "📋 {leader} sets a wide base and low center — this is textbook yotsu prep." },
      { id: "tac_yotsu_52", text: "📋 The expert panel agrees: {leader} must make this a belt fight to win." },
    ],
    speedster_strategy: [
      { id: "tac_speed_1", text: "📋 {leader} will use footwork — movement sumo is the plan." },
      { id: "tac_speed_2", text: "📋 Quick feet, sharp angles — {leader} aims to stay mobile." },
      { id: "tac_speed_3", text: "📋 The commentators say {leader} will rely on lateral movement today." },
      { id: "tac_speed_4", text: "📋 {leader}'s game: don't stand still, don't let {trailer} square up." },
      { id: "tac_speed_5", text: "📋 Speed kills — {leader} plans to make {trailer} chase." },
      { id: "tac_speed_6", text: "📋 The pre-bout read: {leader} will use angles to neutralize power." },
      { id: "tac_speed_7", text: "📋 {leader} circles before the tachiai — already thinking about angles." },
      { id: "tac_speed_8", text: "📋 Expect lateral dashes and sidesteps — {leader}'s trademark." },
      { id: "tac_speed_9", text: "📋 {leader} doesn't want a chest-to-chest battle — mobility is key." },
      { id: "tac_speed_10", text: "📋 The plan: use superior speed to create openings {trailer} can't cover." },
      { id: "tac_speed_11", text: "📋 {leader} is lighter but quicker — the goal is to make size irrelevant." },
      { id: "tac_speed_12", text: "📋 Footwork over power — that's {leader}'s creed." },
      { id: "tac_speed_13", text: "📋 {leader} will try to keep {trailer} reaching and off balance." },
      { id: "tac_speed_14", text: "📋 The scout says {leader}'s best chance is to make this a track meet." },
      { id: "tac_speed_15", text: "📋 Don't get pinned to the center — {leader}'s first rule." },
      { id: "tac_speed_16", text: "📋 {leader} bounces on the toes — coiled energy waiting to spring." },
      { id: "tac_speed_17", text: "📋 Commentators note the light feet — {leader} is in movement mode." },
      { id: "tac_speed_18", text: "📋 {leader} will try to circle away from {trailer}'s strong side." },
      { id: "tac_speed_19", text: "📋 The strategy: force {trailer} to turn, then exploit the opening." },
      { id: "tac_speed_20", text: "📋 {leader} is looking to make {trailer} heavy on the feet." },
      { id: "tac_speed_21", text: "📋 Agility over brawn — {leader} has trained for exactly this." },
      { id: "tac_speed_22", text: "📋 {leader} plans to hit and move — never stay in one spot." },
      { id: "tac_speed_23", text: "📋 The angle of attack matters more than the force for {leader}." },
      { id: "tac_speed_24", text: "📋 {leader} is calculated in the approach — speed must be precise." },
      { id: "tac_speed_25", text: "📋 The gameplan: win with movement, not muscle." },
      { id: "tac_speed_26", text: "📋 {leader}'s coach preaches lateral motion — today we'll see it applied." },
      { id: "tac_speed_27", text: "📋 {leader} keeps the weight on the balls of the feet — ready to spring." },
      { id: "tac_speed_28", text: "📋 The analysis desk notes {leader}'s evasion rate is elite." },
      { id: "tac_speed_29", text: "📋 {leader} won't trade power shots — expect slippery, elusive sumo." },
      { id: "tac_speed_30", text: "📋 The key: don't get locked in {trailer}'s pace. Dictate with speed." },
      { id: "tac_speed_31", text: "📋 {leader} feints left, darts right — misdirection through speed." },
      { id: "tac_speed_32", text: "📋 A quick henka is always in the pocket — but {leader} prefers to earn it." },
      { id: "tac_speed_33", text: "📋 Commentators expect a short, explosive bout with {leader} on the move." },
      { id: "tac_speed_34", text: "📋 {leader}'s footwork in practice this week was described as 'untouchable'." },
      { id: "tac_speed_35", text: "📋 The approach: create chaos with movement and capitalize on mistakes." },
      { id: "tac_speed_36", text: "📋 {leader} knows the weight disadvantage — speed is the equalizer." },
      { id: "tac_speed_37", text: "📋 Light on the feet, heavy on the tactics — that's {leader}'s brand." },
      { id: "tac_speed_38", text: "📋 {leader} has the fastest first step in the division — watch for it." },
      { id: "tac_speed_39", text: "📋 The scouting report: {leader} will use mawari-komi-style circular movement." },
      { id: "tac_speed_40", text: "📋 {leader}'s legs are the weapon — not the arms." },
      { id: "tac_speed_41", text: "📋 Expect {leader} to try a sidestep at the tachiai — classic speed play." },
      { id: "tac_speed_42", text: "📋 The plan is hit-and-run: quick strikes, quick retreat, repeat." },
      { id: "tac_speed_43", text: "📋 {leader} will frustrate {trailer} by never being where expected." },
      { id: "tac_speed_44", text: "📋 Angles, angles, angles — {leader}'s entire strategy in one word." },
      { id: "tac_speed_45", text: "📋 {leader}'s quickness was timed in practice — fastest in the heya." },
      { id: "tac_speed_46", text: "📋 Commentators say {leader} needs to avoid a straight-line battle at all costs." },
      { id: "tac_speed_47", text: "📋 {leader} makes even heavy wrestlers look slow — that's the gift." },
      { id: "tac_speed_48", text: "📋 The tactical edge: make {trailer} lunge and miss." },
      { id: "tac_speed_49", text: "📋 {leader} is warming up with shadow footwork — speed sumo confirmed." },
      { id: "tac_speed_50", text: "📋 When {leader} fights fast, the bout is decided in the first two seconds." },
      { id: "tac_speed_51", text: "📋 {leader} wants a scramble — chaos favors the quicker fighter." },
      { id: "tac_speed_52", text: "📋 The expert opinion: {leader} must fight at range and never get locked in." },
    ],
    trickster_strategy: [
      { id: "tac_trick_1", text: "📋 Expect the unexpected — {leader} is reading the opponent's habits." },
      { id: "tac_trick_2", text: "📋 {leader} has that look in his eyes — something tricky is coming." },
      { id: "tac_trick_3", text: "📋 Misdirection and feints — that's {leader}'s plan today." },
      { id: "tac_trick_4", text: "📋 {leader} studies {trailer}'s tendencies — a trap is being set." },
      { id: "tac_trick_5", text: "📋 The commentators warn: nothing {leader} does is straightforward." },
      { id: "tac_trick_6", text: "📋 {leader} may look relaxed, but the mind is calculating." },
      { id: "tac_trick_7", text: "📋 Mental warfare — {leader} plans to outthink, not overpower." },
      { id: "tac_trick_8", text: "📋 {leader} will feint high and attack low — classic deception." },
      { id: "tac_trick_9", text: "📋 Don't trust the first move — {leader} always has a second plan." },
      { id: "tac_trick_10", text: "📋 The pre-bout read: {leader} will exploit any hesitation from {trailer}." },
      { id: "tac_trick_11", text: "📋 {leader}'s strength isn't in the arms — it's between the ears." },
      { id: "tac_trick_12", text: "📋 Watch the eyes — {leader} looks left but attacks right." },
      { id: "tac_trick_13", text: "📋 {leader} likes to make opponents doubt themselves mid-bout." },
      { id: "tac_trick_14", text: "📋 The gameplan: keep {trailer} guessing with unpredictable timing." },
      { id: "tac_trick_15", text: "📋 {leader} is the type to pull at the moment you push — timing trickery." },
      { id: "tac_trick_16", text: "📋 Commentators say {leader} has been watching tape of {trailer} all week." },
      { id: "tac_trick_17", text: "📋 {leader} may invite the attack just to counter it — a dangerous game." },
      { id: "tac_trick_18", text: "📋 The plan: use {trailer}'s aggression against them." },
      { id: "tac_trick_19", text: "📋 {leader} has at least three tricks ready — the question is which one." },
      { id: "tac_trick_20", text: "📋 Never take {leader} at face value — the deception starts before the tachiai." },
      { id: "tac_trick_21", text: "📋 {leader} is known for fighting differently every single bout." },
      { id: "tac_trick_22", text: "📋 The scout warns: {leader}'s greatest weapon is unpredictability." },
      { id: "tac_trick_23", text: "📋 {leader} changes rhythm mid-bout — it's disorienting for opponents." },
      { id: "tac_trick_24", text: "📋 A hatakikomi setup? A henka? {leader} keeps everyone guessing." },
      { id: "tac_trick_25", text: "📋 {leader} practices timing drills more than power drills — telling." },
      { id: "tac_trick_26", text: "📋 The approach: look passive, then strike when {trailer} commits." },
      { id: "tac_trick_27", text: "📋 {leader} will try to disrupt {trailer}'s rhythm from the first contact." },
      { id: "tac_trick_28", text: "📋 Commentators call {leader} 'the magician' — for good reason." },
      { id: "tac_trick_29", text: "📋 {leader} may absorb the tachiai on purpose — it's bait." },
      { id: "tac_trick_30", text: "📋 The veteran's instinct: {leader} feels the opponent's weight shift and exploits it." },
      { id: "tac_trick_31", text: "📋 {leader} is setting up a psychological game before the bout even starts." },
      { id: "tac_trick_32", text: "📋 Slow hands at the shikiri — {leader} is deliberately messing with timing." },
      { id: "tac_trick_33", text: "📋 {leader} plans to fight a completely different bout than what {trailer} prepared for." },
      { id: "tac_trick_34", text: "📋 The pre-bout ritual is unusually long — {leader} is getting inside {trailer}'s head." },
      { id: "tac_trick_35", text: "📋 {leader} will use timing, leverage, and misdirection to compensate for size." },
      { id: "tac_trick_36", text: "📋 Don't fall for the head fake — but {trailer} probably will." },
      { id: "tac_trick_37", text: "📋 {leader}'s plan is to make {trailer} feel uncomfortable from the opening second." },
      { id: "tac_trick_38", text: "📋 The analysis desk says {leader} changes strategy mid-bout more than anyone." },
      { id: "tac_trick_39", text: "📋 {leader} has lost to {trailer} before — but never the same way twice." },
      { id: "tac_trick_40", text: "📋 The trickster's code: if they know what's coming, it won't work." },
      { id: "tac_trick_41", text: "📋 {leader} could go oshi, yotsu, or henka — and that's the problem for {trailer}." },
      { id: "tac_trick_42", text: "📋 Commentators speculate on a possible pull-down trap from {leader}." },
      { id: "tac_trick_43", text: "📋 {leader}'s body language gives nothing away — perfectly inscrutable." },
      { id: "tac_trick_44", text: "📋 The plan: make {trailer} think one thing, then do the opposite." },
      { id: "tac_trick_45", text: "📋 {leader} thrives in chaos — and plans to create plenty of it." },
      { id: "tac_trick_46", text: "📋 Every movement from {leader} is loaded with intention — or deliberate misdirection." },
      { id: "tac_trick_47", text: "📋 {leader}'s stablemaster says 'even I don't know what he'll do.'" },
      { id: "tac_trick_48", text: "📋 The strategy is anti-strategy — pure improvisation from {leader}." },
      { id: "tac_trick_49", text: "📋 {leader} waits a beat longer than normal — the pause itself is a weapon." },
      { id: "tac_trick_50", text: "📋 Expect the bout to unfold in a way nobody predicted — {leader}'s specialty." },
      { id: "tac_trick_51", text: "📋 {leader} is a student of the game — every opponent gets a custom plan." },
      { id: "tac_trick_52", text: "📋 The trickster approaches: read, adapt, exploit. In that order." },
    ],
    counter_strategy: [
      { id: "tac_ctr_1", text: "📋 {leader} is set to absorb and redirect — a counter strategy." },
      { id: "tac_ctr_2", text: "📋 Patient and calculated — {leader} waits for the opponent to overcommit." },
      { id: "tac_ctr_3", text: "📋 The analysis desk notes {leader} is fighting reactively today." },
      { id: "tac_ctr_4", text: "📋 {leader}'s plan: let {trailer} attack, then use their momentum against them." },
      { id: "tac_ctr_5", text: "📋 Commentators see a defensive stance — {leader} is in counter mode." },
      { id: "tac_ctr_6", text: "📋 {leader} is baiting {trailer} into overextending — a patient trap." },
      { id: "tac_ctr_7", text: "📋 The strategy: absorb the impact, redirect the force, finish." },
      { id: "tac_ctr_8", text: "📋 {leader} has studied {trailer}'s attack patterns — counters are pre-loaded." },
      { id: "tac_ctr_9", text: "📋 The pre-bout scouting: {leader} plans to use {trailer}'s aggression as a weapon." },
      { id: "tac_ctr_10", text: "📋 {leader} won't initiate — the counter specialist waits for the opening." },
      { id: "tac_ctr_11", text: "📋 Patience is the counter fighter's greatest ally — and {leader} has plenty." },
      { id: "tac_ctr_12", text: "📋 {leader} sets low and braces — a human wall waiting to redirect." },
      { id: "tac_ctr_13", text: "📋 The plan: give ground strategically, then explode with a reversal." },
      { id: "tac_ctr_14", text: "📋 {leader} reads body weight like a book — the counter will come at the perfect moment." },
      { id: "tac_ctr_15", text: "📋 Commentators predict {leader} will try a timing throw off {trailer}'s charge." },
      { id: "tac_ctr_16", text: "📋 {leader}'s hips are set for a pivot — classic counter positioning." },
      { id: "tac_ctr_17", text: "📋 The counter fighter's art: transform the opponent's force into your own." },
      { id: "tac_ctr_18", text: "📋 {leader} allows the first move — but controls everything after." },
      { id: "tac_ctr_19", text: "📋 The more aggressive {trailer} gets, the better for {leader}'s counter game." },
      { id: "tac_ctr_20", text: "📋 {leader} wants {trailer} to come in hot — it makes the reversal devastating." },
      { id: "tac_ctr_21", text: "📋 Timing over power — that's {leader}'s entire philosophy." },
      { id: "tac_ctr_22", text: "📋 {leader} has drilled throws off the opponent's forward momentum all week." },
      { id: "tac_ctr_23", text: "📋 The approach: stay compact, stay balanced, wait for the opening." },
      { id: "tac_ctr_24", text: "📋 {leader}'s balance is exceptional — perfect for absorbing attacks." },
      { id: "tac_ctr_25", text: "📋 Commentators call {leader} 'the wall' — you push, and nothing happens." },
      { id: "tac_ctr_26", text: "📋 {leader}'s experience shows — every attack pattern has a counter." },
      { id: "tac_ctr_27", text: "📋 The gameplan: be reactive, not proactive. Let {trailer} make the mistakes." },
      { id: "tac_ctr_28", text: "📋 {leader} will try a kotenage or sukuinage off the charge — bet on it." },
      { id: "tac_ctr_29", text: "📋 The analyst says {leader}'s reversal success rate is the highest in the division." },
      { id: "tac_ctr_30", text: "📋 {leader} invites pressure — it's the bait in the trap." },
      { id: "tac_ctr_31", text: "📋 Don't mistake patience for passivity — {leader} is always calculating." },
      { id: "tac_ctr_32", text: "📋 {leader}'s footwork is subtle — adjusting angles for the perfect counter." },
      { id: "tac_ctr_33", text: "📋 The plan: stay grounded, stay centered, and punish the first overreach." },
      { id: "tac_ctr_34", text: "📋 {leader} has the body awareness of a judoka — timing counters come naturally." },
      { id: "tac_ctr_35", text: "📋 Commentators note the relaxed posture — {leader} is confident in the counter." },
      { id: "tac_ctr_36", text: "📋 {leader}'s training emphasizes reading hips — the key to any reversal." },
      { id: "tac_ctr_37", text: "📋 The pre-bout strategy: let {trailer} think they're winning, then flip the script." },
      { id: "tac_ctr_38", text: "📋 {leader}'s center of gravity is rock-solid — the base of all counter sumo." },
      { id: "tac_ctr_39", text: "📋 The scouting says {leader} will accept the belt grip to set up a throw." },
      { id: "tac_ctr_40", text: "📋 {leader}'s defensive sumo is a thing of beauty — when it works." },
      { id: "tac_ctr_41", text: "📋 The counter fighter doesn't need to win the tachiai — just survive it." },
      { id: "tac_ctr_42", text: "📋 {leader} plays possum — looking vulnerable until the moment of truth." },
      { id: "tac_ctr_43", text: "📋 The analysis: {leader}'s best wins all come from redirected force." },
      { id: "tac_ctr_44", text: "📋 {leader} is mentally mapping {trailer}'s weight distribution right now." },
      { id: "tac_ctr_45", text: "📋 Wait for it… wait for it… {leader} is the most patient fighter here." },
      { id: "tac_ctr_46", text: "📋 {leader}'s hands are relaxed — ready to catch and redirect, not push." },
      { id: "tac_ctr_47", text: "📋 The commentators say {leader} fights like a bullfighter — step aside and strike." },
      { id: "tac_ctr_48", text: "📋 {leader} wants {trailer} to attack with conviction — it's easier to counter." },
      { id: "tac_ctr_49", text: "📋 The plan is defensive in appearance but lethal in execution." },
      { id: "tac_ctr_50", text: "📋 {leader} has the rare gift of turning an opponent's strength into a weakness." },
      { id: "tac_ctr_51", text: "📋 Expect a textbook counter — {leader} has been training for this exact matchup." },
      { id: "tac_ctr_52", text: "📋 The counter specialist's mantra: every force has an equal and opposite opening." },
    ],
    adaptive_strategy: [
      { id: "tac_adapt_1", text: "📋 {leader} reads the matchup and adjusts — a flexible approach." },
      { id: "tac_adapt_2", text: "📋 No fixed plan — {leader} adapts to whatever comes." },
      { id: "tac_adapt_3", text: "📋 A calculated game plan from {leader} — exploiting the opponent's weakness." },
      { id: "tac_adapt_4", text: "📋 {leader} can go oshi or yotsu — and will choose based on what {trailer} gives." },
      { id: "tac_adapt_5", text: "📋 Commentators say {leader} is the hardest to prepare for — no fixed style." },
      { id: "tac_adapt_6", text: "📋 The all-rounder's advantage: respond to anything with the right tool." },
      { id: "tac_adapt_7", text: "📋 {leader} scans {trailer}'s stance — already adapting the approach." },
      { id: "tac_adapt_8", text: "📋 Versatility is {leader}'s greatest weapon — expect a custom gameplan." },
      { id: "tac_adapt_9", text: "📋 The scouting report: {leader} will target {trailer}'s weakest area." },
      { id: "tac_adapt_10", text: "📋 {leader} doesn't commit to one style — flowing between oshi and yotsu." },
      { id: "tac_adapt_11", text: "📋 The pre-bout analysis: {leader} will adjust mid-bout if needed." },
      { id: "tac_adapt_12", text: "📋 {leader}'s flexibility makes the preparation almost impossible for {trailer}." },
      { id: "tac_adapt_13", text: "📋 A chameleon on the dohyo — {leader} becomes whatever the bout demands." },
      { id: "tac_adapt_14", text: "📋 {leader} has weapons for every situation — the ultimate utility fighter." },
      { id: "tac_adapt_15", text: "📋 The approach: test the waters, then commit to what works." },
      { id: "tac_adapt_16", text: "📋 {leader}'s versatility is born from endless cross-training." },
      { id: "tac_adapt_17", text: "📋 Commentators note {leader} changes technique against every opponent." },
      { id: "tac_adapt_18", text: "📋 The gameplan: have three plans ready and pick the best one in real time." },
      { id: "tac_adapt_19", text: "📋 {leader} doesn't fight the opponent's fight — creates the terms." },
      { id: "tac_adapt_20", text: "📋 The analyst says {leader} reads opponents faster than anyone in the division." },
      { id: "tac_adapt_21", text: "📋 {leader}'s training includes every style — the benefits show." },
      { id: "tac_adapt_22", text: "📋 No ego, no stubbornness — {leader} does what the matchup requires." },
      { id: "tac_adapt_23", text: "📋 {leader} is the type to switch from belt to push mid-sequence." },
      { id: "tac_adapt_24", text: "📋 The pre-bout ritual reveals nothing — {leader} shows no cards." },
      { id: "tac_adapt_25", text: "📋 {leader}'s stablemaster preaches adaptability above all — it shows." },
      { id: "tac_adapt_26", text: "📋 Commentators can't predict the style — and that's exactly {leader}'s edge." },
      { id: "tac_adapt_27", text: "📋 {leader} has beaten power fighters and technicians alike — true versatility." },
      { id: "tac_adapt_28", text: "📋 The approach: if plan A fails, pivot instantly to plan B." },
      { id: "tac_adapt_29", text: "📋 {leader} observes before acting — a hallmark of the adaptive fighter." },
      { id: "tac_adapt_30", text: "📋 The analysis desk says {leader} is prepared for any style {trailer} brings." },
      { id: "tac_adapt_31", text: "📋 {leader} may start oshi and end yotsu — or the reverse. Both are likely." },
      { id: "tac_adapt_32", text: "📋 Experience is the adaptive fighter's best friend — and {leader} has plenty." },
      { id: "tac_adapt_33", text: "📋 {leader}'s training rotation hits every style weekly — maximum flexibility." },
      { id: "tac_adapt_34", text: "📋 The tactical read: {leader} has identified something in {trailer}'s stance." },
      { id: "tac_adapt_35", text: "📋 {leader} is calm and centered — ready for whatever develops." },
      { id: "tac_adapt_36", text: "📋 The commentators admire the poise — {leader} never looks rushed or surprised." },
      { id: "tac_adapt_37", text: "📋 {leader}'s fight IQ is off the charts — every action is calculated." },
      { id: "tac_adapt_38", text: "📋 The plan: stay neutral until the opening reveals itself." },
      { id: "tac_adapt_39", text: "📋 {leader} can push like an oshi fighter or throw like a yotsu master." },
      { id: "tac_adapt_40", text: "📋 The pre-bout preparation was opponent-specific — {leader} has homework done." },
      { id: "tac_adapt_41", text: "📋 Commentators say {leader} is the smartest fighter in the room." },
      { id: "tac_adapt_42", text: "📋 {leader} adapts not just to the opponent but to the moment." },
      { id: "tac_adapt_43", text: "📋 The versatile approach: probe, assess, then strike with precision." },
      { id: "tac_adapt_44", text: "📋 {leader}'s greatest strength: no weakness for {trailer} to exploit." },
      { id: "tac_adapt_45", text: "📋 The expert panel says {leader} fights a new bout every time — never stale." },
      { id: "tac_adapt_46", text: "📋 {leader}'s flexibility means {trailer} must prepare for everything." },
      { id: "tac_adapt_47", text: "📋 Adaptive sumo at its finest — {leader} is the ultimate generalist." },
      { id: "tac_adapt_48", text: "📋 The game plan: there is no fixed game plan. That IS the game plan." },
      { id: "tac_adapt_49", text: "📋 {leader} lets the bout dictate the style — never the other way around." },
      { id: "tac_adapt_50", text: "📋 Commentators have given up predicting {leader} — and that's a compliment." },
      { id: "tac_adapt_51", text: "📋 {leader} approaches the shikiri with quiet confidence — prepared for all outcomes." },
      { id: "tac_adapt_52", text: "📋 The adaptive fighter's edge: maximum preparation, zero rigidity." },
    ],
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
  lib?: PbpLibrary
): PbpLine[] {
  // Use voice matrix as default library (lazy-loaded singleton)
  if (!lib) {
    try {
      lib = getVoiceMatrix();
    } catch {
      lib = DEFAULT_PBP_LIBRARY;
    }
  }
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
  lib?: PbpLibrary
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

  let tacticalBeat = 0;

  if (Array.isArray(result.log)) {
    for (const entry of result.log) {
      // Tactical strategy entries (emitted before tachiai)
      if (entry.data?.tacticalEntry) {
        const side = entry.data.side as Side;
        facts.push({
          phase: "tactical",
          beat: ++tacticalBeat,
          side,
          archetype: entry.data.archetype,
          opponentArchetype: entry.data.opponentArchetype,
          clinchPreference: entry.data.clinchPreference,
          strategy: entry.data.strategy ?? "Standard approach",
          leader: side,
        } as TacticalFact);
      } else if (entry.phase === "clinch") {
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

    case "tactical": {
      const arch = (fact as TacticalFact).archetype;
      let bucket = lib.tactical.adaptive_strategy;
      if (arch === "oshi_specialist") bucket = lib.tactical.oshi_strategy;
      else if (arch === "yotsu_specialist") bucket = lib.tactical.yotsu_strategy;
      else if (arch === "speedster") bucket = lib.tactical.speedster_strategy;
      else if (arch === "trickster") bucket = lib.tactical.trickster_strategy;
      else if (arch === "counter_specialist") bucket = lib.tactical.counter_strategy;
      else if (arch === "hybrid_oshi_yotsu" || arch === "all_rounder") bucket = lib.tactical.adaptive_strategy;

      const chosen = weightedPick(bucket, rng);
      return { phrase: chosen, tags: mergeTags(chosen.tags) };
    }
  }
}

/** =========================
 *  Utilities
 *  ========================= */

function phaseOrder(p: BoutPhase): number {
  switch (p) {
    case "tactical":
      return -1;
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