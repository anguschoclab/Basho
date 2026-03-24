// Kimarite Registry - Full 82 official winning techniques (JSA list)
// Includes 5 "bout result" outcomes separately (not kimarite)
// Source list: Japan Sumo Association kimarite page.  [oai_citation:1‡日本相撲協会公式サイト](https://sumo.or.jp/Kimarite/)

import type { Style, Stance, TacticalArchetype, TacticalFamily } from "./types/combat";
import { stableTieBreak } from "./utils/sort";

/** Defines the JSA official categories for kimarite. */
export type JsaCategory = 'Kihonwaza' | 'Nageite' | 'Kakeite' | 'Sorite' | 'Hinerite' | 'Tokushuwaza' | 'Hiwaza';

/** Defines the structure for kimarite (v1.3 Move-Based Architecture). */
export interface Kimarite {
  id: string; // e.g., 'yorikiri'
  name: string;
  nameJa?: string;
  jsaCategory: JsaCategory;
  tacticalFamily: TacticalFamily; // push, belt, trick, speed
  
  // How heavily this specific move relies on specific stats (must sum to 1.0)
  statWeights: {
    strength: number;
    weight: number;
    speed: number;
    technique: number;
    balance: number;
  };
  
  // Specific positional/physical requirements
  requiresBeltGrip?: boolean;
  leverageTarget?: 'high_center_of_gravity' | 'momentum';

  description?: string;
  rarity?: "common" | "uncommon" | "rare" | "legendary";
}

/** Type representing kimarite class (for engine grouping). */
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


// --- Helpers to maintain the 82 techniques with minimal verbosity ---

/** Base fields needed for definition */
interface KBase {
  id: string;
  name: string;
  nameJa?: string;
  jsaCategory: JsaCategory;
  tacticalFamily?: TacticalFamily;
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
      defaults = { tacticalFamily: 'push', statWeights: { strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0.0 }, kimariteClass: 'force_out' };
      break;
    case 'Nageite':
      defaults = { tacticalFamily: 'belt', statWeights: { strength: 0.3, weight: 0.1, speed: 0.1, technique: 0.5, balance: 0.0 }, requiresBeltGrip: true, kimariteClass: 'throw' };
      break;
    case 'Kakeite':
      defaults = { tacticalFamily: 'speed', statWeights: { strength: 0.1, weight: 0.0, speed: 0.5, technique: 0.4, balance: 0.0 }, kimariteClass: 'trip' };
      break;
    case 'Sorite':
      defaults = { tacticalFamily: 'trick', statWeights: { strength: 0.1, weight: 0.0, speed: 0.1, technique: 0.8, balance: 0.0 }, kimariteClass: 'special' };
      break;
    case 'Hinerite':
      defaults = { tacticalFamily: 'trick', statWeights: { strength: 0.1, weight: 0.1, speed: 0.2, technique: 0.6, balance: 0.0 }, leverageTarget: 'momentum', kimariteClass: 'twist' };
      break;
    case 'Tokushuwaza':
      defaults = { tacticalFamily: 'trick', statWeights: { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.4, balance: 0.0 }, kimariteClass: 'special' };
      break;
    case 'Hiwaza':
      defaults = { tacticalFamily: 'trick', statWeights: { strength: 0.1, weight: 0.4, speed: 0.2, technique: 0.3, balance: 0.0 }, kimariteClass: 'result' };
      break;
  }

  return {
    ...defaults,
    ...entry,
    statWeights: entry.statWeights ?? defaults.statWeights,
  };
}

