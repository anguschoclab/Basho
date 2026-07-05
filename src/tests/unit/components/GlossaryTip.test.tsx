/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlossaryTip } from "@/components/ui/GlossaryTip";

// Mock TooltipWrap to inspect tooltip content
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({
    children,
    content,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
  }) => (
    <div data-testid="tooltip-wrap">
      <div data-testid="tooltip-content">{content}</div>
      {children}
    </div>
  ),
}));

// Mock GlossaryService
vi.mock("@/engine/glossary/GlossaryService", () => ({
  GlossaryService: {
    byId: (id: string) => {
      if (id === "tachiai") {
        return {
          id: "tachiai",
          term: "Tachiai",
          termJa: "立合い",
          category: "technique",
          definition: "The initial charge at the start of a bout.",
        };
      }
      return undefined;
    },
  },
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("GlossaryTip", () => {
  it("wraps children in tooltip with glossary term definition", () => {
    renderWithProvider(<GlossaryTip termId="tachiai">Tachiai</GlossaryTip>);
    const wrap = screen.getByTestId("tooltip-wrap");
    expect(wrap).toBeTruthy();
    const content = screen.getByTestId("tooltip-content");
    expect(content.textContent).toContain("立合い");
    expect(content.textContent).toContain("initial charge");
    expect(screen.getByText("Tachiai")).toBeTruthy();
  });

  it("renders plain children when termId not found", () => {
    renderWithProvider(<GlossaryTip termId="nonexistent">Some Text</GlossaryTip>);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
    expect(screen.getByText("Some Text")).toBeTruthy();
  });

  it("applies dotted-underline className to children wrapper", () => {
    renderWithProvider(<GlossaryTip termId="tachiai">Tachiai</GlossaryTip>);
    const el = screen.getByText("Tachiai");
    expect(el.className).toContain("border-dotted");
    expect(el.className).toContain("cursor-help");
  });
});
