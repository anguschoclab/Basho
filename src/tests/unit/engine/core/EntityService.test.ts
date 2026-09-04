import { describe, it, expect, vi } from "vitest";
import { EntityService } from "@/engine/core/EntityService";
import type { WorldState } from "@/engine/types/world";

describe("EntityService", () => {
  describe("ensureState", () => {
    it("should create state if it does not exist", () => {
      const parent: any = {};
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureState(parent, "myState", factory);

      expect(result).toEqual({ val: 1 });
      expect(parent.myState).toEqual({ val: 1 });
    });

    it("should return existing state if it exists", () => {
      const parent: any = { myState: { val: 2 } };
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureState(parent, "myState", factory);

      expect(result).toEqual({ val: 2 });
      expect(parent.myState).toEqual({ val: 2 });
    });
  });

  describe("ensureNestedState", () => {
    it("should create root state and nested state if they do not exist", () => {
      const world = {} as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, "trainingState", "heya1", factory);

      expect(result).toEqual({ val: 1 });
      expect(world.trainingState).toBeDefined();
      expect((world.trainingState as any).get("heya1")).toEqual({ val: 1 });
    });

    it("should create nested state if root state exists but nested does not", () => {
      const world = { trainingState: new Map() } as unknown as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, "trainingState", "heya1", factory);

      expect(result).toEqual({ val: 1 });
      expect((world as any).trainingState.get("heya1")).toEqual({ val: 1 });
    });

    it("should return existing nested state if it exists", () => {
      const world = { trainingState: new Map([["heya1", { val: 2 }]]) } as unknown as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, "trainingState", "heya1", factory);

      expect(result).toEqual({ val: 2 });
      expect((world as any).trainingState.get("heya1")).toEqual({ val: 2 });
    });
  });

  describe("ensureNestedState — sparringPairs field", () => {
    it("should initialize sparringPairs as a Map", () => {
      const world = {} as WorldState;
      const factory = () => ({ val: 1 });
      const result = EntityService.ensureNestedState(world, "sparringPairs", "pair1", factory);

      expect(result).toEqual({ val: 1 });
      expect(world.sparringPairs).toBeInstanceOf(Map);
      expect((world.sparringPairs as any).get("pair1")).toEqual({ val: 1 });
    });
  });

  // ── Extended tests: type safety and Map/POJO initialization ──

  describe("ensureState — extended", () => {
    it("does not call factory when state already exists", () => {
      const parent: any = { myState: { val: 42 } };
      const factory = vi.fn(() => ({ val: 1 }));
      const result = EntityService.ensureState(parent, "myState", factory);

      expect(factory).not.toHaveBeenCalled();
      expect(result).toEqual({ val: 42 });
    });

    it("creates state via factory when missing", () => {
      const parent: any = {};
      const factory = vi.fn(() => ({ val: 99 }));
      const result = EntityService.ensureState(parent, "newKey", factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ val: 99 });
      expect(parent.newKey).toEqual({ val: 99 });
    });
  });

  describe("ensureNestedState — Map vs POJO initialization", () => {
    it("initializes rikishi root as a Map", () => {
      const world = {} as WorldState;
      EntityService.ensureNestedState(world, "rikishi", "r1", () => ({ id: "r1" }));

      expect(world.rikishi).toBeInstanceOf(Map);
    });

    it("initializes heyas root as a Map", () => {
      const world = {} as WorldState;
      EntityService.ensureNestedState(world, "heyas", "h1", () => ({ id: "h1" }));

      expect(world.heyas).toBeInstanceOf(Map);
    });

    it("returns existing nested entry without calling factory", () => {
      const world = { trainingState: new Map([["heya1", { val: 77 }]]) } as unknown as WorldState;
      const factory = vi.fn(() => ({ val: 1 }));
      const result = EntityService.ensureNestedState(world, "trainingState", "heya1", factory);

      expect(factory).not.toHaveBeenCalled();
      expect(result).toEqual({ val: 77 });
    });

    it("creates nested entry via factory when missing from existing root", () => {
      const world = { trainingState: new Map() } as unknown as WorldState;
      const factory = vi.fn(() => ({ val: 55 }));
      const result = EntityService.ensureNestedState(world, "trainingState", "newHeya", factory);

      expect(factory).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ val: 55 });
    });

    it("sparringPairs Map supports .set() and .get() after initialization", () => {
      const world = {} as WorldState;
      EntityService.ensureNestedState(world, "sparringPairs", "pair1", () => ({
        pairs: [],
      }));

      expect(world.sparringPairs).toBeInstanceOf(Map);
      expect((world.sparringPairs as any).get("pair1")).toEqual({ pairs: [] });
      // Verify Map API works
      (world.sparringPairs as any).set("pair2", { pairs: [{ key: "a|b" }] });
      expect((world.sparringPairs as any).get("pair2")).toEqual({ pairs: [{ key: "a|b" }] });
    });

    it("closedHeyas root is initialized as a Map", () => {
      const world = {} as WorldState;
      EntityService.ensureNestedState(world, "closedHeyas", "h1", () => ({ closed: true }));

      expect(world.closedHeyas).toBeInstanceOf(Map);
    });

    it("historicalRikishi root is initialized as a Map", () => {
      const world = {} as WorldState;
      EntityService.ensureNestedState(
        world,
        "historicalRikishi",
        "r1",
        () => ({ id: "r1" }) as any
      );

      expect(world.historicalRikishi).toBeInstanceOf(Map);
    });
  });
});
