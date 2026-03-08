// gameReducer.test.ts — Unit tests for each GameAction type
import { describe, it, expect, vi, beforeEach } from "vitest";
import { gameReducer } from "../gameReducer";
import { initialGameState, type GameState } from "../gameTypes";
import type { WorldState } from "@/engine/types";

// Mock heavy engine modules to keep tests fast and isolated
vi.mock("@/engine/worldgen", () => ({
  generateWorld: vi.fn(({ seed }: { seed: string }) => {
    const heyas = new Map();
    heyas.set("heya-1", { id: "heya-1", name: "Test Heya", isPlayerOwned: false });
    heyas.set("heya-2", { id: "heya-2", name: "Rival Heya", isPlayerOwned: false });
    const rikishi = new Map();
    rikishi.set("r-1", { id: "r-1", shikona: "Taro", division: "makuuchi", isRetired: false });
    return {
      seed,
      heyas,
      rikishi,
      currentBashoName: "hatsu",
      cyclePhase: "interim",
      playerHeyaId: undefined,
    } as unknown as WorldState;
  }),
}));

vi.mock("@/engine/world", () => ({
  startBasho: vi.fn(),
  advanceBashoDay: vi.fn(),
  simulateBoutForToday: vi.fn(() => ({ result: { winnerId: "r-1", loserId: "r-2" } })),
  endBasho: vi.fn(),
  publishBanzukeUpdate: vi.fn(),
  advanceInterim: vi.fn(),
  advanceDay: vi.fn(),
}));

vi.mock("../gameHelpers", () => ({
  autosaveWithSignal: vi.fn(() => true),
}));

// Helper to build a state with a mock world already loaded
function stateWithWorld(overrides: Partial<WorldState> = {}): GameState {
  const heyas = new Map();
  heyas.set("heya-1", { id: "heya-1", name: "Test Heya", isPlayerOwned: true });
  const rikishi = new Map();
  rikishi.set("r-1", { id: "r-1", shikona: "Taro", division: "makuuchi" });
  const standings = new Map();
  standings.set("r-1", { wins: 5, losses: 2 });

  const world = {
    seed: "test",
    heyas,
    rikishi,
    currentBashoName: "hatsu",
    cyclePhase: "interim" as const,
    playerHeyaId: "heya-1",
    currentBasho: null,
    ...overrides,
  } as unknown as WorldState;

  return { ...initialGameState, world, playerHeyaId: "heya-1", phase: "interim" };
}

function stateInBasho(): GameState {
  const base = stateWithWorld({
    cyclePhase: "active_basho" as any,
    currentBasho: { day: 3, matches: [], standings: new Map() } as any,
  });
  return { ...base, phase: "day_preview" };
}

