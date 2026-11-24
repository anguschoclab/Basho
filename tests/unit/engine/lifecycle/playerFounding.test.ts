import { describe, it, expect } from "vitest";
import {
  evaluatePlayerFounding,
  foundPlayerStable,
} from "@/engine/lifecycle/playerFounding";
import { createImpactBuilder } from "@/engine/core/ImpactBuilder";
import { resolveImpacts } from "@/engine/core/ImpactResolver";
import { makeMockWorld, makeMockHeya, mockRikishi } from "@tests/unit/engine/utils";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import { FOUNDING_SEED_FUNDS, HEYA_COUNT_CAP } from "@/constants/engine/economic";

function playerWorld(overrides: {
  heyaFunds?: number;
  rosterIds?: string[];
  sanctioned?: boolean;
  heyaCount?: number;
}) {
  const rosterIds = overrides.rosterIds ?? ["r1", "r2", "r3", "r4"];
  const oyakata = MockFactory.createOyakata("player_o", {
    heyaId: "player_h",
    shikona: "Testmaster",
  });
  const heya = makeMockHeya("player_h", {
    oyakataId: "player_o",
    funds: overrides.heyaFunds ?? FOUNDING_SEED_FUNDS * 2,
    rikishiIds: rosterIds,
    ichimon: "Dewanoumi",
    welfareState: overrides.sanctioned
      ? ({ complianceState: "sanctioned", weeksInState: 30 } as never)
      : undefined,
  });
  const rikishi = new Map(
    rosterIds.map((id) => [
      id,
      mockRikishi(id, { heyaId: "player_h", division: "sandanme", rank: "sandanme" }),
    ])
  );
  // Pad the league so the count-gate is reachable independently of the roster.
  const heyas = new Map([["player_h", heya]]);
  for (let i = 0; i < (overrides.heyaCount ?? 20) - 1; i++) {
    heyas.set(`npc_${i}`, makeMockHeya(`npc_${i}`));
  }
  return makeMockWorld({
    year: 2026,
    heyas,
    rikishi,
    oyakata: new Map([["player_o", oyakata]]),
    playerHeyaId: "player_h",
    seed: "player-founding-seed",
  });
}

describe("evaluatePlayerFounding — gates", () => {
  it("allows a funded, unsanctioned, below-cap player stable", () => {
    const world = playerWorld({});
    expect(evaluatePlayerFounding(world).canFound).toBe(true);
  });

  it("rejects at the league cap", () => {
    const world = playerWorld({ heyaCount: HEYA_COUNT_CAP });
    expect(evaluatePlayerFounding(world).canFound).toBe(false);
  });

  it("rejects when the parent cannot bankroll the seed", () => {
    const world = playerWorld({ heyaFunds: FOUNDING_SEED_FUNDS - 1 });
    expect(evaluatePlayerFounding(world).canFound).toBe(false);
  });

  it("rejects a sanctioned stable — a disciplined house cannot branch", () => {
    const world = playerWorld({ sanctioned: true });
    expect(evaluatePlayerFounding(world).canFound).toBe(false);
  });
});

describe("foundPlayerStable — effects", () => {
  it("founds the branch, moves the player, seeds trustee on the old stable", () => {
    const world = playerWorld({});
    const builder = createImpactBuilder("test");
    expect(foundPlayerStable(world, builder)).toBe(true);
    const next = resolveImpacts(world, [builder.build()]);

    // Player moved to the new stable.
    const newHeyaId = next.playerHeyaId!;
    expect(newHeyaId).not.toBe("player_h");
    const newHeya = next.heyas.get(newHeyaId)!;
    expect(newHeya.branchedFromHeyaId).toBe("player_h");
    expect(newHeya.ichimon).toBe("Dewanoumi"); // inherits parent clan
    expect(newHeya.foundedYear).toBe(2026);
    expect(newHeya.oyakataId).toBe("player_o");
    expect(next.oyakata.get("player_o")?.heyaId).toBe(newHeyaId);

    // The old stable paid the seed and took a JSA caretaker.
    const old = next.heyas.get("player_h")!;
    expect(old.funds).toBe(FOUNDING_SEED_FUNDS);
    const trustee = next.oyakata.get(old.oyakataId!);
    expect(trustee?.isCaretaker).toBe(true);
    expect(old.oyakataId).not.toBe("player_o");

    // Unsalaried deshi followed the founder (≤ FOUNDING_FOLLOWER_MAX).
    expect(newHeya.rikishiIds!.length).toBeGreaterThan(0);
    for (const id of newHeya.rikishiIds!) {
      expect(next.rikishi.get(id)?.heyaId).toBe(newHeyaId);
    }
  });

  it("JSA-seeds a maezumo class when no deshi can follow", () => {
    const world = playerWorld({ rosterIds: [] });
    const builder = createImpactBuilder("test");
    expect(foundPlayerStable(world, builder)).toBe(true);
    const next = resolveImpacts(world, [builder.build()]);
    const newHeya = next.heyas.get(next.playerHeyaId!)!;
    expect(newHeya.rikishiIds!.length).toBeGreaterThanOrEqual(2);
    expect(newHeya.rikishiIds!.length).toBeLessThanOrEqual(3);
  });
});
