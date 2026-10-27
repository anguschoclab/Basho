/**
 * pixelCompose.ts
 *
 * Composes an AvatarIdentity + AvatarStage into a 24×24 palette-indexed grid,
 * then emits merged SVG path data: one <path> per resolved color.
 */

import type { AvatarIdentity, AvatarStage, HeadShape } from "@/engine/types/avatar";
import { AVATAR_COLORS, AVATAR_ATTIRE_COLORS } from "@/constants/ui/drawingPalette";
import type { PaletteSlot } from "@/components/avatar/pixelAtlas";
import {
  OICHOMAGE_FAN,
  CHONMAGE_KNOT,
  EBOSHI_CAP,
  GLASSES_FRAME,
  TSUNA_ROPE,
  BANDAGE_PATCH,
} from "@/components/avatar/pixelAtlas";

const W = 24;
const H = 24;
const CX = 12;

type Grid = (PaletteSlot | null)[][];

/** Attire palettes may use "skin"/"skinShadow" tokens (e.g. the "bare" torso). */
function skinToken(hex: string, skinTone: string): string {
  if (hex === "skin") return skinTone;
  if (hex === "skinShadow") return lighten(skinTone, -18);
  return hex;
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, v + Math.round(2.55 * amt)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 0xff);
  const b = f(n & 0xff);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ---------------------------------------------------------------------------
// Geometry tables — full pixel width of the head per row (rows y=5..17)
// ---------------------------------------------------------------------------

const HEAD_WIDTHS: Record<HeadShape, number[]> = {
  full: [8, 12, 14, 14, 14, 14, 14, 14, 14, 14, 14, 12, 10],
  round: [8, 10, 12, 12, 14, 14, 14, 14, 14, 12, 12, 10, 8],
  oval: [6, 8, 10, 12, 12, 12, 12, 12, 12, 10, 10, 8, 6],
  square: [8, 10, 12, 12, 12, 12, 12, 12, 12, 12, 12, 10, 8],
  broad: [8, 10, 12, 14, 14, 14, 14, 14, 14, 14, 14, 12, 10],
  long: [6, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 8],
};
const HEAD_TOP = 5;
const HEAD_BOTTOM = HEAD_TOP + 12; // y=17

// ---------------------------------------------------------------------------
// Painter
// ---------------------------------------------------------------------------

class Painter {
  grid: Grid = Array.from({ length: H }, () => Array<PaletteSlot | null>(W).fill(null));
  px(x: number, y: number, slot: PaletteSlot) {
    if (x >= 0 && x < W && y >= 0 && y < H) this.grid[y][x] = slot;
  }
  hline(cx: number, y: number, width: number, slot: PaletteSlot) {
    const x0 = Math.round(cx - width / 2);
    for (let x = x0; x < x0 + width; x++) this.px(x, y, slot);
  }
  fillRows(y0: number, y1: number, x0: number, x1: number, slot: PaletteSlot) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.px(x, y, slot);
  }
  stamp(runs: { x: number; y: number; len: number; slot: PaletteSlot }[], dy = 0) {
    for (const r of runs) for (let x = r.x; x < r.x + r.len; x++) this.px(x, r.y + dy, r.slot);
  }
}

// ---------------------------------------------------------------------------
// Feature painters
// ---------------------------------------------------------------------------