describe("gameReducer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // === Pure navigation / selection actions ===

  it("SET_PHASE updates phase", () => {
    const result = gameReducer(initialGameState, { type: "SET_PHASE", phase: "banzuke" });
    expect(result.phase).toBe("banzuke");
  });

  it("SELECT_RIKISHI sets id and navigates to rikishi phase", () => {
    const result = gameReducer(stateWithWorld(), { type: "SELECT_RIKISHI", id: "r-1" });
    expect(result.selectedRikishiId).toBe("r-1");
    expect(result.phase).toBe("rikishi");
  });

  it("SELECT_RIKISHI with null keeps current phase", () => {
    const s = { ...stateWithWorld(), phase: "banzuke" as const };
    const result = gameReducer(s, { type: "SELECT_RIKISHI", id: null });
    expect(result.selectedRikishiId).toBeNull();
    expect(result.phase).toBe("banzuke");
  });

  it("SELECT_HEYA sets id and navigates to stable phase", () => {
    const result = gameReducer(stateWithWorld(), { type: "SELECT_HEYA", id: "heya-1" });
    expect(result.selectedHeyaId).toBe("heya-1");
    expect(result.phase).toBe("stable");
  });

  it("SET_AUTO_PLAY toggles flag", () => {
    const result = gameReducer(initialGameState, { type: "SET_AUTO_PLAY", value: true });
    expect(result.isAutoPlaying).toBe(true);
  });

  // === World creation & loading ===

  it("CREATE_WORLD generates world and sets interim phase when playerHeyaId provided", () => {
    const result = gameReducer(initialGameState, {
      type: "CREATE_WORLD",
      seed: "abc",
      playerHeyaId: "heya-1",
    });
    expect(result.world).not.toBeNull();
    expect(result.playerHeyaId).toBe("heya-1");
    expect(result.phase).toBe("interim");
  });

  it("CREATE_WORLD without playerHeyaId stays at menu", () => {
    const result = gameReducer(initialGameState, { type: "CREATE_WORLD", seed: "abc" });
    expect(result.world).not.toBeNull();
    expect(result.playerHeyaId).toBeNull();
    expect(result.phase).toBe("menu");
  });

  it("SET_PLAYER_HEYA marks heya as owned and transitions to interim", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "SET_PLAYER_HEYA", heyaId: "heya-1" });
    expect(result.playerHeyaId).toBe("heya-1");
    expect(result.phase).toBe("interim");
    expect(result.world?.playerHeyaId).toBe("heya-1");
  });

  it("SET_PLAYER_HEYA is no-op without world", () => {
    const result = gameReducer(initialGameState, { type: "SET_PLAYER_HEYA", heyaId: "heya-1" });
    expect(result).toBe(initialGameState);
  });

  it("LOAD_WORLD sets world and derives phase from playerHeyaId", () => {
    const world = stateWithWorld().world!;
    const result = gameReducer(initialGameState, { type: "LOAD_WORLD", world });
    expect(result.world).toBe(world);
    expect(result.playerHeyaId).toBe("heya-1");
    expect(result.phase).toBe("interim");
  });

  it("LOAD_WORLD without playerHeyaId goes to menu", () => {
    const world = { ...stateWithWorld().world!, playerHeyaId: undefined } as WorldState;
    const result = gameReducer(initialGameState, { type: "LOAD_WORLD", world });
    expect(result.phase).toBe("menu");
  });

  it("UPDATE_WORLD replaces world object", () => {
    const newWorld = stateWithWorld().world!;
    const result = gameReducer(initialGameState, { type: "UPDATE_WORLD", world: newWorld });
    expect(result.world).toBe(newWorld);
  });

  // === Basho lifecycle ===

  it("START_BASHO transitions to day_preview and resets bout state", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "START_BASHO" });
    expect(result.phase).toBe("day_preview");
    expect(result.currentBoutIndex).toBe(0);
    expect(result.lastBoutResult).toBeNull();
  });

  it("START_BASHO is no-op without world", () => {
    const result = gameReducer(initialGameState, { type: "START_BASHO" });
    expect(result).toBe(initialGameState);
  });

  it("ADVANCE_DAY transitions to day_preview when day <= 15", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "ADVANCE_DAY" });
    // Mock doesn't change day, so day stays <= 15
    expect(result.phase).toBe("day_preview");
    expect(result.currentBoutIndex).toBe(0);
  });

  it("ADVANCE_DAY is no-op without currentBasho", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "ADVANCE_DAY" });
    expect(result).toBe(s);
  });

  it("SIMULATE_BOUT increments bout index and stores result", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "SIMULATE_BOUT", boutIndex: 0 });
    expect(result.currentBoutIndex).toBe(1);
    expect(result.lastBoutResult).toEqual({ winnerId: "r-1", loserId: "r-2" });
  });

  it("SIMULATE_BOUT is no-op without currentBasho", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "SIMULATE_BOUT", boutIndex: 0 });
    expect(result).toBe(s);
  });

  it("SIMULATE_ALL_BOUTS transitions to day_results", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "SIMULATE_ALL_BOUTS" });
    expect(result.phase).toBe("day_results");
    expect(result.lastBoutResult).not.toBeNull();
  });

  it("END_DAY sets phase to day_results", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "END_DAY" });
    expect(result.phase).toBe("day_results");
  });

  it("END_BASHO transitions to basho_recap and resets bout state", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "END_BASHO" });
    expect(result.phase).toBe("basho_recap");
    expect(result.currentBoutIndex).toBe(0);
    expect(result.lastBoutResult).toBeNull();
  });

  it("END_BASHO is no-op without currentBasho", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "END_BASHO" });
    expect(result).toBe(s);
  });

  it("SIM_FULL_BASHO transitions to basho_results", () => {
    const s = stateInBasho();
    const result = gameReducer(s, { type: "SIM_FULL_BASHO" });
    expect(result.phase).toBe("basho_results");
  });

  // === Interim actions ===

  it("ADVANCE_INTERIM sets phase based on cyclePhase", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "ADVANCE_INTERIM", weeks: 1 });
    expect(result.phase).toBe("interim"); // cyclePhase is "interim" in mock
  });

  it("ADVANCE_INTERIM is no-op without world", () => {
    const result = gameReducer(initialGameState, { type: "ADVANCE_INTERIM", weeks: 1 });
    expect(result).toBe(initialGameState);
  });

  it("ADVANCE_ONE_DAY sets phase based on cyclePhase", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "ADVANCE_ONE_DAY" });
    expect(result.phase).toBe("interim");
  });

  it("ADVANCE_ONE_DAY is no-op without world", () => {
    const result = gameReducer(initialGameState, { type: "ADVANCE_ONE_DAY" });
    expect(result).toBe(initialGameState);
  });

  // === Holiday & Auto-Sim ===

  it("RUN_HOLIDAY sets phase based on cyclePhase", () => {
    const s = stateWithWorld();
    const result = gameReducer(s, { type: "RUN_HOLIDAY", result: {} as any });
    expect(result.phase).toBe("interim");
  });

  it("RUN_HOLIDAY is no-op without world", () => {
    const result = gameReducer(initialGameState, { type: "RUN_HOLIDAY", result: {} as any });
    expect(result).toBe(initialGameState);
  });

  it("RUN_AUTO_SIM replaces world from result", () => {
    const finalWorld = stateWithWorld().world!;
    const result = gameReducer(initialGameState, {
      type: "RUN_AUTO_SIM",
      result: { finalWorld, bashoCount: 1, events: [] } as any,
    });
    expect(result.world).toEqual({ ...finalWorld });
    expect(result.phase).toBe("interim");
  });

  it("RUN_AUTO_SIM is no-op when result has no finalWorld", () => {
    const result = gameReducer(initialGameState, {
      type: "RUN_AUTO_SIM",
      result: { finalWorld: null } as any,
    });
    expect(result).toBe(initialGameState);
  });

  // === Default ===

  it("unknown action returns state unchanged", () => {
    const result = gameReducer(initialGameState, { type: "UNKNOWN" } as any);
    expect(result).toBe(initialGameState);
  });
});
