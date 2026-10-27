/**
 * dashboardProjections.test.ts
 *
 * Equivalence pins for projectBanzukeUIDigest division data:
 * divisionCounts = filled east/west slots per division,
 * totalWrestlerCount = their sum, divisionMap covers all divisions.
 */
import { describe, it, expect, vi } from "vitest";
import { projectBanzukeUIDigest } from "@/presenters/projections/dashboardProjections";
import { makeMockWorld, mockRikishi } from "@tests/unit/engine/utils";
import type { Rikishi } from "@/engine/types/rikishi";

vi.mock("@/presenters/rikishi/index", () => ({
  projectRosterEntry: vi.fn((r: Rikishi) => ({
    id: r.id,
    shikona: r.shikona,
    division: r.division,
    rank: r.rank,
    rankNumber: r.rankNumber ?? 1,
    side: r.side,
  })),
}));

function makeFixtureWorld() {
  const mk = (id: string, division: Rikishi["division"], rankNumber: number, side: Rikishi["side"]) =>
    mockRikishi(id, { heyaId: "h1", division, rankNumber, side });
  const rikishi = new Map<string, Rikishi>([
    ["m1", mk("m1", "makuuchi", 1, "east")],
    ["m2", mk("m2", "makuuchi", 1, "west")],
    ["m3", mk("m3", "makuuchi", 2, "east")],
    ["m4", mk("m4", "makuuchi", 2, "west")],
    ["j1", mk("j1", "juryo", 1, "east")],
    ["j2", mk("j2", "juryo", 2, "east")],
  ]);
  return makeMockWorld({ rikishi });
}

describe("projectBanzukeUIDigest — division counts", () => {
  it("counts filled east/west slots per division", () => {
    const digest = projectBanzukeUIDigest(makeFixtureWorld());
    expect(digest.divisionCounts.makuuchi).toBe(4);
    expect(digest.divisionCounts.juryo).toBe(2);
    expect(digest.divisionCounts.makushita).toBe(0);
    expect(digest.divisionCounts.sandanme).toBe(0);
    expect(digest.divisionCounts.jonidan).toBe(0);
    expect(digest.divisionCounts.jonokuchi).toBe(0);
    expect(digest.totalWrestlerCount).toBe(6);
  });

  it("populates divisionMap and divisions for all six divisions", () => {
    const digest = projectBanzukeUIDigest(makeFixtureWorld());
    expect(digest.divisions).toHaveLength(6);
    for (const dd of digest.divisions) {
      expect(digest.divisionMap.get(dd.division)).toBe(dd);
    }
    const makuuchi = digest.divisionMap.get("makuuchi");
    expect(makuuchi?.rows.length).toBeGreaterThan(0);
    expect(makuuchi?.rows[0].east?.id).toBe("m1");
    expect(makuuchi?.rows[0].west?.id).toBe("m2");
  });
});
