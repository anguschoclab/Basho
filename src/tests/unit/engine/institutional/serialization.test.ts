/**
 * WS5 — Institutional state persistence.
 */

import { describe, it, expect } from "vitest";
import { SerializationService } from "@/engine/persistence/SerializationService";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Oyakata } from "@/engine/types/oyakata";

describe("institutional state round-trip", () => {
  it("oyakata.tenure survives save/load", () => {
    const world = MockFactory.createWorld();
    world.oyakata.set("o1", {
      id: "o1",
      heyaId: "h1",
      archetype: "traditionalist",
      traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
      age: 55,
      yearsInCharge: 4,
      shikona: "Oya",
      name: "Oya",
      tenure: {
        startedYear: 2,
        bashoServed: 7,
        championships: 1,
        sekitoriProduced: 2,
        insolvencyEvents: 0,
        majorScandals: 1,
        forcedMergers: 0,
      },
    } as unknown as Oyakata);
    const back = SerializationService.deserializeWorld(SerializationService.serializeWorld(world));
    expect(back.oyakata.get("o1")!.tenure).toEqual(world.oyakata.get("o1")!.tenure);
  });

  it("heya.legacyModifier and world.factionPostures survive save/load", () => {
    const world = MockFactory.createWorld();
    const h = MockFactory.createHeya("h1", {});
    h.legacyModifier = { planFamilyBias: "rebuilding", bashoRemaining: 2 };
    world.heyas.set("h1", h);
    world.factionPostures = {
      Dewanoumi: { posture: "coordinated_pressure", targetHeyaId: "h-x", setWeek: 9 },
    };
    const back = SerializationService.deserializeWorld(SerializationService.serializeWorld(world));
    expect(back.heyas.get("h1")!.legacyModifier).toEqual(h.legacyModifier);
    expect(back.factionPostures).toEqual(world.factionPostures);
  });
});
