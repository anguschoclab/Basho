/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { Button } from "@/components/ui/button";

// Mock TooltipWrap to inspect whether it wraps the button
vi.mock("@/components/ui/tooltip-wrap", () => ({
  TooltipWrap: ({
    children,
    content,
    side,
  }: {
    children: React.ReactNode;
    content: React.ReactNode;
    side?: string;
  }) => {
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
    render(
      <Button tooltip="Hello" tooltipSide="bottom">
        Click me
      </Button>
    );
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
    expect(screen.getByTestId("tooltip-wrap").getAttribute("data-content")).toBe(
      "Insufficient funds"
    );
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

describe("Button auto aria-label from tooltip", () => {
  it("derives aria-label from string tooltip", () => {
    const { container } = render(<Button tooltip="Save Game">Save</Button>);
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBe("Save Game");
  });

  it("does not overwrite explicit aria-label", () => {
    const { container } = render(
      <Button tooltip="Save Game" aria-label="Custom Label">
        Save
      </Button>
    );
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBe("Custom Label");
  });

  it("does not derive aria-label from non-string tooltip", () => {
    const { container } = render(
      <Button tooltip={React.createElement("span", null, "Complex")}>Save</Button>
    );
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBeNull();
  });

  it("does not derive aria-label from empty string tooltip", () => {
    const { container } = render(<Button tooltip="">Save</Button>);
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBeNull();
  });

  it("does not derive aria-label from whitespace-only tooltip", () => {
    const { container } = render(<Button tooltip="   ">Save</Button>);
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBeNull();
  });

  it("derives aria-label even when disabled", () => {
    const { container } = render(
      <Button tooltip="Insufficient funds" disabled>
        Recruit
      </Button>
    );
    const btn = container.querySelector("button");
    expect(btn?.getAttribute("aria-label")).toBe("Insufficient funds");
  });
});

describe("Button disabled tooltip wrapping", () => {
  it("wraps disabled button with tooltip in span for hover events", () => {
    const { container } = render(
      <Button tooltip="Cannot afford" disabled>
        Buy
      </Button>
    );
    expect(screen.getByTestId("tooltip-wrap")).toBeTruthy();
    const span = container.querySelector("span.cursor-not-allowed");
    expect(span).toBeTruthy();
    expect(span?.className).toContain("inline-block");
  });

  it("adds pointer-events-none to disabled button inside span wrapper", () => {
    const { container } = render(
      <Button tooltip="Cannot afford" disabled>
        Buy
      </Button>
    );
    const btn = container.querySelector("button");
    expect(btn?.className).toContain("pointer-events-none");
  });

  it("does NOT wrap enabled button with tooltip in span", () => {
    const { container } = render(<Button tooltip="Click to buy">Buy</Button>);
    const span = container.querySelector("span.cursor-not-allowed");
    expect(span).toBeNull();
  });

  it("does NOT wrap disabled button without tooltip in span", () => {
    const { container } = render(<Button disabled>Buy</Button>);
    expect(screen.queryByTestId("tooltip-wrap")).toBeNull();
    const span = container.querySelector("span.cursor-not-allowed");
    expect(span).toBeNull();
  });

  it("disabled + tooltip: span wrapper receives cursor-not-allowed, button keeps disabled", () => {
    const { container } = render(
      <Button tooltip="Locked" disabled>
        Action
      </Button>
    );
    const span = container.querySelector("span.cursor-not-allowed");
    const btn = container.querySelector("button");
    expect(span).toBeTruthy();
    expect(btn?.disabled).toBe(true);
  });

  it("disabled + tooltip + explicit aria-label: all three work together", () => {
    const { container } = render(
      <Button tooltip="Locked" aria-label="Custom Action" disabled>
        Action
      </Button>
    );
    const btn = container.querySelector("button");
    const span = container.querySelector("span.cursor-not-allowed");
    expect(span).toBeTruthy();
    expect(btn?.getAttribute("aria-label")).toBe("Custom Action");
    expect(btn?.disabled).toBe(true);
  });
});
