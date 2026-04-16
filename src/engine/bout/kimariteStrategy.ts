/**
 * src/engine/bout/kimariteStrategy.ts
 * =====================================
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

import type { KimariteStrategy, FinalBoutState } from "../types/kimariteStrategy";

// ─── Shorthand condition builders ───────────────────────────────────────────

const atEdge = (l: FinalBoutState) => l.edgeDistance <= 8;
const nearCenter = (l: FinalBoutState) => l.edgeDistance > 8;
const hasBelt = (w: FinalBoutState) => w.grip !== "none";
const noBelt = (w: FinalBoutState) => w.grip === "none";
const isPusher = (w: FinalBoutState) => w.style === "oshi";
const overCommitting = (l: FinalBoutState) => l.forwardMomentum > 0;
const desperation = (w: FinalBoutState) => w.balance < 20;

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
    condition: (w, l) =>
      hasBelt(w) &&
      atEdge(l) &&
      w.forwardMomentum > 0 &&
      l.balance > 0 &&
      (w.distanceFromCenter === undefined || w.distanceFromCenter < 4.0) &&
      (w.gripDepth === undefined || w.gripDepth === "deep" || w.gripDepth === "maemitsu"),
  },
  {
    id: "oshidashi",
    name: "Oshidashi",
    japaneseName: "押し出し",
    category: "kihon",
    weight: 85,
    appliesTo: ["push_battle", "edge_crisis"],
    condition: (w, l) =>
      noBelt(w) &&
      isPusher(w) &&
      atEdge(l) &&
      w.forwardMomentum > 0 &&
      l.balance > 0 &&
      (w.distanceFromCenter === undefined || w.distanceFromCenter < 3.5),
  },
  {
    id: "oshitaoshi",
    name: "Oshitaoshi",
    japaneseName: "押し倒し",
    category: "kihon",
    weight: 70,
    appliesTo: ["push_battle"],
    condition: (w, l) =>
      noBelt(w) &&
      isPusher(w) &&
      w.forwardMomentum > 0 &&
      l.balance <= 0 &&
      nearCenter(l) &&
      (l.cogOffset === undefined || Math.abs(l.cogOffset) > 0.1),
  },
  {
    id: "yoritaoshi",
    name: "Yoritaoshi",
    japaneseName: "寄り倒し",
    category: "kihon",
    weight: 72,
    appliesTo: ["belt_battle"],
    condition: (w, l) =>
      hasBelt(w) &&
      w.forwardMomentum > 0 &&
      l.balance <= 0 &&
      nearCenter(l) &&
      (l.cogOffset === undefined || Math.abs(l.cogOffset) > 0.15),
  },
  {
    id: "tsukidashi",
    name: "Tsukidashi",
    japaneseName: "突き出し",
    category: "kihon",
    weight: 60,
    condition: (w, l) =>
      noBelt(w) &&
      w.power >= 65 &&
      atEdge(l) &&
      l.balance > 0 &&
      (w.distanceFromCenter === undefined || w.distanceFromCenter < 3.8),
  },
  {
    id: "tsukitaoshi",
    name: "Tsukitaoshi",
    japaneseName: "突き倒し",
    category: "kihon",
    weight: 55,
    condition: (w, l) =>
      noBelt(w) &&
      w.power >= 65 &&
      l.balance <= 0 &&
      nearCenter(l) &&
      (l.cogOffset === undefined || Math.abs(l.cogOffset) > 0.12),
  },
  {
    id: "abisetaoshi",
    name: "Abisetaoshi",
    japaneseName: "浴びせ倒し",
    category: "kihon",
    weight: 50,
    condition: (w, l) => hasBelt(w) && w.power >= 70 && l.balance <= 0 && w.forwardMomentum > 0,
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
    condition: (w, l) => overCommitting(l) && w.offensiveOutput === 0 && l.balance <= 0,
  },
  {
    id: "hikiotoshi",
    name: "Hikiotoshi",
    japaneseName: "引き落とし",
    category: "tokushu",
    weight: 65,
    condition: (w, l) =>
      overCommitting(l) &&
      noBelt(w) &&
      l.balance <= 0 &&
      (l.cogOffset === undefined || Math.abs(l.cogOffset) > 0.2),
  },
  {
    id: "okuridashi",
    name: "Okuridashi",
    japaneseName: "送り出し",
    category: "tokushu",
    weight: 58,
    condition: (w, l) =>
      atEdge(l) && l.balance > 0 && w.forwardMomentum > 0 && l.forwardMomentum <= 0,
  },
  {
    id: "tsuriotoshi",
    name: "Tsuriotoshi",
    japaneseName: "吊り落とし",
    category: "tokushu",
    weight: 40,
    condition: (w, l) =>
      hasBelt(w) && w.power >= 75 && l.power < 60 && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "tsuridashi",
    name: "Tsuridashi",
    japaneseName: "吊り出し",
    category: "tokushu",
    weight: 38,
    condition: (w, l) => hasBelt(w) && w.power >= 75 && l.power < 60 && atEdge(l) && l.balance > 0,
  },
  {
    id: "utchari",
    name: "Utchari",
    japaneseName: "打っ棄り",
    category: "tokushu",
    weight: 30,
    condition: (w, l, ctx) => ctx.edgeDistance <= 4 && w.stamina < 0.25 && l.balance <= 0,
  },
  {
    id: "okuritaoshi",
    name: "Okuritaoshi",
    japaneseName: "送り倒し",
    category: "tokushu",
    weight: 35,
    condition: (w, l) => atEdge(l) && l.balance <= 0 && l.forwardMomentum <= 0,
  },
  {
    id: "katasukashi",
    name: "Katasukashi",
    japaneseName: "肩すかし",
    category: "tokushu",
    weight: 28,
    condition: (w, l) => overCommitting(l) && w.style !== "oshi" && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "sokubiotoshi",
    name: "Sokubiotoshi",
    japaneseName: "素首落とし",
    category: "tokushu",
    weight: 20,
    condition: (w, l) => overCommitting(l) && l.balance <= 0 && w.power < l.power,
  },
  {
    id: "okurigake",
    name: "Okurigake",
    japaneseName: "送り掛け",
    category: "tokushu",
    weight: 15,
    condition: (w, l) =>
      atEdge(l) && l.balance <= 0 && l.forwardMomentum <= 0 && w.style === "yotsu",
  },
  {
    id: "okurihikiotoshi",
    name: "Okurihikiotoshi",
    japaneseName: "送り引き落とし",
    category: "tokushu",
    weight: 15,
    condition: (w, l) => atEdge(l) && l.balance <= 0 && noBelt(w),
  },
  {
    id: "waridashi",
    name: "Waridashi",
    japaneseName: "割り出し",
    category: "tokushu",
    weight: 18,
    condition: (w, l) => isPusher(w) && atEdge(l) && l.balance > 0 && w.power >= 60,
  },
  {
    id: "okurinage",
    name: "Okurinage",
    japaneseName: "送り投げ",
    category: "tokushu",
    weight: 12,
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && l.forwardMomentum <= 0 && hasBelt(w),
  },
  {
    id: "tsukaminage",
    name: "Tsukaminage",
    japaneseName: "つかみ投げ",
    category: "tokushu",
    weight: 10,
    condition: (w, l) => hasBelt(w) && nearCenter(l) && l.balance <= 0 && w.power >= 70,
  },
  {
    id: "okuritsuridashi",
    name: "Okuritsuridashi",
    japaneseName: "送り吊り出し",
    category: "tokushu",
    weight: 8,
    condition: (w, l) => hasBelt(w) && atEdge(l) && l.balance > 0 && w.power >= 80,
  },
  {
    id: "okuritsuriotoshi",
    name: "Okuritsuriotoshi",
    japaneseName: "送り吊り落とし",
    category: "tokushu",
    weight: 6,
    condition: (w, l) => hasBelt(w) && nearCenter(l) && l.balance <= 0 && w.power >= 80,
  },
  {
    id: "yobimodoshi",
    name: "Yobimodoshi",
    japaneseName: "呼び戻し",
    category: "tokushu",
    weight: 5,
    condition: (w, l) => hasBelt(w) && overCommitting(l) && l.balance <= 0,
  },
  {
    id: "ushiromotare",
    name: "Ushiromotare",
    japaneseName: "後ろもたれ",
    category: "tokushu",
    weight: 4,
    condition: (w, l) => atEdge(l) && l.balance > 0 && l.forwardMomentum < 0,
  },
  {
    id: "kimedashi",
    name: "Kimedashi",
    japaneseName: "極め出し",
    category: "tokushu",
    weight: 14,
    condition: (w, l) => hasBelt(w) && atEdge(l) && l.balance > 0 && w.power >= 65,
  },
  {
    id: "kimetaoshi",
    name: "Kimetaoshi",
    japaneseName: "極め倒し",
    category: "tokushu",
    weight: 12,
    condition: (w, l) => hasBelt(w) && nearCenter(l) && l.balance <= 0 && w.power >= 65,
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
    condition: (w, l) =>
      (w.grip === "uwate" || w.grip === "morozashi") &&
      w.power > l.balanceResistance &&
      l.balance <= 0 &&
      nearCenter(l) &&
      (w.torque === undefined || w.torque > 20),
  },
  {
    id: "sukuinage",
    name: "Sukuinage",
    japaneseName: "掬い投げ",
    category: "nage",
    weight: 65,
    condition: (w, l) => noBelt(w) && w.power >= 55 && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "shitatenage",
    name: "Shitatenage",
    japaneseName: "下手投げ",
    category: "nage",
    weight: 70,
    appliesTo: ["belt_battle"],
    condition: (w, l) =>
      (w.grip === "shitate" || w.grip === "morozashi") &&
      w.power > l.balanceResistance &&
      l.balance <= 0 &&
      nearCenter(l),
  },
  {
    id: "kotenage",
    name: "Kotenage",
    japaneseName: "小手投げ",
    category: "nage",
    weight: 55,
    condition: (w, l) =>
      noBelt(w) &&
      w.power >= 60 &&
      l.balance <= 0 &&
      nearCenter(l) &&
      w.style !== "oshi" &&
      (l.cogOffset === undefined || Math.abs(l.cogOffset) > 0.18),
  },
  {
    id: "shitatedashinage",
    name: "Shitatedashinage",
    japaneseName: "下手出し投げ",
    category: "nage",
    weight: 42,
    condition: (w, l) => w.grip === "shitate" && overCommitting(l) && l.balance <= 0,
  },
  {
    id: "uwatedashinage",
    name: "Uwatedashinage",
    japaneseName: "上手出し投げ",
    category: "nage",
    weight: 38,
    condition: (w, l) => w.grip === "uwate" && overCommitting(l) && l.balance <= 0,
  },
  {
    id: "kubinage",
    name: "Kubinage",
    japaneseName: "首投げ",
    category: "nage",
    weight: 20,
    condition: (w, l) => noBelt(w) && nearCenter(l) && l.balance <= 0 && w.power >= 70,
  },
  {
    id: "koshihineri",
    name: "Koshihineri",
    japaneseName: "腰捻り",
    category: "nage",
    weight: 10,
    condition: (w, l) => w.style === "yotsu" && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "ipponzeoi",
    name: "Ipponzeoi",
    japaneseName: "一本背負い",
    category: "nage",
    weight: 6,
    condition: (w, l) => overCommitting(l) && w.style !== "oshi" && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "nichonage",
    name: "Nichonage",
    japaneseName: "二丁投げ",
    category: "nage",
    weight: 5,
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && hasBelt(w) && w.style === "yotsu",
  },
  {
    id: "yaguranage",
    name: "Yaguranage",
    japaneseName: "櫓投げ",
    category: "nage",
    weight: 5,
    condition: (w, l) => hasBelt(w) && nearCenter(l) && l.balance <= 0 && w.power >= 65,
  },
  {
    id: "kakenage",
    name: "Kakenage",
    japaneseName: "掛け投げ",
    category: "nage",
    weight: 5,
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && w.style === "yotsu",
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
    condition: (w, l) => overCommitting(l) && noBelt(w) && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "tottari",
    name: "Tottari",
    japaneseName: "とったり",
    category: "hineri",
    weight: 22,
    appliesTo: ["belt_battle"],
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && w.style !== "oshi",
  },
  {
    id: "shitatehineri",
    name: "Shitatehineri",
    japaneseName: "下手捻り",
    category: "hineri",
    weight: 25,
    condition: (w, l) =>
      w.grip === "shitate" && overCommitting(l) && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "uwatehineri",
    name: "Uwatehineri",
    japaneseName: "上手捻り",
    category: "hineri",
    weight: 22,
    condition: (w, l) => w.grip === "uwate" && overCommitting(l) && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "kotehineri",
    name: "Kotehineri",
    japaneseName: "小手捻り",
    category: "hineri",
    weight: 18,
    condition: (w, l) => overCommitting(l) && l.balance <= 0 && nearCenter(l),
  },
  {
    id: "amiuchi",
    name: "Amiuchi",
    japaneseName: "網打ち",
    category: "hineri",
    weight: 12,
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && w.style === "yotsu",
  },
  {
    id: "kainahineri",
    name: "Kainahineri",
    japaneseName: "腕捻り",
    category: "hineri",
    weight: 12,
    condition: (w, l) => nearCenter(l) && l.balance <= 0 && w.style !== "oshi",
  },
  {
    id: "zubuneri",
    name: "Zubuneri",
    japaneseName: "頭捻り",
    category: "hineri",
    weight: 6,
    condition: (w, l) => nearCenter(l) && overCommitting(l) && l.balance <= 0,
  },
  {
    id: "sakatottari",
    name: "Sakatottari",
    japaneseName: "逆取ったり",
    category: "hineri",
    weight: 6,
    condition: (w, l) => overCommitting(l) && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "kubiotoshi",
    name: "Kubiotoshi",
    japaneseName: "首落とし",
    category: "hineri",
    weight: 6,
    condition: (w, l) => overCommitting(l) && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "gasshohineri",
    name: "Gasshohineri",
    japaneseName: "合掌捻り",
    category: "hineri",
    weight: 4,
    condition: (w, l) => hasBelt(w) && overCommitting(l) && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "harimanage",
    name: "Harimanage",
    japaneseName: "波離間投げ",
    category: "hineri",
    weight: 4,
    condition: (w, l) => hasBelt(w) && l.balance <= 0 && w.style === "yotsu" && nearCenter(l),
  },
  {
    id: "osakate",
    name: "Osakate",
    japaneseName: "大逆手",
    category: "hineri",
    weight: 2,
    condition: (w, l) => l.balance <= 0 && w.style === "yotsu" && nearCenter(l),
  },
  {
    id: "sabaori",
    name: "Sabaori",
    japaneseName: "鯖折り",
    category: "hineri",
    weight: 2,
    condition: (w, l) => hasBelt(w) && l.balance <= 0 && overCommitting(l),
  },
  {
    id: "sotokomata_hinerite",
    name: "Sotokomata",
    japaneseName: "外小股",
    category: "hineri",
    weight: 2,
    condition: (w, l) => l.balance <= 0 && nearCenter(l) && w.style !== "oshi",
  },
  {
    id: "tokkurinage",
    name: "Tokkurinage",
    japaneseName: "徳利投げ",
    category: "hineri",
    weight: 2,
    condition: (w, l) => overCommitting(l) && nearCenter(l) && l.balance <= 0,
  },
  {
    id: "makiotoshi",
    name: "Makiotoshi",
    japaneseName: "巻き落とし",
    category: "hineri",
    weight: 2,
    condition: (w, l) => overCommitting(l) && l.balance <= 0,
  },
  {
    id: "uchimuso",
    name: "Uchimuso",
    japaneseName: "内無双",
    category: "hineri",
    weight: 2,
    condition: (w, l) => l.balance <= 0 && w.style === "yotsu" && nearCenter(l),
  },
  {
    id: "sotomuso",
    name: "Sotomuso",
    japaneseName: "外無双",
    category: "hineri",
    weight: 2,
    condition: (w, l) => l.balance <= 0 && w.style === "yotsu" && nearCenter(l),
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
    condition: (w, l) => l.balance < 40 && l.stamina < 0.5 && nearCenter(l),
  },
  {
    id: "sotogake",
    name: "Sotogake",
    japaneseName: "外掛け",
    category: "kake",
    weight: 28,
    condition: (w, l) => w.style !== "oshi" && l.balance < 35 && nearCenter(l),
  },
  {
    id: "uchigake",
    name: "Uchigake",
    japaneseName: "内掛け",
    category: "kake",
    weight: 24,
    condition: (w, l) => w.style !== "oshi" && l.balance < 35 && nearCenter(l),
  },
  {
    id: "ketaguri",
    name: "Ketaguri",
    japaneseName: "蹴手繰り",
    category: "kake",
    weight: 18,
    condition: (w, l) => overCommitting(l) && l.balance < 30 && w.style !== "oshi",
  },
  {
    id: "watashikomi",
    name: "Watashikomi",
    japaneseName: "渡し込み",
    category: "kake",
    weight: 14,
    condition: (w, l) => l.balance < 30 && hasBelt(w) && nearCenter(l),
  },
  {
    id: "kekaeshi",
    name: "Kekaeshi",
    japaneseName: "蹴返し",
    category: "kake",
    weight: 12,
    condition: (w, l) => overCommitting(l) && l.balance < 30,
  },
  {
    id: "kosotogake",
    name: "Kosotogake",
    japaneseName: "小外掛け",
    category: "kake",
    weight: 10,
    condition: (w, l) => l.balance < 30 && nearCenter(l) && w.style !== "oshi",
  },
  {
    id: "komatasukui",
    name: "Komatasukui",
    japaneseName: "小股掬い",
    category: "kake",
    weight: 7,
    condition: (w, l) => l.balance < 25 && nearCenter(l),
  },
  {
    id: "chongake",
    name: "Chongake",
    japaneseName: "ちょん掛け",
    category: "kake",
    weight: 5,
    condition: (w, l) => l.balance < 20 && nearCenter(l) && w.style !== "oshi",
  },
  {
    id: "kawarigake",
    name: "Kawarigake",
    japaneseName: "河津掛け",
    category: "kake",
    weight: 4,
    condition: (w, l) => l.balance < 20 && nearCenter(l) && w.style === "yotsu",
  },
  {
    id: "susoharai",
    name: "Susoharai",
    japaneseName: "裾払い",
    category: "kake",
    weight: 4,
    condition: (w, l) => l.balance < 20 && atEdge(l),
  },
  {
    id: "kirikaeshi",
    name: "Kirikaeshi",
    japaneseName: "切り返し",
    category: "kake",
    weight: 3,
    condition: (w, l) => l.balance < 20 && overCommitting(l),
  },
  {
    id: "nimaigeri",
    name: "Nimaigeri",
    japaneseName: "二枚蹴り",
    category: "kake",
    weight: 3,
    condition: (w, l) => l.balance < 20 && w.style !== "oshi",
  },
  {
    id: "omata",
    name: "Omata",
    japaneseName: "大股",
    category: "kake",
    weight: 3,
    condition: (w, l) => l.balance < 20 && nearCenter(l),
  },
  {
    id: "susotori",
    name: "Susotori",
    japaneseName: "裾取り",
    category: "kake",
    weight: 3,
    condition: (w, l) => l.balance < 20 && atEdge(l),
  },
  {
    id: "mitokorozeme",
    name: "Mitokorozeme",
    japaneseName: "三所攻め",
    category: "kake",
    weight: 2,
    // Triple-point attack — requires large stat differential
    condition: (w, l) => w.power >= 75 && l.power < 40 && l.balance < 20,
  },
  {
    id: "kosotogari",
    name: "Kosotogari",
    japaneseName: "小外刈",
    category: "kake",
    weight: 2,
    condition: (w, l) => l.balance < 20 && nearCenter(l) && w.style !== "oshi",
  },
  {
    id: "tsumatori",
    name: "Tsumatori",
    japaneseName: "褄取り",
    category: "kake",
    weight: 2,
    condition: (w, l) => atEdge(l) && l.balance < 20,
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
    condition: (w, l) => desperation(w) && overCommitting(l) && l.edgeDistance <= 5,
  },
  {
    id: "kakezori",
    name: "Kakezori",
    japaneseName: "掛け反り",
    category: "sori",
    weight: 5,
    condition: (w, l) => desperation(w) && overCommitting(l) && l.edgeDistance <= 5,
  },
  {
    id: "shumokuzori",
    name: "Shumokuzori",
    japaneseName: "撞木反り",
    category: "sori",
    weight: 4,
    condition: (w, l) => desperation(w) && overCommitting(l) && l.forwardMomentum > 4,
  },
  {
    id: "sototasukizori",
    name: "Sototasukizori",
    japaneseName: "外たすき反り",
    category: "sori",
    weight: 4,
    condition: (w, l) => desperation(w) && overCommitting(l) && l.forwardMomentum > 4,
  },
  {
    id: "tasukizori",
    name: "Tasukizori",
    japaneseName: "たすき反り",
    category: "sori",
    weight: 4,
    condition: (w, l) => desperation(w) && overCommitting(l) && l.forwardMomentum > 4,
  },
  {
    id: "tsutaezori",
    name: "Tsutaezori",
    japaneseName: "伝え反り",
    category: "sori",
    weight: 4,
    condition: (w, l) => desperation(w) && overCommitting(l) && hasBelt(l) && l.edgeDistance <= 5,
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
    // Both fighters near edge simultaneously — winner also steps out but loser touches first
    condition: (w, l) => w.offensiveOutput === 0 && l.balance <= 0 && l.edgeDistance <= 3,
  },
  {
    id: "koshikudake",
    name: "Koshikudake",
    japaneseName: "腰砕け",
    category: "hi_waza",
    weight: 3,
    // Loser's hips collapse without direct attack
    condition: (w, l) =>
      w.offensiveOutput === 0 &&
      l.balance <= 0 &&
      l.stamina < 0.1 &&
      (l.inEdgeCrisis === undefined || l.inEdgeCrisis === true),
  },
  {
    id: "tsukite",
    name: "Tsukite",
    japaneseName: "つき手",
    category: "hi_waza",
    weight: 2,
    // Loser touches down with hand, no direct attack
    condition: (w, l) => w.offensiveOutput === 0 && l.balance <= 0,
  },
  {
    id: "tsukihiza",
    name: "Tsukihiza",
    japaneseName: "つきひざ",
    category: "hi_waza",
    weight: 2,
    // Loser touches down with knee
    condition: (w, l) => w.offensiveOutput === 0 && l.balance <= 0 && l.stamina < 0.2,
  },
  {
    id: "fumidashi",
    name: "Fumidashi",
    japaneseName: "踏み出し",
    category: "hi_waza",
    weight: 2,
    // Loser steps out under their own momentum
    condition: (w, l) =>
      w.offensiveOutput === 0 && l.balance > 0 && l.edgeDistance <= 2 && overCommitting(l),
  },
];

/**
 * V2 weight overrides — recalibrated against real professional sumo kimarite
 * distribution data. Weights reflect relative selection priority within each
 * phase bucket (push_battle, belt_battle, edge_crisis), NOT overall frequency.
 *
 * Real-world targets (10,000-bout simulation):
 *   Yorikiri   ~32.4%  →  27–38%   (keep 90 — dominant belt walk-out finish)
 *   Oshidashi  ~20.9%  →  17–28%   (keep 85 — dominant push-out finish)
 *   Hatakikomi  ~8.1%  →   5–12%   (raise 80→88 — slap-down is very high within its condition)
 *   Tsukidashi  ~5.7%  →   3–9%    (raise 60→72 — closer to oshidashi within thrust sub-family)
 *   Yoritaoshi  ~4.7%  →   2–8%    (raise 72→75 — belt throw-down, slightly above throws)
 *   Uwatenage   ~3.0%  →   1–6%    (lower 85→60 — was over-weighted vs real frequency)
 *   Shitatenage ~2.0%  →   1–5%    (lower 70→50 — less common than uwatenage)
 *
 * Note: KIMARITE_STRATEGIES (V1) is left unchanged to preserve the legacy
 * evaluator (deleted in Phase 8). V1 is kept for reference only.
 */
const V2_WEIGHT_OVERRIDES: Partial<Record<string, number>> = {
  hatakikomi: 88,
  tsukidashi: 72,
  yoritaoshi: 75,
  uwatenage: 60,
  shitatenage: 50,
};

export const KIMARITE_STRATEGIES_V2: KimariteStrategy[] = KIMARITE_STRATEGIES.map((s) => {
  const overrideWeight = V2_WEIGHT_OVERRIDES[s.id];
  return overrideWeight !== undefined ? { ...s, weight: overrideWeight } : s;
});
