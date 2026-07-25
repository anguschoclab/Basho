import type { TacticalFamily } from "./types/combat";
import type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements } from "./types/kimarite";
export type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements };

// --- Domain Models & Defaults ---

type KimariteDefinition = Kimarite & { kimariteClass?: KimariteClass };

interface KimariteBaseEntry {
  id: string;
  name?: string;
  nameJa?: string;
  jsaCategory: JsaCategory;
  tacticalFamily?: TacticalFamily;
  baseWeight?: number;
  isHighRisk?: boolean;
  requirements?: KimariteRequirements;
  statWeights?: Kimarite["statWeights"];
  requiresBeltGrip?: boolean;
  leverageTarget?: Kimarite["leverageTarget"];
  description?: string;
  rarity?: Kimarite["rarity"];
  kimariteClass?: KimariteClass;
}

const CATEGORY_DEFAULTS: Record<JsaCategory, Partial<KimariteDefinition>> = {
  Kihonwaza: {
    tacticalFamily: "push",
    baseWeight: 500,
    statWeights: { strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0.0 },
    kimariteClass: "force_out",
  },
  Nageite: {
    tacticalFamily: "belt",
    baseWeight: 100,
    statWeights: { strength: 0.3, weight: 0.1, speed: 0.1, technique: 0.5, balance: 0.0 },
    requiresBeltGrip: true,
    kimariteClass: "throw",
  },
  Kakeite: {
    tacticalFamily: "speed",
    baseWeight: 50,
    statWeights: { strength: 0.1, weight: 0.0, speed: 0.5, technique: 0.4, balance: 0.0 },
    kimariteClass: "trip",
  },
  Sorite: {
    tacticalFamily: "trick",
    baseWeight: 1,
    isHighRisk: true,
    requirements: { isDesperation: true },
    statWeights: { strength: 0.1, weight: 0.0, speed: 0.1, technique: 0.8, balance: 0.0 },
    kimariteClass: "special",
  },
  Hinerite: {
    tacticalFamily: "trick",
    baseWeight: 100,
    statWeights: { strength: 0.1, weight: 0.1, speed: 0.2, technique: 0.6, balance: 0.0 },
    leverageTarget: "momentum",
    kimariteClass: "twist",
  },
  Tokushuwaza: {
    tacticalFamily: "trick",
    baseWeight: 50,
    statWeights: { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.4, balance: 0.0 },
    kimariteClass: "special",
  },
  Hiwaza: {
    tacticalFamily: "trick",
    baseWeight: 1,
    statWeights: { strength: 0.1, weight: 0.4, speed: 0.2, technique: 0.3, balance: 0.0 },
    kimariteClass: "result",
  },
};

/**
 * Domain builder function to apply correct defaults and scaling logic
 * based on the JSA category taxonomy.
 */
function defineKimarite(entry: KimariteBaseEntry): KimariteDefinition {
  const defaults = CATEGORY_DEFAULTS[entry.jsaCategory] || {};
  const baseWeight = entry.baseWeight ?? defaults.baseWeight ?? 1;

  const rarity =
    entry.rarity ??
    (baseWeight <= 5
      ? "legendary"
      : baseWeight <= 30
        ? "rare"
        : baseWeight <= 150
          ? "uncommon"
          : "common");

  // Auto-generate name from ID if missing
  const name =
    entry.name || entry.id.charAt(0).toUpperCase() + entry.id.slice(1).replace(/_/g, " ");

  const enrichment = KIMARITE_ENRICHMENT[entry.id];

  return {
    ...defaults,
    ...entry,
    name,
    nameJa: entry.nameJa || enrichment?.nameJa || entry.id, // Fallback to id for Ja if missing
    description:
      entry.description || enrichment?.description || defaults.description || `${name} technique.`,
    statWeights: entry.statWeights ??
      defaults.statWeights ?? {
        strength: 0.2,
        weight: 0.2,
        speed: 0.2,
        technique: 0.2,
        balance: 0.2,
      },
    baseWeight,
    rarity,
    requirements: { ...defaults.requirements, ...entry.requirements },
    isHighRisk: entry.isHighRisk ?? defaults.isHighRisk ?? false,
  } as KimariteDefinition;
}

