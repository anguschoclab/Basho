/**
 * infrastructure.ts
 * =================
 * Defines the types and registry for discrete stable buildings.
 * (Phase P: Stable Town & Infrastructure)
 */

export type FacilityId =
  | "weights_room" // Buffs Strength growth & Butsukari drill
  | "medical_suite" // Reduces injury duration & severity
  | "media_studio" // Buffs Media Heat & Reputation gains
  | "traditional_kitchen" // Buffs Stamina & reduces Fatigue floor
  | "video_lab" // Buffs Technique & Adaptability
  | "academy_mongolia" // Regional Academy (Requires Presence > 80)
  | "academy_georgia"
  | "academy_europe"
  | "academy_americas"
  | "scouting_office";

export type ConstructionStatus = "active" | "under_construction" | "remodelling";

export interface InfrastructureState {
  level: number;
  status: ConstructionStatus;
  completionYear?: number;
  completionBasho?: string;
}

export interface FacilityDefinition {
  id: FacilityId;
  label: string;
  description: string;
  baseCost: number; // Cost for Level 1
  buildTimeBasho: number; // Number of basho to complete
  maintenanceCost: number; // Monthly cost
  bonuses: {
    statBuffs?: Record<string, number>; // Multipliers (e.g. 1.1)
    fatigueFloor?: number;
    injuryHealMod?: number; // Additive (e.g. -2 days)
    mediaMod?: number; // Multiplier
  };
  requirements?: {
    regionalPresence?: Record<string, number>; // Region -> Min Presence
  };
}

export const FACILITY_REGISTRY: Record<FacilityId, FacilityDefinition> = {
  weights_room: {
    id: "weights_room",
    label: "Weights & Power Room",
    description:
      "Modern resistance equipment to maximize pure strength and explosive charging power.",
    baseCost: 15_000_000,
    buildTimeBasho: 1,
    maintenanceCost: 450_000,
    bonuses: {
      statBuffs: { strength: 1.15, stamina: 1.05 },
    },
  },
  medical_suite: {
    id: "medical_suite",
    label: "Integrated Medical Suite",
    description: "On-site physiotherapy and advanced diagnostic tools for rapid injury recovery.",
    baseCost: 25_000_000,
    buildTimeBasho: 2,
    maintenanceCost: 800_000,
    bonuses: {
      injuryHealMod: -3, // -3 days per level
    },
  },
  media_studio: {
    id: "media_studio",
    label: "Digital Media Hub",
    description:
      "Pro-audio/visual equipment for recording training clips and managing public relations.",
    baseCost: 5_000_000,
    buildTimeBasho: 1,
    maintenanceCost: 150_000,
    bonuses: {
      mediaMod: 1.25, // +25% rep/heat gains
    },
  },
  traditional_kitchen: {
    id: "traditional_kitchen",
    label: "Chanko-ba Professional Kitchen",
    description: "Optimized nutrition and high-calorie catering for elite mass management.",
    baseCost: 8_000_000,
    buildTimeBasho: 1,
    maintenanceCost: 350_000,
    bonuses: {
      statBuffs: { weight: 1.1, stamina: 1.2 },
      fatigueFloor: 5, // Minimum fatigue floor reduced by 5
    },
  },
  video_lab: {
    id: "video_lab",
    label: "Tactical Video Lab",
    description: "Slow-motion analysis gear to break down technique and memorize enemy styles.",
    baseCost: 12_000_000,
    buildTimeBasho: 1,
    maintenanceCost: 250_000,
    bonuses: {
      statBuffs: { technique: 1.15, adaptability: 1.2 },
    },
  },
  scouting_office: {
    id: "scouting_office",
    label: "Global Scouting Hub",
    description:
      "A specialized office for tracking international talent pipelines and managing scout networks.",
    baseCost: 18_000_000,
    buildTimeBasho: 2,
    maintenanceCost: 500_000,
    bonuses: {
      mediaMod: 1.1, // Minor cross-over bonus for networking
    },
  },
  academy_mongolia: {
    id: "academy_mongolia",
    label: "Ulaanbaatar High-Performance Academy",
    description:
      "A premier facility specializing in grip-fighting and explosive oshi-sumo techniques.",
    baseCost: 50_000_000,
    buildTimeBasho: 3,
    maintenanceCost: 2_000_000,
    requirements: { regionalPresence: { Mongolia: 80 } },
    bonuses: { statBuffs: { strength: 1.1, technique: 1.1 } },
  },
  academy_georgia: {
    id: "academy_georgia",
    label: "Caucasus Strength Center",
    description: "Focuses on raw lifting power and back-breaking endurance training.",
    baseCost: 45_000_000,
    buildTimeBasho: 3,
    maintenanceCost: 1_800_000,
    requirements: { regionalPresence: { Georgia: 80 } },
    bonuses: { statBuffs: { strength: 1.2 } },
  },
  academy_europe: {
    id: "academy_europe",
    label: "Euro-Continental Dojo",
    description: "Emphasizes technical grappling and anatomical efficiency.",
    baseCost: 40_000_000,
    buildTimeBasho: 2,
    maintenanceCost: 1_500_000,
    requirements: { regionalPresence: { Europe: 80 } },
    bonuses: { statBuffs: { technique: 1.2 } },
  },
  academy_americas: {
    id: "academy_americas",
    label: "Pan-American Athletic Hub",
    description: "Advanced nutrition and conditioning for extreme size and stamina.",
    baseCost: 40_000_000,
    buildTimeBasho: 2,
    maintenanceCost: 1_500_000,
    requirements: { regionalPresence: { Americas: 80 } },
    bonuses: { statBuffs: { weight: 1.1, stamina: 1.1 } },
  },
};
