/**
 * Pixel composer tests — grid composition, palette resolution, path bounds.
 */

import { describe, it, expect } from "vitest";
import { composeAvatar } from "@/components/avatar/pixelCompose";
import { compileArt, ATTIRE_PALETTES } from "@/components/avatar/pixelAtlas";
import { generateAvatarIdentity, deriveAvatarStage } from "@/engine/avatarGenerator";

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
});
