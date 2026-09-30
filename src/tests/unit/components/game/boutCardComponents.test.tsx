import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoutTags } from "@/components/game/boutCardComponents";
import { HEAT_CONFIG } from "@/components/game/boutCardTypes";
import type { MatchRowData } from "@/components/game/boutCardTypes";

// Mock TooltipWrap to just render its children
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children }: any) => <div data-testid="tooltip-wrap">{children}</div>,
}));

describe("BoutTags", () => {
  it("renders Kinboshi tag when match.result.isKinboshi is true", () => {
    const mockMatch = {
      east: { id: "1", shikona: "Wrestler 1" },
      west: { id: "2", shikona: "Wrestler 2" },
      h2h: { wins: 0, losses: 0 },
      result: {
        winner: "east",
        isKinboshi: true,
      },
      heatBand: "cold",
    } as unknown as MatchRowData;

    render(<BoutTags match={mockMatch} heatConfig={HEAT_CONFIG} />);

    // Should show Kinboshi text
    expect(screen.getByText("Kinboshi")).toBeDefined();
  });

  it("does not render Kinboshi tag when match.result.isKinboshi is false", () => {
    const mockMatch = {
      east: { id: "1", shikona: "Wrestler 1" },
      west: { id: "2", shikona: "Wrestler 2" },
      h2h: { wins: 0, losses: 0 },
      result: {
        winner: "east",
        isKinboshi: false,
      },
      heatBand: "cold",
    } as unknown as MatchRowData;

    render(<BoutTags match={mockMatch} heatConfig={HEAT_CONFIG} />);

    expect(screen.queryByText("Kinboshi")).toBeNull();
  });
});
