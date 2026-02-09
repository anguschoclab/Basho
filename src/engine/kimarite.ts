// Kimarite Registry - Full 82 official winning techniques (JSA list)
// Includes 5 "bout result" outcomes separately (not kimarite)
// Source list: Japan Sumo Association kimarite page.  [oai_citation:1‡日本相撲協会公式サイト](https://sumo.or.jp/Kimarite/)

import type { Style, Stance, TacticalArchetype } from "./types";

export interface Kimarite {
  id: string;
  name: string;     // romaji / display
  nameJa?: string;  // kanji/kana
  category: KimariteCategory;
  kimariteClass: KimariteClass;
  description?: string;

  styleAffinity: {
    oshi: number;
    yotsu: number;
    hybrid: number;
  };

  archetypeBonus: Partial<Record<TacticalArchetype, number>>;

  requiredStances: Stance[];

  vector: "frontal" | "lateral" | "rear";
  gripNeed: "belt" | "arm" | "none" | "any";
  baseWeight: number;
  rarity: "common" | "uncommon" | "rare" | "legendary";
}

export type KimariteCategory =
  | "push"      // oshi family (incl basic push-outs)
  | "thrust"    // tsuki family
  | "throw"     // nage family
  | "trip"      // kake/sweep/leg-pick
  | "twist"     // hineri / arm-twists
  | "pull"      // hiki/hataki style
  | "lift"      // tsuri family
  | "rear"      // okuri family
  | "special"   // unusual / mixed
  | "result"    // non-technique outcomes (isamiashi etc)
  | "forfeit";  // fusensho / hansoku etc

export type KimariteClass =
  | "force_out"
  | "push"
  | "thrust"
  | "throw"
  | "trip"
  | "twist"
  | "slap_pull"
  | "lift"
  | "rear"
  | "evasion"
  | "special"
  | "result"
  | "forfeit";

// --- small helpers to keep the big list readable ---
// Base makes most kimarite fields optional since K() fills them from defaults
type Base = {
  id: string;
  name: string;
  nameJa?: string;
  category: KimariteCategory;
  kimariteClass: KimariteClass;
  description?: string;
  styleAffinity?: Kimarite["styleAffinity"];
  archetypeBonus?: Kimarite["archetypeBonus"];
  requiredStances?: Stance[];
  vector?: "frontal" | "lateral" | "rear";
  gripNeed?: "belt" | "arm" | "none" | "any";
  baseWeight?: number;
  rarity?: "common" | "uncommon" | "rare" | "legendary";
};

const SA = (oshi: number, yotsu: number, hybrid: number) => ({ oshi, yotsu, hybrid });

const DEFAULT_ARCH_BONUS = (): Kimarite["archetypeBonus"] => ({
  // mild defaults; tune later
  all_rounder: 1,
});

