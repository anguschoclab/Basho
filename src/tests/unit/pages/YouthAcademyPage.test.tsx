import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", { "data-testid": "app-layout" }, children),
}));

vi.mock("@/components/recruitment/YouthAcademyPanel", () => ({
  YouthAcademyPanel: ({ onBuild }: any) =>
    React.createElement(
      "div",
      { "data-testid": "youth-academy-panel" },
      React.createElement("button", { "data-testid": "build-youth-academy", onClick: onBuild }, "Build")
    ),
}));

vi.mock("@/presenters/youthAcademyProjections", () => ({
  projectYouthAcademy: () => ({ level: 0, hasAcademy: false, prospectCapacity: 0, upgradeCost: 50000 }),
}));

const mockUseGame = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

const mockSendCommand = vi.fn();
vi.mock("@/store/gameStore", () => ({
  useGameStore: () => mockSendCommand,
}));

import YouthAcademyPage from "@/pages/YouthAcademyPage";

describe("YouthAcademyPage", () => {
  afterEach(() => cleanup());

  it("renders no game loaded message when world is null", () => {
    mockUseGame.mockReturnValue({ state: { world: null } });
    render(<YouthAcademyPage />);
    expect(screen.getByText("No game loaded.")).toBeDefined();
  });

  it("renders youth academy page with panel", () => {
    mockUseGame.mockReturnValue({
      state: {
        world: {
          seed: "test",
          playerHeyaId: "player",
          heyas: new Map([["player", { id: "player", name: "Player", economics: { cash: 100000 } }]]),
        },
      },
    });
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("youth-academy-page")).toBeDefined();
    expect(screen.getByTestId("youth-academy-panel")).toBeDefined();
  });

  it("renders build button when no academy exists", () => {
    mockUseGame.mockReturnValue({
      state: {
        world: {
          seed: "test",
          playerHeyaId: "player",
          heyas: new Map([["player", { id: "player", name: "Player", economics: { cash: 100000 } }]]),
        },
      },
    });
    render(<YouthAcademyPage />);
    expect(screen.getByTestId("build-youth-academy")).toBeDefined();
  });
});
