import type { Style, Stance, TacticalArchetype, TacticalFamily } from "./types/combat";
import type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements } from "./types/kimarite";
export type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements };
import { stableTieBreak } from "./utils/sort";



// --- Helpers to maintain the 82 techniques with minimal verbosity ---

/** Base fields needed for definition */
interface KBase {
  id: string;
  name: string;
  nameJa?: string;
  jsaCategory: JsaCategory;
  tacticalFamily?: TacticalFamily;
  baseWeight?: number; // Optional in KBase, but will be filled by defaults or entry
  isHighRisk?: boolean;
  requirements?: KimariteRequirements;
  statWeights?: Kimarite['statWeights']; // Override defaults
  requiresBeltGrip?: boolean;
  leverageTarget?: Kimarite['leverageTarget'];
  description?: string;
  rarity?: Kimarite['rarity'];
  kimariteClass?: KimariteClass; // Legacy engine compatibility
}

function K(entry: KBase): Kimarite & { kimariteClass?: KimariteClass } {
  let defaults: any;
  switch (entry.jsaCategory) {
    case 'Kihonwaza':
      defaults = { tacticalFamily: 'push', baseWeight: 500, statWeights: { strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0.0 }, kimariteClass: 'force_out' };
      break;
    case 'Nageite':
      defaults = { tacticalFamily: 'belt', baseWeight: 100, statWeights: { strength: 0.3, weight: 0.1, speed: 0.1, technique: 0.5, balance: 0.0 }, requiresBeltGrip: true, kimariteClass: 'throw' };
      break;
    case 'Kakeite':
      defaults = { tacticalFamily: 'speed', baseWeight: 50, statWeights: { strength: 0.1, weight: 0.0, speed: 0.5, technique: 0.4, balance: 0.0 }, kimariteClass: 'trip' };
      break;
    case 'Sorite':
      defaults = { tacticalFamily: 'trick', baseWeight: 1, isHighRisk: true, requirements: { isDesperation: true }, statWeights: { strength: 0.1, weight: 0.0, speed: 0.1, technique: 0.8, balance: 0.0 }, kimariteClass: 'special' };
      break;
    case 'Hinerite':
      defaults = { tacticalFamily: 'trick', baseWeight: 100, statWeights: { strength: 0.1, weight: 0.1, speed: 0.2, technique: 0.6, balance: 0.0 }, leverageTarget: 'momentum', kimariteClass: 'twist' };
      break;
    case 'Tokushuwaza':
      defaults = { tacticalFamily: 'trick', baseWeight: 50, statWeights: { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.4, balance: 0.0 }, kimariteClass: 'special' };
      break;
    case 'Hiwaza':
      defaults = { tacticalFamily: 'trick', baseWeight: 1, statWeights: { strength: 0.1, weight: 0.4, speed: 0.2, technique: 0.3, balance: 0.0 }, kimariteClass: 'result' };
      break;
  }

  const baseWeight = entry.baseWeight ?? defaults.baseWeight;
  const rarity = entry.rarity ?? (
    baseWeight <= 5 ? "legendary" :
    baseWeight <= 30 ? "rare" :
    baseWeight <= 150 ? "uncommon" : "common"
  );

  return {
    ...defaults,
    ...entry,
    statWeights: entry.statWeights ?? defaults.statWeights,
    baseWeight,
    rarity,
    requirements: { ...defaults.requirements, ...entry.requirements },
    isHighRisk: entry.isHighRisk ?? defaults.isHighRisk ?? false,
  };
}

