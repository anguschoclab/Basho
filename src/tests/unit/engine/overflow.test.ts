import { describe, it, expect, beforeEach } from "vitest";
import { enforceHardCapRosterOverflow, HARD_CAP_ROSTER_SIZE } from "@/engine/overflow";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@/tests/unit/engine/utils";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import type { WorldState } from "@/engine/types/world";

describe("enforceHardCapRosterOverflow", () => {
  let world: WorldState;

  beforeEach(() => {
    world = makeMockWorld();
  });

  it("does nothing when heya is under HARD_CAP_ROSTER_SIZE", () => {
    const heya = makeMockHeya("heya-1", { rikishiIds: ["r1", "r2", "r3"] });
    world.heyas.set("heya-1", heya);
    for (let i = 1; i <= 3; i++) {
      world.rikishi.set(`r${i}`, mockRikishi(`r${i}`, { heyaId: "heya-1" }));
    }

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    const updatedHeya = newWorld.heyas.get("heya-1")!;
    expect(updatedHeya.rikishiIds).toHaveLength(3);
  });

  it("does nothing when heya has exactly HARD_CAP_ROSTER_SIZE", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE; i++) {
      const id = `r${i}`;
      ids.push(id);
      world.rikishi.set(id, mockRikishi(id, { heyaId: "heya-1" }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.get("heya-1")!.rikishiIds).toHaveLength(HARD_CAP_ROSTER_SIZE);
  });

  it("releases exactly overflowCount rikishi when over cap", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 3; i++) {
      const id = `r${i}`;
      ids.push(id);
      world.rikishi.set(id, mockRikishi(id, { heyaId: "heya-1", talentSeed: 50 }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.get("heya-1")!.rikishiIds).toHaveLength(HARD_CAP_ROSTER_SIZE);
  });

  it("retains high-potential rikishi (high talentSeed)", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 1; i++) {
      const id = `r${i}`;
      ids.push(id);
      const talentSeed = i === 0 ? 99 : 10;
      world.rikishi.set(id, mockRikishi(id, { heyaId: "heya-1", talentSeed }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    const remaining = newWorld.heyas.get("heya-1")!.rikishiIds ?? [];
    expect(remaining).toContain("r0");
  });

  it("releases low-potential rikishi preferentially", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 1; i++) {
      const id = `r${i}`;
      ids.push(id);
      const talentSeed = i === HARD_CAP_ROSTER_SIZE ? 1 : 80;
      world.rikishi.set(id, mockRikishi(id, { heyaId: "heya-1", talentSeed }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    const remaining = newWorld.heyas.get("heya-1")!.rikishiIds ?? [];
    const releasedId = ids.find((id) => !remaining.includes(id));
    expect(releasedId).toBe(`r${HARD_CAP_ROSTER_SIZE}`);
  });

  it("releases injured rikishi preferentially (injury penalty)", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 1; i++) {
      const id = `r${i}`;
      ids.push(id);
      const isInjured = i === HARD_CAP_ROSTER_SIZE;
      world.rikishi.set(
        id,
        mockRikishi(id, {
          heyaId: "heya-1",
          talentSeed: 50,
          injured: isInjured,
          injuryWeeksRemaining: isInjured ? 10 : 0,
        })
      );
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    const remaining = newWorld.heyas.get("heya-1")!.rikishiIds ?? [];
    const releasedId = ids.find((id) => !remaining.includes(id));
    expect(releasedId).toBe(`r${HARD_CAP_ROSTER_SIZE}`);
  });

  it("retains foreign rikishi (foreign retention bias)", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 1; i++) {
      const id = `r${i}`;
      ids.push(id);
      const isForeign = i === HARD_CAP_ROSTER_SIZE;
      world.rikishi.set(
        id,
        mockRikishi(id, {
          heyaId: "heya-1",
          talentSeed: 50,
          nationality: isForeign ? "MN" : "JP",
        })
      );
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    const remaining = newWorld.heyas.get("heya-1")!.rikishiIds ?? [];
    const releasedId = ids.find((id) => !remaining.includes(id));
    expect(releasedId).not.toBe(`r${HARD_CAP_ROSTER_SIZE}`);
  });

  it("logs ROSTER_OVERFLOW_RELEASE event", () => {
    const ids: string[] = [];
    for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 1; i++) {
      const id = `r${i}`;
      ids.push(id);
      world.rikishi.set(id, mockRikishi(id, { heyaId: "heya-1", talentSeed: 50 }));
    }
    const heya = makeMockHeya("heya-1", { rikishiIds: ids });
    world.heyas.set("heya-1", heya);

    const impact = enforceHardCapRosterOverflow(world);

    const releaseEvents = (impact.events ?? []).filter(
      (e) => e.type === "ROSTER_OVERFLOW_RELEASE"
    );
    expect(releaseEvents.length).toBe(1);
  });

  it("handles multiple overflowing heyas", () => {
    for (let h = 0; h < 2; h++) {
      const ids: string[] = [];
      for (let i = 0; i < HARD_CAP_ROSTER_SIZE + 2; i++) {
        const id = `h${h}-r${i}`;
        ids.push(id);
        world.rikishi.set(id, mockRikishi(id, { heyaId: `heya-${h}`, talentSeed: 50 }));
      }
      world.heyas.set(`heya-${h}`, makeMockHeya(`heya-${h}`, { rikishiIds: ids }));
    }

    const impact = enforceHardCapRosterOverflow(world);
    const newWorld = resolveImpacts(world, [impact]);

    expect(newWorld.heyas.get("heya-0")!.rikishiIds).toHaveLength(HARD_CAP_ROSTER_SIZE);
    expect(newWorld.heyas.get("heya-1")!.rikishiIds).toHaveLength(HARD_CAP_ROSTER_SIZE);

    const releaseEvents = (impact.events ?? []).filter(
      (e) => e.type === "ROSTER_OVERFLOW_RELEASE"
    );
    expect(releaseEvents.length).toBe(4);
  });
});