/** COMPLETE OFFICIAL 82 KIMARITE (v1.3 taxonomy) */
export const KIMARITE_ALL: (Kimarite & { kimariteClass?: KimariteClass })[] = [
  // === Kihonwaza (Basic Techniques - 7 moves) ===
  K({ id: 'oshidashi', name: 'Oshidashi', nameJa: '押し出し', jsaCategory: 'Kihonwaza', description: 'Frontal push out' }),
  K({ id: 'oshitaoshi', name: 'Oshitaoshi', nameJa: '押し倒し', jsaCategory: 'Kihonwaza', description: 'Push down' }),
  K({ id: 'tsukidashi', name: 'Tsukidashi', nameJa: '突き出し', jsaCategory: 'Kihonwaza', description: 'Thrust out', statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'tsukitaoshi', name: 'Tsukitaoshi', nameJa: '突き倒し', jsaCategory: 'Kihonwaza', description: 'Thrust down', statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'yorikiri', name: 'Yorikiri', nameJa: '寄り切り', jsaCategory: 'Kihonwaza', description: 'Force out', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'yoritaoshi', name: 'Yoritaoshi', nameJa: '寄り倒し', jsaCategory: 'Kihonwaza', description: 'Crush down', tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'abisetaoshi', name: 'Abisetaoshi', nameJa: '浴びせ倒し', jsaCategory: 'Kihonwaza', description: 'Backward force down', tacticalFamily: 'belt', requiresBeltGrip: true }),

  // === Nageite (Throwing Techniques - 13 moves) ===
  K({ id: 'uwatenage', name: 'Uwatenage', nameJa: '上手投げ', jsaCategory: 'Nageite', description: 'Overarm throw', leverageTarget: 'high_center_of_gravity' }),
  K({ id: 'shitatenage', name: 'Shitatenage', nameJa: '下手投げ', jsaCategory: 'Nageite', description: 'Underarm throw' }),
  K({ id: 'kotenage', name: 'Kotenage', nameJa: '小手投げ', jsaCategory: 'Nageite', description: 'Armlock throw', requiresBeltGrip: false }),
  K({ id: 'sukuinage', name: 'Sukuinage', nameJa: '掬い投げ', jsaCategory: 'Nageite', description: 'Beltless arm throw', requiresBeltGrip: false }),
  K({ id: 'kubinage', name: 'Kubinage', nameJa: '首投げ', jsaCategory: 'Nageite', description: 'Headlock throw', requiresBeltGrip: false, rarity: 'rare' }),
  K({ id: 'nichonage', name: 'Nichonage', nameJa: '二丁投げ', jsaCategory: 'Nageite', description: 'Two-handed arm throw', rarity: 'legendary' }),
  K({ id: 'koshinage', name: 'Koshinage', nameJa: '腰投げ', jsaCategory: 'Nageite', description: 'Hip throw', rarity: 'rare' }),
  K({ id: 'yaguranage', name: 'Yaguranage', nameJa: '櫓投げ', jsaCategory: 'Nageite', description: 'Inner thigh throw', rarity: 'legendary' }),
  K({ id: 'kakenage', name: 'Kakenage', nameJa: '掛け投げ', jsaCategory: 'Nageite', description: 'Hooking throw' }),
  K({ id: 'uwatedashinage', name: 'Uwatedashinage', nameJa: '上手出し投げ', jsaCategory: 'Nageite', description: 'Pulling overarm throw' }),
  K({ id: 'shitatedashinage', name: 'Shitatedashinage', nameJa: '下手出し投げ', jsaCategory: 'Nageite', description: 'Pulling underarm throw' }),
  K({ id: 'tsukaminage', name: 'Tsukaminage', nameJa: 'つかみ投げ', jsaCategory: 'Nageite', description: 'Grabbing throw', rarity: 'legendary' }),
  K({ id: 'ipponzeoi', name: 'Ipponzeoi', nameJa: '一本背負い', jsaCategory: 'Nageite', description: 'One-armed shoulder throw', rarity: 'legendary' }),

  // === Kakeite (Tripping/Leg Techniques - 18 moves) ===
  K({ id: 'uchigake', name: 'Uchigake', nameJa: '内掛け', jsaCategory: 'Kakeite', description: 'Inside leg trip' }),
  K({ id: 'sotogake', name: 'Sotogake', nameJa: '外掛け', jsaCategory: 'Kakeite', description: 'Outside leg trip' }),
  K({ id: 'chongake', name: 'Chongake', nameJa: 'ちょん掛け', jsaCategory: 'Kakeite', description: 'Hooking heel trip', rarity: 'rare' }),
  K({ id: 'kirikaeshi', name: 'Kirikaeshi', nameJa: '切り返し', jsaCategory: 'Kakeite', description: 'Twisting backward trip', rarity: 'rare' }),
  K({ id: 'kawazugake', name: 'Kawazugake', nameJa: '河津掛け', jsaCategory: 'Kakeite', description: 'Hooking backward trip', rarity: 'legendary' }),
  K({ id: 'kekaeshi', name: 'Kekaeshi', nameJa: '蹴返し', jsaCategory: 'Kakeite', description: 'Kicking back the leg', rarity: 'rare' }),
  K({ id: 'ketaguri', name: 'Ketaguri', nameJa: '蹴手繰り', jsaCategory: 'Kakeite', description: 'Ankle kick sweep', rarity: 'rare' }),
  K({ id: 'mitokorozeme', name: 'Mitokorozeme', nameJa: '三所攻め', jsaCategory: 'Kakeite', description: 'Triple-point attack', rarity: 'legendary' }),
  K({ id: 'watashikomi', name: 'Watashikomi', nameJa: '渡し込み', jsaCategory: 'Kakeite', description: 'Thigh-hook body drop', rarity: 'rare' }),
  K({ id: 'nimaigeri', name: 'Nimaigeri', nameJa: '二枚蹴り', jsaCategory: 'Kakeite', description: 'Ankle kick sweep', rarity: 'legendary' }),
  K({ id: 'komatasukui', name: 'Komatasukui', nameJa: '小股掬い', jsaCategory: 'Kakeite', description: 'Over-thigh scooping throw', rarity: 'rare' }),
  K({ id: 'sotokomata', name: 'Sotokomata', nameJa: '外小股', jsaCategory: 'Kakeite', description: 'Outside thigh-scooping throw', rarity: 'legendary' }),
  K({ id: 'omata', name: 'Omata', nameJa: '大股', jsaCategory: 'Kakeite', description: 'Thigh-scooping throw', rarity: 'rare' }),
  K({ id: 'tsumatori', name: 'Tsumatori', nameJa: '褄取り', jsaCategory: 'Kakeite', description: 'Rear toe pick', rarity: 'rare' }),
  K({ id: 'kozumatori', name: 'Kozumatori', nameJa: '小褄取り', jsaCategory: 'Kakeite', description: 'Ankle pick', rarity: 'rare' }),
  K({ id: 'ashitori', name: 'Ashitori', nameJa: '足取り', jsaCategory: 'Kakeite', description: 'Leg pick', rarity: 'rare' }),
  K({ id: 'susotori', name: 'Susotori', nameJa: '裾取り', jsaCategory: 'Kakeite', description: 'Ankle pick', rarity: 'rare' }),
  K({ id: 'susoharai', name: 'Susoharai', nameJa: '裾払い', jsaCategory: 'Kakeite', description: 'Ankle sweep', rarity: 'rare' }),

  // === Sorite (Backwards Body Drops - 6 moves) ===
  K({ id: 'izori', name: 'Izori', nameJa: '居反り', jsaCategory: 'Sorite', description: 'Backwards body drop', rarity: 'legendary' }),
  K({ id: 'shumokuzori', name: 'Shumokuzori', nameJa: '撞木反り', jsaCategory: 'Sorite', description: 'Bell-clapper back drop', rarity: 'legendary' }),
  K({ id: 'kakezori', name: 'Kakezori', nameJa: '掛け反り', jsaCategory: 'Sorite', description: 'Hooking back drop', rarity: 'legendary' }),
  K({ id: 'tasukizori', name: 'Tasukizori', nameJa: 'たすき反り', jsaCategory: 'Sorite', description: 'Kimono-string back drop', rarity: 'legendary' }),
  K({ id: 'sototasukizori', name: 'Sototasukizori', nameJa: '外たすき反り', jsaCategory: 'Sorite', description: 'Outer kimono-string back drop', rarity: 'legendary' }),
  K({ id: 'tsutaezori', name: 'Tsutaezori', nameJa: '伝え反り', jsaCategory: 'Sorite', description: 'Underarm back drop', rarity: 'legendary' }),

  // === Hinerite (Twisting Techniques - 19 moves) ===
  K({ id: 'tsukiotoshi', name: 'Tsukiotoshi', nameJa: '突き落とし', jsaCategory: 'Hinerite', description: 'Thrust down' }),
  K({ id: 'makiotoshi', name: 'Makiotoshi', nameJa: '巻き落とし', jsaCategory: 'Hinerite', description: 'Twisting pull down' }),
  K({ id: 'tottari', name: 'Tottari', nameJa: 'とったり', jsaCategory: 'Hinerite', description: 'Arm bar throw' }),
  K({ id: 'sakatottari', name: 'Sakatottari', nameJa: '逆取ったり', jsaCategory: 'Hinerite', description: 'Wrapped arm throw' }),
  K({ id: 'katasukashi', name: 'Katasukashi', nameJa: '肩すかし', jsaCategory: 'Hinerite', description: 'Under-shoulder swing down' }),
  K({ id: 'uwatehineri', name: 'Uwatehineri', nameJa: '上手捻り', jsaCategory: 'Hinerite', description: 'Overarm twisting throw', requiresBeltGrip: true }),
  K({ id: 'shitatehineri', name: 'Shitatehineri', nameJa: '下手捻り', jsaCategory: 'Hinerite', description: 'Underarm twisting throw', requiresBeltGrip: true }),
  K({ id: 'kotehineri', name: 'Kotehineri', nameJa: '小手捻り', jsaCategory: 'Hinerite', description: 'Armlock twisting throw' }),
  K({ id: 'amiuchi', name: 'Amiuchi', nameJa: '網打ち', jsaCategory: 'Hinerite', description: 'Fisherman\'s throw', rarity: 'rare' }),
  K({ id: 'kainahineri', name: 'Kainahineri', nameJa: '腕捻り', jsaCategory: 'Hinerite', description: 'Two-arm twisting throw' }),
  K({ id: 'gasshohineri', name: 'Gasshohineri', nameJa: '合掌捻り', jsaCategory: 'Hinerite', description: 'Clasped-hand twisting throw', rarity: 'rare' }),
  K({ id: 'tokkurinage', name: 'Tokkurinage', nameJa: '徳利投げ', jsaCategory: 'Hinerite', description: 'Two-hand head-twisting throw', rarity: 'rare' }),
  K({ id: 'kubihineri', name: 'Kubihineri', nameJa: '首捻り', jsaCategory: 'Hinerite', description: 'Neck-twisting throw', rarity: 'rare' }),
  K({ id: 'sotomuso', name: 'Sotomuso', nameJa: '外無双', jsaCategory: 'Hinerite', description: 'Outer thigh-propping twist' }),
  K({ id: 'uchimuso', name: 'Uchimuso', nameJa: '内無双', jsaCategory: 'Hinerite', description: 'Inner thigh-propping twist' }),
  K({ id: 'zunebari', name: 'Zunebari', nameJa: '頭捻り', jsaCategory: 'Hinerite', description: 'Head-propping twisting throw', rarity: 'rare' }),
  K({ id: 'sabaori', name: 'Sabaori', nameJa: '鯖折り', jsaCategory: 'Hinerite', description: 'Forward force down', requiresBeltGrip: true, rarity: 'rare' }),
  K({ id: 'harimanage', name: 'Harimanage', nameJa: '波離間投げ', jsaCategory: 'Hinerite', description: 'Backward belt throw', rarity: 'legendary' }),
  K({ id: 'dainigiri', name: 'Dainigiri', nameJa: '大逆手', jsaCategory: 'Hinerite', description: 'Overarm leg-trip throw', rarity: 'legendary' }),

  // === Tokushuwaza (Special Techniques - 14 moves) ===
  K({ id: 'hatakikomi', name: 'Hatakikomi', nameJa: '叩き込み', jsaCategory: 'Tokushuwaza', description: 'Slap down', kimariteClass: 'slap_pull' }),
  K({ id: 'hikiotoshi', name: 'Hikiotoshi', nameJa: '引き落とし', jsaCategory: 'Tokushuwaza', description: 'Hand pull down', kimariteClass: 'slap_pull' }),
  K({ id: 'hikkake', name: 'Hikkake', nameJa: '引っ掛け', jsaCategory: 'Tokushuwaza', description: 'Arm pull down', rarity: 'rare' }),
  K({ id: 'tsuridashi', name: 'Tsuridashi', nameJa: '吊り出し', jsaCategory: 'Tokushuwaza', description: 'Lift out', tacticalFamily: 'belt', requiresBeltGrip: true, kimariteClass: 'lift' }),
  K({ id: 'tsuriotoshi', name: 'Tsuriotoshi', nameJa: '吊り落とし', jsaCategory: 'Tokushuwaza', description: 'Lift-and-drop' }),
  K({ id: 'okuridashi', name: 'Okuridashi', nameJa: '送り出し', jsaCategory: 'Tokushuwaza', description: 'Rear push out', kimariteClass: 'rear' }),
  K({ id: 'okuritaoshi', name: 'Okuritaoshi', nameJa: '送り倒し', jsaCategory: 'Tokushuwaza', description: 'Rear push down', kimariteClass: 'rear' }),
  K({ id: 'okurinage', name: 'Okurinage', nameJa: '送り投げ', jsaCategory: 'Tokushuwaza', description: 'Rear throw', kimariteClass: 'rear' }),
  K({ id: 'okurigake', name: 'Okurigake', nameJa: '送り掛け', jsaCategory: 'Tokushuwaza', description: 'Rear leg trip', kimariteClass: 'rear' }),
  K({ id: 'okurihikiotoshi', name: 'Okurihikiotoshi', nameJa: '送り引き落とし', jsaCategory: 'Tokushuwaza', description: 'Rear pull down', kimariteClass: 'rear' }),
  K({ id: 'okuritsuridashi', name: 'Okuritsuridashi', nameJa: '送り吊り出し', jsaCategory: 'Tokushuwaza', description: 'Rear lift out', kimariteClass: 'rear' }),
  K({ id: 'okuritsuriotoshi', name: 'Okuritsuriotoshi', nameJa: '送り吊り落とし', jsaCategory: 'Tokushuwaza', description: 'Rear lift and drop', kimariteClass: 'rear' }),
  K({ id: 'sokubiotoshi', name: 'Sokubiotoshi', nameJa: '素首落とし', jsaCategory: 'Tokushuwaza', description: 'Neck-slap down', rarity: 'rare' }),
  K({ id: 'waridashi', name: 'Waridashi', nameJa: '割り出し', jsaCategory: 'Tokushuwaza', description: 'Upper-arm frontal push out', rarity: 'rare' }),

  // === Edge Reversals & Others (often grouped into Tokushuwaza or Hiwaza) ===
  K({ id: 'utchari', name: 'Utchari', nameJa: '打っ棄り', jsaCategory: 'Tokushuwaza', description: 'Pivot sweep throw', rarity: 'rare' }),
  K({ id: 'kimedashi', name: 'Kimedashi', nameJa: '極め出し', jsaCategory: 'Tokushuwaza', description: 'Arm-barring force out' }),
  K({ id: 'kimetaoshi', name: 'Kimetaoshi', nameJa: '極め倒し', jsaCategory: 'Tokushuwaza', description: 'Arm-barring force down' }),
  K({ id: 'yobimodoshi', name: 'Yobimodoshi', nameJa: '呼び戻し', jsaCategory: 'Tokushuwaza', description: 'Pulling body slam', rarity: 'legendary' }),
  K({ id: 'ushiromotare', name: 'Ushiromotare', nameJa: '後ろもたれ', jsaCategory: 'Tokushuwaza', description: 'Backward leaning out', rarity: 'legendary' }),

  // === Hiwaza (Non-Winning Techniques - 5 moves) ===
  K({ id: 'isamiashi', name: 'Isamiashi', nameJa: '勇み足', jsaCategory: 'Hiwaza', description: 'Inadvertent step out' }),
  K({ id: 'koshikudake', name: 'Koshikudake', nameJa: '腰砕け', jsaCategory: 'Hiwaza', description: 'Collapsing' }),
  K({ id: 'tsukite', name: 'Tsukite', nameJa: 'つき手', jsaCategory: 'Hiwaza', description: 'Hand touch down' }),
  K({ id: 'tsukihiza', name: 'Tsukihiza', nameJa: 'つきひざ', jsaCategory: 'Hiwaza', description: 'Knee touch down' }),
  K({ id: 'fumidashi', name: 'Fumidashi', nameJa: '踏み出し', jsaCategory: 'Hiwaza', description: 'Stepping out' }),

  // === Forfeits & Extras (Engine internal) ===
  { id: 'fusensho', name: 'Fusensho', nameJa: '不戦勝', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, description: 'Win by default', kimariteClass: 'forfeit' },
  { id: 'hansoku', name: 'Hansoku', nameJa: '反則', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, description: 'Win by disqualification', kimariteClass: 'forfeit' },
];

// --- Lookup helpers ---

/** Get kimarite by ID */
export function getKimarite(id: string): (Kimarite & { kimariteClass?: KimariteClass }) | undefined {
  return KIMARITE_ALL.find(k => k.id === id);
}

/** Get kimarite by JSA category */
export function getKimariteByJsaCategory(category: JsaCategory): Kimarite[] {
  return KIMARITE_ALL.filter(k => k.jsaCategory === category);
}

/** Get kimarite by legacy KimariteClass */
export function getKimariteByClass(kimariteClass: KimariteClass): (Kimarite & { kimariteClass?: KimariteClass })[] {
  return KIMARITE_ALL.filter(k => k.kimariteClass === kimariteClass);
}

/** Get kimarite count (official 82) */
export function getKimariteCount(): number {
  return KIMARITE_ALL.filter(k => k.id !== 'fusensho' && k.id !== 'hansoku').length;
}

/** Get kimarite for tactical family */
export function getKimariteForFamily(family: TacticalFamily): Kimarite[] {
  return KIMARITE_ALL.filter(k => k.tacticalFamily === family);
}
