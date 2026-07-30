/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect } from "vitest";
import { provideEncouragement, canEncourage } from "@/engine/actions/InjuredEncouragement";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";

function makeWorld(): WorldState {
  return {
    seed: "test-encouragement",
    year: 2025,
    week: 1,
    dayIndexGlobal: 1,
    cyclePhase: "interim",
    heyas: new Map(),
    rikishi: new Map(),
    oyakata: new Map(),
    activeRikishiIds: new Set(),
  } as any;
}

describe("Injured Encouragement System (B6)", () => {
  it("canEncourage returns true when from is injured and to is active, same heya", () => {
    const from = mockRikishi("enc-1", { injured: true, heyaId: "heya-1", isRetired: false } as any);
    const to = mockRikishi("enc-2", { injured: false, heyaId: "heya-1", isRetired: false } as any);
    expect(canEncourage(from, to)).toBe(true);
  });

  it("canEncourage returns false when from is not injured", () => {
    const from = mockRikishi("enc-3", { injured: false, heyaId: "heya-1" } as any);
    const to = mockRikishi("enc-4", { injured: false, heyaId: "heya-1" } as any);
    expect(canEncourage(from, to)).toBe(false);
  });

  it("canEncourage returns false when from is retired", () => {
    const from = mockRikishi("enc-5", { injured: true, isRetired: true, heyaId: "heya-1" } as any);
    const to = mockRikishi("enc-6", { injured: false, heyaId: "heya-1" } as any);
    expect(canEncourage(from, to)).toBe(false);
  });

  it("canEncourage returns false when in different heya", () => {
    const from = mockRikishi("enc-7", { injured: true, heyaId: "heya-1" } as any);
    const to = mockRikishi("enc-8", { injured: false, heyaId: "heya-2" } as any);
    expect(canEncourage(from, to)).toBe(false);
  });

  it("canEncourage returns false when to is injured", () => {
    const from = mockRikishi("enc-9", { injured: true, heyaId: "heya-1" } as any);
    const to = mockRikishi("enc-10", { injured: true, heyaId: "heya-1" } as any);
    expect(canEncourage(from, to)).toBe(false);
  });

  it("provideEncouragement gives +3 motivation to recipient", () => {
    const from = mockRikishi("enc-11", {
      injured: true, heyaId: "heya-1", shikona: "InjuredMan", motivation: 50,
    } as any);
    const to = mockRikishi("enc-12", {
      injured: false, heyaId: "heya-1", shikona: "ActiveMan", motivation: 50,
    } as any);
    const world = makeWorld();

    const impact = provideEncouragement(world, from, to, "2025-hatsu");
    const updates = impact.entities?.rikishiUpdates?.get("enc-12");
    expect(updates).toBeDefined();
    expect(updates!.motivation).toBe(53); // +3
  });

  it("provideEncouragement creates encouragementLog entry", () => {
    const from = mockRikishi("enc-13", {
      injured: true, heyaId: "heya-1", shikona: "InjuredMan",
    } as any);
    const to = mockRikishi("enc-14", {
      injured: false, heyaId: "heya-1", shikona: "ActiveMan",
    } as any);
    const world = makeWorld();

    const impact = provideEncouragement(world, from, to, "2025-natsu");
    const worldFields = impact.worldFields as any;
    expect(worldFields).toBeDefined();
    expect(worldFields.encouragementLog).toBeDefined();
    expect(worldFields.encouragementLog).toHaveLength(1);
    expect(worldFields.encouragementLog[0].from).toBe("enc-13");
    expect(worldFields.encouragementLog[0].to).toBe("enc-14");
    expect(worldFields.encouragementLog[0].basho).toBe("2025-natsu");
  });

  it("provideEncouragement appends to existing encouragementLog", () => {
    const from = mockRikishi("enc-15", {
      injured: true, heyaId: "heya-1", shikona: "InjuredMan",
    } as any);
    const to = mockRikishi("enc-16", {
      injured: false, heyaId: "heya-1", shikona: "ActiveMan",
    } as any);
    const world = makeWorld();
    world.encouragementLog = [{ from: "other", to: "other2", basho: "2024-hatsu" }];

    const impact = provideEncouragement(world, from, to, "2025-haru");
    const worldFields = impact.worldFields as any;
    expect(worldFields.encouragementLog).toHaveLength(2);
  });

  it("provideEncouragement logs a narrative event", () => {
    const from = mockRikishi("enc-17", {
      injured: true, heyaId: "heya-1", shikona: "InjuredMan",
    } as any);
    const to = mockRikishi("enc-18", {
      injured: false, heyaId: "heya-1", shikona: "ActiveMan",
    } as any);
    const world = makeWorld();

    const impact = provideEncouragement(world, from, to, "2025-akyu");
    const events = impact.events ?? [];
    const encEvent = events.find((e: any) => e.data?.eventId === "injured_encouragement");
    expect(encEvent).toBeDefined();
  });
});
