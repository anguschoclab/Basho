import { describe, it, expect } from "vitest";
import {
  DefaultMediaStrategy,
  TraditionalistMediaStrategy,
  ScientistMediaStrategy,
  GamblerMediaStrategy,
  NurturerMediaStrategy,
  TyrantMediaStrategy,
  StrategistMediaStrategy,
  StrictMediaStrategy,
  IndulgentMediaStrategy,
} from "@/engine/npcMediaStrategy";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";

function makeWorldWithHeya(): WorldState {
  const heya = MockFactory.createHeya("h1");
  const oyakata = MockFactory.createOyakata("o1", { heyaId: "h1" });
  const world = MockFactory.createWorld({
    heyas: new Map([["h1", heya]]),
    oyakata: new Map([["o1", oyakata]]),
    events: { version: "1.0.0", log: [], dedupe: {} },
  });
  return world;
}

describe("npcMediaStrategy — EventBus migration", () => {
  it("DefaultMediaStrategy.evaluateMediaEventResponse returns StateImpact with events", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const result = DefaultMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    expect(result).toBeDefined();
    expect(result.events).toBeDefined();
    expect(result.events!.length).toBeGreaterThan(0);
  });

  it("DefaultMediaStrategy returns NPC_MANAGER_DECISION event with archetype, choice, reasoning", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const result = DefaultMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    const decisionEvent = result.events?.find((e) => e.type === "NPC_MANAGER_DECISION");
    expect(decisionEvent).toBeDefined();
    expect(decisionEvent?.data).toHaveProperty("archetype");
    expect(decisionEvent?.data).toHaveProperty("choice");
    expect(decisionEvent?.data).toHaveProperty("reasoning");
  });

  it("TraditionalistMediaStrategy returns impact with choice: apologize", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const result = TraditionalistMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    const decisionEvent = result.events?.find((e) => e.type === "NPC_MANAGER_DECISION");
    expect(decisionEvent?.data?.choice).toBe("apologize");
  });

  it("GamblerMediaStrategy returns impact with choice: deny", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const result = GamblerMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    const decisionEvent = result.events?.find((e) => e.type === "NPC_MANAGER_DECISION");
    expect(decisionEvent?.data?.choice).toBe("deny");
  });

  it("IndulgentMediaStrategy returns impact with choice: ignore", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const result = IndulgentMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    const decisionEvent = result.events?.find((e) => e.type === "NPC_MANAGER_DECISION");
    expect(decisionEvent?.data?.choice).toBe("ignore");
  });

  it("no direct EventBus calls — world.events log is NOT mutated", () => {
    const world = makeWorldWithHeya();
    const heya = world.heyas.get("h1")!;
    const oyakata = world.oyakata.get("o1")!;
    const initialLogLength = world.events?.log?.length ?? 0;

    DefaultMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    TraditionalistMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");
    GamblerMediaStrategy.evaluateMediaEventResponse(world, heya, oyakata, "event_1");

    expect(world.events?.log?.length ?? 0).toBe(initialLogLength);
  });
});
