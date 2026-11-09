import { describe, it, expect } from "vitest";
import { projectTsukebito } from "@/presenters/projections/tsukebitoProjections";
import { toIdMap } from "@/engine/utils/index";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";

function makeRikishi(
  id: string,
  rankNumber: number,
  heyaId: string,
  shikona?: string,
  rank = "makushita"
): Rikishi {
  return {
    id,
    shikona: shikona ?? `Rikishi ${id}`,
    heyaId,
    rankNumber,
    rank,
    isRetired: false,
  } as any;
}

function makeWorld(rikishi: Rikishi[] = [], playerHeyaId = "h1"): WorldState {
  return {
    seed: "test",
    year: 2024,
    heyas: new Map([["h1", { id: "h1" } as any]]),
    rikishi: toIdMap(rikishi),
    playerHeyaId,
  } as any;
}

describe("projectTsukebito", () => {
  it("returns empty when no rikishi in heya", () => {
    const result = projectTsukebito(makeWorld(), "h1");
    expect(result.assignments).toEqual([]);
    expect(result.eligibleSeniors).toEqual([]);
    expect(result.eligibleJuniors).toEqual([]);
  });

  it("identifies eligible seniors (sanyaku rank)", () => {
    const rikishi = [
      makeRikishi("s1", 1, "h1", "Yokozuna", "yokozuna"),
      // A maegashira is sekitori but NOT sanyaku — ineligible under the
      // corrected rank-metadata check (was admitted by rankNumber <= 3).
      makeRikishi("j1", 15, "h1", "Junior", "maegashira"),
    ];
    const result = projectTsukebito(makeWorld(rikishi), "h1");
    expect(result.eligibleSeniors).toHaveLength(1);
    expect(result.eligibleSeniors[0].shikona).toBe("Yokozuna");
  });

  it("identifies eligible juniors (non-sekitori rank)", () => {
    const rikishi = [
      makeRikishi("s1", 2, "h1", "Ozeki", "ozeki"),
      makeRikishi("j1", 20, "h1", "Junior 1"),
      makeRikishi("j2", 25, "h1", "Junior 2"),
    ];
    const result = projectTsukebito(makeWorld(rikishi), "h1");
    expect(result.eligibleJuniors).toHaveLength(2);
  });

  it("shows assignments when tsukebitoIds are set", () => {
    const senior = {
      ...makeRikishi("s1", 1, "h1", "Yokozuna", "yokozuna"),
      tsukebitoIds: ["j1"],
    };
    const junior = makeRikishi("j1", 20, "h1", "Junior");
    const result = projectTsukebito(makeWorld([senior, junior]), "h1");
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].tsukebito).toHaveLength(1);
    expect(result.assignments[0].tsukebito[0].shikona).toBe("Junior");
  });

  it("marks juniors as assigned when they have a senior", () => {
    const senior = {
      ...makeRikishi("s1", 1, "h1", "Yokozuna", "yokozuna"),
      tsukebitoIds: ["j1"],
    };
    const junior = makeRikishi("j1", 20, "h1", "Junior");
    const result = projectTsukebito(makeWorld([senior, junior]), "h1");
    const j = result.eligibleJuniors.find((j) => j.id === "j1");
    expect(j?.assignedTo).toBe("s1");
  });

  it("marks juniors as unassigned when no senior", () => {
    const junior = makeRikishi("j1", 20, "h1", "Junior");
    const result = projectTsukebito(makeWorld([junior]), "h1");
    const j = result.eligibleJuniors.find((j) => j.id === "j1");
    expect(j?.assignedTo).toBeNull();
  });

  it("filters to only the specified heya", () => {
    const senior = makeRikishi("s1", 1, "h2", "Other Heya Senior", "yokozuna");
    const junior = makeRikishi("j1", 20, "h2", "Other Junior");
    const result = projectTsukebito(makeWorld([senior, junior]), "h1");
    expect(result.eligibleSeniors).toHaveLength(0);
    expect(result.eligibleJuniors).toHaveLength(0);
  });
});
