/**
 * OfficialsPanel.test.tsx — tests panel renders gyoji list with rank, accuracy, bouts officiated.
 * Plan Feature 6 Test-First Protocol item 7.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => React.createElement("div", props, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
  CardHeader: ({ children }: any) => React.createElement("div", null, children),
  CardTitle: ({ children, ...props }: any) => React.createElement("div", props, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => React.createElement("span", props, children),
}));

import { OfficialsPanel } from "@/components/officials/OfficialsPanel";

const mockProjection = {
  gyoji: [
    { id: "g1", name: "Kimura", rank: "tate" as const, rankLabel: "Tate-gyoji", accuracy: 95, boutsOfficiated: 100, callsReversed: 2, reversalRate: 0.02 },
    { id: "g2", name: "Shikimori", rank: "fuku-tate" as const, rankLabel: "Fuku-tate-gyoji", accuracy: 88, boutsOfficiated: 80, callsReversed: 5, reversalRate: 0.06 },
  ],
  shimpan: [
    { id: "s1", name: "Judge 1", accuracy: 90, consultations: 50 },
  ],
  topGyoji: { id: "g1", name: "Kimura", rank: "tate" as const, rankLabel: "Tate-gyoji", accuracy: 95, boutsOfficiated: 100, callsReversed: 2, reversalRate: 0.02 },
  totalBoutsOfficiated: 180,
  totalReversals: 7,
};

describe("OfficialsPanel", () => {
  afterEach(() => cleanup());

  it("renders gyoji list", () => {
    render(<OfficialsPanel projection={mockProjection} />);
    expect(screen.getAllByText("Kimura").length).toBeGreaterThan(0);
    expect(screen.getByText("Shikimori")).toBeDefined();
  });

  it("renders gyoji rank label", () => {
    render(<OfficialsPanel projection={mockProjection} />);
    expect(screen.getByText("Tate-gyoji")).toBeDefined();
  });

  it("renders accuracy", () => {
    render(<OfficialsPanel projection={mockProjection} />);
    expect(screen.getByText("95")).toBeDefined();
  });
});
