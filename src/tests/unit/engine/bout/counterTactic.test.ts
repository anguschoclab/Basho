import { describe, it, expect } from "vitest";
import {
  TACTIC_TO_FAMILY,
  COUNTER_TACTIC_BONUS,
  resolveCounterTacticBonus,
  type TacticalFamily,
  type CombatProfile,
  type CombatArchetype,
} from "@/engine/types/combat";

function makeProfile(prefs: Partial<Record<TacticalFamily, number>> = {}): CombatProfile {
  return {
    archetype: "hybrid" as CombatArchetype,
    familyPreferences: { push: 25, belt: 25, trick: 25, speed: 25, ...prefs },
    preferredGrip: "none",
    preferredGripDepth: "standard",
    statModifiers: {},
  };
}

describe("TACTIC_TO_FAMILY", () => {
  it("maps STANDARD to push", () => {
    expect(TACTIC_TO_FAMILY.STANDARD).toBe("push");
  });
  it("maps OSHI_THRUST to push", () => {
    expect(TACTIC_TO_FAMILY.OSHI_THRUST).toBe("push");
  });
  it("maps YOTSU_BELT to belt", () => {
    expect(TACTIC_TO_FAMILY.YOTSU_BELT).toBe("belt");
  });
  it("maps DEFENSIVE_PULL to trick", () => {
    expect(TACTIC_TO_FAMILY.DEFENSIVE_PULL).toBe("trick");
  });
  it("maps HENKA to trick", () => {
    expect(TACTIC_TO_FAMILY.HENKA).toBe("trick");
  });
  it("maps ALL_OUT to push", () => {
    expect(TACTIC_TO_FAMILY.ALL_OUT).toBe("push");
  });
});

describe("resolveCounterTacticBonus", () => {
  it("returns COUNTER_TACTIC_BONUS when countering", () => {
    // push counters belt: OSHI_THRUST (push) vs belt-dominant opponent
    const profile = makeProfile({ belt: 60, push: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("OSHI_THRUST", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("returns 0 when not countering", () => {
    // push does NOT counter push: OSHI_THRUST vs push-dominant opponent
    const profile = makeProfile({ push: 60, belt: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("OSHI_THRUST", profile)).toBe(0);
  });

  it("STANDARD (push) still counters belt-dominant opponent", () => {
    const profile = makeProfile({ belt: 60, push: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("STANDARD", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("returns bonus for YOTSU_BELT vs trick-dominant opponent", () => {
    // belt counters trick
    const profile = makeProfile({ trick: 60, push: 10, belt: 10, speed: 10 });
    expect(resolveCounterTacticBonus("YOTSU_BELT", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("returns bonus for DEFENSIVE_PULL vs push-dominant opponent", () => {
    // trick counters push
    const profile = makeProfile({ push: 60, belt: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("DEFENSIVE_PULL", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("returns bonus for HENKA vs push-dominant opponent", () => {
    // trick counters push
    const profile = makeProfile({ push: 60, belt: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("HENKA", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("returns 0 for YOTSU_BELT vs push-dominant opponent (belt does not counter push)", () => {
    const profile = makeProfile({ push: 60, belt: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("YOTSU_BELT", profile)).toBe(0);
  });

  it("picks highest familyPreferences as dominant", () => {
    // speed counters push and belt; speed is dominant
    const profile = makeProfile({ speed: 70, push: 50, belt: 30, trick: 10 });
    // ALL_OUT maps to push, push does NOT counter speed → 0
    expect(resolveCounterTacticBonus("ALL_OUT", profile)).toBe(0);
    // But if push is dominant instead:
    const profile2 = makeProfile({ push: 70, speed: 50, belt: 30, trick: 10 });
    // ALL_OUT (push) counters belt, but dominant is push, not belt → 0
    expect(resolveCounterTacticBonus("ALL_OUT", profile2)).toBe(0);
  });

  it("returns bonus when ALL_OUT counters belt-dominant opponent", () => {
    const profile = makeProfile({ belt: 70, push: 10, trick: 10, speed: 10 });
    expect(resolveCounterTacticBonus("ALL_OUT", profile)).toBe(COUNTER_TACTIC_BONUS);
  });

  it("is deterministic — same inputs produce same output", () => {
    const profile = makeProfile({ belt: 60, push: 10, trick: 10, speed: 10 });
    const a = resolveCounterTacticBonus("OSHI_THRUST", profile);
    const b = resolveCounterTacticBonus("OSHI_THRUST", profile);
    expect(a).toBe(b);
  });
});
