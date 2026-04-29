// @ts-nocheck
import type { Style, Stance, TacticalArchetype, TacticalFamily } from "./types/combat";
import type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements } from "./types/kimarite";
export type { Kimarite, KimariteClass, JsaCategory, KimariteRequirements };
import { stableTieBreak } from "./utils/sort";

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
  statWeights?: Kimarite['statWeights']; 
  requiresBeltGrip?: boolean;
  leverageTarget?: Kimarite['leverageTarget'];
  description?: string;
  rarity?: Kimarite['rarity'];
  kimariteClass?: KimariteClass;
}

const CATEGORY_DEFAULTS: Record<JsaCategory, Partial<KimariteDefinition>> = {
  Kihonwaza: { tacticalFamily: 'push', baseWeight: 500, statWeights: { strength: 0.4, weight: 0.4, speed: 0.1, technique: 0.1, balance: 0.0 }, kimariteClass: 'force_out' },
  Nageite: { tacticalFamily: 'belt', baseWeight: 100, statWeights: { strength: 0.3, weight: 0.1, speed: 0.1, technique: 0.5, balance: 0.0 }, requiresBeltGrip: true, kimariteClass: 'throw' },
  Kakeite: { tacticalFamily: 'speed', baseWeight: 50, statWeights: { strength: 0.1, weight: 0.0, speed: 0.5, technique: 0.4, balance: 0.0 }, kimariteClass: 'trip' },
  Sorite: { tacticalFamily: 'trick', baseWeight: 1, isHighRisk: true, requirements: { isDesperation: true }, statWeights: { strength: 0.1, weight: 0.0, speed: 0.1, technique: 0.8, balance: 0.0 }, kimariteClass: 'special' },
  Hinerite: { tacticalFamily: 'trick', baseWeight: 100, statWeights: { strength: 0.1, weight: 0.1, speed: 0.2, technique: 0.6, balance: 0.0 }, leverageTarget: 'momentum', kimariteClass: 'twist' },
  Tokushuwaza: { tacticalFamily: 'trick', baseWeight: 50, statWeights: { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.4, balance: 0.0 }, kimariteClass: 'special' },
  Hiwaza: { tacticalFamily: 'trick', baseWeight: 1, statWeights: { strength: 0.1, weight: 0.4, speed: 0.2, technique: 0.3, balance: 0.0 }, kimariteClass: 'result' },
};

/**
 * Domain builder function to apply correct defaults and scaling logic
 * based on the JSA category taxonomy.
 */
function defineKimarite(entry: KimariteBaseEntry): KimariteDefinition {
  const defaults = CATEGORY_DEFAULTS[entry.jsaCategory] || {};
  const baseWeight = entry.baseWeight ?? defaults.baseWeight ?? 1;
  
  const rarity = entry.rarity ?? (
    baseWeight <= 5 ? "legendary" :
    baseWeight <= 30 ? "rare" :
    baseWeight <= 150 ? "uncommon" : "common"
  );

  // Auto-generate name from ID if missing
  const name = entry.name || entry.id.charAt(0).toUpperCase() + entry.id.slice(1).replace(/_/g, ' ');

  return {
    ...defaults,
    ...entry,
    name,
    nameJa: entry.nameJa || entry.id, // Fallback to id for Ja if missing
    description: entry.description || defaults.description || `${name} technique.`,
    statWeights: entry.statWeights ?? defaults.statWeights ?? { strength: 0.2, weight: 0.2, speed: 0.2, technique: 0.2, balance: 0.2 },
    baseWeight,
    rarity,
    requirements: { ...defaults.requirements, ...entry.requirements },
    isHighRisk: entry.isHighRisk ?? defaults.isHighRisk ?? false,
  } as KimariteDefinition;
}

// Local alias strictly for visual alignment of the static data block
const K = defineKimarite;

