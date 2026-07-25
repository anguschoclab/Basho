import type { Rikishi } from "./types/rikishi";
import type { SpatialBoutContext, EngineStateV2 } from "./types/combat-spatial";

/**
 * src/engine/bout/KimariteStrategyData.ts
 * =========================================
 * Exhaustive KimariteStrategy registry — all 82 official JSA techniques
 * plus 5 hi_waza (non-winning results) and 2 forfeits.
 *
 * Each entry has a pure condition() function evaluated against FinalBoutState.
 * The B+ spatial classifier (kimariteClassifier.ts) selects techniques mid-fight.
 *
 * Condition paradigms by category:
 *   kihon    — edge proximity + grip/style alignment
 *   nage     — center ring + grip + power differential
 *   kake     — technique/agility + low loser balance
 *   sori     — desperation: winner near edge with low balance, loser overcommitting
 *   hineri   — loser overcommitting forward, winner redirects
 *   tokushu  — highly situational (flanking, arm bar, lift)
 *   hi_waza  — self-inflicted (winner's offensiveOutput === 0 on final tick)
 *   kinjite  — foul (not selected by evaluator; pre-processed separately)
 */

export interface KimariteStrategy {
  id: string;
  name: string;
  japaneseName: string;
  category: string;
  weight: number;
  difficulty?: number;
  appliesTo?: ("push_battle" | "belt_battle" | "edge_crisis")[];
  condition: (
    w: Rikishi,
    l: Rikishi,
    ctx: SpatialBoutContext,
    st: EngineStateV2,
    wSide: "east" | "west",
    lSide: "east" | "west"
  ) => boolean;
}

const edgeDistance = (ctx: SpatialBoutContext, side: "east" | "west") =>
  Math.max(0, 4.55 - Math.abs(side === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot));
const atEdge = (ctx: SpatialBoutContext, side: "east" | "west") => edgeDistance(ctx, side) <= 2.0;
const nearCenter = (ctx: SpatialBoutContext, side: "east" | "west") =>
  edgeDistance(ctx, side) > 2.0;
const hasBelt = (ctx: SpatialBoutContext, side: "east" | "west") =>
  (side === "east" ? ctx.eastGrip : ctx.westGrip) !== "none" &&
  (side === "east" ? ctx.eastGrip : ctx.westGrip) !== "outside";
const noBelt = (ctx: SpatialBoutContext, side: "east" | "west") =>
  (side === "east" ? ctx.eastGrip : ctx.westGrip) === "none" ||
  (side === "east" ? ctx.eastGrip : ctx.westGrip) === "outside";
const isPusher = (r: Rikishi) => r.style === "oshi";
const forwardMomentum = (ctx: SpatialBoutContext, side: "east" | "west") => {
  const m = side === "east" ? ctx.eastMomentumX : ctx.westMomentumX;
  return side === "east" ? Math.max(0, -m) : Math.max(0, m);
};
const overCommitting = (ctx: SpatialBoutContext, side: "east" | "west") =>
  forwardMomentum(ctx, side) > 0;
const balance = (ctx: SpatialBoutContext, side: "east" | "west") =>
  Math.max(0, 100 - Math.abs(side === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) * 200);
const desperation = (ctx: SpatialBoutContext, side: "east" | "west") => balance(ctx, side) < 20;
const offensiveOutput = (_st: EngineStateV2) => 1; // Always 1 in selection engine unless modified

// --- 1.75D Lateral & Angular Predicates ---

/** Engagement is off-axis when lateral offset exceeds glancing threshold */
const offAxis = (ctx: SpatialBoutContext) => Math.abs(ctx.lateralOffsetDiff) > 0.2;

/** Fighter is rotating (has angular authority this tick) */
const rotating = (ctx: SpatialBoutContext, side: "east" | "west") => {
  return side === "east" ? ctx.angularAdvantage > 0.005 : ctx.angularAdvantage < -0.005;
};

