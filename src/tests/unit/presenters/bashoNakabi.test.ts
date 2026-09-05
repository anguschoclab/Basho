import { describe, it, expect } from "vitest";
import { projectBashoUIDigest } from "@/presenters/projections/bashoProjections";
import { NAKABI_DAY } from "@/engine/systems/basho/NakabiService";
import { mockRikishi, makeMockWorld } from "../engine/utils";
import type { BashoState } from "@/engine/types/basho";
import type { WorldState } from "@/engine/types/world";

function makeBasho(day: number): Partial<BashoState> {
  return {
    year: 2024,
    bashoNumber: 1,
    bashoName: "hatsu",
    day,
    isActive: true,
    schedule: [],
    results: new Map(),
  };
}

function makeWorld(day: number): WorldState {
  const basho = makeBasho(day) as BashoState;
  const r1 = mockRikishi("r1", { shikona: "Rikishi 1" });
  const r2 = mockRikishi("r2", { shikona: "Rikishi 2" });
  return makeMockWorld({
    currentBasho: basho,
    rikishi: new Map([[r1.id, r1], [r2.id, r2]]),
  });
}

describe("projectBashoUIDigest — nakabi day", () => {
  it("sets isNakabiDay=true when day is 8", () => {
    const world = makeWorld(NAKABI_DAY);
    const digest = projectBashoUIDigest(world);
    expect(digest).not.toBeNull();
    expect(digest!.isNakabiDay).toBe(true);
    expect(digest!.day).toBe(NAKABI_DAY);
  });

  it("sets isNakabiDay=false when day is not 8", () => {
    const world = makeWorld(5);
    const digest = projectBashoUIDigest(world);
    expect(digest).not.toBeNull();
    expect(digest!.isNakabiDay).toBe(false);
  });

  it("sets isNakabiDay=false on day 7 (just before nakabi)", () => {
    const world = makeWorld(7);
    const digest = projectBashoUIDigest(world);
    expect(digest!.isNakabiDay).toBe(false);
  });

  it("sets isNakabiDay=false on day 9 (just after nakabi)", () => {
    const world = makeWorld(9);
    const digest = projectBashoUIDigest(world);
    expect(digest!.isNakabiDay).toBe(false);
  });

  it("still sets isKeyDay=true on day 8 (day 8 is a key day)", () => {
    const world = makeWorld(NAKABI_DAY);
    const digest = projectBashoUIDigest(world);
    expect(digest!.isKeyDay).toBe(true);
    expect(digest!.isNakabiDay).toBe(true);
  });
});
