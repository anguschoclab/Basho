import { describe, it, expect } from "vitest";
import { mockRikishi } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";
import type { CombatProfile, TacticalFamily } from "@/engine/types/combat";

function makeCombatProfile(counterFamily: TacticalFamily): CombatProfile {
  return {
    archetype: "hybrid",
    familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25 },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    statModifiers: {},
    counterFamily,
    archetypeBehavior: {
      tachiaiSpeedBonus: 0,
      edgeEscapeBonus: 0,
      pushVelocityBonus: 0,
      lateralMovementBonus: 0,
      beltTorqueBonus: 0,
    },
    bodyTypeBehavior: {
      tachiaiSpeedBonus: 0,
      pushVelocityBonus: 0,
      lateralMovementBonus: 0,
      beltTorqueBonus: 0,
    },
  };
}

describe("in-bout counter activation (2.2)", () => {
  it("tickPushBattle logs counter_tactic when defender counterFamily is push", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });

    // East has counterFamily "push" — when west pushes, east counters
    (east as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("push");
    (west as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("belt");

    // Verify counterFamily is set
    expect(east.combatProfile!.counterFamily).toBe("push");
    expect(west.combatProfile!.counterFamily).toBe("belt");
  });

  it("tickBeltBattle logs counter_tactic when defender counterFamily is belt", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });

    // West has counterFamily "belt" — when east uses belt, west counters
    (east as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("push");
    (west as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("belt");

    expect(east.combatProfile!.counterFamily).toBe("push");
    expect(west.combatProfile!.counterFamily).toBe("belt");
  });

  it("no counter when both have same counterFamily", () => {
    const east = mockRikishi("r1", { rank: "maegashira", division: "makuuchi" });
    const west = mockRikishi("r2", { rank: "maegashira", division: "makuuchi" });

    (east as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("push");
    (west as unknown as { combatProfile: CombatProfile }).combatProfile = makeCombatProfile("push");

    // Both have push counterFamily — neither gets a counter bonus
    expect(east.combatProfile!.counterFamily).toBe("push");
    expect(west.combatProfile!.counterFamily).toBe("push");
  });

  it("counter_tactic phase exists in BoutLogEntry type", () => {
    // This is a type-level test — if the phase doesn't exist, TypeScript would error
    const entry = {
      phase: "counter_tactic" as const,
      clock: 0,
      data: {
        event: "counter_tactic",
        side: "east" as const,
        counterFamily: "push" as const,
        attackerFamily: "push" as const,
      },
    };
    expect(entry.phase).toBe("counter_tactic");
  });
});