function paintHead(p: Painter, identity: AvatarIdentity, stage: AvatarStage) {
  const widths = HEAD_WIDTHS[identity.headShape];
  const cheek = stage.fullness;

  // Head silhouette
  for (let i = 0; i < widths.length; i++) {
    let w = widths[i];
    // Cheeks/jaw widen with weight on the lower half of the face
    if (i >= 7 && cheek >= 1) w += 1;
    if (i >= 9 && cheek >= 2) w += 2;
    p.hline(CX, HEAD_TOP + i, w, "skin");
  }

  // Shading: right edge + jawline shadow, faint highlight left
  for (let i = 2; i < widths.length - 1; i++) {
    let w = widths[i];
    if (i >= 7 && cheek >= 1) w += 1;
    if (i >= 9 && cheek >= 2) w += 2;
    p.px(CX + Math.floor(w / 2) - 1, HEAD_TOP + i, "skinShadow");
    if (i < 5) p.px(CX - Math.floor(w / 2), HEAD_TOP + i, "skinHighlight");
  }
  p.hline(CX, HEAD_BOTTOM, Math.max(6, widths[12] - 2 + cheek * 2), "skinShadow");

  // Neck
  p.hline(CX, 18, 6 + cheek * 2, "skin");
  p.hline(CX, 19, 6 + cheek * 2, "skin");
  p.hline(CX + 1, 18, 3 + cheek, "skinShadow");
  p.hline(CX + 1, 19, 3 + cheek, "skinShadow");
}

function paintEars(p: Painter, identity: AvatarIdentity) {
  const widths = HEAD_WIDTHS[identity.headShape];
  // ear row index within head: rows 10-12 → head indices 5-7
  for (const i of [5, 6, 7]) {
    const hw = Math.floor(widths[i] / 2);
    const y = HEAD_TOP + i;
    p.px(CX - hw - 1, y, "skin");
    p.px(CX + hw, y, "skin");
  }
  if (identity.ears === "large" || identity.ears === "cauliflower") {
    for (const i of [4, 8]) {
      const hw = Math.floor(widths[i] / 2);
      p.px(CX - hw - 1, HEAD_TOP + i, "skin");
      p.px(CX + hw, HEAD_TOP + i, "skin");
    }
  }
  if (identity.ears === "cauliflower") {
    for (const i of [5, 6, 7]) {
      const hw = Math.floor(widths[i] / 2);
      p.px(CX - hw - 2, HEAD_TOP + i, "skinShadow");
      p.px(CX + hw + 1, HEAD_TOP + i, "skinShadow");
    }
  } else if (identity.ears === "small") {
    // shrink: recolor outer px back
    for (const i of [5, 7]) {
      const hw = Math.floor(widths[i] / 2);
      p.px(CX - hw - 1, HEAD_TOP + i, "backdrop");
      p.px(CX + hw, HEAD_TOP + i, "backdrop");
    }
  }
}

function paintEyes(p: Painter, identity: AvatarIdentity, stage: AvatarStage) {
  const intense = stage.expression === "intense";
  const y = intense ? 10 : 10;
  switch (identity.eyes) {
    case "standard":
      p.fillRows(y, y, 8, 9, "ink");
      p.fillRows(y, y, 15, 16, "ink");
      break;
    case "narrow":
      p.fillRows(y, y, 8, 9, "ink");
      p.fillRows(y, y, 15, 16, "ink");
      p.fillRows(y - 1, y - 1, 8, 9, "skinShadow");
      p.fillRows(y - 1, y - 1, 15, 16, "skinShadow");
      break;
    case "wide":
      p.fillRows(y - 1, y, 8, 9, "ink");
      p.fillRows(y - 1, y, 15, 16, "ink");
      p.px(8, y - 1, "white");
      p.px(15, y - 1, "white");
      break;
    case "deepset":
      p.fillRows(y - 1, y - 1, 8, 9, "skinShadow");
      p.fillRows(y - 1, y - 1, 15, 16, "skinShadow");
      p.fillRows(y, y, 8, 9, "ink");
      p.fillRows(y, y, 15, 16, "ink");
      break;
    case "upturned":
      p.px(8, y - 1, "ink");
      p.px(9, y, "ink");
      p.px(16, y - 1, "ink");
      p.px(15, y, "ink");
      break;
  }
  if (intense) {
    // squint: shadow over eyes
    p.px(8, y - 1, "skinShadow");
    p.px(16, y - 1, "skinShadow");
  }
}

