/**
 * boutModalConstants.ts
 *
 * Display constants for BoutNarrativeModal — per-phase badge styling and
 * pbp-line tag icons.
 */

export const PHASE_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  opening: { label: "開幕", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  pre_bout: { label: "前取", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  entrance: { label: "入場", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  ritual: { label: "儀式", color: "text-muted-foreground", bg: "bg-muted/10 border-muted/20" },
  tactical: { label: "策略", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  tachiai: { label: "立合", color: "text-east", bg: "bg-east/10 border-east/20" },
  engagement: { label: "攻防", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  clinch: { label: "組合", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  momentum: { label: "攻勢", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  edge_crisis: {
    label: "土俵際",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  },
  finish: { label: "決着", color: "text-success", bg: "bg-success/10 border-success/20" },
  post_bout: { label: "後取", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  replay: { label: "再放", color: "text-accent", bg: "bg-accent/10 border-accent/20" },
  interview: { label: "会見", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
  mono_ii: {
    label: "物言",
    color: "text-destructive",
    bg: "bg-destructive/10 border-destructive/20",
  },
  award: { label: "殊勲", color: "text-success", bg: "bg-success/10 border-success/20" },
  ceremony: { label: "礼", color: "text-muted-foreground", bg: "bg-muted/10 border-muted/20" },
  closing: { label: "結び", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
};

export const TAG_ICONS: Record<string, string> = {
  crowd_roar: "🔊",
  gasps: "😮",
  upset: "⚡",
  kinboshi: "🌟",
  ginboshi: "🥈",
  kensho: "💰",
  yusho_race: "🏆",
  close_call: "😰",
  dominant: "💪",
  dynasty: "🏯",
  drama: "🎭",
  henka: "🤸",
  rivalry: "⚔️",
  injury: "🩹",
  comeback: "🔄",
  milestone: "🎖️",
  winless: "📉",
  birthday: "🎂",
  hometown: "🏠",
  veteran: "👴",
  rookie: "🆕",
  kadoban: "⚠️",
  career_high: "📈",
  consecutive_kachi: "✅",
  kachi_koshi: "✅",
  make_koshi: "❌",
  first_win: "🎉",
  streak: "🔥",
  weight_diff: "⚖️",
  age_diff: "📅",
  title_stakes: "👑",
  senshuraku: "🎯",
  tournament_context: "📅",
  mono_ii: "🔍",
  interview: "🎤",
};