function defaultsForCategory(category: KimariteCategory): Pick<Kimarite, "styleAffinity" | "baseWeight" | "rarity" | "gripNeed" | "vector" | "requiredStances"> {
  switch (category) {
    case "push":
      return { styleAffinity: SA(9, 2, 5), baseWeight: 7, rarity: "common", gripNeed: "none", vector: "frontal", requiredStances: ["push-dominant", "no-grip"] };
    case "thrust":
      return { styleAffinity: SA(9, 2, 5), baseWeight: 4, rarity: "uncommon", gripNeed: "none", vector: "frontal", requiredStances: ["push-dominant", "no-grip"] };
    case "throw":
      return { styleAffinity: SA(2, 9, 6), baseWeight: 3, rarity: "uncommon", gripNeed: "belt", vector: "lateral", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"] };
    case "twist":
      return { styleAffinity: SA(3, 8, 6), baseWeight: 2, rarity: "rare", gripNeed: "arm", vector: "lateral", requiredStances: ["no-grip", "push-dominant", "belt-dominant", "migi-yotsu", "hidari-yotsu"] };
    case "trip":
      return { styleAffinity: SA(4, 7, 6), baseWeight: 2, rarity: "rare", gripNeed: "any", vector: "lateral", requiredStances: ["no-grip", "belt-dominant", "migi-yotsu", "hidari-yotsu"] };
    case "pull":
      return { styleAffinity: SA(7, 4, 8), baseWeight: 5, rarity: "common", gripNeed: "none", vector: "frontal", requiredStances: ["no-grip", "push-dominant"] };
    case "lift":
      return { styleAffinity: SA(1, 9, 4), baseWeight: 1, rarity: "legendary", gripNeed: "belt", vector: "frontal", requiredStances: ["belt-dominant"] };
    case "rear":
      return { styleAffinity: SA(5, 6, 6), baseWeight: 1, rarity: "rare", gripNeed: "any", vector: "rear", requiredStances: ["belt-dominant", "push-dominant"] };
    case "special":
      return { styleAffinity: SA(5, 6, 7), baseWeight: 1, rarity: "rare", gripNeed: "any", vector: "frontal", requiredStances: ["no-grip", "push-dominant", "belt-dominant", "migi-yotsu", "hidari-yotsu"] };
    case "result":
      return { styleAffinity: SA(0, 0, 0), baseWeight: 0, rarity: "common", gripNeed: "none", vector: "frontal", requiredStances: [] };
    case "forfeit":
      return { styleAffinity: SA(0, 0, 0), baseWeight: 0, rarity: "common", gripNeed: "none", vector: "frontal", requiredStances: [] };
  }
}

function K(entry: Base): Kimarite {
  const d = defaultsForCategory(entry.category);
  return {
    ...entry,
    styleAffinity: entry.styleAffinity ?? d.styleAffinity,
    archetypeBonus: entry.archetypeBonus ?? DEFAULT_ARCH_BONUS(),
    baseWeight: entry.baseWeight ?? d.baseWeight,
    rarity: entry.rarity ?? d.rarity,
    gripNeed: entry.gripNeed ?? d.gripNeed,
    vector: entry.vector ?? d.vector,
    requiredStances: entry.requiredStances ?? d.requiredStances,
  };
}

// ---- COMPLETE OFFICIAL 82 KIMARITE (IDs use common romaji) ----
// Names/kanji are from the JSA list.  [oai_citation:2‡日本相撲協会公式サイト](https://sumo.or.jp/Kimarite/)
export const KIMARITE_REGISTRY: Kimarite[] = [
  // === Basic techniques (基本技) ===
  K({ id: "tsukidashi", name: "Tsukidashi", nameJa: "突き出し", category: "thrust", kimariteClass: "thrust", description: "Thrust out" }),
  K({ id: "tsukitaoshi", name: "Tsukitaoshi", nameJa: "突き倒し", category: "thrust", kimariteClass: "thrust", description: "Thrust down" }),
  K({ id: "oshidashi", name: "Oshidashi", nameJa: "押し出し", category: "push", kimariteClass: "force_out", baseWeight: 22, rarity: "common", description: "Frontal push out" }),
  K({ id: "oshitaoshi", name: "Oshitaoshi", nameJa: "押し倒し", category: "push", kimariteClass: "push", baseWeight: 8, rarity: "common", description: "Push down" }),
  K({ id: "yorikiri", name: "Yorikiri", nameJa: "寄り切り", category: "push", kimariteClass: "force_out", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], styleAffinity: SA(6, 9, 7), baseWeight: 25, rarity: "common", description: "Force out with belt grip" }),
  K({ id: "yoritaoshi", name: "Yoritaoshi", nameJa: "寄り倒し", category: "push", kimariteClass: "force_out", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], styleAffinity: SA(5, 8, 6), baseWeight: 6, rarity: "uncommon", description: "Crush down while driving" }),
  K({ id: "abisetaoshi", name: "Abisetaoshi", nameJa: "浴びせ倒し", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], description: "Backward force down by leaning pressure" }),

  // === Throws (投げ手) ===
  K({ id: "uwatenage", name: "Uwatenage", nameJa: "上手投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], baseWeight: 12, rarity: "common", description: "Overarm throw" }),
  K({ id: "shitatenage", name: "Shitatenage", nameJa: "下手投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], baseWeight: 10, rarity: "common", description: "Underarm throw" }),
  K({ id: "kotenage", name: "Kotenage", nameJa: "小手投げ", category: "throw", kimariteClass: "throw", gripNeed: "arm", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu", "no-grip"], description: "Armlock throw" }),
  K({ id: "sukuinage", name: "Sukuinage", nameJa: "掬い投げ", category: "throw", kimariteClass: "throw", gripNeed: "arm", requiredStances: ["no-grip", "push-dominant"], description: "Beltless arm throw" }),
  K({ id: "kubinage", name: "Kubinage", nameJa: "首投げ", category: "throw", kimariteClass: "throw", gripNeed: "none", requiredStances: ["no-grip", "push-dominant"], rarity: "rare", description: "Headlock throw" }),
  K({ id: "ipponzeoi", name: "Ipponzeoi", nameJa: "一本背負い", category: "special", kimariteClass: "special", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "legendary", description: "One-armed shoulder throw" }),
  K({ id: "koshinage", name: "Koshinage", nameJa: "腰投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "rare", description: "Hip throw" }),
  K({ id: "yaguranage", name: "Yaguranage", nameJa: "櫓投げ", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary", description: "Yagura throw" }),
  K({ id: "kakenage", name: "Kakenage", nameJa: "掛け投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], rarity: "rare", description: "Hooking throw" }),
  K({ id: "nichonage", name: "Nichonage", nameJa: "二丁投げ", category: "throw", kimariteClass: "throw", gripNeed: "arm", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], rarity: "legendary", description: "Two-handed arm throw" }),
  K({ id: "uwatedashinage", name: "Uwatedashinage", nameJa: "上手出し投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], description: "Pulling overarm throw" }),
  K({ id: "shitatedashinage", name: "Shitatedashinage", nameJa: "下手出し投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], description: "Pulling underarm throw" }),
  K({ id: "tsukaminage", name: "Tsukaminage", nameJa: "つかみ投げ", category: "throw", kimariteClass: "throw", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary", description: "Grabbing throw" }),

  // === Leg trips / hooks (掛け手) ===
  K({ id: "uchigake", name: "Uchigake", nameJa: "内掛け", category: "trip", kimariteClass: "trip", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], description: "Inside leg trip" }),
  K({ id: "sotogake", name: "Sotogake", nameJa: "外掛け", category: "trip", kimariteClass: "trip", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], description: "Outside leg trip" }),
  K({ id: "chongake", name: "Chongake", nameJa: "ちょん掛け", category: "trip", kimariteClass: "trip", gripNeed: "any", description: "Chongake trip" }),
  K({ id: "kirikaeshi", name: "Kirikaeshi", nameJa: "切り返し", category: "trip", kimariteClass: "trip", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], rarity: "rare", description: "Kirikaeshi reversal trip" }),
  K({ id: "kawazugake", name: "Kawazugake", nameJa: "河津掛け", category: "trip", kimariteClass: "trip", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary", description: "Kawazugake hooked counter" }),
  K({ id: "kekaeshi", name: "Kekaeshi", nameJa: "蹴返し", category: "trip", kimariteClass: "trip", gripNeed: "none", requiredStances: ["no-grip", "push-dominant"], rarity: "rare", description: "Kicking counter" }),
  K({ id: "ketaguri", name: "Ketaguri", nameJa: "蹴手繰り", category: "trip", kimariteClass: "trip", gripNeed: "none", requiredStances: ["no-grip"], rarity: "rare", description: "Ankle kick sweep" }),
  K({ id: "mitokorozeme", name: "Mitokorozeme", nameJa: "三所攻め", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary", description: "Triple-point attack" }),
  K({ id: "watashikomi", name: "Watashikomi", nameJa: "渡し込み", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "rare", description: "Thigh-hook body drop" }),
  K({ id: "nimaigeri", name: "Nimaigeri", nameJa: "二枚蹴り", category: "trip", kimariteClass: "trip", gripNeed: "none", requiredStances: ["no-grip"], rarity: "legendary", description: "Double-leg kick" }),
  K({ id: "komatasukui", name: "Komatasukui", nameJa: "小股掬い", category: "trip", kimariteClass: "trip", gripNeed: "any", rarity: "rare", description: "Thigh scooping drop" }),
  K({ id: "sotokomata", name: "Sotokomata", nameJa: "外小股", category: "trip", kimariteClass: "trip", gripNeed: "any", rarity: "legendary", description: "Outside thigh scoop" }),
  K({ id: "omata", name: "Omata", nameJa: "大股", category: "trip", kimariteClass: "trip", gripNeed: "any", rarity: "rare", description: "Big thigh attack" }),
  K({ id: "tsumatori", name: "Tsumatori", nameJa: "褄取り", category: "trip", kimariteClass: "trip", gripNeed: "any", rarity: "rare", description: "Foot pick (tsuma)" }),
  K({ id: "kozumatori", name: "Kozumatori", nameJa: "小褄取り", category: "trip", kimariteClass: "trip", gripNeed: "any", rarity: "rare", description: "Small foot pick" }),
  K({ id: "ashitori", name: "Ashitori", nameJa: "足取り", category: "trip", kimariteClass: "special", gripNeed: "none", requiredStances: ["no-grip"], rarity: "rare", description: "Leg pick" }),
  K({ id: "susotori", name: "Susotori", nameJa: "裾取り", category: "trip", kimariteClass: "special", gripNeed: "none", requiredStances: ["no-grip"], rarity: "rare", description: "Hem/ankle pick" }),
  K({ id: "susoharai", name: "Susoharai", nameJa: "裾払い", category: "trip", kimariteClass: "trip", gripNeed: "none", requiredStances: ["no-grip", "push-dominant"], rarity: "rare", description: "Foot sweep" }),

  // === Sori (反り手) ===
  K({ id: "izori", name: "Izori", nameJa: "居反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "none", requiredStances: ["no-grip"], rarity: "legendary", description: "Sori (back-bend) win" }),
  K({ id: "shumokuzori", name: "Shumokuzori", nameJa: "撞木反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "legendary", description: "Shumokuzori win" }),
  K({ id: "kakezori", name: "Kakezori", nameJa: "掛け反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary", description: "Kakezori win" }),
  K({ id: "tasukizori", name: "Tasukizori", nameJa: "たすき反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "legendary", description: "Tasukizori win" }),
  K({ id: "sototasukizori", name: "Sototasukizori", nameJa: "外たすき反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "legendary", description: "Outside tasuki-zori" }),
  K({ id: "tsutaezori", name: "Tsutaezori", nameJa: "伝え反り", category: "special", kimariteClass: "special", vector: "rear", gripNeed: "none", requiredStances: ["no-grip"], rarity: "legendary", description: "Tsutaezori win" }),

  // === Hineri / twist group (捻り手) ===
  K({ id: "tsukiotoshi", name: "Tsukiotoshi", nameJa: "突き落とし", category: "thrust", kimariteClass: "thrust", description: "Thrust down at angle" }),
  K({ id: "makiotoshi", name: "Makiotoshi", nameJa: "巻き落とし", category: "twist", kimariteClass: "twist", description: "Winding throw-down" }),
  K({ id: "tottari", name: "Tottari", nameJa: "とったり", category: "twist", kimariteClass: "twist", description: "Arm-bar take-down" }),
  K({ id: "sakatottari", name: "Sakatottari", nameJa: "逆取ったり", category: "twist", kimariteClass: "twist", description: "Reverse tottari" }),
  K({ id: "katasukashi", name: "Katasukashi", nameJa: "肩すかし", category: "pull", kimariteClass: "evasion", vector: "lateral", gripNeed: "none", requiredStances: ["no-grip"], description: "Shoulder swing-down" }),
  K({ id: "sotomuso", name: "Sotomuso", nameJa: "外無双", category: "twist", kimariteClass: "twist", description: "Outside thigh twist-down" }),
  K({ id: "uchimuso", name: "Uchimuso", nameJa: "内無双", category: "twist", kimariteClass: "twist", description: "Inside thigh twist-down" }),
  K({ id: "sototasukizori_dummy", name: "REMOVE_ME", category: "result", kimariteClass: "result" }), // placeholder guard (removed below)
].filter(k => k.id !== "sototasukizori_dummy");

// Continue the remaining official entries (to keep this response readable, they are appended below).
// NOTE: This registry MUST include all 82 kimarite; the appended block completes it.

export const KIMARITE_REGISTRY_APPEND: Kimarite[] = [
  // (JSA list continues)  [oai_citation:3‡日本相撲協会公式サイト](https://sumo.or.jp/Kimarite/)
  K({ id: "shitatehineri", name: "Shitatehineri", nameJa: "下手捻り", category: "twist", kimariteClass: "twist", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"] }),
  K({ id: "uwatehineri", name: "Uwatehineri", nameJa: "上手捻り", category: "twist", kimariteClass: "twist", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"] }),
  K({ id: "zunebari", name: "Zunebari", nameJa: "頭捻り", category: "twist", kimariteClass: "twist", gripNeed: "none", requiredStances: ["no-grip", "push-dominant"] }),
  K({ id: "kainahineri", name: "Kainahineri", nameJa: "腕捻り", category: "twist", kimariteClass: "twist", gripNeed: "arm", requiredStances: ["no-grip", "push-dominant"] }),
  K({ id: "gasshohineri", name: "Gasshohineri", nameJa: "合掌捻り", category: "twist", kimariteClass: "twist", gripNeed: "arm", requiredStances: ["no-grip"] }),
  K({ id: "tokkurinage", name: "Tokkurinage", nameJa: "徳利投げ", category: "twist", kimariteClass: "twist", gripNeed: "none", requiredStances: ["no-grip"] }),
  K({ id: "kubihineri", name: "Kubihineri", nameJa: "首捻り", category: "twist", kimariteClass: "twist", gripNeed: "none", requiredStances: ["no-grip"] }),
  K({ id: "kotehineri", name: "Kotehineri", nameJa: "小手捻り", category: "twist", kimariteClass: "twist", gripNeed: "arm", requiredStances: ["no-grip", "push-dominant"] }),
  K({ id: "amiuchi", name: "Amiuchi", nameJa: "網打ち", category: "pull", kimariteClass: "evasion", vector: "lateral", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "rare" }),
  K({ id: "sabaori", name: "Sabaori", nameJa: "鯖折り", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary" }),
  K({ id: "harimanage", name: "Harimanage", nameJa: "波離間投げ", category: "twist", kimariteClass: "twist", vector: "lateral", gripNeed: "belt", requiredStances: ["belt-dominant", "migi-yotsu", "hidari-yotsu"], rarity: "legendary" }),
  K({ id: "dainigiri", name: "Dainigiri", nameJa: "大逆手", category: "twist", kimariteClass: "twist", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "rare" }),
  K({ id: "hikkake", name: "Hikkake", nameJa: "引っ掛け", category: "pull", kimariteClass: "slap_pull", vector: "lateral", gripNeed: "arm", requiredStances: ["no-grip", "push-dominant"] }),
  K({ id: "hikiotoshi", name: "Hikiotoshi", nameJa: "引き落とし", category: "pull", kimariteClass: "slap_pull" }),
  K({ id: "hatakikomi", name: "Hatakikomi", nameJa: "叩き込み", category: "pull", kimariteClass: "slap_pull", baseWeight: 15, rarity: "common" }),
  K({ id: "sokubiotoshi", name: "Sokubiotoshi", nameJa: "素首落とし", category: "special", kimariteClass: "special", gripNeed: "none", requiredStances: ["no-grip", "push-dominant"], rarity: "rare" }),
  K({ id: "tsuridashi", name: "Tsuridashi", nameJa: "吊り出し", category: "lift", kimariteClass: "lift", requiredStances: ["belt-dominant"] }),
  K({ id: "okuritsuridashi", name: "Okuritsuridashi", nameJa: "送り吊り出し", category: "rear", kimariteClass: "rear", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary" }),
  K({ id: "tsuriotoshi", name: "Tsuriotoshi", nameJa: "吊り落とし", category: "lift", kimariteClass: "lift", requiredStances: ["belt-dominant"] }),
  K({ id: "okuritsuriotoshi", name: "Okuritsuriotoshi", nameJa: "送り吊り落とし", category: "rear", kimariteClass: "rear", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary" }),
  K({ id: "okuridashi", name: "Okuridashi", nameJa: "送り出し", category: "rear", kimariteClass: "rear" }),
  K({ id: "okuritaoshi", name: "Okuritaoshi", nameJa: "送り倒し", category: "rear", kimariteClass: "rear" }),
  K({ id: "okurinage", name: "Okurinage", nameJa: "送り投げ", category: "rear", kimariteClass: "rear", rarity: "rare" }),
  K({ id: "okurigake", name: "Okurigake", nameJa: "送り掛け", category: "rear", kimariteClass: "rear", rarity: "rare" }),
  K({ id: "okurihikiotoshi", name: "Okurihikiotoshi", nameJa: "送り引き落とし", category: "rear", kimariteClass: "rear", rarity: "rare" }),
  K({ id: "waridashi", name: "Waridashi", nameJa: "割り出し", category: "special", kimariteClass: "force_out", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "rare" }),
  K({ id: "utchari", name: "Utchari", nameJa: "打っ棄り", category: "special", kimariteClass: "special", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "rare" }),
  K({ id: "kimedashi", name: "Kimedashi", nameJa: "極め出し", category: "special", kimariteClass: "special", gripNeed: "arm", requiredStances: ["push-dominant", "no-grip"] }),
  K({ id: "kimetaoshi", name: "Kimetaoshi", nameJa: "極め倒し", category: "special", kimariteClass: "special", gripNeed: "arm", requiredStances: ["push-dominant", "no-grip"], rarity: "rare" }),
  K({ id: "ushiromotare", name: "Ushiromotare", nameJa: "後ろもたれ", category: "rear", kimariteClass: "rear", gripNeed: "belt", requiredStances: ["belt-dominant"], rarity: "legendary" }),
  K({ id: "yobimodoshi", name: "Yobimodoshi", nameJa: "呼び戻し", category: "pull", kimariteClass: "evasion", vector: "lateral", gripNeed: "arm", requiredStances: ["no-grip"], rarity: "legendary" }),

  // --- 5 non-technique bout outcomes (勝負結果) ---
  K({ id: "isamiashi", name: "Isamiashi", nameJa: "勇み足", category: "result", kimariteClass: "result", description: "Overstep / self-out" }),
  K({ id: "koshikudake", name: "Koshikudake", nameJa: "腰砕け", category: "result", kimariteClass: "result", description: "Collapse / self-fall" }),
  K({ id: "tsukite", name: "Tsukite", nameJa: "つき手", category: "result", kimariteClass: "result", description: "Hand touch-down" }),
  K({ id: "tsukihiza", name: "Tsukihiza", nameJa: "つきひざ", category: "result", kimariteClass: "result", description: "Knee touch-down" }),
  K({ id: "fumidashi", name: "Fumidashi", nameJa: "踏み出し", category: "result", kimariteClass: "result", description: "Step-out / stumble-out" }),

  // --- forfeits (not part of 82 kimarite) ---
  K({ id: "fusensho", name: "Fusensho", nameJa: "不戦勝", category: "forfeit", kimariteClass: "forfeit", description: "Win by default (opponent absent)" }),
  K({ id: "hansoku", name: "Hansoku", nameJa: "反則", category: "forfeit", kimariteClass: "forfeit", description: "Win by foul" }),
];

// Final exported registry: 82 kimarite + 5 results + forfeits
export const KIMARITE_ALL: Kimarite[] = [...KIMARITE_REGISTRY, ...KIMARITE_REGISTRY_APPEND];

// --- Lookup helpers (use KIMARITE_ALL) ---
export function getKimarite(id: string): Kimarite | undefined {
  return KIMARITE_ALL.find(k => k.id === id);
}

export function getKimariteByCategory(category: KimariteCategory): Kimarite[] {
  return KIMARITE_ALL.filter(k => k.category === category);
}

export function getKimariteByClass(kimariteClass: KimariteClass): Kimarite[] {
  return KIMARITE_ALL.filter(k => k.kimariteClass === kimariteClass);
}

export function getKimariteForStance(stance: Stance): Kimarite[] {
  return KIMARITE_ALL.filter(k =>
    k.requiredStances.length === 0 || k.requiredStances.includes(stance)
  );
}

export function getKimariteForStyle(style: Style): Kimarite[] {
  return KIMARITE_ALL
    .filter(k => k.category !== "forfeit" && k.category !== "result")
    .filter(k => k.styleAffinity[style] >= 5)
    .sort((a, b) => b.styleAffinity[style] - a.styleAffinity[style]);
}

export function getKimariteForArchetype(archetype: TacticalArchetype): Kimarite[] {
  return KIMARITE_ALL
    .filter(k => k.category !== "forfeit" && k.category !== "result")
    .filter(k => (k.archetypeBonus[archetype] ?? 0) > 0)
    .sort((a, b) => (b.archetypeBonus[archetype] ?? 0) - (a.archetypeBonus[archetype] ?? 0));
}

// Stats
export function getKimariteCount(): number {
  // Official 82 only
  return KIMARITE_ALL.filter(k => k.category !== "forfeit" && k.category !== "result").length;
}
