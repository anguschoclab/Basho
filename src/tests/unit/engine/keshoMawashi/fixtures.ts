/**
 * Test fixtures for kesho-mawashi system
 */

import type { KeshoMawashi, YokozunaTsuna, HeyaBrandIdentity } from "@/engine/types/keshoMawashi";
import type { MovementEvent } from "@/engine/types/banzuke";

export const sampleKeshoJuryo: KeshoMawashi = {
  id: "kesho-1",
  rikishiId: "rikishi-1",
  heyaBrandId: "brand-heya-1",
  createdAt: { year: 2025, basho: "hatsu" },
  tier: "juryo",
  origin: "traditional",
  basePattern: "striped",
  primaryColor: "#1a365d",
  secondaryColor: "#2c5282",
  accentColor: "#d69e2e",
  goldThreadDensity: 0.3,
  borderStyle: "simple",
  embroideryStyle: "satin",
  mainSymbol: {
    type: "motif",
    value: "dragon",
    position: "center",
    size: "large",
    prominence: 0.8,
  },
  description: "An elegant ceremonial apron for a rising sekitori",
};

export const sampleKeshoMakuuchi: KeshoMawashi = {
  id: "kesho-2",
  rikishiId: "rikishi-2",
  heyaBrandId: "brand-heya-2",
  createdAt: { year: 2025, basho: "hatsu" },
  tier: "makuuchi",
  origin: "corporate",
  basePattern: "gradient",
  primaryColor: "#2d3748",
  secondaryColor: "#4a5568",
  accentColor: "#ecc94b",
  goldThreadDensity: 0.5,
  borderStyle: "simple",
  embroideryStyle: "satin",
  mainSymbol: {
    type: "corporate_logo",
    value: "Nippon Kaiun",
    position: "center",
    size: "large",
    prominence: 0.7,
  },
  secondarySymbol: {
    type: "heya_crest",
    value: "rising_sun",
    position: "left",
    size: "medium",
    prominence: 0.5,
  },
  sponsorInfo: {
    name: "Nippon Kaiun",
    industry: "shipping",
    logoStyle: "emblem",
  },
  description: "A prestigious mawashi featuring corporate sponsorship",
};

export const sampleKeshoSanyaku: KeshoMawashi = {
  id: "kesho-3",
  rikishiId: "rikishi-3",
  heyaBrandId: "brand-heya-3",
  createdAt: { year: 2025, basho: "natsu" },
  tier: "sanyaku",
  origin: "traditional",
  basePattern: "cloud",
  primaryColor: "#742a2a",
  secondaryColor: "#9b2c2c",
  accentColor: "#f6ad55",
  goldThreadDensity: 0.7,
  borderStyle: "simple",
  embroideryStyle: "satin",
  mainSymbol: {
    type: "motif",
    value: "phoenix",
    position: "center",
    size: "large",
    prominence: 0.9,
  },
  secondarySymbol: {
    type: "motif",
    value: "sakura",
    position: "scattered",
    size: "small",
    prominence: 0.4,
  },
  tertiarySymbol: {
    type: "motif",
    value: "waves",
    position: "lower",
    size: "small",
    prominence: 0.3,
  },
  description: "An ornate ceremonial garment worthy of sanyaku rank",
};

export const sampleKeshoYokozuna: KeshoMawashi = {
  id: "kesho-4",
  rikishiId: "rikishi-4",
  heyaBrandId: "brand-heya-4",
  createdAt: { year: 2025, basho: "nagoya" },
  tier: "yokozuna",
  origin: "heya_legacy",
  basePattern: "ray",
  primaryColor: "#1a365d",
  secondaryColor: "#2c5282",
  accentColor: "#FFD700",
  goldThreadDensity: 0.95,
  borderStyle: "simple",
  embroideryStyle: "satin",
  mainSymbol: {
    type: "heya_crest",
    value: "rising_sun",
    position: "center",
    size: "large",
    prominence: 1.0,
  },
  secondarySymbol: {
    type: "motif",
    value: "dragon",
    position: "scattered",
    size: "medium",
    prominence: 0.5,
  },
  description: "A magnificent golden-threaded masterpiece fit for a grand champion",
};

export const sampleYokozunaTsuna: YokozunaTsuna = {
  rikishiId: "rikishi-4",
  conferredAt: { year: 2025, basho: "nagoya" },
  style: "traditional",
  ropeColor: "gold_accented",
  paperTassels: 5,
  displayedOnProfile: true,
  isRetired: false,
};

export const sampleHeyaBrand: HeyaBrandIdentity = {
  id: "brand-heya-1",
  heyaId: "heya-1",
  primaryColor: "#1a365d",
  secondaryColor: "#2c5282",
  accentColor: "#d69e2e",
  crestMotif: "dragon",
  crestStyle: "circular",
  traditionLevel: 0.8,
  createdAt: { year: 2024, basho: "hatsu" },
};

export const samplePromotionJuryo: MovementEvent = {
  kind: "promotion",
  rikishiId: "rikishi-1",
  from: "makushita-1-east",
  to: "juryo-14-east",
  description: "Promoted from Makushita to Juryo",
};

export const samplePromotionMakuuchi: MovementEvent = {
  kind: "promotion",
  rikishiId: "rikishi-2",
  from: "juryo-1-east",
  to: "maegashira-15-east",
  description: "Promoted from Juryo to Makuuchi",
};

export const samplePromotionSanyaku: MovementEvent = {
  kind: "promotion",
  rikishiId: "rikishi-3",
  from: "maegashira-5-east",
  to: "sekiwake-1-east",
  description: "Promoted to Sanyaku",
};

export const samplePromotionYokozuna: MovementEvent = {
  kind: "promotion",
  rikishiId: "rikishi-4",
  from: "ozeki-1-east",
  to: "yokozuna-1-east",
  description: "Promoted to Yokozuna",
};

export const sampleDemotion: MovementEvent = {
  kind: "demotion",
  rikishiId: "rikishi-1",
  from: "juryo-14-east",
  to: "makushita-1-east",
  description: "Demoted from Juryo to Makushita",
};
