import { test, expect, describe } from "bun:test";
import { assignMentor, getMentor, menteesOf, ensureLineage } from "../lineage";
import { WorldState } from "../types/world";
import { Rikishi } from "../types/rikishi";

describe("lineage", () => {
  test("assigns and unassigns mentors", () => {
    const rikishiMap = new Map<string, Rikishi>();
    rikishiMap.set("m1", { id: "m1", shikona: "Mentor", heyaId: "h1" } as Rikishi);
    rikishiMap.set("m2", { id: "m2", shikona: "Mentee", heyaId: "h1" } as Rikishi);

    const world = {
      year: 2025,
      week: 1,
      rikishi: rikishiMap,
      lineage: [],
      rivalriesState: { pairs: {} }
    } as unknown as WorldState;

    const result = assignMentor(world, "m2", "m1");
    expect(result).toBe("Mentor is now mentoring Mentee.");

    const mentee = world.rikishi.get("m2")!;
    const mentor = world.rikishi.get("m1")!;

    expect(mentee.mentorId).toBe("m1");
    expect(mentor.menteeIds).toContain("m2");

    expect(getMentor(world, mentee)).toBe(mentor);
    expect(menteesOf(world, mentor)).toContain(mentee);
    expect(world.lineage?.length).toBe(1);
    expect(world.lineage?.[0].mentorId).toBe("m1");
    expect(world.lineage?.[0].menteeId).toBe("m2");

    // Reassign mentor
    world.rikishi.set("m3", { id: "m3", shikona: "New Mentor", heyaId: "h1" } as Rikishi);
    assignMentor(world, "m2", "m3");

    expect(mentee.mentorId).toBe("m3");
    expect(world.rikishi.get("m3")!.menteeIds).toContain("m2");
    expect(mentor.menteeIds).not.toContain("m2");
    expect(world.lineage?.length).toBe(1);
    expect(world.lineage?.[0].mentorId).toBe("m3");
  });
});
