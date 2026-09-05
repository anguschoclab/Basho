import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { vi as vitestVi } from "vitest";

const mockUseGame = vitestVi.fn();
const mockUseGameStore = vitestVi.fn();
vitestVi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));
vitestVi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: (s: unknown) => unknown) => mockUseGameStore(selector),
}));

import { YouthAcademyPage } from "@/pages/YouthAcademyPage";

function makeWorld(overrides: Record<string, unknown> = {}) {
  return {
    seed: "test",
    year: 2024,
    playerHeyaId: "player",
    heyas: new Map([
      ["player", {
        id: "player",
        name: "Player Heya",
        economics: { cash: 100_000 },
      }],
    ]),
    rikishi: new Map(),
    ...overrides,
  };
}

describe("YouthAcademyPage", () => {
  afterEach(() => cleanup());

  it("renders no game loaded message when world is null", () => {
    mockUseGame.mockReturnValue({ state: { world: null } });
    mockUseGameStore.mockReturnValue(vi.fn());
    render(<YouthAcademyPage />);
    expect(screen.getByText("No game loaded.")).toBeDefined();
  });

  it("renders youth academy page with panel", () => {
    mockUseGame.mockReturnValue({ state: { world: makeWorld() } });
    mockUseGameStore.mockReturnValue(vi.fn());
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("youth-academy-page")).toBeDefined();
    expect(screen.getByTestId("youth-academy-panel")).toBeDefined();
  });

  it("renders build button when no academy exists", () => {
    mockUseGame.mockReturnValue({ state: { world: makeWorld() } });
    mockUseGameStore.mockReturnValue(vi.fn());
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("build-youth-academy")).toBeDefined();
  });
});