/** Enrichment data: real Japanese names and descriptions for every kimarite. */
const KIMARITE_ENRICHMENT: Record<string, { nameJa: string; description: string }> = {
  // Kihonwaza
  yorikiri: {
    nameJa: "寄り切り",
    description:
      "Frontal force-out. The attacker maintains a grip on the opponent's mawashi and drives them backward out of the ring.",
  },
  oshidashi: {
    nameJa: "押し出し",
    description:
      "Push-out. The attacker pushes the opponent backward out of the ring without maintaining a belt grip.",
  },
  oshitaoshi: {
    nameJa: "押し倒し",
    description:
      "Push-down. The attacker pushes the opponent down onto the dohyo surface, forcing them to touch the ground.",
  },
  yoritaoshi: {
    nameJa: "寄り倒し",
    description:
      "Belt-force-down. The attacker uses a belt grip to drive the opponent down and out of the ring.",
  },
  tsukidashi: {
    nameJa: "突き出し",
    description:
      "Thrust-out. The attacker uses rapid thrusting strikes to push the opponent out of the ring.",
  },
  tsukitaoshi: {
    nameJa: "突き倒し",
    description:
      "Thrust-down. The attacker uses thrusting strikes to knock the opponent down onto the dohyo.",
  },
  abisetaoshi: {
    nameJa: "浴びせ倒し",
    description:
      "Backward force-down. The attacker pulls the opponent forward and down, forcing them to touch the ground.",
  },
  // Tokushuwaza
  tsuridashi: {
    nameJa: "吊り出し",
    description:
      "Lift-out. The attacker lifts the opponent bodily and carries them out of the ring.",
  },
  utchari: {
    nameJa: "打っ棄り",
    description:
      "Backward throw-out. At the edge, the attacker arches backward, throwing the opponent out while launching themselves backward.",
  },
  okuritaoshi: {
    nameJa: "送り倒し",
    description:
      "Rear push-down. From behind the opponent, the attacker pushes them down onto the dohyo.",
  },
  katasukashi: {
    nameJa: "肩すかし",
    description:
      "Shoulder slip-down. The attacker dodges the opponent's charge, grabbing their arm and pulling them down.",
  },
  sokubiotoshi: {
    nameJa: "素首落とし",
    description:
      "Head push-down. The attacker pushes down on the back of the opponent's neck, forcing them to the ground.",
  },
  okurigake: {
    nameJa: "送り掛け",
    description:
      "Rear leg trip. From behind, the attacker trips the opponent's leg, sending them forward.",
  },
  okurihikiotoshi: {
    nameJa: "送り引き落とし",
    description:
      "Rear pull-down. From behind, the attacker pulls the opponent backward down to the ground.",
  },
  waridashi: {
    nameJa: "割り出し",
    description:
      "Split push-out. The attacker forces apart the opponent's arms and pushes them out of the ring.",
  },
  okurinage: {
    nameJa: "送り投げ",
    description:
      "Rear throw. From behind the opponent, the attacker throws them forward to the ground.",
  },
  tsukaminage: {
    nameJa: "つかみ投げ",
    description:
      "Lifting throw. The attacker grabs any part of the opponent and lifts, throwing them to the ground.",
  },
  okuritsuridashi: {
    nameJa: "送り吊り出し",
    description:
      "Rear lift-out. From behind, the attacker lifts the opponent and carries them out of the ring.",
  },
  okuritsuriotoshi: {
    nameJa: "送り吊り落とし",
    description:
      "Rear lift-down. From behind, the attacker lifts the opponent and drops them to the ground.",
  },
  yobimodoshi: {
    nameJa: "呼び戻し",
    description:
      "Pull-back. The attacker pulls the opponent forward, then suddenly shoves them backward out of the ring.",
  },
  ushiromotare: {
    nameJa: "後ろもたれ",
    description:
      "Backward lean-out. The attacker leans backward against the opponent, using their weight to force them out.",
  },
  kimedashi: {
    nameJa: "極め出し",
    description:
      "Arm-bar force-out. The attacker locks the opponent's arm and forces them out of the ring.",
  },
  kimetaoshi: {
    nameJa: "極め倒し",
    description:
      "Arm-bar force-down. The attacker locks the opponent's arm and forces them down to the ground.",
  },
  // Nageite
  uwatenage: {
    nameJa: "上手投げ",
    description:
      "Overarm throw. The attacker grips the opponent's belt over the arm and throws them to the ground.",
  },
  sukuinage: {
    nameJa: "掬い投げ",
    description:
      "Scoop throw. Without a belt grip, the attacker scoops the opponent's body and throws them down.",
  },
  shitatenage: {
    nameJa: "下手投げ",
    description:
      "Underarm throw. The attacker grips the opponent's belt under the arm and throws them to the ground.",
  },
  kotenage: {
    nameJa: "小手投げ",
    description:
      "Arm-lock throw. The attacker locks the opponent's arm and uses the leverage to throw them down.",
  },
  shitatedashinage: {
    nameJa: "下手出し投げ",
    description:
      "Underarm forward throw. The attacker releases the belt grip and throws the opponent forward.",
  },
  uwatedashinage: {
    nameJa: "上手出し投げ",
    description:
      "Overarm forward throw. The attacker releases the overarm belt grip and throws the opponent forward.",
  },
  kubinage: {
    nameJa: "首投げ",
    description:
      "Headlock throw. The attacker wraps the opponent's neck and throws them to the ground.",
  },
  koshihineri: {
    nameJa: "腰捻り",
    description:
      "Hip twist. The attacker twists the opponent's hips, using leverage to throw them down.",
  },
  ipponzeoi: {
    nameJa: "一本背負い",
    description:
      "One-armed shoulder throw. The attacker pulls the opponent forward by one arm and throws them over the shoulder.",
  },
  nichonage: {
    nameJa: "二丁投げ",
    description:
      "Two-handed throw. The attacker grips the opponent with both arms and throws them to the ground.",
  },
  yaguranage: {
    nameJa: "櫓投げ",
    description: "Beam throw. The attacker locks the opponent's arm overhead and throws them down.",
  },
  kakenage: {
    nameJa: "掛け投げ",
    description:
      "Hooking throw. The attacker hooks the opponent's leg and throws them off balance.",
  },
  // Hinerite
  tsukiotoshi: {
    nameJa: "突き落とし",
    description:
      "Thrust-down. The attacker thrusts the opponent downward, forcing them to touch the ground.",
  },
  tottari: {
    nameJa: "とったり",
    description:
      "Arm-lock twist. The attacker locks the opponent's arm and twists, forcing them down.",
  },
  shitatehineri: {
    nameJa: "下手捻り",
    description:
      "Underarm twist. The attacker grips the belt underhand and twists the opponent down.",
  },
  uwatehineri: {
    nameJa: "上手捻り",
    description:
      "Overarm twist. The attacker grips the belt overhand and twists the opponent down.",
  },
  kotehineri: {
    nameJa: "小手捻り",
    description:
      "Arm twist. The attacker twists the opponent's forearm, forcing them to the ground.",
  },
  amiuchi: {
    nameJa: "網打ち",
    description:
      "Net casting throw. The attacker swings both arms across the opponent's body, throwing them down.",
  },
  kainahineri: {
    nameJa: "腕捻り",
    description: "Arm twist-down. The attacker twists the opponent's upper arm, forcing them down.",
  },
  zubuneri: {
    nameJa: "頭捻り",
    description:
      "Head twist. The attacker presses their head against the opponent and twists, forcing them down.",
  },
  sakatottari: {
    nameJa: "逆取ったり",
    description:
      "Reverse arm-lock. The attacker reverses the opponent's grip and locks their arm, forcing them down.",
  },
  kubiotoshi: {
    nameJa: "首落とし",
    description:
      "Head pull-down. The attacker pulls the opponent's head downward, forcing them to the ground.",
  },
  gasshohineri: {
    nameJa: "合掌捻り",
    description:
      "Clasping twist. The attacker clasps both hands around the opponent and twists them down.",
  },
  harimanage: {
    nameJa: "波離間投げ",
    description:
      "Reverse belt throw. The attacker reaches behind and throws the opponent using a reverse belt grip.",
  },
  osakate: {
    nameJa: "大逆手",
    description:
      "Reverse underarm throw. The attacker reverses the opponent's grip and throws them down.",
  },
  sabaori: {
    nameJa: "鯖折り",
    description:
      "Mackerel drop. The attacker forces the opponent forward, then drops their weight, breaking the opponent's balance.",
  },
  sotokomata_hinerite: {
    nameJa: "外小股",
    description:
      "Outer thigh twist. The attacker twists the opponent's outer thigh, forcing them down.",
  },
  tokkurinage: {
    nameJa: "徳利投げ",
    description:
      "Bottle throw. The attacker locks the opponent's arms overhead and throws them down.",
  },
  makiotoshi: {
    nameJa: "巻き落とし",
    description:
      "Wrap-around drop. The attacker wraps the opponent's body and pulls them down to the ground.",
  },
  uchimuso: {
    nameJa: "内無双",
    description:
      "Inner thigh throw. The attacker throws the opponent by striking the inside of their thigh.",
  },
  sotomuso: {
    nameJa: "外無双",
    description:
      "Outer thigh throw. The attacker throws the opponent by striking the outside of their thigh.",
  },
  // Kakeite
  ashitori: {
    nameJa: "足取り",
    description:
      "Leg grab. The attacker grabs the opponent's leg and pulls, forcing them off balance.",
  },
  sotogake: {
    nameJa: "外掛け",
    description:
      "Outer leg trip. The attacker trips the opponent's leg from the outside, sending them forward.",
  },
  uchigake: {
    nameJa: "内掛け",
    description:
      "Inner leg trip. The attacker trips the opponent's leg from the inside, sending them forward.",
  },
  ketaguri: {
    nameJa: "蹴手繰り",
    description:
      "Kicking leg pull. The attacker kicks the opponent's leg backward, pulling them down.",
  },
  watashikomi: {
    nameJa: "渡し込み",
    description:
      "Thigh grab push. The attacker grabs the opponent's thigh and forces them out of the ring.",
  },
  kekaeshi: {
    nameJa: "蹴返し",
    description:
      "Counter kick. The attacker counters the opponent's charge by kicking their leg, sending them down.",
  },
  kosotogake: {
    nameJa: "小外掛け",
    description:
      "Small outer trip. The attacker trips the opponent's ankle from the outside, forcing them down.",
  },
  komatasukui: {
    nameJa: "小股掬い",
    description:
      "Thigh scoop. The attacker scoops the opponent's thigh and pushes them off balance.",
  },
  chongake: {
    nameJa: "ちょん掛け",
    description:
      "Hooking ankle trip. The attacker hooks the opponent's ankle, sending them forward to the ground.",
  },
  kawarigake: {
    nameJa: "河津掛け",
    description:
      "Riverbank trip. A dangerous leg hook where both wrestlers may fall, risking injury.",
  },
  susoharai: {
    nameJa: "裾払い",
    description:
      "Foot sweep. The attacker sweeps the opponent's foot at the edge, sending them out of the ring.",
  },
  kirikaeshi: {
    nameJa: "切り返し",
    description:
      "Cutting counter. The attacker counters the opponent's charge by twisting and pulling them down.",
  },
  nimaigeri: {
    nameJa: "二枚蹴り",
    description:
      "Two-level kick. The attacker kicks at the opponent's legs at two levels, forcing them down.",
  },
  omata: {
    nameJa: "大股",
    description:
      "Inner thigh grab. The attacker grabs the opponent's inner thigh and forces them out.",
  },
  susotori: {
    nameJa: "裾取り",
    description:
      "Ankle grab. The attacker grabs the opponent's ankle at the edge, pulling them off balance.",
  },
  mitokorozeme: {
    nameJa: "三所攻め",
    description:
      "Three-point attack. A devastating combination attacking the neck, arm, and leg simultaneously.",
  },
  kosotogari: {
    nameJa: "小外刈",
    description:
      "Small outer reap. The attacker reaps the opponent's leg from the outside, sending them down.",
  },
  tsumatori: {
    nameJa: "褄取り",
    description:
      "Heel grab. The attacker grabs the opponent's heel at the edge, pulling them off balance.",
  },
  // Sorite
  izori: {
    nameJa: "居反り",
    description:
      "Backward body drop. The attacker arches backward at the edge, throwing the opponent out.",
  },
  kakezori: {
    nameJa: "掛け反り",
    description:
      "Hooking body drop. The attacker hooks the opponent's leg and arches backward, throwing them out.",
  },
  shumokuzori: {
    nameJa: "撞木反り",
    description:
      "Bell hammer drop. The attacker locks both arms overhead and arches backward, throwing the opponent.",
  },
  sototasukizori: {
    nameJa: "外たすき反り",
    description:
      "Outer reverse body drop. The attacker wraps from the outside and arches backward.",
  },
  tasukizori: {
    nameJa: "たすき反り",
    description:
      "Reverse body drop. The attacker wraps the opponent's arms and arches backward, throwing them.",
  },
  tsutaezori: {
    nameJa: "伝え反り",
    description:
      "Belt-grasp body drop. The attacker grasps the opponent's belt and arches backward at the edge.",
  },
  // Hiwaza
  isamiashi: {
    nameJa: "勇み足",
    description:
      "Overeager step. The opponent steps out of the ring first during a forward charge.",
  },
  koshikudake: {
    nameJa: "腰砕け",
    description:
      "Hip collapse. The opponent's hips give way without direct attack, causing them to fall.",
  },
  tsukite: {
    nameJa: "つき手",
    description:
      "Hand touch-down. The opponent touches the ground with their hand without being directly attacked.",
  },
  tsukihiza: {
    nameJa: "つきひざ",
    description:
      "Knee touch-down. The opponent touches the ground with their knee without being directly attacked.",
  },
  fumidashi: {
    nameJa: "踏み出し",
    description:
      "Inadvertent step-out. The opponent steps out of the ring under their own momentum.",
  },
  // Forfeits
  fusensho: {
    nameJa: "不戦勝",
    description:
      "Win by default. The opponent fails to appear for the bout, resulting in an automatic victory.",
  },
  hansoku: {
    nameJa: "反則",
    description:
      "Foul. The opponent commits a rules violation, resulting in disqualification and an automatic victory.",
  },
};

