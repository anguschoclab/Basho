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
    exceptional: "His raw strength is fearsome — opponents buckle on first contact as if struck by a massive wall of concrete. He can dismantle defenses on sheer power alone.",
    outstanding: "A powerful frame that most men at this level simply cannot withstand for long. When he commits forward, the earth seems to tremble.",
    strong: "Solid, reliable strength. Enough to move most men and strictly punish any passive opponents who try to stall the bout.",
    capable: "Adequate power for his rank. He won't effortlessly overwhelm anyone, but holds his own comfortably in the clinch.",
    developing: "Still building the deep muscle and leverage his rank demands. The raw potential is there, and improvement is visible.",
    limited: "Noticeably outpowered by most opponents. He relies heavily on technique, positioning, and speed to compensate for the strength gap.",
    struggling: "Physically overmatched in most contests. His raw strength is a distinct liability at this level of sumo."
  },
  speed: {
    exceptional: "Lightning quick — his first step and reaction time verge on the preternatural. By the time opponents set their feet, he is already executing his offense.",
    outstanding: "Fast enough to regularly catch opponents flat-footed before they can establish their grips or defensive posture.",
    strong: "Quick on his feet, able to exploit fleeting openings that slower, more deliberate men would miss entirely.",
    capable: "Moves adequately for his preferred style. His speed is neither a pronounced liability nor a primary weapon.",
    developing: "Could be quicker. His timing is still maturing, and momentary opportunities are occasionally left unexploited on the clay.",
    limited: "Noticeably sluggish compared to his peers. Opponents frequently dictate the pace, and he struggles to adjust laterally.",
    struggling: "Painfully slow to react and extremely easy to outmaneuver. Speed is a consistent, glaring weakness at this level."
  },
  balance: {
    exceptional: "His root is the stuff of legend — opponents describe pushing him as trying to shove a mountain. His center of gravity is an unbreakable anchor.",
    outstanding: "Exceptionally stable under immense pressure. He rarely loses footing, even in the most desperate, tangled scrambles.",
    strong: "Well-grounded and composed. He recovers remarkably well from disadvantaged positions and awkward angles.",
    capable: "Adequate balance for competitive sumo. He holds steady in most standard grappling situations without issue.",
    developing: "Sometimes caught leaning or off-angle. His balance is a work in progress and can fail under sustained, heavy pressure.",
    limited: "Unsteady under serious pressure. He is noticeably vulnerable to throws, pull-downs, and sudden shifts in momentum.",
    struggling: "Falls far too easily. Fundamental stability issues severely limit what he can attempt both offensively and defensively."
  },
  technique: {
    exceptional: "A transcendent master technician. Every grip, every angle, and every timing read is deliberate, precise, and flawlessly executed.",
    outstanding: "Highly skilled and deeply intuitive. He reads complex situations instantly and executes with the crisp clarity of a seasoned veteran.",
    strong: "A remarkably good technical foundation, featuring highly reliable execution of his preferred throwing and twisting techniques.",
    capable: "Sound fundamental basics. He can execute his core moves cleanly when the correct opportunity presents itself.",
    developing: "His technique is slowly improving but remains frustratingly inconsistent, particularly when he is put under heavy pressure.",
    limited: "Relies almost entirely on raw physicality over craft. Technical sophistication is a massive, gaping hole in his sumo game.",
    struggling: "Severely lacks the technical repertoire required to compete effectively. Opponents routinely exploit his sheer predictability."
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
  generational: { label: "Generational Talent", description: "A once-in-a-decade prospect. Scouts argue about him in hushed, reverent tones." },
  star:         { label: "Star Potential",       description: "The ceiling is the top. Whether he reaches it depends on what happens next." },
  solid:        { label: "Solid Prospect",       description: "Won't set the sumo world on fire, but a reliable career in the upper divisions is well within reach." },
  average:      { label: "Average Ceiling",      description: "What he achieves will come from effort, discipline, and smart development — not raw gifts." },
  limited:      { label: "Limited Upside",        description: "The growth ceiling is low. But the dohyo has surprised everyone before." },
  unknown:      { label: "Uncharted",             description: "Too early to say. The clay reveals all, in time." },
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
    description: "Calm, grounded, and almost impossible to rush. He absorbs pressure and turns it into opportunity, waiting for the moment his opponent overcommits."
  },
  Explosive_Blitzer: {
    label: "Explosive Blitzer",
    description: "The tachiai is his weapon. He ends fights in seconds — or he doesn't end them at all. Longer bouts expose a stamina cliff that opponents try desperately to reach."
  },
  Acrobatic_Trickster: {
    label: "Acrobatic Trickster",
    description: "Slippery, inventive, and infuriating to fight. He uses unpredictable angles, impeccable timing, and clever misdirection to make heavier, stronger opponents look completely foolish."
  },
  Immovable_Mountain: {
    label: "Immovable Mountain",
    description: "Once he plants himself, he is not going anywhere. His center of gravity is almost inhumanly low, and his patience is unlimited."
  },
  All_Rounder: {
    label: "All-Rounder",
    description: "No obvious weaknesses, no single predictable style. He adapts to whatever the bout demands — which is what makes him so difficult to game-plan against."
  },
};
