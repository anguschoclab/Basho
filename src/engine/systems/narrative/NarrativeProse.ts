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
    exceptional: "His raw strength is fearsome — opponents buckle on first contact as if struck by a wall.",
    outstanding: "A powerful frame that most men at this level simply cannot withstand for long.",
    strong: "Solid, reliable strength. Enough to move most men and punish passive opponents.",
    capable: "Adequate power for his rank. Won't overwhelm anyone, but holds his own in the clinch.",
    developing: "Still building the muscle and leverage his rank demands. Improvement is visible.",
    limited: "Noticeably outpowered by most opponents. Relies on technique to compensate.",
    struggling: "Physically overmatched in most contests. Raw strength is a liability at this level."
  },
  speed: {
    exceptional: "Lightning quick — his first step and reaction time verge on the preternatural.",
    outstanding: "Fast enough to regularly catch opponents flat-footed before they can set their feet.",
    strong: "Quick on his feet, able to exploit openings that slower men would miss entirely.",
    capable: "Moves adequately for his style. Not a liability, not a weapon.",
    developing: "Could be quicker. Timing is still maturing and opportunities are occasionally left on the clay.",
    limited: "Sluggish compared to peers. Opponents dictate the pace and he struggles to adjust.",
    struggling: "Slow to react and easy to outmaneuver. Speed is a consistent weakness at this level."
  },
  balance: {
    exceptional: "His root is the stuff of legend — opponents describe pushing him as shoving a mountain.",
    outstanding: "Exceptionally stable under pressure. Rarely loses footing even in desperate scrambles.",
    strong: "Well-grounded and composed. Recovers well from disadvantaged positions.",
    capable: "Adequate balance for competitive sumo. Holds steady in most situations.",
    developing: "Sometimes caught leaning or off-angle. Balance is a work in progress.",
    limited: "Unsteady under sustained pressure. Vulnerable to throws and shifts.",
    struggling: "Falls too easily. Fundamental stability issues limit what he can attempt."
  },
  technique: {
    exceptional: "A master technician. Every grip, every angle, every timing read is deliberate and precise.",
    outstanding: "Highly skilled. Reads situations quickly and executes with the clarity of a veteran.",
    strong: "A good technical foundation with reliable execution of his preferred techniques.",
    capable: "Sound basics. Can execute his core moves cleanly when the opportunity presents itself.",
    developing: "Technique is improving but remains inconsistent, especially under pressure.",
    limited: "Relies on physicality over craft. Technical sophistication is a gap in his game.",
    struggling: "Lacks the technical repertoire to compete effectively. Opponents exploit his predictability."
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