function paintBrows(p: Painter, identity: AvatarIdentity, stage: AvatarStage) {
  const t = identity.browThickness;
  const slot: PaletteSlot = "hair";
  const rows = t === 3 ? [7, 8] : t === 2 ? [8] : [8];
  const lower = stage.expression === "intense" ? 1 : 0;

  for (const y of rows) {
    const yy = y + (y === 8 ? lower : 0);
    switch (identity.brows) {
      case "straight":
        p.fillRows(yy, yy, 7, 10, slot);
        p.fillRows(yy, yy, 14, 17, slot);
        break;
      case "furrowed":
        p.fillRows(yy, yy, 8, 10, slot);
        p.fillRows(yy, yy, 14, 16, slot);
        p.px(10, yy + 1, slot);
        p.px(14, yy + 1, slot);
        break;
      case "arched":
        p.fillRows(yy, yy, 8, 10, slot);
        p.fillRows(yy, yy, 14, 16, slot);
        p.px(7, yy - 1, slot);
        p.px(17, yy - 1, slot);
        break;
      case "sparse":
        p.px(8, yy, slot);
        p.px(16, yy, slot);
        break;
    }
  }
}

function paintNose(p: Painter, identity: AvatarIdentity) {
  switch (identity.nose) {
    case "small":
      p.px(11, 12, "skinShadow");
      p.px(12, 13, "skinShadow");
      break;
    case "medium":
      p.px(11, 12, "skinShadow");
      p.px(11, 13, "skinShadow");
      p.px(12, 13, "skinShadow");
      break;
    case "broad":
      p.fillRows(13, 13, 10, 13, "skinShadow");
      p.fillRows(12, 12, 11, 12, "skinShadow");
      break;
    case "flat":
      p.px(10, 13, "skinShadow");
      p.px(11, 12, "skinShadow");
      p.px(12, 13, "skinShadow");
      p.px(13, 13, "skinShadow");
      break;
    case "hooked":
      p.px(11, 11, "skinShadow");
      p.px(11, 12, "skinShadow");
      p.fillRows(13, 13, 11, 13, "skinShadow");
      break;
  }
}

function paintMouth(p: Painter, identity: AvatarIdentity, stage: AvatarStage) {
  const expr = stage.expression;
  // expression overrides mouth when set
  if (expr === "confident") {
    p.px(10, 15, "ink");
    p.fillRows(16, 16, 11, 13, "ink");
    p.px(14, 15, "ink");
    return;
  }
  if (expr === "intense" || expr === "determined") {
    p.fillRows(15, 15, 10, 14, "ink");
    return;
  }
  if (expr === "worried") {
    p.px(10, 16, "ink");
    p.fillRows(15, 15, 11, 13, "ink");
    p.px(14, 16, "ink");
    return;
  }
  switch (identity.mouth) {
    case "neutral":
      p.fillRows(15, 15, 11, 13, "ink");
      break;
    case "smile":
      p.px(10, 15, "ink");
      p.fillRows(16, 16, 11, 13, "ink");
      p.px(14, 15, "ink");
      break;
    case "frown":
      p.px(10, 16, "ink");
      p.fillRows(15, 15, 11, 13, "ink");
      p.px(14, 16, "ink");
      break;
    case "pursed":
      p.fillRows(15, 15, 11, 12, "ink");
      break;
    case "open":
      p.fillRows(15, 16, 11, 13, "accent");
      break;
    case "flat":
      p.fillRows(15, 15, 10, 14, "ink");
      break;
  }
}

function paintMark(p: Painter, identity: AvatarIdentity) {
  switch (identity.mark) {
    case "scar":
      p.px(15, 11, "skinShadow");
      p.px(16, 12, "skinShadow");
      p.px(15, 13, "skinShadow");
      break;
    case "mole":
      p.px(9, 13, "ink");
      break;
    case "freckles":
      p.px(8, 12, "skinShadow");
      p.px(16, 12, "skinShadow");
      p.px(9, 13, "skinShadow");
      p.px(15, 13, "skinShadow");
      break;
    case "acne":
      p.px(8, 12, "accent");
      p.px(16, 13, "accent");
      p.px(10, 14, "accent");
      break;
    case "none":
      break;
  }
}

