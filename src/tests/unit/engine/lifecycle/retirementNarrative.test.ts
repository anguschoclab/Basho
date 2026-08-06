 
import { describe, it, expect } from "vitest";
import { generateRetirementNarrative } from "@/engine/lifecycle/retirementNarrative";
import { mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import type { Heya } from "@/engine/types/heya";

function makeWorld(year = 2025): WorldState {
  const heya = {
    id: "heya-r1",
    name: "Test Beya",
    rikishiIds: ["r1"],
    staffIds: [],
    funds: 5_000_000,
    reputation: 50,
    scandalScore: 0,
    governanceStatus: "good_standing" as const,
    politicalCapital: 50,
    koenkaiBand: "bronze" as const,
    facilities: { training: 50, recovery: 50, nutrition: 50, housing: 50 },
    riskIndicators: { financial: false, welfare: false, governance: false },
  } as unknown as Heya;
  return {
    year,
    heyas: new Map([["heya-r1", heya]]),
  } as unknown as WorldState;
}

describe("retirement narrative (6.2)", () => {
  it("generates multi-paragraph narrative for retiring rikishi", () => {
    const r = mockRikishi("r1", {
      rank: "ozeki",
      division: "makuuchi",
      careerWins: 400,
      careerLosses: 250,
      birthYear: 1985,
      pressPersona: "stoic",
    });
    const world = makeWorld(2025);
    const lines = generateRetirementNarrative(r, world, "retirement-test-seed");

    expect(lines.length).toBeGreaterThanOrEqual(3);
    const sections = lines.map((l) => l.section);
    expect(sections).toContain("ceremony");
    expect(sections).toContain("career_summary");
    expect(sections).toContain("legacy");
  });

  it("career summary includes win count", () => {
    const r = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerWins: 350,
      careerLosses: 200,
      birthYear: 1988,
    });
    const world = makeWorld(2025);
    const lines = generateRetirementNarrative(r, world, "retirement-wins-seed");
    const careerLine = lines.find((l) => l.section === "career_summary");

    expect(careerLine).toBeDefined();
    expect(careerLine!.text).toContain("350");
  });

  it("legacy includes highest rank", () => {
    const r = mockRikishi("r1", {
      rank: "ozeki",
      division: "makuuchi",
      careerWins: 500,
      careerLosses: 300,
      birthYear: 1985,
    });
    const world = makeWorld(2025);
    const lines = generateRetirementNarrative(r, world, "retirement-legacy-seed");
    const legacyLine = lines.find((l) => l.section === "legacy");

    expect(legacyLine).toBeDefined();
    expect(legacyLine!.text).toContain("ozeki");
  });

  it("press reaction varies by persona", () => {
    const stoic = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerWins: 200,
      careerLosses: 150,
      birthYear: 1990,
      pressPersona: "stoic",
    });
    const celebrity = mockRikishi("r2", {
      rank: "maegashira",
      division: "makuuchi",
      careerWins: 200,
      careerLosses: 150,
      birthYear: 1990,
      pressPersona: "celebrity",
    });
    const world = makeWorld(2025);
    const stoicLines = generateRetirementNarrative(stoic, world, "retirement-stoic-seed");
    const celebLines = generateRetirementNarrative(celebrity, world, "retirement-celeb-seed");

    const stoicPress = stoicLines.find((l) => l.section === "press_reaction");
    const celebPress = celebLines.find((l) => l.section === "press_reaction");

    expect(stoicPress).toBeDefined();
    expect(celebPress).toBeDefined();
    // Stoic and celebrity should have different press reactions
    expect(stoicPress!.text).not.toBe(celebPress!.text);
  });

  it("oyakata conversion mentioned when rikishi qualifies", () => {
    const r = mockRikishi("r1", {
      rank: "ozeki",
      division: "makuuchi",
      careerWins: 500,
      careerLosses: 300,
      birthYear: 1985,
    });
    const world = makeWorld(2025);
    const lines = generateRetirementNarrative(r, world, "retirement-oyakata-seed");
    const oyakataLine = lines.find((l) => l.section === "oyakata_conversion");

    expect(oyakataLine).toBeDefined();
  });

  it("no oyakata conversion when rikishi does not qualify", () => {
    const r = mockRikishi("r1", {
      rank: "maegashira",
      division: "makuuchi",
      careerWins: 50,
      careerLosses: 100,
      birthYear: 1995,
    });
    const world = makeWorld(2025);
    const lines = generateRetirementNarrative(r, world, "retirement-no-oyakata-seed");
    const oyakataLine = lines.find((l) => l.section === "oyakata_conversion");

    expect(oyakataLine).toBeUndefined();
  });
});
