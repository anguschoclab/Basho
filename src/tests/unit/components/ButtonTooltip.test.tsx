/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/ui/button";

// Mock TooltipWrap to inspect whether it wraps the button
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({ children, content, side }: { children: React.ReactNode; content: React.ReactNode; side?: string }) => {
    if (!content) return <>{children}</>;
    return (
      <div data-testid="tooltip-wrap" data-content={content} data-side={side}>
        {children}
      </div>
    );
  },
}));

describe("Button tooltip props", () => {
  it("renders without tooltip when not provided", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeTruthy();
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
  });

  it("wraps in TooltipWrap when tooltip provided", () => {
    render(<Button tooltip="Hello">Click me</Button>);
    expect(screen.getByTestId("tooltip-wrap")).toBeTruthy();
    expect(screen.getByTestId("tooltip-wrap").getAttribute("data-content")).toBe("Hello");
  });

  it("passes tooltipSide to TooltipWrap", () => {
    render(<Button tooltip="Hello" tooltipSide="bottom">Click me</Button>);
    expect(screen.getByTestId("tooltip-wrap").getAttribute("data-side")).toBe("bottom");
  });

  it("does not wrap when tooltip is undefined", () => {
    render(<Button tooltip={undefined}>Click me</Button>);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
  });

  it("does not wrap when tooltip is empty string", () => {
    render(<Button tooltip="">Click me</Button>);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
  });

  it("works with spread pattern: {...(cond ? { tooltip: 'x' } : {})}", () => {
    const canAfford = false;
    render(
      <Button
        disabled={!canAfford}
        {...(!canAfford ? { tooltip: "Insufficient funds", tooltipSide: "top" } : {})}
      >
        Recruit
      </Button>
    );
    expect(screen.getByTestId("tooltip-wrap")).toBeTruthy();
    expect(screen.getByTestId("tooltip-wrap").getAttribute("data-content")).toBe("Insufficient funds");
  });

  it("spread pattern with cond=true: no tooltip", () => {
    const canAfford = true;
    render(
      <Button
        disabled={!canAfford}
        {...(!canAfford ? { tooltip: "Insufficient funds", tooltipSide: "top" } : {})}
      >
        Recruit
      </Button>
    );
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
  });

  it("defaults tooltipSide to 'top'", () => {
    render(<Button tooltip="Test">Click</Button>);
    expect(screen.getByTestId("tooltip-wrap").getAttribute("data-side")).toBe("top");
  });
});