/** COMPLETE OFFICIAL 82 KIMARITE (v1.3 taxonomy) */
export const KIMARITE_REGISTRY: (Kimarite & { kimariteClass?: KimariteClass })[] = [
  // === Kihonwaza (Basic Techniques - 7 moves) ===
  K({ id: 'yorikiri', name: 'Yorikiri', nameJa: '寄り切り', jsaCategory: 'Kihonwaza', baseWeight: 1000, description: 'Classic force out by gripping the opponent\'s belt and driving relentlessly forward until they step over the edge.', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'oshidashi', name: 'Oshidashi', nameJa: '押し出し', jsaCategory: 'Kihonwaza', baseWeight: 850, description: 'Frontal push out using a barrage of powerful hand thrusts to march the opponent out of the ring without touching the belt.' }),
  K({ id: 'oshitaoshi', name: 'Oshitaoshi', nameJa: '押し倒し', jsaCategory: 'Kihonwaza', baseWeight: 250, description: 'Overwhelming frontal push down that crushes the opponent directly into the clay.' }),
  K({ id: 'yoritaoshi', name: 'Yoritaoshi', nameJa: '寄り倒し', jsaCategory: 'Kihonwaza', baseWeight: 200, description: 'Devastating frontal force down, collapsing the opponent backward while maintaining a solid belt grip.', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'tsukidashi', name: 'Tsukidashi', nameJa: '突き出し', jsaCategory: 'Kihonwaza', baseWeight: 120, description: 'Violent thrust out, using rapid open-palm strikes to send the opponent reeling across the boundary.', statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'tsukitaoshi', name: 'Tsukitaoshi', nameJa: '突き倒し', jsaCategory: 'Kihonwaza', baseWeight: 50, description: 'Ferocious thrust down that knocks the opponent completely off their feet.', statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'abisetaoshi', name: 'Abisetaoshi', nameJa: '浴びせ倒し', jsaCategory: 'Kihonwaza', baseWeight: 30, description: 'Backward force down where the attacker leans heavily, using their entire body weight to flatten the defender.', tacticalFamily: 'belt', requiresBeltGrip: true }),

  // === Tokushuwaza (Special Techniques - 19 moves) ===
  K({ id: 'hatakikomi', name: 'Hatakikomi', nameJa: '叩き込み', jsaCategory: 'Tokushuwaza', baseWeight: 400, description: 'Slap down using the opponent\'s forward momentum', kimariteClass: 'slap_pull' }),
  K({ id: 'hikiotoshi', name: 'Hikiotoshi', nameJa: '引き落とし', jsaCategory: 'Tokushuwaza', baseWeight: 250, description: 'Hand pull down' }),
  K({ id: 'okuridashi', name: 'Okuridashi', nameJa: '送り出し', jsaCategory: 'Tokushuwaza', baseWeight: 80, description: 'Rear push out', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'tsuriotoshi', name: 'Tsuriotoshi', nameJa: '吊り落とし', jsaCategory: 'Tokushuwaza', baseWeight: 30, description: 'Lift-and-drop', tacticalFamily: 'belt', requirements: { minStrengthDifferential: 30 } }),
  K({ id: 'tsuridashi', name: 'Tsuridashi', nameJa: '吊り出し', jsaCategory: 'Tokushuwaza', baseWeight: 25, description: 'Lift out', tacticalFamily: 'belt', requiresBeltGrip: true, requirements: { minStrengthDifferential: 30 } }),
  K({ id: 'utchari', name: 'Utchari', nameJa: '打っ棄り', jsaCategory: 'Tokushuwaza', baseWeight: 20, description: 'Pivot sweep throw', requirements: { edgeOfRing: true } }),
  K({ id: 'okuritaoshi', name: 'Okuritaoshi', nameJa: '送り倒し', jsaCategory: 'Tokushuwaza', baseWeight: 15, description: 'Rear push down', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'katasukashi', name: 'Katasukashi', nameJa: '肩すかし', jsaCategory: 'Tokushuwaza', baseWeight: 15, description: 'Under-shoulder swing down' }),
  K({ id: 'sokubiotoshi', name: 'Sokubiotoshi', nameJa: '素首落とし', jsaCategory: 'Tokushuwaza', baseWeight: 10, description: 'Neck-slap down' }),
  K({ id: 'okurigake', name: 'Okurigake', nameJa: '送り掛け', jsaCategory: 'Tokushuwaza', baseWeight: 5, description: 'Rear leg trip', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'okurihikiotoshi', name: 'Okurihikiotoshi', nameJa: '送り引き落とし', jsaCategory: 'Tokushuwaza', baseWeight: 5, description: 'Rear pull down', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'waridashi', name: 'Waridashi', nameJa: '割り出し', jsaCategory: 'Tokushuwaza', baseWeight: 5, description: 'Upper-arm frontal push out', tacticalFamily: 'push' }),
  K({ id: 'okurinage', name: 'Okurinage', nameJa: '送り投げ', jsaCategory: 'Tokushuwaza', baseWeight: 3, description: 'Rear throw', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'tsukaminage', name: 'Tsukaminage', nameJa: 'つかみ投げ', jsaCategory: 'Tokushuwaza', baseWeight: 2, description: 'Grabbing throw', tacticalFamily: 'belt' }),
  K({ id: 'okuritsuridashi', name: 'Okuritsuridashi', nameJa: '送り吊り出し', jsaCategory: 'Tokushuwaza', baseWeight: 2, description: 'Rear lift out', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'okuritsuriotoshi', name: 'Okuritsuriotoshi', nameJa: '送り吊り落とし', jsaCategory: 'Tokushuwaza', baseWeight: 1, description: 'Rear lift and drop', tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'yobimodoshi', name: 'Yobimodoshi', nameJa: '呼び戻し', jsaCategory: 'Tokushuwaza', baseWeight: 1, description: 'Pulling body slam', tacticalFamily: 'belt' }),
  K({ id: 'ushiromotare', name: 'Ushiromotare', nameJa: '後ろもたれ', jsaCategory: 'Tokushuwaza', baseWeight: 1, description: 'Backward leaning out' }),

  // === Nageite (Throwing Techniques - 13 moves) ===
  K({ id: 'uwatenage', name: 'Uwatenage', nameJa: '上手投げ', jsaCategory: 'Nageite', baseWeight: 350, description: 'A magnificent overarm throw, leveraging an outside belt grip to hurl the opponent to the dirt.', leverageTarget: 'high_center_of_gravity', requirements: { requiredGrip: { anyHand: 'outside' } } }),
  K({ id: 'sukuinage', name: 'Sukuinage', nameJa: '掬い投げ', jsaCategory: 'Nageite', baseWeight: 200, description: 'A swift beltless arm throw, scooping the opponent under their arm and tossing them down.', requiresBeltGrip: false }),
  K({ id: 'shitatenage', name: 'Shitatenage', nameJa: '下手投げ', jsaCategory: 'Nageite', baseWeight: 150, description: 'A sharp underarm throw that uses an inside belt grip to pivot and drop the opponent.', requirements: { requiredGrip: { anyHand: 'inside' } } }),
  K({ id: 'kotenage', name: 'Kotenage', nameJa: '小手投げ', jsaCategory: 'Nageite', baseWeight: 120, description: 'Armlock throw', requiresBeltGrip: false }),
  K({ id: 'shitatedashinage', name: 'Shitatedashinage', nameJa: '下手出し投げ', jsaCategory: 'Nageite', baseWeight: 80, description: 'Pulling underarm throw', tacticalFamily: 'trick' }),
  K({ id: 'uwatedashinage', name: 'Uwatedashinage', nameJa: '上手出し投げ', jsaCategory: 'Nageite', baseWeight: 60, description: 'Pulling overarm throw', tacticalFamily: 'trick' }),
  K({ id: 'kubinage', name: 'Kubinage', nameJa: '首投げ', jsaCategory: 'Nageite', baseWeight: 15, description: 'Headlock throw', requiresBeltGrip: false }),
  K({ id: 'koshihineri', name: 'Koshihineri', nameJa: '腰捻り', jsaCategory: 'Nageite', baseWeight: 5, description: 'Hip twist throw' }),
  K({ id: 'ipponzeoi', name: 'Ipponzeoi', nameJa: '一本背負い', jsaCategory: 'Nageite', baseWeight: 3, description: 'One-armed shoulder throw', tacticalFamily: 'trick' }),
  K({ id: 'nichonage', name: 'Nichonage', nameJa: '二丁投げ', jsaCategory: 'Nageite', baseWeight: 2, description: 'Two-handed arm throw' }),
  K({ id: 'yaguranage', name: 'Yaguranage', nameJa: '櫓投げ', jsaCategory: 'Nageite', baseWeight: 2, description: 'Inner thigh throw' }),
  K({ id: 'kakenage', name: 'Kakenage', nameJa: '掛け投げ', jsaCategory: 'Nageite', baseWeight: 2, description: 'Hooking throw' }),

  // === Hinerite (Twisting Techniques - 19 moves) ===
  K({ id: 'tsukiotoshi', name: 'Tsukiotoshi', nameJa: '突き落とし', jsaCategory: 'Hinerite', baseWeight: 350, description: 'A lightning-fast twisting thrust down, redirecting the opponent\'s forward momentum directly into the clay.' }),
  K({ id: 'tottari', name: 'Tottari', nameJa: 'とったり', jsaCategory: 'Hinerite', baseWeight: 30, description: 'Arm bar throw' }),
  K({ id: 'shitatehineri', name: 'Shitatehineri', nameJa: '下手捻り', jsaCategory: 'Hinerite', baseWeight: 25, description: 'Underarm twisting throw', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'uwatehineri', name: 'Uwatehineri', nameJa: '上手捻り', jsaCategory: 'Hinerite', baseWeight: 20, description: 'Overarm twisting throw', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'kotehineri', name: 'Kotehineri', nameJa: '小手捻り', jsaCategory: 'Hinerite', baseWeight: 15, description: 'Armlock twisting throw', tacticalFamily: 'belt' }),
  K({ id: 'amiuchi', name: 'Amiuchi', nameJa: '網打ち', jsaCategory: 'Hinerite', baseWeight: 10, description: 'Fisherman\'s throw' }),
  K({ id: 'kainahineri', name: 'Kainahineri', nameJa: '腕捻り', jsaCategory: 'Hinerite', baseWeight: 10, description: 'Two-arm twisting throw' }),
  K({ id: 'zubuneri', name: 'Zubuneri', nameJa: '頭捻り', jsaCategory: 'Hinerite', baseWeight: 5, description: 'Head-propping twisting throw' }),
  K({ id: 'sakatottari', name: 'Sakatottari', nameJa: '逆取ったり', jsaCategory: 'Hinerite', baseWeight: 5, description: 'Wrapped arm throw' }),
  K({ id: 'kubiotoshi', name: 'Kubiotoshi', nameJa: '首落とし', jsaCategory: 'Hinerite', baseWeight: 5, description: 'Neck-twisting throw' }),
  K({ id: 'gasshohineri', name: 'Gasshohineri', nameJa: '合掌捻り', jsaCategory: 'Hinerite', baseWeight: 2, description: 'Clasped-hand twisting throw', tacticalFamily: 'belt' }),
  K({ id: 'harimanage', name: 'Harimanage', nameJa: '波離間投げ', jsaCategory: 'Hinerite', baseWeight: 2, description: 'Backward belt throw', tacticalFamily: 'belt' }),
  K({ id: 'osakate', name: 'Osakate', nameJa: '大逆手', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Overarm leg-trip throw' }),
  K({ id: 'sabaori', name: 'Sabaori', nameJa: '鯖折り', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Forward force down', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'sotokomata_hinerite', name: 'Sotokomata', nameJa: '外小股', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Outside thigh-scooping throw' }),
  K({ id: 'tokkurinage', name: 'Tokkurinage', nameJa: '徳利投げ', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Two-hand head-twisting throw' }),
  K({ id: 'makiotoshi', name: 'Makiotoshi', nameJa: '巻き落とし', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Twisting pull down' }),
  K({ id: 'uchimuso', name: 'Uchimuso', nameJa: '内無双', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Inner thigh-propping twist' }),
  K({ id: 'sotomuso', name: 'Sotomuso', nameJa: '外無双', jsaCategory: 'Hinerite', baseWeight: 1, description: 'Outer thigh-propping twist' }),

  // === Kakeite (Tripping Techniques - 18 moves) ===
  K({ id: 'ashitori', name: 'Ashitori', nameJa: '足取り', jsaCategory: 'Kakeite', baseWeight: 30, description: 'Leg pick' }),
  K({ id: 'sotogake', name: 'Sotogake', nameJa: '外掛け', jsaCategory: 'Kakeite', baseWeight: 25, description: 'Outside leg trip' }),
  K({ id: 'uchigake', name: 'Uchigake', nameJa: '内掛け', jsaCategory: 'Kakeite', baseWeight: 20, description: 'Inside leg trip' }),
  K({ id: 'ketaguri', name: 'Ketaguri', nameJa: '蹴手繰り', jsaCategory: 'Kakeite', baseWeight: 15, description: 'Ankle kick sweep', tacticalFamily: 'trick' }),
  K({ id: 'watashikomi', name: 'Watashikomi', nameJa: '渡し込み', jsaCategory: 'Kakeite', baseWeight: 10, description: 'Thigh-hook body drop' }),
  K({ id: 'kekaeshi', name: 'Kekaeshi', nameJa: '蹴返し', jsaCategory: 'Kakeite', baseWeight: 10, description: 'Kicking back the leg' }),
  K({ id: 'kosotogake', name: 'Kosotogake', nameJa: '小外掛け', jsaCategory: 'Kakeite', baseWeight: 8, description: 'Minor outside leg trip' }),
  K({ id: 'komatasukui', name: 'Komatasukui', nameJa: '小股掬い', jsaCategory: 'Kakeite', baseWeight: 5, description: 'Over-thigh scooping throw' }),
  K({ id: 'chongake', name: 'Chongake', nameJa: 'ちょん掛け', jsaCategory: 'Kakeite', baseWeight: 3, description: 'Hooking heel trip' }),
  K({ id: 'kawarigake', name: 'Kawarigake', nameJa: '河津掛け', jsaCategory: 'Kakeite', baseWeight: 2, description: 'Hooking backward trip', isHighRisk: true }),
  K({ id: 'susoharai', name: 'Susoharai', nameJa: '裾払い', jsaCategory: 'Kakeite', baseWeight: 2, description: 'Ankle sweep' }),
  K({ id: 'kirikaeshi', name: 'Kirikaeshi', nameJa: '切り返し', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Twisting backward trip' }),
  K({ id: 'nimaigeri', name: 'Nimaigeri', nameJa: '二枚蹴り', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Ankle kick sweep' }),
  K({ id: 'omata', name: 'Omata', nameJa: '大股', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Thigh-scooping throw' }),
  K({ id: 'susotori', name: 'Susotori', nameJa: '裾取り', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Ankle pick' }),
  K({ id: 'mitokorozeme', name: 'Mitokorozeme', nameJa: '三所攻め', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Triple-point attack' }),
  K({ id: 'kosotogari', name: 'Kosotogari', nameJa: '小外刈', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Minor outside reap' }),
  K({ id: 'tsumatori', name: 'Tsumatori', nameJa: '褄取り', jsaCategory: 'Kakeite', baseWeight: 1, description: 'Rear toe pick' }),

  // === Sorite (Backwards Body Drops - 6 moves) ===
  K({ id: 'izori', name: 'Izori', nameJa: '居反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Backwards body drop' }),
  K({ id: 'kakezori', name: 'Kakezori', nameJa: '掛け反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Hooking back drop' }),
  K({ id: 'shumokuzori', name: 'Shumokuzori', nameJa: '撞木反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Bell-clapper back drop' }),
  K({ id: 'sototasukizori', name: 'Sototasukizori', nameJa: '外たすき反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Outer kimono-string back drop' }),
  K({ id: 'tasukizori', name: 'Tasukizori', nameJa: 'たすき反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Kimono-string back drop' }),
  K({ id: 'tsutaezori', name: 'Tsutaezori', nameJa: '伝え反り', jsaCategory: 'Sorite', baseWeight: 1, description: 'Underarm back drop' }),

  // === Tokushuwaza Continued (Remaining from 19) ===
  K({ id: 'kimedashi', name: 'Kimedashi', nameJa: '極め出し', jsaCategory: 'Tokushuwaza', baseWeight: 5, description: 'Arm-barring force out' }),
  K({ id: 'kimetaoshi', name: 'Kimetaoshi', nameJa: '極め倒し', jsaCategory: 'Tokushuwaza', baseWeight: 5, description: 'Arm-barring force down' }),

  // === Hiwaza (Non-Winning Techniques - 5 moves) ===
  K({ id: 'isamiashi', name: 'Isamiashi', nameJa: '勇み足', jsaCategory: 'Hiwaza', baseWeight: 1, description: 'Inadvertent step out' }),
  K({ id: 'koshikudake', name: 'Koshikudake', nameJa: '腰砕け', jsaCategory: 'Hiwaza', baseWeight: 1, description: 'Collapsing' }),
  K({ id: 'tsukite', name: 'Tsukite', nameJa: 'つき手', jsaCategory: 'Hiwaza', baseWeight: 1, description: 'Hand touch down' }),
  K({ id: 'tsukihiza', name: 'Tsukihiza', nameJa: 'つきひざ', jsaCategory: 'Hiwaza', baseWeight: 1, description: 'Knee touch down' }),
  K({ id: 'fumidashi', name: 'Fumidashi', nameJa: '踏み出し', jsaCategory: 'Hiwaza', baseWeight: 1, description: 'Stepping out' }),

  // === Forfeits & Extras (Engine internal) ===
  { id: 'fusensho', name: 'Fusensho', nameJa: '不戦勝', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, description: 'Win by default', kimariteClass: 'forfeit' },
  { id: 'hansoku', name: 'Hansoku', nameJa: '反則', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, description: 'Win by disqualification', kimariteClass: 'forfeit' },
];

/** Legacy alias for compatibility */


// --- Lookup helpers ---

/** Get kimarite by ID */
export function getKimarite(id: string): (Kimarite & { kimariteClass?: KimariteClass }) | undefined {
  return KIMARITE_REGISTRY.find(k => k.id === id);
}

/** Get kimarite by JSA category */
export function getKimariteByJsaCategory(category: JsaCategory): Kimarite[] {
  return KIMARITE_REGISTRY.filter(k => k.jsaCategory === category);
}

/** Get kimarite by legacy KimariteClass */
export function getKimariteByClass(kimariteClass: KimariteClass): (Kimarite & { kimariteClass?: KimariteClass })[] {
  return KIMARITE_REGISTRY.filter(k => k.kimariteClass === kimariteClass);
}

export function getKimariteCount(): number {
  return KIMARITE_REGISTRY.filter(k =>
    k.id !== 'fusensho' && 
    k.id !== 'hansoku' && 
    k.jsaCategory !== 'Hiwaza'
  ).length;
}

/** Get kimarite for tactical family */
export function getKimariteForFamily(family: TacticalFamily): Kimarite[] {
  return KIMARITE_REGISTRY.filter(k => k.tacticalFamily === family);
}
