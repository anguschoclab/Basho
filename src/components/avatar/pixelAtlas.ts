/**
 * pixelAtlas.ts
 *
 * Sprite-part definitions for the 24×24 pixel avatar. Fixed accessories
 * (topknots, eboshi cap, glasses, tsuna, bandage) are authored as string-art
 * and compiled to pixel runs at module load; head/feature geometry is painted
 * procedurally in pixelCompose.
 */

import type { AvatarAttire } from "@/engine/types/avatar";
import { AVATAR_ATTIRE_COLORS } from "@/constants/ui/drawingPalette";

/** Semantic color slots resolved against identity + stage at compose time. */
export type PaletteSlot =
  | "backdrop"
  | "backdropDark"
  | "skin"
  | "skinShadow"
  | "skinHighlight"
  | "hair"
  | "hairGray"
  | "ink"
  | "white"
  | "attire"
  | "attireAccent"
  | "accent"
  | "glass"
  | "bandage";

export interface PixelRun {
  x: number;
  y: number;
  len: number;
  slot: PaletteSlot;
}

/** Compile string-art rows into horizontal pixel runs ('.' = transparent). */
export function compileArt(rows: string[], charMap: Record<string, PaletteSlot>): PixelRun[] {
  const runs: PixelRun[] = [];
  for (let y = 0; y < rows.length; y++) {
    let x = 0;
    while (x < rows[y].length) {
      const ch = rows[y][x];
      const slot = charMap[ch];
      if (!slot || ch === ".") {
        x++;
        continue;
      }
      let len = 1;
      while (rows[y][x + len] === ch) len++;
      runs.push({ x, y, len, slot });
      x += len;
    }
  }
  return runs;
}

// -- Fixed sprites (24-wide canvas, drawn at y offsets noted per part) -------

/** Oichomage ginkgo-leaf topknot (sekitori). Drawn at y=0, spans ~rows 0-4. */
export const OICHOMAGE_FAN = compileArt(
  [
    ".......XXXXXxXXXXX.......",
    ".....XXxXXXXXXXXXxXX.....",
    "....XXXXXXXXXXXXXXXXX....",
    ".....XXXXXXXXXXXXXXXX....",
  ],
  { X: "hair", x: "hairGray" }
);

/** Standard chonmage topknot (lower divisions). Drawn at y=1. */
export const CHONMAGE_KNOT = compileArt(
  [".........XXXXXX..........", "........XXXXXXXX.........", ".........XXXXXX.........."],
  { X: "hair" }
);

/** Eboshi lacquered cap worn by gyoji. Drawn at y=0. */
export const EBOSHI_CAP = compileArt(
  [
    "..........XXXXX..........",
    ".........XXXXXXX.........",
    ".........XXXXXXX.........",
    "........XXXXXXXXX........",
  ],
  { X: "ink" }
);

/** Rectangular glasses frame. Drawn over the eye row (y=9). */
export const GLASSES_FRAME = compileArt(
  ["....WW.....WW....", "...W..W...W..W...", "....WW.....WW...."],
  { W: "ink" }
);

/** Yokozuna tsuna — white ceremonial rope across the chest (y=20). */
export const TSUNA_ROPE = compileArt(
  ["....W.........W....", "....W.........W....", "...WW.........WW..."],
  { W: "white" }
);

/** Forehead bandage patch (injured/kyujo). Drawn at y=5. */
export const BANDAGE_PATCH = compileArt(["......BBBBB........", "......BBBBBB......."], {
  B: "bandage",
});

/** Resolve an attire key to its palette. */
export const ATTIRE_PALETTES: Record<AvatarAttire, { base: string; accent: string }> = {
  bare: { base: AVATAR_ATTIRE_COLORS.bare.base, accent: AVATAR_ATTIRE_COLORS.bare.accent },
  kimono: { base: AVATAR_ATTIRE_COLORS.kimono.base, accent: AVATAR_ATTIRE_COLORS.kimono.accent },
  suit: { base: AVATAR_ATTIRE_COLORS.suit.base, accent: AVATAR_ATTIRE_COLORS.suit.accent },
  tracksuit: {
    base: AVATAR_ATTIRE_COLORS.tracksuit.base,
    accent: AVATAR_ATTIRE_COLORS.tracksuit.accent,
  },
  coat: { base: AVATAR_ATTIRE_COLORS.coat.base, accent: AVATAR_ATTIRE_COLORS.coat.accent },
  polo: { base: AVATAR_ATTIRE_COLORS.polo.base, accent: AVATAR_ATTIRE_COLORS.polo.accent },
  shirt: { base: AVATAR_ATTIRE_COLORS.shirt.base, accent: AVATAR_ATTIRE_COLORS.shirt.accent },
  apron: { base: AVATAR_ATTIRE_COLORS.apron.base, accent: AVATAR_ATTIRE_COLORS.apron.accent },
  gyoji_tate: {
    base: AVATAR_ATTIRE_COLORS.gyoji_tate.base,
    accent: AVATAR_ATTIRE_COLORS.gyoji_tate.accent,
  },
  gyoji_sanyaku: {
    base: AVATAR_ATTIRE_COLORS.gyoji_sanyaku.base,
    accent: AVATAR_ATTIRE_COLORS.gyoji_sanyaku.accent,
  },
  gyoji_standard: {
    base: AVATAR_ATTIRE_COLORS.gyoji_standard.base,
    accent: AVATAR_ATTIRE_COLORS.gyoji_standard.accent,
  },
  shimpan: { base: AVATAR_ATTIRE_COLORS.shimpan.base, accent: AVATAR_ATTIRE_COLORS.shimpan.accent },
};