function paintWrinkles(p: Painter, stage: AvatarStage) {
  if (stage.wrinkleTier >= 1) p.fillRows(7, 7, 9, 15, "skinShadow");
  if (stage.wrinkleTier >= 2) {
    p.px(6, 10, "skinShadow");
    p.px(18, 10, "skinShadow");
    p.px(6, 11, "skinShadow");
    p.px(18, 11, "skinShadow");
  }
  if (stage.wrinkleTier >= 3) {
    p.fillRows(6, 6, 10, 14, "skinShadow");
    p.px(9, 14, "skinShadow");
    p.px(15, 14, "skinShadow");
  }
}

function paintFacialHair(p: Painter, identity: AvatarIdentity) {
  if (identity.facialHair === "none") return;
  const slot: PaletteSlot = "hair";
  // mustache above lip
  p.fillRows(14, 14, 10, 14, slot);
  if (identity.facialHair === "goatee" || identity.facialHair === "full") {
    p.fillRows(16, 16, 11, 13, slot);
    p.fillRows(17, 17, 11, 13, slot);
  }
  if (identity.facialHair === "full") {
    p.fillRows(14, 16, 7, 8, slot);
    p.fillRows(14, 16, 16, 17, slot);
    p.fillRows(17, 17, 8, 9, slot);
    p.fillRows(17, 17, 15, 16, slot);
  }
}

function paintHair(p: Painter, identity: AvatarIdentity, stage: AvatarStage) {
  const slot: PaletteSlot = stage.graying === 0 ? "hair" : "hairGray";
  const widths = HEAD_WIDTHS[identity.headShape];

  switch (stage.hairstyle) {
    case "shaved":
      // faint stubble on top rows
      p.hline(CX, HEAD_TOP, widths[0], "hairGray");
      break;
    case "bald":
      p.px(10, HEAD_TOP, "skinHighlight");
      p.px(11, HEAD_TOP, "skinHighlight");
      break;
    case "receding":
      // hair only at the temples/back
      p.hline(CX - Math.floor(widths[2] / 2) + 1, HEAD_TOP + 1, 2, slot);
      p.hline(CX + Math.floor(widths[2] / 2) - 1, HEAD_TOP + 1, 2, slot);
      p.hline(CX, HEAD_TOP + 2, widths[2], slot);
      break;
    case "short":
      p.hline(CX, HEAD_TOP - 1, widths[0], slot);
      p.hline(CX, HEAD_TOP, widths[1], slot);
      break;
    case "chonmage":
      p.hline(CX, HEAD_TOP - 1, widths[0] + 2, slot);
      p.hline(CX, HEAD_TOP, widths[1] + 1, slot);
      p.stamp(CHONMAGE_KNOT, 1);
      break;
    case "oichomage":
      p.hline(CX, HEAD_TOP - 1, widths[0] + 2, slot);
      p.hline(CX, HEAD_TOP, widths[1] + 1, slot);
      p.stamp(OICHOMAGE_FAN, 0);
      break;
  }
}

function paintAttire(p: Painter, stage: AvatarStage) {
  const shoulderW = stage.fullness * 1 + (stage.role === "rikishi" ? 2 : 0);
  const widths = [16 + shoulderW, 20 + shoulderW, 22 + shoulderW, 24];
  if (stage.attire === "bare") {
    // bare torso: skin rows with shadow at the bottom edge
    for (let i = 0; i < 4; i++) p.hline(CX, 20 + i, widths[i], "skin");
    p.hline(CX, 23, 24, "skinShadow");
    if (stage.attireOverride) {
      // mawashi strap across the chest — e.g. kesho-mawashi preview color
      p.fillRows(21, 21, 8, 16, "attireAccent");
    }
    return;
  }
  for (let i = 0; i < 4; i++) p.hline(CX, 20 + i, widths[i], "attire");
  // collar accent — V-shaped neckline for robes/jackets
  p.px(10, 20, "attireAccent");
  p.px(14, 20, "attireAccent");
  p.px(11, 21, "attireAccent");
  p.px(13, 21, "attireAccent");
  p.px(12, 21, "attireAccent");
}

