import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: any) => React.createElement("div", { "data-testid": "sheet" }, children),
  SheetContent: ({ children }: any) => React.createElement("div", null, children),
  SheetHeader: ({ children }: any) => React.createElement("div", null, children),
  SheetTitle: ({ children, ...props }: any) => React.createElement("h2", props, children),
  SheetDescription: ({ children }: any) => React.createElement("p", null, children),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, ...props }: any) => React.createElement("span", props, children),
}));

import { OyakataProfileDrawer } from "@/components/governance/OyakataProfileDrawer";
import type { RivalStableDTO } from "@/presenters/rivalStablesProjections";

function makeRival(overrides: Partial<RivalStableDTO> = {}): RivalStableDTO {
  return {
    heyaId: "h1",
    heyaName: "Test Heya",
    ichimon: "Nishonoseki",
    legacyTier: "A",
    decisionCount: 3,
    recentDecisions: [
      { heyaId: "h1", heyaName: "Test Heya", category: "Aggressive", decision: "recruit", reasoning: "Signed a top recruit", week: 1 },
      { heyaId: "h1", heyaName: "Test Heya", category: "Aggressive", decision: "facility", reasoning: "Invested in facilities", week: 2 },
    ],
    ...overrides,
  };
}

describe("OyakataProfileDrawer", () => {
  afterEach(() => cleanup());

  it("renders nothing when rival is null", () => {
    const { container } = render(
      <OyakataProfileDrawer open={false} onOpenChange={vi.fn()} rival={null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders heya name when open", () => {
    render(
      <OyakataProfileDrawer open={true} onOpenChange={vi.fn()} rival={makeRival()} />
    );
    expect(screen.getByTestId("drawer-heya-name")).toBeDefined();
    expect(screen.getByTestId("drawer-heya-name").textContent).toContain("Test Heya");
  });

  it("renders ichimon and legacy tier badges", () => {
    render(
      <OyakataProfileDrawer open={true} onOpenChange={vi.fn()} rival={makeRival()} />
    );
    expect(screen.getByTestId("drawer-ichimon")).toBeDefined();
    expect(screen.getByTestId("drawer-legacy-tier")).toBeDefined();
  });

  it("renders recent decisions", () => {
    render(
      <OyakataProfileDrawer open={true} onOpenChange={vi.fn()} rival={makeRival()} />
    );
    expect(screen.getByTestId("drawer-decision-0")).toBeDefined();
    expect(screen.getByTestId("drawer-decision-1")).toBeDefined();
  });

  it("shows no decisions message when empty", () => {
    render(
      <OyakataProfileDrawer
        open={true}
        onOpenChange={vi.fn()}
        rival={makeRival({ recentDecisions: [] })}
      />
    );
    expect(screen.getByText("No recent decisions logged.")).toBeDefined();
  });
});
