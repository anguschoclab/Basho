/**
 * Pixel composer tests — grid composition, palette resolution, path bounds.
 */

import { describe, it, expect } from "vitest";
import { composeAvatar } from "@/components/avatar/pixelCompose";
import { compileArt, ATTIRE_PALETTES } from "@/components/avatar/pixelAtlas";
import { generateAvatarIdentity, deriveAvatarStage } from "@/engine/generation/avatarGenerator";

const identity = generateAvatarIdentity({ seed: "compose-1", nationality: "Japan", role: "rikishi" });
const stage = deriveAvatarStage({ role: "rikishi", division: "makuuchi", age: 27, weight: 150 });

describe("compileArt", () => {
  it("compiles string-art into pixel runs", () => {
    const runs = compileArt([".XX.", "XXXX"], { X: "ink" });
    expect(runs).toEqual([
      { x: 1, y: 0, len: 2, slot: "ink" },
      { x: 0, y: 1, len: 4, slot: "ink" },
    ]);
  });
});

describe("ATTIRE_PALETTES", () => {
  it("covers every attire key the stage can emit", () => {
    const attires = [
      "bare", "kimono", "suit", "tracksuit", "coat", "polo", "shirt", "apron",
      "gyoji_tate", "gyoji_sanyaku", "gyoji_standard", "shimpan",
    ] as const;
    for (const a of attires) expect(ATTIRE_PALETTES[a]).toBeDefined();
  });
});

/** Decode merged path data back into a 24×24 per-cell hex grid. */
function toGrid(paths: Map<string, string>): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: 24 }, () =>
    Array<string | null>(24).fill(null)
  );
  for (const [hex, d] of paths) {
    for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)v1H\d+z/g)) {
      const x = Number(m[1]);
      const y = Number(m[2]);
      const len = Number(m[3]);
      for (let i = 0; i < len; i++) grid[y][x + i] = hex;
    }
  }
  return grid;
}

/** Cells whose resolved color differs between two composed avatars. */
function diffCells(a: Map<string, string>, b: Map<string, string>): { x: number; y: number }[] {
  const ga = toGrid(a);
  const gb = toGrid(b);
  const diffs: { x: number; y: number }[] = [];
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 24; x++) if (ga[y][x] !== gb[y][x]) diffs.push({ x, y });
  return diffs;
}

describe("composeAvatar", () => {
  it("is deterministic", () => {
    expect(composeAvatar(identity, stage)).toEqual(composeAvatar(identity, stage));
  });

  it("emits at least one path per required slot and stays within 24×24", () => {
    const paths = composeAvatar(identity, stage);
    expect(paths.size).toBeGreaterThan(3);
    for (const [, d] of paths) {
      const nums = d.match(/-?\d+/g)?.map(Number) ?? [];
      for (const n of nums) {
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(24);
      }
    }
  });

  it("different stage attire changes output", () => {
    const bare = composeAvatar(identity, stage);
    const suited = composeAvatar(identity, { ...stage, attire: "suit" });
    expect(suited).not.toEqual(bare);
  });

  it("glasses/bandage/topknot toggles change output", () => {
    const base = composeAvatar(identity, stage);
    expect(composeAvatar(identity, { ...stage, glasses: true })).not.toEqual(base);
    expect(composeAvatar(identity, { ...stage, bandage: true })).not.toEqual(base);
    expect(composeAvatar(identity, { ...stage, hairstyle: "bald" })).not.toEqual(base);
  });

  it("renders each browThickness tier differently, inside the brow band", () => {
    const t1 = composeAvatar({ ...identity, browThickness: 1 }, stage);
    const t2 = composeAvatar({ ...identity, browThickness: 2 }, stage);
    const t3 = composeAvatar({ ...identity, browThickness: 3 }, stage);
    for (const [a, b] of [
      [t1, t2],
      [t2, t3],
      [t1, t3],
    ] as const) {
      const diffs = diffCells(a, b);
      expect(diffs.length).toBeGreaterThan(0);
      // Brows live at rows 7-9 — thickness must not bleed into other features.
      expect(diffs.every((c) => c.y <= 9)).toBe(true);
    }
  });

  it("gives the intense expression a real squint lid over every eye style", () => {
    const eyeStyles = ["standard", "narrow", "wide", "deepset", "upturned"] as const;
    for (const eyes of eyeStyles) {
      // Sparse brows leave the lid row exposed — if the squint lid doesn't
      // exist, these cells stay bare skin.
      const id = { ...identity, eyes, brows: "sparse" as const };
      const paths = composeAvatar(id, { ...stage, expression: "intense" });
      const g = toGrid(paths);
      // The lid row sits directly over the eye row (y=9 over eyes at y=10);
      // the eye-interior cells of both spans must be lidded, not bare skin.
      for (const cell of [g[9][9], g[9][15]]) {
        expect(cell).not.toBeNull();
        expect(cell).not.toBe(id.skinTone);
      }
    }
  });

  it("gives confident/worried expressions brow cues instead of cloning smile/frown", () => {
    const smileId = { ...identity, mouth: "smile" as const };
    const frownId = { ...identity, mouth: "frown" as const };
    const confidentDiff = diffCells(
      composeAvatar(smileId, stage),
      composeAvatar(smileId, { ...stage, expression: "confident" })
    );
    const worriedDiff = diffCells(
      composeAvatar(frownId, stage),
      composeAvatar(frownId, { ...stage, expression: "worried" })
    );
    expect(confidentDiff.length).toBeGreaterThan(0);
    expect(worriedDiff.length).toBeGreaterThan(0);
    // The difference is a brow cue, not a mouth change (brow band rows ≤9).
    expect(confidentDiff.every((c) => c.y <= 9)).toBe(true);
    expect(worriedDiff.every((c) => c.y <= 9)).toBe(true);
  });
});
