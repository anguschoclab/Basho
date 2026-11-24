/**
 * Spec — genesis heya→ichimon alignment.
 *
 * Real grand sumo has 45 stables across five clans (ichimon) with a
 * heavily uneven split — Nishonoseki 17 / Dewanoumi 14 / Isegahama 5 /
 * Tokitsukaze 5 / Takasago 4 (2026). Genesis previously assigned clan
 * membership by uniform random pick, so the political map never matched:
 * clan sizes came out ~9 each and attested memberships (Kokonoe is
 * always Takasago, Sakaigawa always Dewanoumi) were left to chance.
 *
 * Membership is fixed per stable name; a fictional or closed stable
 * slots into the clan that keeps the real counts.
 */
import { describe, it, expect } from "vitest";
import { createStables } from "@/engine/generation/HeyaFactory";
import { rngFromSeed } from "@/engine/core/rng";

describe("genesis ichimon alignment", () => {
  const { heyaMap } = createStables(rngFromSeed("ichimon-map", "worldgen", "world"));
  const byName = new Map(
    [...heyaMap.values()].map((h) => [h.name, h.ichimon])
  );

  it("matches the real 17/14/5/5/4 clan distribution", () => {
    const counts = new Map<string, number>();
    for (const h of heyaMap.values()) {
      counts.set(h.ichimon ?? "?", (counts.get(h.ichimon ?? "?") ?? 0) + 1);
    }
    expect(counts.get("Nishonoseki")).toBe(17);
    expect(counts.get("Dewanoumi")).toBe(14);
    expect(counts.get("Isegahama")).toBe(5);
    expect(counts.get("Tokitsukaze")).toBe(5);
    expect(counts.get("Takasago")).toBe(4);
  });

  it("holds the attested memberships", () => {
    // Each of these is a fixed real-world clan alignment, not a coin flip.
    expect(byName.get("Kokonoe")).toBe("Takasago");
    expect(byName.get("Hakkaku")).toBe("Takasago");
    expect(byName.get("Sakaigawa")).toBe("Dewanoumi");
    expect(byName.get("Tamanoi")).toBe("Dewanoumi");
    expect(byName.get("Futagoyama")).toBe("Dewanoumi");
    expect(byName.get("Ajigawa")).toBe("Isegahama");
    expect(byName.get("Asakayama")).toBe("Isegahama");
    expect(byName.get("Miyagino")).toBe("Isegahama");
    expect(byName.get("Minato")).toBe("Tokitsukaze");
    expect(byName.get("Arashio")).toBe("Tokitsukaze");
    expect(byName.get("Sadogatake")).toBe("Nishonoseki");
    expect(byName.get("Takadagawa")).toBe("Nishonoseki");
    expect(byName.get("Shibatayama")).toBe("Nishonoseki");
  });

  it("namesake stables sit inside their own clan", () => {
    for (const name of [
      "Dewanoumi",
      "Nishonoseki",
      "Takasago",
      "Tokitsukaze",
      "Isegahama",
    ] as const) {
      expect(byName.get(name)).toBe(name);
    }
  });
});