/** Lateral threshold crossed (significant off-axis displacement) */
const lateralThresholdCrossed = (ctx: SpatialBoutContext) => Math.abs(ctx.lateralOffsetDiff) > 0.4;

const getDepth = (st: EngineStateV2, side: "east" | "west") => {
  if (st.phase.tag === "belt_battle") {
    return side === "east" ? st.phase.state.eastDepth : st.phase.state.westDepth;
  }
  if (st.phase.tag === "edge_crisis" && st.phase.savedBelt) {
    return side === "east" ? st.phase.savedBelt.eastDepth : st.phase.savedBelt.westDepth;
  }
  return undefined;
};

const getTorque = (st: EngineStateV2, side: "east" | "west") => {
  if (st.phase.tag === "belt_battle") {
    return side === "east" ? st.phase.state.torqueEast : st.phase.state.torqueWest;
  }
  if (st.phase.tag === "edge_crisis" && st.phase.savedBelt) {
    return side === "east" ? st.phase.savedBelt.torqueEast : st.phase.savedBelt.torqueWest;
  }
  return 0;
};

// ─── KIMARITE_STRATEGIES ─────────────────────────────────────────────────────

export const KIMARITE_STRATEGIES: KimariteStrategy[] = [
  // =========================================================================
  // KIHONWAZA — Basic Techniques (7)
  // =========================================================================

  {
    id: "yorikiri",
    name: "Yorikiri",
    japaneseName: "寄り切り",
    category: "kihon",
    weight: 90,
    appliesTo: ["push_battle", "belt_battle"],
    difficulty: 1,
    condition: (_w, _l, ctx, st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      atEdge(ctx, lSide) &&
      forwardMomentum(ctx, wSide) > 0 &&
      balance(ctx, lSide) > 0 &&
      (Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) === undefined ||
        Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) < 4.0) &&
      (getDepth(st, wSide) === undefined ||
        getDepth(st, wSide) === "deep" ||
        getDepth(st, wSide) === "maemitsu" ||
        getDepth(st, wSide) === "standard"),
  },
  {
    id: "oshidashi",
    name: "Oshidashi",
    japaneseName: "押し出し",
    category: "kihon",
    weight: 85,
    appliesTo: ["push_battle", "edge_crisis"],
    difficulty: 1,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      isPusher(w) &&
      atEdge(ctx, lSide) &&
      forwardMomentum(ctx, wSide) > 0 &&
      balance(ctx, lSide) > 0 &&
      (Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) === undefined ||
        Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) < 3.5),
  },
  {
    id: "oshitaoshi",
    name: "Oshitaoshi",
    japaneseName: "押し倒し",
    category: "kihon",
    weight: 70,
    appliesTo: ["push_battle"],
    difficulty: 2,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      isPusher(w) &&
      forwardMomentum(ctx, wSide) > 0 &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      ((lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) === undefined ||
        Math.abs(lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) > 0.1),
  },
  {
    id: "yoritaoshi",
    name: "Yoritaoshi",
    japaneseName: "寄り倒し",
    category: "kihon",
    weight: 72,
    appliesTo: ["belt_battle"],
    difficulty: 2,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      forwardMomentum(ctx, wSide) > 0 &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      ((lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) === undefined ||
        Math.abs(lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) > 0.15),
  },
  {
    id: "tsukidashi",
    name: "Tsukidashi",
    japaneseName: "突き出し",
    category: "kihon",
    weight: 60,
    difficulty: 3,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      w.stats.power >= 65 &&
      atEdge(ctx, lSide) &&
      balance(ctx, lSide) > 0 &&
      (Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) === undefined ||
        Math.abs(wSide === "east" ? ctx.eastLeadFoot : ctx.westLeadFoot) < 3.8),
  },
  {
    id: "tsukitaoshi",
    name: "Tsukitaoshi",
    japaneseName: "突き倒し",
    category: "kihon",
    weight: 55,
    difficulty: 3,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      w.stats.power >= 65 &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      ((lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) === undefined ||
        Math.abs(lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) > 0.12),
  },
  {
    id: "abisetaoshi",
    name: "Abisetaoshi",
    japaneseName: "浴びせ倒し",
    category: "kihon",
    weight: 50,
    difficulty: 3,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      w.stats.power >= 70 &&
      balance(ctx, lSide) <= 0 &&
      forwardMomentum(ctx, wSide) > 0,
  },

  // =========================================================================
  // TOKUSHUWAZA — Special Techniques (19 + 2 extra = 21)
  // =========================================================================

  {
    id: "hatakikomi",
    name: "Hatakikomi",
    japaneseName: "叩き込み",
    category: "tokushu",
    weight: 80,
    difficulty: 4,
    condition: (_w, _l, ctx, st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && offensiveOutput(st) === 0 && balance(ctx, lSide) <= 0,
  },
  {
    id: "hikiotoshi",
    name: "Hikiotoshi",
    japaneseName: "引き落とし",
    category: "tokushu",
    weight: 65,
    difficulty: 4,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      overCommitting(ctx, lSide) &&
      noBelt(ctx, wSide) &&
      balance(ctx, lSide) <= 0 &&
      ((lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) === undefined ||
        Math.abs(lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) > 0.2),
  },
  {
    id: "okuridashi",
    name: "Okuridashi",
    japaneseName: "送り出し",
    category: "tokushu",
    weight: 58,
    difficulty: 4,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      atEdge(ctx, lSide) &&
      balance(ctx, lSide) > 0 &&
      forwardMomentum(ctx, wSide) > 0 &&
      forwardMomentum(ctx, lSide) <= 0,
  },
  {
    id: "tsuriotoshi",
    name: "Tsuriotoshi",
    japaneseName: "吊り落とし",
    category: "tokushu",
    weight: 40,
    difficulty: 8,
    condition: (w, l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      w.stats.power >= 75 &&
      l.stats.power < 60 &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0,
  },
  {
    id: "tsuridashi",
    name: "Tsuridashi",
    japaneseName: "吊り出し",
    category: "tokushu",
    weight: 38,
    difficulty: 7,
    condition: (w, l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      w.stats.power >= 75 &&
      l.stats.power < 60 &&
      atEdge(ctx, lSide) &&
      balance(ctx, lSide) > 0,
  },
  {
    id: "utchari",
    name: "Utchari",
    japaneseName: "打っ棄り",
    category: "tokushu",
    weight: 30,
    difficulty: 9,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      edgeDistance(ctx, wSide) <= 0.5 && w.stats.stamina < 25 && balance(ctx, lSide) <= 0,
  },
  {
    id: "okuritaoshi",
    name: "Okuritaoshi",
    japaneseName: "送り倒し",
    category: "tokushu",
    weight: 35,
    difficulty: 5,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      atEdge(ctx, lSide) && balance(ctx, lSide) <= 0 && forwardMomentum(ctx, lSide) <= 0,
  },
  {
    id: "katasukashi",
    name: "Katasukashi",
    japaneseName: "肩すかし",
    category: "tokushu",
    weight: 28,
    difficulty: 6,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) &&
      w.style !== "oshi" &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide),
  },
  {
    id: "sokubiotoshi",
    name: "Sokubiotoshi",
    japaneseName: "素首落とし",
    category: "tokushu",
    weight: 20,
    condition: (w, l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && balance(ctx, lSide) <= 0 && w.stats.power < l.stats.power,
  },
  {
    id: "okurigake",
    name: "Okurigake",
    japaneseName: "送り掛け",
    category: "tokushu",
    weight: 15,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      atEdge(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      forwardMomentum(ctx, lSide) <= 0 &&
      w.style === "yotsu",
  },
  {
    id: "okurihikiotoshi",
    name: "Okurihikiotoshi",
    japaneseName: "送り引き落とし",
    category: "tokushu",
    weight: 15,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      atEdge(ctx, lSide) && balance(ctx, lSide) <= 0 && noBelt(ctx, wSide),
  },
  {
    id: "waridashi",
    name: "Waridashi",
    japaneseName: "割り出し",
    category: "tokushu",
    weight: 18,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      isPusher(w) && atEdge(ctx, lSide) && balance(ctx, lSide) > 0 && w.stats.power >= 60,
  },
  {
    id: "okurinage",
    name: "Okurinage",
    japaneseName: "送り投げ",
    category: "tokushu",
    weight: 12,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      forwardMomentum(ctx, lSide) <= 0 &&
      hasBelt(ctx, wSide),
  },
  {
    id: "tsukaminage",
    name: "Tsukaminage",
    japaneseName: "つかみ投げ",
    category: "tokushu",
    weight: 10,
    difficulty: 8,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      w.stats.power >= 70,
  },
  {
    id: "okuritsuridashi",
    name: "Okuritsuridashi",
    japaneseName: "送り吊り出し",
    category: "tokushu",
    weight: 8,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) && atEdge(ctx, lSide) && balance(ctx, lSide) > 0 && w.stats.power >= 80,
  },
  {
    id: "okuritsuriotoshi",
    name: "Okuritsuriotoshi",
    japaneseName: "送り吊り落とし",
    category: "tokushu",
    weight: 6,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      w.stats.power >= 80,
  },
  {
    id: "yobimodoshi",
    name: "Yobimodoshi",
    japaneseName: "呼び戻し",
    category: "tokushu",
    weight: 5,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) && overCommitting(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "ushiromotare",
    name: "Ushiromotare",
    japaneseName: "後ろもたれ",
    category: "tokushu",
    weight: 4,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      atEdge(ctx, lSide) && balance(ctx, lSide) > 0 && forwardMomentum(ctx, lSide) < 0,
  },
  {
    id: "kimedashi",
    name: "Kimedashi",
    japaneseName: "極め出し",
    category: "tokushu",
    weight: 14,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) && atEdge(ctx, lSide) && balance(ctx, lSide) > 0 && w.stats.power >= 65,
  },
  {
    id: "kimetaoshi",
    name: "Kimetaoshi",
    japaneseName: "極め倒し",
    category: "tokushu",
    weight: 12,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      w.stats.power >= 65,
  },

  // =========================================================================
  // NAGEITE — Throwing Techniques (12)
  // =========================================================================

  {
    id: "uwatenage",
    name: "Uwatenage",
    japaneseName: "上手投げ",
    category: "nage",
    weight: 85,
    appliesTo: ["belt_battle"],
    difficulty: 6,
    condition: (w, l, ctx, st, wSide, lSide) =>
      ((wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "uwate" ||
        (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "morozashi") &&
      w.stats.power > l.stats.balance &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      (getTorque(st, wSide) > 20 || rotating(ctx, wSide)),
  },
  {
    id: "sukuinage",
    name: "Sukuinage",
    japaneseName: "掬い投げ",
    category: "nage",
    weight: 65,
    difficulty: 5,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      w.stats.power >= 55 &&
      balance(ctx, lSide) <= 0 &&
      (nearCenter(ctx, lSide) || lateralThresholdCrossed(ctx)),
  },
  {
    id: "shitatenage",
    name: "Shitatenage",
    japaneseName: "下手投げ",
    category: "nage",
    weight: 70,
    appliesTo: ["belt_battle"],
    difficulty: 6,
    condition: (w, l, ctx, _st, wSide, lSide) =>
      ((wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "shitate" ||
        (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "morozashi") &&
      w.stats.power > l.stats.balance &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide),
  },
  {
    id: "kotenage",
    name: "Kotenage",
    japaneseName: "小手投げ",
    category: "nage",
    weight: 55,
    difficulty: 7,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      w.stats.power >= 60 &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      w.style !== "oshi" &&
      ((lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) === undefined ||
        Math.abs(lSide === "east" ? ctx.eastCoGOffset : ctx.westCoGOffset) > 0.18),
  },
  {
    id: "shitatedashinage",
    name: "Shitatedashinage",
    japaneseName: "下手出し投げ",
    category: "nage",
    weight: 42,
    difficulty: 6,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "shitate" &&
      overCommitting(ctx, lSide) &&
      balance(ctx, lSide) <= 0,
  },
  {
    id: "uwatedashinage",
    name: "Uwatedashinage",
    japaneseName: "上手出し投げ",
    category: "nage",
    weight: 38,
    difficulty: 6,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "uwate" &&
      overCommitting(ctx, lSide) &&
      balance(ctx, lSide) <= 0,
  },
  {
    id: "kubinage",
    name: "Kubinage",
    japaneseName: "首投げ",
    category: "nage",
    weight: 20,
    difficulty: 8,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      w.stats.power >= 70,
  },
  {
    id: "koshihineri",
    name: "Koshihineri",
    japaneseName: "腰捻り",
    category: "nage",
    weight: 10,
    difficulty: 7,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      w.style === "yotsu" && nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "ipponzeoi",
    name: "Ipponzeoi",
    japaneseName: "一本背負い",
    category: "nage",
    weight: 6,
    difficulty: 9,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) &&
      w.style !== "oshi" &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0,
  },
  {
    id: "nichonage",
    name: "Nichonage",
    japaneseName: "二丁投げ",
    category: "nage",
    weight: 5,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      hasBelt(ctx, wSide) &&
      w.style === "yotsu",
  },
  {
    id: "yaguranage",
    name: "Yaguranage",
    japaneseName: "櫓投げ",
    category: "nage",
    weight: 5,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      w.stats.power >= 65,
  },
  {
    id: "kakenage",
    name: "Kakenage",
    japaneseName: "掛け投げ",
    category: "nage",
    weight: 5,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0 && w.style === "yotsu",
  },

  // =========================================================================
  // HINERITE — Twisting Techniques (19)
  // =========================================================================

  {
    id: "tsukiotoshi",
    name: "Tsukiotoshi",
    japaneseName: "突き落とし",
    category: "hineri",
    weight: 75,
    appliesTo: ["push_battle"],
    difficulty: 4,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      noBelt(ctx, wSide) &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide) &&
      (overCommitting(ctx, lSide) || offAxis(ctx)),
  },
  {
    id: "tottari",
    name: "Tottari",
    japaneseName: "とったり",
    category: "hineri",
    weight: 22,
    appliesTo: ["belt_battle"],
    difficulty: 7,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0 && w.style !== "oshi",
  },
  {
    id: "shitatehineri",
    name: "Shitatehineri",
    japaneseName: "下手捻り",
    category: "hineri",
    weight: 25,
    difficulty: 7,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "shitate" &&
      overCommitting(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide),
  },
  {
    id: "uwatehineri",
    name: "Uwatehineri",
    japaneseName: "上手捻り",
    category: "hineri",
    weight: 22,
    difficulty: 7,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      (wSide === "east" ? ctx.eastGrip : ctx.westGrip) === "uwate" &&
      overCommitting(ctx, lSide) &&
      balance(ctx, lSide) <= 0 &&
      nearCenter(ctx, lSide),
  },
  {
    id: "kotehineri",
    name: "Kotehineri",
    japaneseName: "小手捻り",
    category: "hineri",
    weight: 18,
    difficulty: 5,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && balance(ctx, lSide) <= 0 && nearCenter(ctx, lSide),
  },
  {
    id: "amiuchi",
    name: "Amiuchi",
    japaneseName: "網打ち",
    category: "hineri",
    weight: 12,
    difficulty: 8,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0 && w.style === "yotsu",
  },
  {
    id: "kainahineri",
    name: "Kainahineri",
    japaneseName: "腕捻り",
    category: "hineri",
    weight: 12,
    difficulty: 6,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0 && w.style !== "oshi",
  },
  {
    id: "zubuneri",
    name: "Zubuneri",
    japaneseName: "頭捻り",
    category: "hineri",
    weight: 6,
    difficulty: 8,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      nearCenter(ctx, lSide) && overCommitting(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "sakatottari",
    name: "Sakatottari",
    japaneseName: "逆取ったり",
    category: "hineri",
    weight: 6,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "kubiotoshi",
    name: "Kubiotoshi",
    japaneseName: "首落とし",
    category: "hineri",
    weight: 6,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "gasshohineri",
    name: "Gasshohineri",
    japaneseName: "合掌捻り",
    category: "hineri",
    weight: 4,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      overCommitting(ctx, lSide) &&
      nearCenter(ctx, lSide) &&
      balance(ctx, lSide) <= 0,
  },
  {
    id: "harimanage",
    name: "Harimanage",
    japaneseName: "波離間投げ",
    category: "hineri",
    weight: 4,
    difficulty: 9,
    condition: (w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) &&
      balance(ctx, lSide) <= 0 &&
      w.style === "yotsu" &&
      nearCenter(ctx, lSide),
  },
  {
    id: "osakate",
    name: "Osakate",
    japaneseName: "大逆手",
    category: "hineri",
    weight: 2,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) <= 0 && w.style === "yotsu" && nearCenter(ctx, lSide),
  },
  {
    id: "sabaori",
    name: "Sabaori",
    japaneseName: "鯖折り",
    category: "hineri",
    weight: 2,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      hasBelt(ctx, wSide) && balance(ctx, lSide) <= 0 && overCommitting(ctx, lSide),
  },
  {
    id: "sotokomata_hinerite",
    name: "Sotokomata",
    japaneseName: "外小股",
    category: "hineri",
    weight: 2,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) <= 0 && nearCenter(ctx, lSide) && w.style !== "oshi",
  },
  {
    id: "tokkurinage",
    name: "Tokkurinage",
    japaneseName: "徳利投げ",
    category: "hineri",
    weight: 2,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && nearCenter(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "makiotoshi",
    name: "Makiotoshi",
    japaneseName: "巻き落とし",
    category: "hineri",
    weight: 2,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && balance(ctx, lSide) <= 0,
  },
  {
    id: "uchimuso",
    name: "Uchimuso",
    japaneseName: "内無双",
    category: "hineri",
    weight: 2,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) <= 0 && w.style === "yotsu" && nearCenter(ctx, lSide),
  },
  {
    id: "sotomuso",
    name: "Sotomuso",
    japaneseName: "外無双",
    category: "hineri",
    weight: 2,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) <= 0 && w.style === "yotsu" && nearCenter(ctx, lSide),
  },

  // =========================================================================
  // KAKEITE — Tripping/Leg Techniques (18)
  // =========================================================================

  {
    id: "ashitori",
    name: "Ashitori",
    japaneseName: "足取り",
    category: "kake",
    weight: 30,
    difficulty: 5,
    condition: (_w, l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 40 && l.stats.stamina < 0.5 && nearCenter(ctx, lSide),
  },
  {
    id: "sotogake",
    name: "Sotogake",
    japaneseName: "外掛け",
    category: "kake",
    weight: 28,
    difficulty: 5,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      w.style !== "oshi" && balance(ctx, lSide) < 35 && nearCenter(ctx, lSide),
  },
  {
    id: "uchigake",
    name: "Uchigake",
    japaneseName: "内掛け",
    category: "kake",
    weight: 24,
    difficulty: 5,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      w.style !== "oshi" && balance(ctx, lSide) < 35 && nearCenter(ctx, lSide),
  },
  {
    id: "ketaguri",
    name: "Ketaguri",
    japaneseName: "蹴手繰り",
    category: "kake",
    weight: 18,
    difficulty: 6,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && balance(ctx, lSide) < 30 && w.style !== "oshi",
  },
  {
    id: "watashikomi",
    name: "Watashikomi",
    japaneseName: "渡し込み",
    category: "kake",
    weight: 14,
    difficulty: 4,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      balance(ctx, lSide) < 30 && hasBelt(ctx, wSide) && nearCenter(ctx, lSide),
  },
  {
    id: "kekaeshi",
    name: "Kekaeshi",
    japaneseName: "蹴返し",
    category: "kake",
    weight: 12,
    difficulty: 7,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      overCommitting(ctx, lSide) && balance(ctx, lSide) < 30,
  },
  {
    id: "kosotogake",
    name: "Kosotogake",
    japaneseName: "小外掛け",
    category: "kake",
    weight: 10,
    difficulty: 6,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 30 && nearCenter(ctx, lSide) && w.style !== "oshi",
  },
  {
    id: "komatasukui",
    name: "Komatasukui",
    japaneseName: "小股掬い",
    category: "kake",
    weight: 7,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 25 && nearCenter(ctx, lSide),
  },
  {
    id: "chongake",
    name: "Chongake",
    japaneseName: "ちょん掛け",
    category: "kake",
    weight: 5,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 20 && nearCenter(ctx, lSide) && w.style !== "oshi",
  },
  {
    id: "kawarigake",
    name: "Kawarigake",
    japaneseName: "河津掛け",
    category: "kake",
    weight: 4,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 20 && nearCenter(ctx, lSide) && w.style === "yotsu",
  },
  {
    id: "susoharai",
    name: "Susoharai",
    japaneseName: "裾払い",
    category: "kake",
    weight: 4,
    condition: (_w, _l, ctx, _st, _wSide, lSide) => balance(ctx, lSide) < 20 && atEdge(ctx, lSide),
  },
  {
    id: "kirikaeshi",
    name: "Kirikaeshi",
    japaneseName: "切り返し",
    category: "kake",
    weight: 3,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 20 && overCommitting(ctx, lSide),
  },
  {
    id: "nimaigeri",
    name: "Nimaigeri",
    japaneseName: "二枚蹴り",
    category: "kake",
    weight: 3,
    difficulty: 7,
    condition: (w, _l, ctx, _st, _wSide, lSide) => balance(ctx, lSide) < 20 && w.style !== "oshi",
  },
  {
    id: "omata",
    name: "Omata",
    japaneseName: "大股",
    category: "kake",
    weight: 3,
    condition: (_w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 20 && nearCenter(ctx, lSide),
  },
  {
    id: "susotori",
    name: "Susotori",
    japaneseName: "裾取り",
    category: "kake",
    weight: 3,
    difficulty: 6,
    condition: (_w, _l, ctx, _st, _wSide, lSide) => balance(ctx, lSide) < 20 && atEdge(ctx, lSide),
  },
  {
    id: "mitokorozeme",
    name: "Mitokorozeme",
    japaneseName: "三所攻め",
    category: "kake",
    weight: 2,
    difficulty: 10,
    // Triple-point attack — requires large stat differential
    condition: (w, l, ctx, _st, _wSide, lSide) =>
      w.stats.power >= 75 && l.stats.power < 40 && balance(ctx, lSide) < 20,
  },
  {
    id: "kosotogari",
    name: "Kosotogari",
    japaneseName: "小外刈",
    category: "kake",
    weight: 2,
    difficulty: 6,
    condition: (w, _l, ctx, _st, _wSide, lSide) =>
      balance(ctx, lSide) < 20 && nearCenter(ctx, lSide) && w.style !== "oshi",
  },
  {
    id: "tsumatori",
    name: "Tsumatori",
    japaneseName: "褄取り",
    category: "kake",
    weight: 2,
    difficulty: 6,
    condition: (_w, _l, ctx, _st, _wSide, lSide) => atEdge(ctx, lSide) && balance(ctx, lSide) < 20,
  },

  // =========================================================================
  // SORITE — Backwards Body Drops (6)
  // All are desperate/rare: winner near edge, loser driving hard forward
  // =========================================================================

  {
    id: "izori",
    name: "Izori",
    japaneseName: "居反り",
    category: "sori",
    weight: 5,
    difficulty: 9,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) && overCommitting(ctx, lSide) && edgeDistance(ctx, lSide) <= 5,
  },
  {
    id: "kakezori",
    name: "Kakezori",
    japaneseName: "掛け反り",
    category: "sori",
    weight: 5,
    difficulty: 9,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) && overCommitting(ctx, lSide) && edgeDistance(ctx, lSide) <= 5,
  },
  {
    id: "shumokuzori",
    name: "Shumokuzori",
    japaneseName: "撞木反り",
    category: "sori",
    weight: 4,
    difficulty: 10,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) && overCommitting(ctx, lSide) && forwardMomentum(ctx, lSide) > 4,
  },
  {
    id: "sototasukizori",
    name: "Sototasukizori",
    japaneseName: "外たすき反り",
    category: "sori",
    weight: 4,
    difficulty: 10,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) && overCommitting(ctx, lSide) && forwardMomentum(ctx, lSide) > 4,
  },
  {
    id: "tasukizori",
    name: "Tasukizori",
    japaneseName: "たすき反り",
    category: "sori",
    weight: 4,
    difficulty: 10,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) && overCommitting(ctx, lSide) && forwardMomentum(ctx, lSide) > 4,
  },
  {
    id: "tsutaezori",
    name: "Tsutaezori",
    japaneseName: "伝え反り",
    category: "sori",
    weight: 4,
    difficulty: 10,
    condition: (_w, _l, ctx, _st, wSide, lSide) =>
      desperation(ctx, wSide) &&
      overCommitting(ctx, lSide) &&
      hasBelt(ctx, lSide) &&
      edgeDistance(ctx, lSide) <= 5,
  },

  // =========================================================================
  // HI_WAZA — Non-Winning Results (5)
  // Trigger when the loser's outcome is self-inflicted (no offensive action
  // from the winner on the final tick).
  // =========================================================================

  {
    id: "isamiashi",
    name: "Isamiashi",
    japaneseName: "勇み足",
    category: "hi_waza",
    weight: 3,
    difficulty: 1,
    // Both fighters near edge simultaneously — winner also steps out but loser touches first
    condition: (_w, _l, ctx, st, _wSide, lSide) =>
      offensiveOutput(st) === 0 && balance(ctx, lSide) <= 0 && edgeDistance(ctx, lSide) <= 3,
  },
  {
    id: "koshikudake",
    name: "Koshikudake",
    japaneseName: "腰砕け",
    category: "hi_waza",
    weight: 3,
    difficulty: 1,
    // Loser's hips collapse without direct attack
    condition: (_w, l, ctx, st, _wSide, lSide) =>
      offensiveOutput(st) === 0 &&
      balance(ctx, lSide) <= 0 &&
      l.stats.stamina < 0.1 &&
      st.phase.tag === "edge_crisis",
  },
  {
    id: "tsukite",
    name: "Tsukite",
    japaneseName: "つき手",
    category: "hi_waza",
    weight: 2,
    difficulty: 2,
    // Loser touches down with hand, no direct attack
    condition: (_w, _l, ctx, st, _wSide, lSide) =>
      offensiveOutput(st) === 0 && balance(ctx, lSide) <= 0,
  },
  {
    id: "tsukihiza",
    name: "Tsukihiza",
    japaneseName: "つきひざ",
    category: "hi_waza",
    weight: 2,
    difficulty: 2,
    // Loser touches down with knee
    condition: (_w, l, ctx, st, _wSide, lSide) =>
      offensiveOutput(st) === 0 && balance(ctx, lSide) <= 0 && l.stats.stamina < 0.2,
  },
  {
    id: "fumidashi",
    name: "Fumidashi",
    japaneseName: "踏み出し",
    category: "hi_waza",
    weight: 2,
    difficulty: 2,
    // Loser steps out under their own momentum
    condition: (_w, _l, ctx, st, _wSide, lSide) =>
      offensiveOutput(st) === 0 &&
      balance(ctx, lSide) > 0 &&
      edgeDistance(ctx, lSide) <= 2 &&
      overCommitting(ctx, lSide),
  },
];
