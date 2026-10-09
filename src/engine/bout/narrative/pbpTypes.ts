/**
 * pbpTypes.ts — public play-by-play types for bout narration.
 * Moved verbatim from boutNarrative.ts during the narrative pipeline split.
 */

export type PbpPhase =
  | "opening"
  | "pre_bout"
  | "entrance"
  | "ritual"
  | "tactical"
  | "tachiai"
  | "engagement"
  | "clinch"
  | "momentum"
  | "momentum_shift"
  | "edge_crisis"
  | "fatigue"
  | "bout_injury"
  | "grip_transition"
  | "bout_timeout"
  | "counter_tactic"
  | "finish"
  | "post_bout"
  | "replay"
  | "interview"
  | "mono_ii"
  | "award"
  | "ceremony"
  | "closing"
  | "kyujo";

export type PbpVoice = "dramatic" | "formal" | "understated";

export type PbpTag =
  | "crowd_roar"
  | "gasps"
  | "upset"
  | "kinboshi"
  | "ginboshi"
  | "kensho"
  | "yusho_race"
  | "close_call"
  | "dominant"
  | "dynasty"
  | "drama"
  | "henka"
  | "rivalry"
  | "grudge_match"
  | "injury"
  | "comeback"
  | "milestone"
  | "winless"
  | "birthday"
  | "hometown"
  | "veteran"
  | "rookie"
  | "kadoban"
  | "career_high"
  | "career_phase"
  | "consecutive_kachi"
  | "kachi_koshi"
  | "make_koshi"
  | "first_win"
  | "streak"
  | "title_stakes"
  | "senshuraku"
  | "tournament_context"
  | "weight_diff"
  | "age_diff"
  | "mono_ii"
  | "interview"
  | "body_type"
  | "debut"
  | "heya_style"
  | "archetype_counter"
  | "archetype_evolution"
  | "counter"
  | "momentum_shift"
  | "ozeki_demotion"
  | "son_of_stablemaster"
  | "justice_done"
  | "schedule_delay"
  | "ydc_accountability"
  | "post_basho_press"
  | "playoff"
  | "lower_division";

export type PbpLine = {
  text: string;
  id: string;
  /** Optional phase metadata used by the narrative modal for styling */
  phase?: PbpPhase;
  /** Optional tags rendered as small icons under the line */
  tags?: PbpTag[];
  /** Voice style used for this line */
  voice?: PbpVoice;
};
