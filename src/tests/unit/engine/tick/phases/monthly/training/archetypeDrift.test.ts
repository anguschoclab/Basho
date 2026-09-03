import { describe, it, expect, beforeEach } from "vitest";
import { processArchetypeDrift } from "@/engine/tick/phases/monthly/training/archetypeDrift";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import { createImpactBuilder, ImpactBuilder } from "@/engine/core/ImpactBuilder";

describe("processArchetypeDrift", () => {
  let world: WorldState;
  let builder: ImpactBuilder;

  beforeEach(() => {
    world = MockFactory.createWorld();
    builder = createImpactBuilder("test");
  });

  it("does nothing if there is no archetypeEvidence", () => {
    const rikishi = MockFactory.createRikishi("r-1");
    rikishi.archetypeEvidence = undefined as any;

    const result = processArchetypeDrift(world, rikishi, "r-1", builder);

    expect(result).toBe(false);
    expect(builder.build().events?.length).toBeFalsy();
  });

  it("changes archetype to oshi when push evidence >= 5 and push > grapple", () => {
    const rikishi = MockFactory.createRikishi("r-1");
    rikishi.combatProfile = { archetype: "hybrid" } as any;
    rikishi.archetypeEvidence = {
      push: { success: 6, fail: 1 },
      grapple: { success: 2, fail: 1 },
      evade: { success: 0, fail: 0 },
    };

    const result = processArchetypeDrift(world, rikishi, "r-1", builder);

    expect(result).toBe(true);
    expect(rikishi.combatProfile?.archetype).toBe("oshi");
    expect(rikishi.archetypeEvidence).toEqual({
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    });

    const events = builder.build().events;
    expect(events?.length).toBe(1);
    expect(events?.[0].type).toBe("TRAINING_UPDATE");
    expect(events?.[0].data.to).toBe("oshi");
  });

  it("changes archetype to yotsu when grapple evidence >= 5 and grapple > push", () => {
    const rikishi = MockFactory.createRikishi("r-1");
    rikishi.combatProfile = { archetype: "oshi" } as any;
    rikishi.archetypeEvidence = {
      push: { success: 3, fail: 1 },
      grapple: { success: 5, fail: 1 },
      evade: { success: 0, fail: 0 },
    };

    const result = processArchetypeDrift(world, rikishi, "r-1", builder);

    expect(result).toBe(true);
    expect(rikishi.combatProfile?.archetype).toBe("yotsu");
    expect(rikishi.archetypeEvidence).toEqual({
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    });

    const events = builder.build().events;
    expect(events?.length).toBe(1);
    expect(events?.[0].type).toBe("TRAINING_UPDATE");
    expect(events?.[0].data.to).toBe("yotsu");
  });

  it("does not change archetype and resets evidence when no clear majority >= 5", () => {
    const rikishi = MockFactory.createRikishi("r-1");
    rikishi.combatProfile = { archetype: "hybrid" } as any;
    rikishi.archetypeEvidence = {
      push: { success: 4, fail: 4 },
      grapple: { success: 4, fail: 4 },
      evade: { success: 0, fail: 0 },
    };

    const result = processArchetypeDrift(world, rikishi, "r-1", builder);

    expect(result).toBe(true);
    expect(rikishi.combatProfile?.archetype).toBe("hybrid");
    expect(rikishi.archetypeEvidence).toEqual({
      push: { success: 0, fail: 0 },
      grapple: { success: 0, fail: 0 },
      evade: { success: 0, fail: 0 },
    });

    const events = builder.build().events;
    expect(events).toBeUndefined(); // no event logged when it doesn't change
  });
});
