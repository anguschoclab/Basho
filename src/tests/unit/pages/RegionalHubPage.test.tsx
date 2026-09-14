import React from "react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import RegionalHubPage from "@/pages/RegionalHubPage";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

let mockWorld: any = null;
const mockSendCommand = vi.fn();

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({
    state: { world: mockWorld },
  }),
}));

vi.mock("@/store/gameStore", () => ({
  useGameStore: (selector: any) => selector({ sendCommand: mockSendCommand }),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => <div data-testid="app-layout">{children}</div>,
}));

vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: any) => <div>{title}</div>,
}));

describe("RegionalHubPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const world = MockFactory.createWorld({
      playerHeyaId: "heya_player",
      heyas: new Map([
        ["heya_player", MockFactory.createHeya("heya_player", { name: "Player Heya" })],
      ]),
    });
    mockWorld = world;
  });

  afterEach(() => {
    cleanup();
  });

  it("renders World Circuit Hub header and components", () => {
    render(<RegionalHubPage />);
    expect(screen.getByText("World Circuit Hub")).toBeDefined();
  });

  it("renders pending exhibition invitations when present", () => {
    mockWorld.pendingExhibitions = [
      {
        id: "inv_1",
        heyaId: "heya_player",
        region: "Mongolia",
        prestige: 75,
        expiresAtWeek: 8,
        requiresRank: "juryo",
      },
    ];

    render(<RegionalHubPage />);
    expect(screen.getAllByText("Mongolia").length).toBeGreaterThanOrEqual(1);
  });
});
