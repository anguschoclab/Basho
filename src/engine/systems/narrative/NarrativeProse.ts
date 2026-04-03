/**
 * src/engine/systems/narrative/NarrativeProse.ts
 * ==============================================
 * Localized labels and flavor text for Sumo Manager Pro.
 * 
 * Translates qualitative bands (StatBand, FatigueBand, etc.) 
 * into localized strings and verbose narrative segments.
 * 
 * Goal: Immersive, professional-grade storytelling.
 */

import type { RikishiArchetype } from "../../types/combat";
import type {
  StatBand,
  FatigueBand,
  MomentumBand,
  RivalryHeatBand,
  PotentialBand,
  ScandalBand,
  PrizeBand,
  TraitBand
} from "./NarrativeBands";

// === Attribute Labels (Short) ===
export const STAT_LABELS: Record<StatBand, string> = {
  exceptional: "Exceptional",
  outstanding: "Outstanding",
  strong: "Strong",
  capable: "Capable",
  developing: "Developing",
  limited: "Limited",
  struggling: "Struggling",
};

// === Attribute Prose (Verbose) ===
export const STAT_PROSE: Record<string, Record<StatBand, string>> = {
  power: {
    exceptional: "His raw strength is fearsome—opponents buckle on contact.",
    outstanding: "A powerful frame that most cannot withstand.",
    strong: "Solid strength, enough to move most men.",
    capable: "Adequate power for his level.",
    developing: "Still building the muscle needed at this rank.",
    limited: "Lacks the power expected of a rikishi.",
    struggling: "Physically overmatched in most contests."
  },
  speed: {
    exceptional: "Lightning quick—his reactions are almost preternatural.",
    outstanding: "Fast enough to catch opponents off-guard routinely.",
    strong: "Quick on his feet, able to exploit openings.",
    capable: "Moves well enough for his style.",
    developing: "Could be quicker; timing still maturing.",
    limited: "Sluggish compared to peers.",
    struggling: "Slow to react, often caught out."
  },
  balance: {
    exceptional: "His root is legendary—impossible to shift.",
    outstanding: "Exceptionally stable; rarely loses footing.",
    strong: "Well-grounded, recovers well from pressure.",
    capable: "Adequate balance for competitive sumo.",
    developing: "Sometimes caught leaning; balance needs work.",
    limited: "Unsteady; vulnerable to throws.",
    struggling: "Falls too easily—fundamentals lacking."
  },
  technique: {
    exceptional: "A master technician—every move is precise.",
    outstanding: "Highly skilled; knows exactly what to do.",
    strong: "Good technical foundation.",
    capable: "Sound basics, can execute his preferred moves.",
    developing: "Technique improving but inconsistent.",
    limited: "Relies on physicality over skill.",
    struggling: "Lacks the craft to compete effectively."
  }
};

// === Fatigue Labels & Prose ===
export const FATIGUE_LABELS: Record<FatigueBand, string> = {
  fresh: "Fresh",
  light: "Lightly Worn",
  tired: "Tired",
  exhausted: "Exhausted",
  spent: "Spent",
};

// === Momentum Labels & Prose ===
export const MOMENTUM_LABELS: Record<MomentumBand, string> = {
  on_fire: "On Fire",
  rising: "Rising",
  steady: "Steady",
  struggling: "Struggling",
  in_crisis: "In Crisis",
};

// === Potential Labels & Prose ===
export const POTENTIAL_LABELS: Record<PotentialBand, { label: string; description: string }> = {
  generational: { label: "Generational Talent", description: "A once-in-a-decade prospect with limitless ceiling." },
  star:         { label: "Star Potential",       description: "Could reach the very top with proper development." },
  solid:        { label: "Solid Prospect",       description: "Reliable growth trajectory with a respectable ceiling." },
  average:      { label: "Average Ceiling",      description: "Moderate potential — hard work can compensate." },
  limited:      { label: "Limited Upside",        description: "Growth ceiling is low, but grit may surprise." },
  unknown:      { label: "Uncharted",             description: "Potential has not yet been assessed." },
};

// === Rivalry Heat Labels ===
export const RIVALRY_HEAT_LABELS: Record<RivalryHeatBand, string> = {
  dormant: "Dormant",
  simmering: "Simmering",
  heated: "Heated",
  fierce: "Fierce",
  legendary: "Legendary",
};

// === Scandal Labels ===
export const SCANDAL_LABELS: Record<ScandalBand, string> = {
  clean: "Clean",
  whispers: "Whispers",
  scrutiny: "Under Scrutiny",
  scandal: "Scandal",
  crisis: "Crisis",
};

// === Prize Labels ===
export const PRIZE_LABELS: Record<PrizeBand, string> = {
  nominal: "Nominal",
  modest: "Modest",
  notable: "Notable",
  prestigious: "Prestigious",
  grand: "Grand",
};

// === Trait Labels ===
export const TRAIT_LABELS: Record<TraitBand, string> = {
  negligible: "Negligible",
  minor: "Minor",
  moderate: "Moderate",
  strong: "Strong",
  dominant: "Dominant",
};

// === Archetype Labels ===
export const ARCHETYPE_LABELS: Record<RikishiArchetype, { label: string; description: string }> = {
  Defensive_Stalwart: { 
    label: "Defensive Stalwart", 
    description: "A technical specialist who prioritizes stability and reactive counters." 
  },
  Explosive_Blitzer: { 
    label: "Explosive Blitzer", 
    description: "Relies on a massive initial charge to end matches instantly, but tires quickly." 
  },
  Acrobatic_Trickster: { 
    label: "Acrobatic Trickster", 
    description: "Uses superior movement and technique to outmaneuver heavier opponents." 
  },
  Immovable_Mountain: { 
    label: "Immovable Mountain", 
    description: "A massive, powerful presence who is near-impossible to push out once established." 
  },
  All_Rounder: { 
    label: "All-Rounder", 
    description: "A balanced fighter with no glaring weaknesses and high adaptability." 
  },
};
