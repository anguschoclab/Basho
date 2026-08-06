import { describe, it, expect } from "vitest";
import { getSekitoriInHeya, clearQueryCaches, getHeyaStyleBias } from "@/engine/queries";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("Queries", () => {
  describe("getSekitoriInHeya", () => {
    it("should return the correct count of sekitori (makuuchi + juryo) in a heya", () => {
      const world = MockFactory.createWorld();

      const heya = MockFactory.createHeya("heya1");
      heya.rikishiIds = ["rikishi1", "rikishi2", "rikishi3", "rikishi4"];
      world.heyas.set("heya1", heya);

      // Setup rikishi with different divisions
      world.rikishi.set(
        "rikishi1",
        MockFactory.createRikishi("rikishi1", { heyaId: "heya1", division: "makuuchi" })
      );
      world.rikishi.set(
        "rikishi2",
        MockFactory.createRikishi("rikishi2", { heyaId: "heya1", division: "juryo" })
      );
      world.rikishi.set(
        "rikishi3",
        MockFactory.createRikishi("rikishi3", { heyaId: "heya1", division: "makushita" })
      );
      world.rikishi.set(
        "rikishi4",
        MockFactory.createRikishi("rikishi4", { heyaId: "heya1", division: "sandanme" })
      );

      clearQueryCaches();
      const count = getSekitoriInHeya(world, "heya1");
      expect(count).toBe(2);
    });
  });

  describe("getHeyaStyleBias", () => {
    it("should correctly identify oshi style bias", () => {
      const world = MockFactory.createWorld();
      const heya = MockFactory.createHeya("heya1");
      heya.rikishiIds = ["r1", "r2", "r3"];
      world.heyas.set("heya1", heya);

      world.rikishi.set("r1", MockFactory.createRikishi("r1", { heyaId: "heya1", style: "oshi" }));
      world.rikishi.set("r2", MockFactory.createRikishi("r2", { heyaId: "heya1", style: "oshi" }));
      world.rikishi.set("r3", MockFactory.createRikishi("r3", { heyaId: "heya1", style: "yotsu" }));

      clearQueryCaches();
      const bias = getHeyaStyleBias(world, "heya1");
      expect(bias).toBe("oshi");
    });

    it("should correctly identify yotsu style bias", () => {
      const world = MockFactory.createWorld();
      const heya = MockFactory.createHeya("heya1");
      heya.rikishiIds = ["r1", "r2", "r3"];
      world.heyas.set("heya1", heya);

      world.rikishi.set("r1", MockFactory.createRikishi("r1", { heyaId: "heya1", style: "oshi" }));
      world.rikishi.set("r2", MockFactory.createRikishi("r2", { heyaId: "heya1", style: "yotsu" }));
      world.rikishi.set("r3", MockFactory.createRikishi("r3", { heyaId: "heya1", style: "yotsu" }));

      clearQueryCaches();
      const bias = getHeyaStyleBias(world, "heya1");
      expect(bias).toBe("yotsu");
    });

    it("should correctly identify neutral style bias when counts are equal", () => {
      const world = MockFactory.createWorld();
      const heya = MockFactory.createHeya("heya1");
      heya.rikishiIds = ["r1", "r2", "r3"];
      world.heyas.set("heya1", heya);

      world.rikishi.set("r1", MockFactory.createRikishi("r1", { heyaId: "heya1", style: "oshi" }));
      world.rikishi.set("r2", MockFactory.createRikishi("r2", { heyaId: "heya1", style: "yotsu" }));
      world.rikishi.set(
        "r3",
        MockFactory.createRikishi("r3", { heyaId: "heya1", style: "balanced" as any })
      );

      clearQueryCaches();
      const bias = getHeyaStyleBias(world, "heya1");
      expect(bias).toBe("neutral");
    });

    it("return type is StyleBias (never hybrid)", () => {
      const world = MockFactory.createWorld();
      const heya = MockFactory.createHeya("heya1");
      heya.rikishiIds = ["r1", "r2"];
      world.heyas.set("heya1", heya);

      world.rikishi.set("r1", MockFactory.createRikishi("r1", { heyaId: "heya1", style: "oshi" }));
      world.rikishi.set("r2", MockFactory.createRikishi("r2", { heyaId: "heya1", style: "yotsu" }));

      clearQueryCaches();
      const bias = getHeyaStyleBias(world, "heya1");
      expect(["oshi", "yotsu", "neutral"]).toContain(bias);
    });
  });
});
