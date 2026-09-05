import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { vi as vitestVi } from "vitest";

// Mock useGame before importing the page
const mockUseGame = vitestVi.fn();
vitestVi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

import { RivalStablesPage } from "@/pages/RivalStablesPage";

function makeWorld(overrides: Record<string, unknown> = {}) {
  return {
    seed: "test",
    year: 2024,
    playerHeyaId: "player",
    heyas: new Map([
      ["player", { id: "player", name: "Player Heya", isPlayer: true }],
      ["rival-1", { id: "rival-1", name: "Rival Heya 1", ichimon: "Tatsunami" }],
      ["rival-2", { id: "rival-2", name: "Rival Heya 2" }],
    ]),
    rikishi: new Map(),
    events: { log: [] },
    ...overrides,
  };
}

describe("RivalStablesPage", () => {
  afterEach(() => cleanup());

  it("renders no game loaded message when world is null", () => {
    mockUseGame.mockReturnValue({ state: { world: null } });
    render(<RivalStablesPage />);
    expect(screen.getByText("No game loaded.")).toBeDefined();
  });

  it("renders rival stables page with rival count", () => {
    mockUseGame.mockReturnValue({ state: { world: makeWorld() } });
    render(<RivalStablesPage />);
    expect(screen.getByTestId("rival-stables-page")).toBeDefined();
    expect(screen.getByText("Rival Oyakata (2)")).toBeDefined();
  });

  it("renders rival oyakata cards for each rival", () => {
    mockUseGame.mockReturnValue({ state: { world: makeWorld() } });
    render(<RivalStablesPage />);
    expect(screen.getByTestId("rival-oyakata-card-rival-1")).toBeDefined();
    expect(screen.getByTestId("rival-oyakata-card-rival-2")).toBeDefined();
  });

  it("renders no rivals message when world has only player heya", () => {
    mockUseGame.mockReturnValue({
      state: {
        world: makeWorld({
          heyas: new Map([["player", { id: "player", name: "Player", isPlayer: true }]]),
        }),
      },
    });
    render(<RivalStablesPage />);
    expect(screen.getByText("No rival stables found in this world.")).toBeDefined();
  });
});