// Local alias strictly for visual alignment of the static data block
const K = defineKimarite;

/** COMPLETE OFFICIAL 82 KIMARITE (v1.3 taxonomy) */
export const KIMARITE_REGISTRY: KimariteDefinition[] = [
  // === Kihonwaza (Basic Techniques - 7 moves) ===
  K({
    id: "yorikiri",
    jsaCategory: "Kihonwaza",
    baseWeight: 1000,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),
  K({ id: "oshidashi", jsaCategory: "Kihonwaza", baseWeight: 850 }),
  K({ id: "oshitaoshi", jsaCategory: "Kihonwaza", baseWeight: 250 }),
  K({
    id: "yoritaoshi",
    jsaCategory: "Kihonwaza",
    baseWeight: 200,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),
  K({
    id: "tsukidashi",
    jsaCategory: "Kihonwaza",
    baseWeight: 120,
    statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 },
  }),
  K({
    id: "tsukitaoshi",
    jsaCategory: "Kihonwaza",
    baseWeight: 50,
    statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 },
  }),
  K({
    id: "abisetaoshi",
    jsaCategory: "Kihonwaza",
    baseWeight: 30,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),

  // === Tokushuwaza (Special Techniques - 19 moves) ===
  K({
    id: "tsuridashi",
    jsaCategory: "Tokushuwaza",
    baseWeight: 25,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
    requirements: { minStrengthDifferential: 30 },
  }),
  K({
    id: "utchari",
    jsaCategory: "Tokushuwaza",
    baseWeight: 20,
    requirements: { edgeOfRing: true },
  }),
  K({
    id: "okuritaoshi",
    jsaCategory: "Tokushuwaza",
    baseWeight: 15,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({ id: "katasukashi", jsaCategory: "Tokushuwaza", baseWeight: 15 }),
  K({ id: "sokubiotoshi", jsaCategory: "Tokushuwaza", baseWeight: 10 }),
  K({
    id: "okurigake",
    jsaCategory: "Tokushuwaza",
    baseWeight: 5,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({
    id: "okurihikiotoshi",
    jsaCategory: "Tokushuwaza",
    baseWeight: 5,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({ id: "waridashi", jsaCategory: "Tokushuwaza", baseWeight: 5, tacticalFamily: "push" }),
  K({
    id: "okurinage",
    jsaCategory: "Tokushuwaza",
    baseWeight: 3,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({ id: "tsukaminage", jsaCategory: "Tokushuwaza", baseWeight: 2, tacticalFamily: "belt" }),
  K({
    id: "okuritsuridashi",
    jsaCategory: "Tokushuwaza",
    baseWeight: 2,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({
    id: "okuritsuriotoshi",
    jsaCategory: "Tokushuwaza",
    baseWeight: 1,
    tacticalFamily: "speed",
    requirements: { canFlank: true },
  }),
  K({ id: "yobimodoshi", jsaCategory: "Tokushuwaza", baseWeight: 1, tacticalFamily: "belt" }),
  K({ id: "ushiromotare", jsaCategory: "Tokushuwaza", baseWeight: 1 }),

  // === Nageite (Throwing Techniques - 13 moves) ===
  K({
    id: "uwatenage",
    jsaCategory: "Nageite",
    baseWeight: 350,
    leverageTarget: "high_center_of_gravity",
    requirements: { requiredGrip: { anyHand: "outside" } },
  }),
  K({ id: "sukuinage", jsaCategory: "Nageite", baseWeight: 200, requiresBeltGrip: false }),
  K({
    id: "shitatenage",
    jsaCategory: "Nageite",
    baseWeight: 150,
    requirements: { requiredGrip: { anyHand: "inside" } },
  }),
  K({ id: "kotenage", jsaCategory: "Nageite", baseWeight: 120, requiresBeltGrip: false }),
  K({ id: "shitatedashinage", jsaCategory: "Nageite", baseWeight: 80, tacticalFamily: "trick" }),
  K({ id: "uwatedashinage", jsaCategory: "Nageite", baseWeight: 60, tacticalFamily: "trick" }),
  K({ id: "kubinage", jsaCategory: "Nageite", baseWeight: 15, requiresBeltGrip: false }),
  K({ id: "koshihineri", jsaCategory: "Nageite", baseWeight: 5 }),
  K({ id: "ipponzeoi", jsaCategory: "Nageite", baseWeight: 3, tacticalFamily: "trick" }),
  K({ id: "nichonage", jsaCategory: "Nageite", baseWeight: 2 }),
  K({ id: "yaguranage", jsaCategory: "Nageite", baseWeight: 2 }),
  K({ id: "kakenage", jsaCategory: "Nageite", baseWeight: 2 }),

  // === Hinerite (Twisting Techniques - 19 moves) ===
  K({ id: "tsukiotoshi", jsaCategory: "Hinerite", baseWeight: 350 }),
  K({ id: "tottari", jsaCategory: "Hinerite", baseWeight: 30 }),
  K({
    id: "shitatehineri",
    jsaCategory: "Hinerite",
    baseWeight: 25,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),
  K({
    id: "uwatehineri",
    jsaCategory: "Hinerite",
    baseWeight: 20,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),
  K({ id: "kotehineri", jsaCategory: "Hinerite", baseWeight: 15, tacticalFamily: "belt" }),
  K({ id: "amiuchi", jsaCategory: "Hinerite", baseWeight: 10 }),
  K({ id: "kainahineri", jsaCategory: "Hinerite", baseWeight: 10 }),
  K({ id: "zubuneri", jsaCategory: "Hinerite", baseWeight: 5 }),
  K({ id: "sakatottari", jsaCategory: "Hinerite", baseWeight: 5 }),
  K({ id: "kubiotoshi", jsaCategory: "Hinerite", baseWeight: 5 }),
  K({ id: "gasshohineri", jsaCategory: "Hinerite", baseWeight: 2, tacticalFamily: "belt" }),
  K({ id: "harimanage", jsaCategory: "Hinerite", baseWeight: 2, tacticalFamily: "belt" }),
  K({ id: "osakate", jsaCategory: "Hinerite", baseWeight: 1 }),
  K({
    id: "sabaori",
    jsaCategory: "Hinerite",
    baseWeight: 1,
    tacticalFamily: "belt",
    requiresBeltGrip: true,
  }),
  K({ id: "sotokomata_hinerite", jsaCategory: "Hinerite", baseWeight: 1 }),
  K({ id: "tokkurinage", jsaCategory: "Hinerite", baseWeight: 1 }),
  K({ id: "makiotoshi", jsaCategory: "Hinerite", baseWeight: 1 }),
  K({ id: "uchimuso", jsaCategory: "Hinerite", baseWeight: 1 }),
  K({ id: "sotomuso", jsaCategory: "Hinerite", baseWeight: 1 }),

  // === Kakeite (Tripping Techniques - 18 moves) ===
  K({ id: "ashitori", jsaCategory: "Kakeite", baseWeight: 30 }),
  K({ id: "sotogake", jsaCategory: "Kakeite", baseWeight: 25 }),
  K({ id: "uchigake", jsaCategory: "Kakeite", baseWeight: 20 }),
  K({ id: "ketaguri", jsaCategory: "Kakeite", baseWeight: 15, tacticalFamily: "trick" }),
  K({ id: "watashikomi", jsaCategory: "Kakeite", baseWeight: 10 }),
  K({ id: "kekaeshi", jsaCategory: "Kakeite", baseWeight: 10 }),
  K({ id: "kosotogake", jsaCategory: "Kakeite", baseWeight: 8 }),
  K({ id: "komatasukui", jsaCategory: "Kakeite", baseWeight: 5 }),
  K({ id: "chongake", jsaCategory: "Kakeite", baseWeight: 3 }),
  K({ id: "kawarigake", jsaCategory: "Kakeite", baseWeight: 2, isHighRisk: true }),
  K({ id: "susoharai", jsaCategory: "Kakeite", baseWeight: 2 }),
  K({ id: "kirikaeshi", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "nimaigeri", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "omata", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "susotori", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "mitokorozeme", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "kosotogari", jsaCategory: "Kakeite", baseWeight: 1 }),
  K({ id: "tsumatori", jsaCategory: "Kakeite", baseWeight: 1 }),

  // === Sorite (Backwards Body Drops - 6 moves) ===
  K({ id: "izori", jsaCategory: "Sorite", baseWeight: 1 }),
  K({ id: "kakezori", jsaCategory: "Sorite", baseWeight: 1 }),
  K({ id: "shumokuzori", jsaCategory: "Sorite", baseWeight: 1 }),
  K({ id: "sototasukizori", jsaCategory: "Sorite", baseWeight: 1 }),
  K({ id: "tasukizori", jsaCategory: "Sorite", baseWeight: 1 }),
  K({ id: "tsutaezori", jsaCategory: "Sorite", baseWeight: 1 }),

  // === Tokushuwaza Continued (Remaining from 19) ===
  K({ id: "kimedashi", jsaCategory: "Tokushuwaza", baseWeight: 5 }),
  K({ id: "kimetaoshi", jsaCategory: "Tokushuwaza", baseWeight: 5 }),

  // === Hiwaza (Non-Winning Techniques - 5 moves) ===
  K({ id: "isamiashi", jsaCategory: "Hiwaza", baseWeight: 1 }),
  K({ id: "koshikudake", jsaCategory: "Hiwaza", baseWeight: 1 }),
  K({ id: "tsukite", jsaCategory: "Hiwaza", baseWeight: 1 }),
  K({ id: "tsukihiza", jsaCategory: "Hiwaza", baseWeight: 1 }),
  K({ id: "fumidashi", jsaCategory: "Hiwaza", baseWeight: 1 }),

  // === Forfeits & Extras (Engine internal) ===
  K({
    id: "fusensho",
    jsaCategory: "Tokushuwaza",
    tacticalFamily: "trick",
    baseWeight: 0,
    statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 },
    kimariteClass: "forfeit",
    name: "Fusensho",
  }),
  K({
    id: "hansoku",
    jsaCategory: "Tokushuwaza",
    tacticalFamily: "trick",
    baseWeight: 0,
    statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 },
    kimariteClass: "forfeit",
    name: "Hansoku",
  }),
];

// --- High-Performance Lookups ---

/** Pre-computed map for O(1) direct ID lookups during combat simulations */
const KIMARITE_MAP = new Map<string, KimariteDefinition>(KIMARITE_REGISTRY.map((k) => [k.id, k]));

/** Get kimarite by ID (O(1) operation) */
export function getKimarite(id: string): KimariteDefinition | undefined {
  return KIMARITE_MAP.get(id);
}

/** Get kimarite by JSA category */
export function getKimariteByJsaCategory(category: JsaCategory): Kimarite[] {
  return KIMARITE_REGISTRY.filter((k) => k.jsaCategory === category);
}

/** Get kimarite by legacy KimariteClass */
export function getKimariteByClass(kimariteClass: KimariteClass): KimariteDefinition[] {
  return KIMARITE_REGISTRY.filter((k) => k.kimariteClass === kimariteClass);
}

export function getKimariteCount(): number {
  return KIMARITE_REGISTRY.filter(
    (k) => k.id !== "fusensho" && k.id !== "hansoku" && k.jsaCategory !== "Hiwaza"
  ).length;
}

/** Get kimarite for tactical family */
export function getKimariteForFamily(family: TacticalFamily): Kimarite[] {
  return KIMARITE_REGISTRY.filter((k) => k.tacticalFamily === family);
}
