import type { ReplayPhase } from "./types";

export const PHASES: ReplayPhase[] = [
  "ritual",
  "tachiai",
  "clinch",
  "momentum",
  "finish",
  "ceremony",
  "complete",
];

export const PHASE_LABELS: Record<ReplayPhase, { en: string; ja: string }> = {
  ritual: { en: "Ritual", ja: "仕切り" },
  tachiai: { en: "Tachiai", ja: "立合い" },
  clinch: { en: "Clinch", ja: "組み" },
  momentum: { en: "Momentum", ja: "攻め" },
  finish: { en: "Finish", ja: "決まり手" },
  ceremony: { en: "Ceremony", ja: "表彰" },
  complete: { en: "Complete", ja: "終了" },
};

export const CROWD_TEXT: Record<ReplayPhase, string> = {
  ritual: "Silence fills the arena…",
  tachiai: "TACHIAI!",
  clinch: "The crowd holds its breath…",
  momentum: "Rising tension!",
  finish: "決まり手！",
  ceremony: "The hall erupts!",
  complete: "",
};
