import { describe, it, expect } from "vitest";
import { recruitmentBalanceMultiplier } from "@/engine/systems/generation/competitiveBalance";
import { makeMockWorld, makeMockHeya, mockRikishi } from "../utils";

// This is a focused unit check on the multiplier ordering that the bid loop relies on.
describe("balanced bidding ordering", () => {
  it("weak stable's effective bid can overtake a strong stable's after the handicap", () => {
    const heyas = new Map();
    const rikishi = new Map();
    for (let i = 0; i < 8; i++) {
      const r = mockRikishi(`strong-s${i}`, { heyaId: "strong", division: "makuuchi" });
      rikishi.set(r.id, r);
    }
    heyas.set(
      "strong",
      makeMockHeya("strong", { rikishiIds: Array.from({ length: 8 }, (_, i) => `strong-s${i}`) })
    );
    heyas.set("weak", makeMockHeya("weak", { rikishiIds: [] }));
    const world = makeMockWorld({ heyas, rikishi });

    const rawStrongBid = 10_000_000; // strong stable can afford more
    const rawWeakBid = 7_000_000;
    const effStrong = rawStrongBid * recruitmentBalanceMultiplier(world, "strong");
    const effWeak = rawWeakBid * recruitmentBalanceMultiplier(world, "weak");
    expect(effWeak).toBeGreaterThan(effStrong);
  });
});
