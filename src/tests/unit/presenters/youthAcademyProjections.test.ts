import { describe, it, expect } from "vitest";
import { projectYouthAcademy } from "@/presenters/youthAcademyProjections";
import type { WorldState } from "@/engine/types/world";
import type { YouthAcademyState } from "@/engine/systems/recruitment/YouthAcademyService";

function makeWorld(academy?: YouthAcademyState, cash = 100_000): WorldState {
  return {
    seed: "test",
    year: 2024,
    heyas: new Map([
      ["h1", {
        id: "h1",
        name: "Test Heya",
        economics: { cash },
        youthAcademy: academy,
      } as any],
    ]),
    rikishi: new Map(),
    playerHeyaId: "h1",
  } as any;
}

describe("projectYouthAcademy", () => {
  it("returns null academy when not built", () => {
    const result = projectYouthAcademy(makeWorld(), "h1");
    expect(result.hasAcademy).toBe(false);
    expect(result.academy).toBeNull();
  });

  it("projects academy level and prospects", () => {
    const academy: YouthAcademyState = {
      level: 2,
      prospects: [
        { id: "p1", shikona: "Young Prospect", age: 15, region: "Japan", potential: 70, developmentPoints: 10, enrolledAtYear: 2024, enrolledAtWeek: 1 },
      ],
      totalGraduated: 3,
    };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.hasAcademy).toBe(true);
    expect(result.academy!.level).toBe(2);
    expect(result.academy!.prospectCount).toBe(1);
    expect(result.academy!.totalGraduated).toBe(3);
  });

  it("canUpgrade is true when below max level", () => {
    const academy: YouthAcademyState = { level: 1, prospects: [], totalGraduated: 0 };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.canUpgrade).toBe(true);
  });

  it("canUpgrade is false at max level", () => {
    const academy: YouthAcademyState = { level: 3, prospects: [], totalGraduated: 0 };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.canUpgrade).toBe(false);
  });

  it("shows upgrade cost for next level", () => {
    const academy: YouthAcademyState = { level: 1, prospects: [], totalGraduated: 0 };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.upgradeCost).toBe(150_000);
  });

  it("upgrade cost is 0 at max level", () => {
    const academy: YouthAcademyState = { level: 3, prospects: [], totalGraduated: 0 };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.upgradeCost).toBe(0);
  });

  it("shows max prospects based on level", () => {
    const academy: YouthAcademyState = { level: 1, prospects: [], totalGraduated: 0 };
    const result = projectYouthAcademy(makeWorld(academy), "h1");
    expect(result.academy!.maxProspects).toBe(3);
  });
});
