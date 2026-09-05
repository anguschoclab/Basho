/**
 * TsukebitoAssignmentPanel.test.tsx — tests panel renders current assignments and eligible juniors.
 * Plan Feature 10 Test-First Protocol item 5.
 * Note: The component is named TsukebitoPanel in the implementation.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, ...props }: any) => React.createElement("div", props, children),
  CardContent: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => React.createElement("span", props, children),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: any) =>
    React.createElement("button", { onClick, ...props }, children),
}));

import { TsukebitoPanel } from "@/components/training/TsukebitoPanel";
import type { TsukebitoProjection } from "@/presenters/tsukebitoProjections";

const mockProjection: TsukebitoProjection = {
  assignments: [
    {
      seniorId: "s1",
      seniorShikona: "Senior Riki",
      seniorRankLabel: "Sekiwake",
      tsukebitoIds: ["j1"],
      tsukebito: [{ id: "j1", shikona: "Junior Riki", rankLabel: "Jonokuchi" }],
    },
  ],
  eligibleSeniors: [
    { id: "s1", shikona: "Senior Riki", rankLabel: "Sekiwake", currentCount: 1, maxCount: 2 },
  ],
  eligibleJuniors: [
    { id: "j2", shikona: "Junior Two", rankLabel: "Jonokuchi", assignedTo: null },
  ],
};

describe("TsukebitoPanel", () => {
  afterEach(() => cleanup());

  it("renders the panel", () => {
    render(<TsukebitoPanel projection={mockProjection} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByTestId("tsukebito-panel")).toBeDefined();
  });

  it("renders current assignments", () => {
    render(<TsukebitoPanel projection={mockProjection} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getAllByText("Senior Riki").length).toBeGreaterThan(0);
  });

  it("renders eligible juniors for assignment", () => {
    render(<TsukebitoPanel projection={mockProjection} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText("Junior Two")).toBeDefined();
  });
});
