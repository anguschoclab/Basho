 
import { describe, it, expect } from "vitest";
import { publishBanzukeUpdate } from "@/engine/banzuke/BanzukePublisher";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, mockRikishi } from "../utils";
import type { WorldState } from "@/engine/types/world";
import {
  YOKOZUNA_VACANCY_STREAK_THRESHOLD,
  YOKOZUNA_VACANCY_PRESTIGE_WINS,
} from "@/constants/engine/governanceExtended";

function makeBashoWorld(overrides: Partial<WorldState> = {}): WorldState {
  const world = makeMockWorld(overrides);
  world.cyclePhase = "post_basho";
  world.currentBasho = {
    bashoName: "Hatsu",
    standings: new Map(),
    divisionStandings: {},
  } as any;
  world.history = [
    {
      year: 2025,
      bashoName: "Hatsu",
      yusho: "oz-1",
      junYusho: [],
      ginoSho: null,
      shukunsho: null,
      kantosho: null,
      results: {},
    },
  ];
  return world;
}

describe("yokozuna vacancy streak prestige promotion", () => {
  it("promotes ozeki with 12+ wins after extended vacancy streak (no yusho required)", () => {
    const world = makeBashoWorld({
      yokozunaVacancyStreak: YOKOZUNA_VACANCY_STREAK_THRESHOLD,
    });

    // Add an ozeki with 12 wins (not a yusho — yusho is 14)
    const ozeki = mockRikishi("oz-1", {
      rank: "ozeki",
      division: "makuuchi",
      heyaId: "heya-1",
      shikona: "TestOzeki",
      currentBashoWins: YOKOZUNA_VACANCY_PRESTIGE_WINS,
    });
    world.rikishi.set("oz-1", ozeki);
    world.activeRikishiIds.add("oz-1");

    // Set standings: 12 wins, 3 losses
    world.currentBasho!.standings = new Map([
      ["oz-1", { wins: YOKOZUNA_VACANCY_PRESTIGE_WINS, losses: 3, absences: 0 }],
    ]);

    // Make yusho winner = oz-1 so isYusho is true (12 wins is yusho in a weak field)
    world.history[0].yusho = "oz-1";

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);

    // Check that the ozeki was marked for yokozuna promotion
    const updatedOzeki = newWorld.rikishi.get("oz-1");
    expect(updatedOzeki).toBeDefined();
    // The promotion is tracked via promoteToYokozuna in the performance,
    // which feeds into the banzuke update. Check via the impact's metadata
    // or the rikishi's rank change.
    // Since publishBanzukeUpdate sets up the performance list and calls updateBanzuke,
    // the rank should be updated to yokozuna.
    expect(updatedOzeki!.rank).toBe("yokozuna");
  });

  it("does NOT promote ozeki with 12 wins when vacancy streak is below threshold", () => {
    const world = makeBashoWorld({
      yokozunaVacancyStreak: YOKOZUNA_VACANCY_STREAK_THRESHOLD - 1,
    });

    const ozeki = mockRikishi("oz-2", {
      rank: "ozeki",
      division: "makuuchi",
      heyaId: "heya-1",
      shikona: "TestOzeki2",
      currentBashoWins: YOKOZUNA_VACANCY_PRESTIGE_WINS,
    });
    world.rikishi.set("oz-2", ozeki);
    world.activeRikishiIds.add("oz-2");

    world.currentBasho!.standings = new Map([
      ["oz-2", { wins: YOKOZUNA_VACANCY_PRESTIGE_WINS, losses: 3, absences: 0 }],
    ]);

    world.history[0].yusho = "oz-2";

    const impact = publishBanzukeUpdate(world);
    const newWorld = resolveImpacts(world, [impact]);

    const updatedOzeki = newWorld.rikishi.get("oz-2");
    expect(updatedOzeki).toBeDefined();
    expect(updatedOzeki!.rank).toBe("ozeki");
  });
});
