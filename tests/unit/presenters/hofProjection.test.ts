/**
 * hofProjection.test.ts
 *
 * UIHofInductee must carry the ids its card needs to render ClickableName
 * links — heyaId for the stable and opponentId for each notable-bout opponent.
 */

import { describe, it, expect } from "vitest";
import { projectHOFUIDigest } from "@/presenters/projections/hofProjection";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { Rikishi } from "@/engine/types/rikishi";
import type { WorldState } from "@/engine/types/world";
import type { HoFInductee, HallOfFameState } from "@/engine/history/hallOfFame";

function worldWithInductee(): WorldState {
  const opponent = MockFactory.createRikishi({ id: "opp1", shikona: "Rival-yama" });
  const inductee = MockFactory.createRikishi({
    id: "ind1",
    shikona: "Legend-zan",
    heyaId: "h1",
    history: [
      { win: false, bashoId: "2025-1", kimarite: "yorikiri", opponentId: "opp1" },
      { win: true, bashoId: "2025-3", kimarite: "uwatenage", opponentId: "opp1" },
    ] as Rikishi["history"],
  });
  const inductees: HoFInductee[] = [
    {
      rikishiId: "ind1",
      shikona: "Legend-zan",
      category: "champion",
      inductionYear: 2026,
      stats: { highestRank: "yokozuna", careerWins: 500, careerLosses: 200 },
    } as HoFInductee,
  ];
  return MockFactory.createWorld({
    year: 2026,
    rikishi: new Map([
      ["ind1", inductee],
      ["opp1", opponent],
    ]),
    heyas: new Map([["h1", MockFactory.createHeya("h1", { name: "Test-beya" })]]),
    hallOfFame: {
      version: "1.0.0",
      lastProcessedYear: 2026,
      inductees,
      inducted: { "ind1::champion": true },
    } as HallOfFameState,
    history: [],
  } as Partial<WorldState>);
}

describe("projectHOFUIDigest — link ids", () => {
  it("carries heyaId and opponentId so the card can render ClickableName links", () => {
    const { inductees } = projectHOFUIDigest(worldWithInductee());
    expect(inductees).toHaveLength(1);
    expect(inductees[0].heyaId).toBe("h1");
    expect(inductees[0].greatestFights).toHaveLength(1);
    expect(inductees[0].greatestFights[0].opponentId).toBe("opp1");
    expect(inductees[0].greatestFights[0].opponentName).toBe("Rival-yama");
  });
});
