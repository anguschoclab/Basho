/**
 * keshoMotifs.ts — canonical registry for the selectable kesho-mawashi
 * motifs. Single source for the emoji glyph (renderer) and the English
 * narrative description (factory prose) so the two tables can't drift —
 * `mountain` was the example: renderable + selectable but missing a
 * description for a full release.
 */

export interface KeshoMotifEntry {
  /** Emoji glyph rendered at the mawashi's center. */
  emoji: string;
  /** Narrative fragment used in generated descriptions ("a fierce tiger"). */
  description: string;
}

export const KESHO_MOTIF_REGISTRY: Record<string, KeshoMotifEntry> = {
  dragon: { emoji: "🐉", description: "a powerful dragon" },
  phoenix: { emoji: "🔥", description: "a majestic phoenix" },
  tiger: { emoji: "🐅", description: "a fierce tiger" },
  mt_fuji: { emoji: "🗻", description: "Mount Fuji" },
  waves: { emoji: "🌊", description: "crashing waves" },
  sakura: { emoji: "🌸", description: "cherry blossoms" },
  pine: { emoji: "🌲", description: "evergreen pine" },
  bamboo: { emoji: "🎋", description: "sturdy bamboo" },
  crane: { emoji: "🕊️", description: "a graceful crane" },
  rising_sun: { emoji: "☀️", description: "the rising sun" },
  lightning: { emoji: "⚡", description: "lightning bolts" },
  waterfall: { emoji: "💧", description: "a cascading waterfall" },
  temple: { emoji: "⛩️", description: "a traditional temple" },
  treasure_ship: { emoji: "⛵", description: "the treasure ship" },
  carp: { emoji: "🐟", description: "a noble carp" },
  lotus: { emoji: "🪷", description: "a pure lotus" },
  thunder: { emoji: "⛈️", description: "thunder clouds" },
  wind: { emoji: "💨", description: "swirling winds" },
  mountain: { emoji: "⛰️", description: "a towering mountain" },
};

/** Motif ids selectable in the kesho editor (registry order). */
export const SELECTABLE_MOTIFS: readonly string[] = Object.keys(KESHO_MOTIF_REGISTRY);

/** Emoji lookup for a motif id — `undefined` for unrenderable values. */
export function keshoMotifEmoji(motif: string): string | undefined {
  return KESHO_MOTIF_REGISTRY[motif]?.emoji;
}

/** Narrative lookup for a motif id — `undefined` for unknown values. */
export function keshoMotifDescription(motif: string): string | undefined {
  return KESHO_MOTIF_REGISTRY[motif]?.description;
}
