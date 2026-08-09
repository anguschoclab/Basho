import { describe, it, expect } from "vitest";
import { mergeImpacts } from "@/engine/core/ImpactResolver";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";

describe("Bug H: mergeImpacts correctly merges rikishiUpdates for same ID", () => {
  it("merges partial updates from multiple impacts for the same rikishi", () => {
    const builder1 = createImpactBuilder("training");
    builder1.updateRikishi("r1", { fatigue: 10 });

    const builder2 = createImpactBuilder("heritage");
    builder2.updateRikishi("r1", { motivation: 60 });

    const builder3 = createImpactBuilder("mentorship");
    builder3.updateRikishi("r1", { condition: 80 });

    const merged = mergeImpacts([builder1.build(), builder2.build(), builder3.build()]);
    const updates = merged.entities?.rikishiUpdates;
    expect(updates).toBeDefined();
    expect(updates!.has("r1")).toBe(true);
    const r1Update = updates!.get("r1");
    // All three fields should be present (not overwritten)
    expect(r1Update).toMatchObject({ fatigue: 10, motivation: 60, condition: 80 });
  });

  it("does not overwrite earlier entries when later impacts update same rikishi", () => {
    const builder1 = createImpactBuilder("training");
    builder1.updateRikishi("r1", { fatigue: 10 });

    const builder2 = createImpactBuilder("sparring");
    builder2.updateRikishi("r1", { fatigue: 20 });

    const merged = mergeImpacts([builder1.build(), builder2.build()]);
    const updates = merged.entities?.rikishiUpdates;
    const r1Update = updates?.get("r1");
    // Later impact should override the same field (last-write-wins for same field),
    // but earlier impacts' unique fields should not be lost
    expect(r1Update).toBeDefined();
    expect(r1Update!.fatigue).toBe(20);
  });
});
