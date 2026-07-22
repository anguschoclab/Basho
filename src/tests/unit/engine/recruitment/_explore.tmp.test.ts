import { describe, it, expect } from "vitest";
import { getRecruitmentStrategy } from "@/engine/npcRecruitmentStrategy";
import { makeMockWorld, makeMockHeya } from "../utils";
import type { TalentCandidate } from "@/engine/types/talent";
import type { Oyakata } from "@/engine/types/oyakata";

function makeOyakata(heyaId: string): Oyakata {
  return {
    id: `oyakata-${heyaId}`, heyaId, name: `Oyakata-${heyaId}`, shikona: `Oyakata-${heyaId}`,
    age: 55, archetype: "traditionalist",
    traits: { ambition: 50, patience: 50, risk: 50, tradition: 50, compassion: 50 },
    yearsInCharge: 5,
  } as Oyakata;
}

describe("explore4", () => {
  it("sweep funds ratios (well above the 5M bid floor)", () => {
    const strategy = getRecruitmentStrategy("traditionalist");
    for (const [richFunds, poorFunds] of [
      [200_000_000, 100_000_000],
      [150_000_000, 100_000_000],
      [130_000_000, 100_000_000],
      [120_000_000, 100_000_000],
      [110_000_000, 100_000_000],
    ] as const) {
      const heyas = new Map([
        ["rich", makeMockHeya("rich", { funds: richFunds, rikishiIds: [] })],
        ["poor", makeMockHeya("poor", { funds: poorFunds, rikishiIds: [] })],
      ]);
      const candidates: Record<string, TalentCandidate> = {};
      for (let i = 0; i < 50; i++) candidates[`c${i}`] = { candidateId: `c${i}`, talentSeed: 80 } as unknown as TalentCandidate;
      const world = makeMockWorld({
        heyas, rikishi: new Map(),
        talentPool: { version: "1.0.0", lastYearlyRefreshYear: 2025, candidates, pools: {} as never },
      });
      let poorWins = 0;
      for (let i = 0; i < 50; i++) {
        const richBid = strategy.calculateMaxBid(world, world.heyas.get("rich")!, makeOyakata("rich"), `c${i}`, undefined);
        const poorBid = strategy.calculateMaxBid(world, world.heyas.get("poor")!, makeOyakata("poor"), `c${i}`, undefined);
        if (poorBid > richBid) poorWins++;
      }
      console.log(`rich=${richFunds} poor=${poorFunds} ratio=${(richFunds/poorFunds).toFixed(2)} poorWins=${poorWins}/50`);
    }
    expect(true).toBe(true);
  });
});