function paintAccessories(p: Painter, stage: AvatarStage) {
  if (stage.glasses) p.stamp(GLASSES_FRAME, 9);
  if (stage.bandage) p.stamp(BANDAGE_PATCH, 5);
  if (stage.role === "gyoji") p.stamp(EBOSHI_CAP, 0);
  if (stage.tsuna) p.stamp(TSUNA_ROPE, 19);
}

// ---------------------------------------------------------------------------
// Compose + palette resolution
// ---------------------------------------------------------------------------

function resolveSlot(slot: PaletteSlot, identity: AvatarIdentity, stage: AvatarStage): string {
  switch (slot) {
    case "skin":
      return identity.skinTone;
    case "skinShadow":
      return lighten(identity.skinTone, -18);
    case "skinHighlight":
      return lighten(identity.skinTone, 12);
    case "hair":
      return stage.graying === 2
        ? AVATAR_COLORS.hairWhite
        : stage.graying === 1
          ? AVATAR_COLORS.hairGray
          : identity.hairColor;
    case "hairGray":
      return stage.graying === 2 ? AVATAR_COLORS.hairWhite : AVATAR_COLORS.hairGray;
    case "ink":
      return AVATAR_COLORS.ink;
    case "white":
      return AVATAR_COLORS.paper;
    case "accent":
      return AVATAR_COLORS.mouthAccent;
    case "glass":
      return AVATAR_COLORS.glass;
    case "bandage":
      return AVATAR_COLORS.bandage;
    case "attire": {
      const pal = ATTIRE_PALETTES_LOOKUP[stage.attire];
      if (stage.attireOverride && stage.attire !== "bare") return stage.attireOverride;
      return skinToken(pal.base, identity.skinTone);
    }
    case "attireAccent": {
      const pal = ATTIRE_PALETTES_LOOKUP[stage.attire];
      if (stage.attireOverride) return stage.attireOverride;
      return skinToken(pal.accent, identity.skinTone);
    }
    case "backdrop":
      return stage.backdropTone ?? AVATAR_COLORS.backdrop;
    case "backdropDark":
      return AVATAR_COLORS.backdropDark;
  }
}

// "skin"/"skinShadow" tokens inside ATTIRE palettes resolve through skin slots.
const ATTIRE_PALETTES_LOOKUP: Record<
  AvatarStage["attire"],
  { base: string; accent: string }
> = Object.fromEntries(
  Object.entries(AVATAR_ATTIRE_COLORS).map(([k, v]) => [
    k,
    { base: v.base as string, accent: v.accent as string },
  ])
) as Record<AvatarStage["attire"], { base: string; accent: string }>;

export function composeAvatar(
  identity: AvatarIdentity,
  stage: AvatarStage
): Map<string, string> {
  const p = new Painter();

  // backdrop: full canvas, darker floor band
  p.fillRows(0, H - 1, 0, W - 1, "backdrop");
  p.fillRows(22, H - 1, 0, W - 1, "backdropDark");

  paintAttire(p, stage);
  paintHead(p, identity, stage);
  paintEars(p, identity);
  paintWrinkles(p, stage);
  paintNose(p, identity);
  paintMark(p, identity);
  paintMouth(p, identity, stage);
  paintFacialHair(p, identity);
  paintEyes(p, identity, stage);
  paintBrows(p, identity, stage);
  paintHair(p, identity, stage);
  paintAccessories(p, stage);

  // Merge cells → one path per resolved hex
  const out = new Map<string, string>();
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const slot = p.grid[y][x];
      if (!slot) {
        x++;
        continue;
      }
      let len = 1;
      while (x + len < W && p.grid[y][x + len] === slot) len++;
      const hex = resolveSlot(slot, identity, stage);
      const piece = `M${x} ${y}h${len}v1H${x}z`;
      out.set(hex, (out.get(hex) ?? "") + piece);
      x += len;
    }
  }
  return out;
}
