import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

describe("balanced bidding ordering", () => {
  it("weak stable's effective bid can overtake a strong stable's after the handicap", () => {
    const heyas = new Map();
    const rikishi = new Map();
    const strongIds: string[] = [];
    for (let i = 0; i < 8; i++) {
      const r = mockRikishi(`strong-s${i}`, { heyaId: "strong", division: "makuuchi" });
      rikishi.set(r.id, r); strongIds.push(r.id);
    }
    heyas.set("strong", makeMockHeya("strong", { rikishiIds: strongIds }));
    heyas.set("weak", makeMockHeya("weak", { rikishiIds: [] }));
    const world = makeMockWorld({ heyas, rikishi });

    const rawStrongBid = 10_000_000;
    const rawWeakBid = 7_000_000;
    const effStrong = rawStrongBid * recruitmentBalanceMultiplier(world, "strong");
    const effWeak = rawWeakBid * recruitmentBalanceMultiplier(world, "weak");
    expect(effWeak).toBeGreaterThan(effStrong);
  });
});
