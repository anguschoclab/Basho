import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useGame } from "@/state/game/useGame";
import StablePage from "@/pages/StablePage";

vi.mock("@/state/game/useGame");

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ id: "ghost-heya" }),
  useNavigate: () => vi.fn(),
}));

vi.mock("@/hooks/useRequireWorld", () => ({
  useRequireWorld: () => true,
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/layout/page-shell/index", () => ({
  PageHeader: ({ title }: { title: string }) => React.createElement("div", null, title),
}));

const world = {
  heyas: new Map(),
  playerHeyaId: "h-player",
} as never;

describe("StablePage", () => {
  it("renders 'Stable not found' for a stale heya id instead of a blank page", () => {
    vi.mocked(useGame).mockReturnValue({
      state: { world, playerHeyaId: "h-player" },
      buildInfrastructure: vi.fn(),
      repairInfrastructure: vi.fn(),
    } as never);

    render(React.createElement(StablePage));

    expect(screen.getByText("Stable not found")).toBeDefined();
    expect(screen.getByText(/isn't part of the current world/)).toBeDefined();
    expect(screen.getByText("Return to Dashboard")).toBeDefined();
  });
});
