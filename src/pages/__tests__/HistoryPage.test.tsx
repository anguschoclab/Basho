// Set up jsdom-like environment manually
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
Object.defineProperty(global, "document", { value: dom.window.document, writable: true });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Object.defineProperty(global, "window", { value: dom.window as any, writable: true });
Object.defineProperty(global, "navigator", { value: dom.window.navigator, writable: true });

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import HistoryPage from "../HistoryPage";
import * as GameContext from "@/contexts/GameContext";

// Mock dependencies
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
  StableName: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("react-helmet", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("HistoryPage", () => {
  it("renders correctly with no world", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: null },
      getRikishi: vi.fn(),
    } as any);

    const { container } = render(<HistoryPage />);
    expect(container.firstChild).toBeNull();
  });

  it("renders correctly with empty history", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: { history: [] } },
      getRikishi: vi.fn(),
    } as any);

    render(<HistoryPage />);
    expect(screen.queryByText("No History Yet")).toBeTruthy();
  });

  it("renders correctly with partial history record (guard checks)", () => {
    const mockWorld = {
      history: [
        {
          year: 2024,
          bashoNumber: 1,
          // Missing bashoName intentionally to test fallback
          yusho: "r1",
          // Missing junYusho
          // Missing prizes
        },
      ],
      heyas: new Map([["h1", { id: "h1", name: "Mock Stable" }]]),
    };

    const mockRikishi = {
      id: "r1",
      shikona: "Mockyama",
      rank: 1,
      heyaId: "h1",
    };

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: mockWorld },
      getRikishi: () => mockRikishi,
    } as any);

    render(<HistoryPage />);

    // Check fallback basho name logic (should use default properties when bashoName is missing but getBashoByNumber handles the number)
    expect(screen.queryByText("初場所")).toBeTruthy(); // 1 = Hatsu / 初場所

    // Check winner is shown
    expect(screen.queryByText("Mockyama")).toBeTruthy();
    expect(screen.queryByText("Mock Stable")).toBeTruthy();

    // Check missing Jun-Yusho guard renders dash
    expect(screen.queryByText("—", { selector: ".text-sm.text-muted-foreground" })).toBeTruthy();
  });

  it("handles missing rank in RANK_HIERARCHY gracefully", () => {
    const mockWorld = {
      history: [
        {
          year: 2024,
          bashoNumber: 1,
          yusho: "r1",
        },
      ],
      heyas: new Map([["h1", { id: "h1", name: "Mock Stable" }]]),
    };

    // Provide a non-existent rank to test safeRankJa guard
    const mockRikishi = {
      id: "r1",
      shikona: "Mockyama",
      rank: 99999,
      heyaId: "h1",
    };

    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: { world: mockWorld },
      getRikishi: () => mockRikishi,
    } as any);

    render(<HistoryPage />);

    // Should fallback to stringified rank
    expect(screen.queryByText(/99999/)).toBeTruthy();
  });
});
