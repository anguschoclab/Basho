import { describe, it, expect, vi } from "vitest";
import { gameReducer } from "../gameReducer";
import { initialGameState } from "../gameTypes";
import type { GameAction } from "../gameTypes";
import { generateInitialWorld } from "@/engine/systems/generation/WorldFactory";
import * as uiDigestModule from "@/presenters/uiDigest";

vi.mock("@/presenters/uiDigest", () => ({
  buildWeeklyDigest: vi.fn().mockReturnValue({}),
}));

/**
 * Helper: pre-generate the world so we can pick a real heyaId.
 * The reducer uses the same seed, so heya IDs will match.
 */
function getFirstHeyaId(seed: string): string {
  const world = generateInitialWorld(seed);
  return [...world.heyas.keys()][0];
}

describe("CREATE_WORLD without oyakataConfig", () => {
  it("creates a world (state.world is not null)", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: "core-test-1" } as GameAction
    );
    expect(next.world).not.toBeNull();
  });

  it("playerOyakataId is null when no playerHeyaId is provided", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: "core-test-2" } as GameAction
    );
    expect(next.playerOyakataId).toBeNull();
  });

  it("phase is 'menu' when no playerHeyaId is provided", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: "core-test-3" } as GameAction
    );
    expect(next.phase).toBe("menu");
  });

  it("succeeds without oyakataConfig (backward compat)", () => {
    expect(() =>
      gameReducer(
        initialGameState,
        { type: "CREATE_WORLD", seed: "core-compat-seed" } as GameAction
      )
    ).not.toThrow();
  });
});

describe("CREATE_WORLD with playerHeyaId", () => {
  const SEED = "core-heya-test";
  const playerHeyaId = getFirstHeyaId(SEED);

  it("playerOyakataId is populated when playerHeyaId is given", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: SEED, playerHeyaId } as GameAction
    );
    expect(next.playerOyakataId).not.toBeNull();
  });

  it("playerOyakataId matches the heya's oyakataId", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: SEED, playerHeyaId } as GameAction
    );
    const oyakataIdFromHeya = next.world!.heyas.get(playerHeyaId)?.oyakataId;
    expect(next.playerOyakataId).toBe(oyakataIdFromHeya);
  });

  it("phase is 'interim' when playerHeyaId is given", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: SEED, playerHeyaId } as GameAction
    );
    expect(next.phase).toBe("interim");
  });

  it("playerHeyaId is stored in state", () => {
    const next = gameReducer(
      initialGameState,
      { type: "CREATE_WORLD", seed: SEED, playerHeyaId } as GameAction
    );
    expect(next.playerHeyaId).toBe(playerHeyaId);
  });
});

describe("CREATE_WORLD with playerHeyaId + oyakataConfig", () => {
  const SEED = "core-oyakata-cfg";
  const playerHeyaId = getFirstHeyaId(SEED);
  const OYAKATA_NAME = "Testoyama";

  it("oyakata name in world matches config name", () => {
    const next = gameReducer(
      initialGameState,
      {
        type: "CREATE_WORLD",
        seed: SEED,
        playerHeyaId,
        oyakataConfig: { name: OYAKATA_NAME, backstoryId: "ozeki_legend" },
      } as GameAction
    );
    const oyakataId = next.world!.heyas.get(playerHeyaId)?.oyakataId!;
    expect(next.world!.oyakata.get(oyakataId)?.name).toBe(OYAKATA_NAME);
  });

  it("oyakata backstoryId is set from config", () => {
    const next = gameReducer(
      initialGameState,
      {
        type: "CREATE_WORLD",
        seed: SEED,
        playerHeyaId,
        oyakataConfig: { name: OYAKATA_NAME, backstoryId: "sanyaku_veteran" },
      } as GameAction
    );
    const oyakataId = next.world!.heyas.get(playerHeyaId)?.oyakataId!;
    expect(next.world!.oyakata.get(oyakataId)?.backstoryId).toBe("sanyaku_veteran");
  });

  it("heya funds increase by the backstory bonus", () => {
    const worldBefore = generateInitialWorld(SEED);
    const originalFunds = worldBefore.heyas.get(playerHeyaId)?.funds ?? 0;

    const next = gameReducer(
      initialGameState,
      {
        type: "CREATE_WORLD",
        seed: SEED,
        playerHeyaId,
        oyakataConfig: { name: OYAKATA_NAME, backstoryId: "yokozuna_champion" },
      } as GameAction
    );

    // yokozuna_champion gives +3_000_000
    const updatedFunds = next.world!.heyas.get(playerHeyaId)?.funds ?? 0;
    expect(updatedFunds).toBeGreaterThan(originalFunds);
  });

  it("playerOyakataId is populated after applying oyakataConfig", () => {
    const next = gameReducer(
      initialGameState,
      {
        type: "CREATE_WORLD",
        seed: SEED,
        playerHeyaId,
        oyakataConfig: { name: OYAKATA_NAME, backstoryId: "council_elder" },
      } as GameAction
    );
    expect(next.playerOyakataId).not.toBeNull();
    // And it should point to a real oyakata entry
    expect(next.world!.oyakata.has(next.playerOyakataId!)).toBe(true);
  });

  it("ichimon in config is applied to the player's heya", () => {
    const next = gameReducer(
      initialGameState,
      {
        type: "CREATE_WORLD",
        seed: SEED,
        playerHeyaId,
        oyakataConfig: {
          name: OYAKATA_NAME,
          backstoryId: "international_scout",
          ichimon: "Takasago",
        },
      } as GameAction
    );
    expect(next.world!.heyas.get(playerHeyaId)?.ichimon).toBe("Takasago");
  });
});