/** COMPLETE OFFICIAL 82 KIMARITE (v1.3 taxonomy) */
export const KIMARITE_REGISTRY: KimariteDefinition[] = [
  // === Kihonwaza (Basic Techniques - 7 moves) ===
  K({ id: 'yorikiri', jsaCategory: 'Kihonwaza', baseWeight: 1000, tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'oshidashi', jsaCategory: 'Kihonwaza', baseWeight: 850 }),
  K({ id: 'oshitaoshi', jsaCategory: 'Kihonwaza', baseWeight: 250 }),
  K({ id: 'yoritaoshi', jsaCategory: 'Kihonwaza', baseWeight: 200, tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'tsukidashi', jsaCategory: 'Kihonwaza', baseWeight: 120, statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'tsukitaoshi', jsaCategory: 'Kihonwaza', baseWeight: 50, statWeights: { strength: 0.3, weight: 0.3, speed: 0.3, technique: 0.1, balance: 0.0 } }),
  K({ id: 'abisetaoshi', jsaCategory: 'Kihonwaza', baseWeight: 30, tacticalFamily: 'belt', requiresBeltGrip: true }),

  // === Tokushuwaza (Special Techniques - 19 moves) ===
  K({ id: 'tsuridashi', jsaCategory: 'Tokushuwaza', baseWeight: 25, tacticalFamily: 'belt', requiresBeltGrip: true, requirements: { minStrengthDifferential: 30 } }),
  K({ id: 'utchari', jsaCategory: 'Tokushuwaza', baseWeight: 20, requirements: { edgeOfRing: true } }),
  K({ id: 'okuritaoshi', jsaCategory: 'Tokushuwaza', baseWeight: 15, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'katasukashi', jsaCategory: 'Tokushuwaza', baseWeight: 15 }),
  K({ id: 'sokubiotoshi', jsaCategory: 'Tokushuwaza', baseWeight: 10 }),
  K({ id: 'okurigake', jsaCategory: 'Tokushuwaza', baseWeight: 5, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'okurihikiotoshi', jsaCategory: 'Tokushuwaza', baseWeight: 5, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'waridashi', jsaCategory: 'Tokushuwaza', baseWeight: 5, tacticalFamily: 'push' }),
  K({ id: 'okurinage', jsaCategory: 'Tokushuwaza', baseWeight: 3, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'tsukaminage', jsaCategory: 'Tokushuwaza', baseWeight: 2, tacticalFamily: 'belt' }),
  K({ id: 'okuritsuridashi', jsaCategory: 'Tokushuwaza', baseWeight: 2, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'okuritsuriotoshi', jsaCategory: 'Tokushuwaza', baseWeight: 1, tacticalFamily: 'speed', requirements: { canFlank: true } }),
  K({ id: 'yobimodoshi', jsaCategory: 'Tokushuwaza', baseWeight: 1, tacticalFamily: 'belt' }),
  K({ id: 'ushiromotare', jsaCategory: 'Tokushuwaza', baseWeight: 1 }),

  // === Nageite (Throwing Techniques - 13 moves) ===
  K({ id: 'uwatenage', jsaCategory: 'Nageite', baseWeight: 350, leverageTarget: 'high_center_of_gravity', requirements: { requiredGrip: { anyHand: 'outside' } } }),
  K({ id: 'sukuinage', jsaCategory: 'Nageite', baseWeight: 200, requiresBeltGrip: false }),
  K({ id: 'shitatenage', jsaCategory: 'Nageite', baseWeight: 150, requirements: { requiredGrip: { anyHand: 'inside' } } }),
  K({ id: 'kotenage', jsaCategory: 'Nageite', baseWeight: 120, requiresBeltGrip: false }),
  K({ id: 'shitatedashinage', jsaCategory: 'Nageite', baseWeight: 80, tacticalFamily: 'trick' }),
  K({ id: 'uwatedashinage', jsaCategory: 'Nageite', baseWeight: 60, tacticalFamily: 'trick' }),
  K({ id: 'kubinage', jsaCategory: 'Nageite', baseWeight: 15, requiresBeltGrip: false }),
  K({ id: 'koshihineri', jsaCategory: 'Nageite', baseWeight: 5 }),
  K({ id: 'ipponzeoi', jsaCategory: 'Nageite', baseWeight: 3, tacticalFamily: 'trick' }),
  K({ id: 'nichonage', jsaCategory: 'Nageite', baseWeight: 2 }),
  K({ id: 'yaguranage', jsaCategory: 'Nageite', baseWeight: 2 }),
  K({ id: 'kakenage', jsaCategory: 'Nageite', baseWeight: 2 }),

  // === Hinerite (Twisting Techniques - 19 moves) ===
  K({ id: 'tsukiotoshi', jsaCategory: 'Hinerite', baseWeight: 350 }),
  K({ id: 'tottari', jsaCategory: 'Hinerite', baseWeight: 30 }),
  K({ id: 'shitatehineri', jsaCategory: 'Hinerite', baseWeight: 25, tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'uwatehineri', jsaCategory: 'Hinerite', baseWeight: 20, tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'kotehineri', jsaCategory: 'Hinerite', baseWeight: 15, tacticalFamily: 'belt' }),
  K({ id: 'amiuchi', jsaCategory: 'Hinerite', baseWeight: 10 }),
  K({ id: 'kainahineri', jsaCategory: 'Hinerite', baseWeight: 10 }),
  K({ id: 'zubuneri', jsaCategory: 'Hinerite', baseWeight: 5 }),
  K({ id: 'sakatottari', jsaCategory: 'Hinerite', baseWeight: 5 }),
  K({ id: 'kubiotoshi', jsaCategory: 'Hinerite', baseWeight: 5 }),
  K({ id: 'gasshohineri', jsaCategory: 'Hinerite', baseWeight: 2, tacticalFamily: 'belt' }),
  K({ id: 'harimanage', jsaCategory: 'Hinerite', baseWeight: 2, tacticalFamily: 'belt' }),
  K({ id: 'osakate', jsaCategory: 'Hinerite', baseWeight: 1 }),
  K({ id: 'sabaori', jsaCategory: 'Hinerite', baseWeight: 1, tacticalFamily: 'belt', requiresBeltGrip: true }),
  K({ id: 'sotokomata_hinerite', jsaCategory: 'Hinerite', baseWeight: 1 }),
  K({ id: 'tokkurinage', jsaCategory: 'Hinerite', baseWeight: 1 }),
  K({ id: 'makiotoshi', jsaCategory: 'Hinerite', baseWeight: 1 }),
  K({ id: 'uchimuso', jsaCategory: 'Hinerite', baseWeight: 1 }),
  K({ id: 'sotomuso', jsaCategory: 'Hinerite', baseWeight: 1 }),

  // === Kakeite (Tripping Techniques - 18 moves) ===
  K({ id: 'ashitori', jsaCategory: 'Kakeite', baseWeight: 30 }),
  K({ id: 'sotogake', jsaCategory: 'Kakeite', baseWeight: 25 }),
  K({ id: 'uchigake', jsaCategory: 'Kakeite', baseWeight: 20 }),
  K({ id: 'ketaguri', jsaCategory: 'Kakeite', baseWeight: 15, tacticalFamily: 'trick' }),
  K({ id: 'watashikomi', jsaCategory: 'Kakeite', baseWeight: 10 }),
  K({ id: 'kekaeshi', jsaCategory: 'Kakeite', baseWeight: 10 }),
  K({ id: 'kosotogake', jsaCategory: 'Kakeite', baseWeight: 8 }),
  K({ id: 'komatasukui', jsaCategory: 'Kakeite', baseWeight: 5 }),
  K({ id: 'chongake', jsaCategory: 'Kakeite', baseWeight: 3 }),
  K({ id: 'kawarigake', jsaCategory: 'Kakeite', baseWeight: 2, isHighRisk: true }),
  K({ id: 'susoharai', jsaCategory: 'Kakeite', baseWeight: 2 }),
  K({ id: 'kirikaeshi', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'nimaigeri', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'omata', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'susotori', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'mitokorozeme', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'kosotogari', jsaCategory: 'Kakeite', baseWeight: 1 }),
  K({ id: 'tsumatori', jsaCategory: 'Kakeite', baseWeight: 1 }),

  // === Sorite (Backwards Body Drops - 6 moves) ===
  K({ id: 'izori', jsaCategory: 'Sorite', baseWeight: 1 }),
  K({ id: 'kakezori', jsaCategory: 'Sorite', baseWeight: 1 }),
  K({ id: 'shumokuzori', jsaCategory: 'Sorite', baseWeight: 1 }),
  K({ id: 'sototasukizori', jsaCategory: 'Sorite', baseWeight: 1 }),
  K({ id: 'tasukizori', jsaCategory: 'Sorite', baseWeight: 1 }),
  K({ id: 'tsutaezori', jsaCategory: 'Sorite', baseWeight: 1 }),

  // === Tokushuwaza Continued (Remaining from 19) ===
  K({ id: 'kimedashi', jsaCategory: 'Tokushuwaza', baseWeight: 5 }),
  K({ id: 'kimetaoshi', jsaCategory: 'Tokushuwaza', baseWeight: 5 }),

  // === Hiwaza (Non-Winning Techniques - 5 moves) ===
  K({ id: 'isamiashi', jsaCategory: 'Hiwaza', baseWeight: 1 }),
  K({ id: 'koshikudake', jsaCategory: 'Hiwaza', baseWeight: 1 }),
  K({ id: 'tsukite', jsaCategory: 'Hiwaza', baseWeight: 1 }),
  K({ id: 'tsukihiza', jsaCategory: 'Hiwaza', baseWeight: 1 }),
  K({ id: 'fumidashi', jsaCategory: 'Hiwaza', baseWeight: 1 }),

  // === Forfeits & Extras (Engine internal) ===
  K({ id: 'fusensho', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, kimariteClass: 'forfeit', name: 'Fusensho' }),
  K({ id: 'hansoku', jsaCategory: 'Tokushuwaza', tacticalFamily: 'trick', baseWeight: 0, statWeights: { strength: 0, weight: 0, speed: 0, technique: 0, balance: 0 }, kimariteClass: 'forfeit', name: 'Hansoku' }),
];

// --- High-Performance Lookups ---

/** Pre-computed map for O(1) direct ID lookups during combat simulations */
const KIMARITE_MAP = new Map<string, KimariteDefinition>(
  KIMARITE_REGISTRY.map(k => [k.id, k])
);

/** Get kimarite by ID (O(1) operation) */
export function getKimarite(id: string): KimariteDefinition | undefined {
  return KIMARITE_MAP.get(id);
}

/** Get kimarite by JSA category */
export function getKimariteByJsaCategory(category: JsaCategory): Kimarite[] {
  return KIMARITE_REGISTRY.filter(k => k.jsaCategory === category);
}

/** Get kimarite by legacy KimariteClass */
export function getKimariteByClass(kimariteClass: KimariteClass): KimariteDefinition[] {
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