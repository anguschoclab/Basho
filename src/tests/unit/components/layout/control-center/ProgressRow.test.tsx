import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressRow } from "@/components/layout/control-center/ProgressRow";

describe("ProgressRow", () => {
  it("renders name text", () => {
    render(<ProgressRow name="Fatigue" value={50} />);
    expect(screen.getByText("Fatigue")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(<ProgressRow name="Fatigue" subtitle="High" value={50} />);
    expect(screen.getByText("High")).toBeTruthy();
  });

  it("does not render subtitle element when absent", () => {
    const { container } = render(<ProgressRow name="Fatigue" value={50} />);
    expect(container.querySelector(".text-\\[10px\\].text-muted-foreground")).toBeNull();
  });

  it("renders value percentage when showValue is true (default)", () => {
    render(<ProgressRow name="Fatigue" value={42} />);
    expect(screen.getByText("42%")).toBeTruthy();
  });

  it("hides value when showValue is false", () => {
    render(<ProgressRow name="Fatigue" value={42} showValue={false} />);
    expect(screen.queryByText("42%")).toBeNull();
  });

  it("clamps value to 0 when negative", () => {
    render(<ProgressRow name="Fatigue" value={-10} />);
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("clamps value to 100 when over 100", () => {
    render(<ProgressRow name="Fatigue" value={150} />);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("renders 0% for value=0", () => {
    render(<ProgressRow name="Fatigue" value={0} />);
    expect(screen.getByText("0%")).toBeTruthy();
  });

  it("renders 100% for value=100", () => {
    render(<ProgressRow name="Fatigue" value={100} />);
    expect(screen.getByText("100%")).toBeTruthy();
  });

  it("sets bar width style to clamped value", () => {
    const { container } = render(<ProgressRow name="Fatigue" value={150} />);
    const bar = container.querySelector(".h-full.rounded-sm") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("sets bar width to 0% for negative value", () => {
    const { container } = render(<ProgressRow name="Fatigue" value={-10} />);
    const bar = container.querySelector(".h-full.rounded-sm") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it.each([
    ["default", "bg-primary"],
    ["gold", "bg-[hsl(var(--gold))]"],
    ["east", "bg-[hsl(var(--east))]"],
    ["west", "bg-[hsl(var(--west))]"],
    ["success", "bg-success"],
    ["warning", "bg-warning"],
    ["destructive", "bg-destructive"],
  ] as const)("applies BAR_TONE class for tone=%s", (tone, expectedClass) => {
    const { container } = render(<ProgressRow name="Test" value={50} tone={tone} />);
    const bar = container.querySelector(".h-full.rounded-sm") as HTMLElement;
    expect(bar.classList.contains(expectedClass)).toBe(true);
  });

  it.each([
    ["default", "text-primary"],
    ["gold", "text-gold"],
    ["east", "text-east"],
    ["west", "text-west"],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
  ] as const)("applies TEXT_TONE class for tone=%s", (tone, expectedClass) => {
    render(<ProgressRow name="Test" value={50} tone={tone} />);
    const valueEl = screen.getByText("50%");
    expect(valueEl.classList.contains(expectedClass)).toBe(true);
  });

  it("defaults tone to 'default'", () => {
    const { container } = render(<ProgressRow name="Test" value={50} />);
    const bar = container.querySelector(".h-full.rounded-sm") as HTMLElement;
    expect(bar.classList.contains("bg-primary")).toBe(true);
  });

  it("merges custom className onto container", () => {
    const { container } = render(<ProgressRow name="Test" value={50} className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("custom-class")).toBe(true);
  });
});
