/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Trophy } from "lucide-react";
import {
  StatCard,
  type StatItem,
  type ProgressItem,
} from "@/components/layout/control-center/StatCard";

// Mock CardEyebrow to isolate StatCard logic
vi.mock("@/components/layout/control-center/CardEyebrow", () => ({
  CardEyebrow: ({ eyebrow, title, icon, actions }: any) => (
    <div
      data-testid="card-eyebrow"
      data-eyebrow={eyebrow}
      data-title={title}
      data-has-icon={!!icon}
      data-has-actions={!!actions}
    />
  ),
}));

const baseStats: StatItem[] = [
  { label: "Wins", value: 10 },
  { label: "Losses", value: 3, sub: "2 by injury" },
  { label: "Streak", value: "W5", tone: "gold" },
];

describe("StatCard", () => {
  it("renders CardEyebrow with eyebrow, title, icon, and actions props", () => {
    render(
      <StatCard
        eyebrow="Stats"
        title="Performance"
        stats={baseStats}
        icon={Trophy}
        actions={<button data-testid="action-btn">Action</button>}
      />
    );
    const eyebrow = screen.getByTestId("card-eyebrow");
    expect(eyebrow.getAttribute("data-eyebrow")).toBe("Stats");
    expect(eyebrow.getAttribute("data-title")).toBe("Performance");
    expect(eyebrow.getAttribute("data-has-icon")).toBe("true");
    expect(eyebrow.getAttribute("data-has-actions")).toBe("true");
  });

  it("renders all stat labels and values", () => {
    render(<StatCard eyebrow="Stats" title="Performance" stats={baseStats} />);
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("10")).toBeTruthy();
    expect(screen.getByText("Losses")).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("Streak")).toBeTruthy();
    expect(screen.getByText("W5")).toBeTruthy();
  });

  it("renders sub text when provided", () => {
    render(<StatCard eyebrow="Stats" title="Performance" stats={baseStats} />);
    expect(screen.getByText("2 by injury")).toBeTruthy();
  });

  it("does not render sub text when absent", () => {
    const stats: StatItem[] = [{ label: "Wins", value: 10 }];
    const { container } = render(<StatCard eyebrow="Stats" title="Performance" stats={stats} />);
    expect(
      container.querySelectorAll(".text-\\[10px\\].text-muted-foreground.leading-tight")
    ).toHaveLength(0);
  });

  it.each([
    ["default", "text-foreground"],
    ["gold", "text-gold"],
    ["success", "text-success"],
    ["warning", "text-warning"],
    ["destructive", "text-destructive"],
    ["east", "text-east"],
    ["west", "text-west"],
  ] as const)("applies VALUE_TONE class for tone=%s", (tone, expectedClass) => {
    const stats: StatItem[] = [{ label: "Test", value: 1, tone }];
    const { container } = render(<StatCard eyebrow="E" title="T" stats={stats} />);
    const valueEl = container.querySelector(".font-mono.font-bold") as HTMLElement;
    expect(valueEl.classList.contains(expectedClass)).toBe(true);
  });

  it("defaults tone to 'default' (text-foreground)", () => {
    const stats: StatItem[] = [{ label: "Test", value: 1 }];
    const { container } = render(<StatCard eyebrow="E" title="T" stats={stats} />);
    const valueEl = container.querySelector(".font-mono.font-bold") as HTMLElement;
    expect(valueEl.classList.contains("text-foreground")).toBe(true);
  });

  it("renders progress bars when progress is provided", () => {
    const progress: ProgressItem[] = [{ label: "Health", value: 80 }];
    const { container } = render(
      <StatCard eyebrow="E" title="T" stats={baseStats} progress={progress} />
    );
    expect(screen.getByText("80%")).toBeTruthy();
    expect(container.querySelector(".h-full.rounded-sm")).toBeTruthy();
  });

  it("clamps progress bar width to 100% for value > 100", () => {
    const progress: ProgressItem[] = [{ label: "Health", value: 150 }];
    const { container } = render(
      <StatCard eyebrow="E" title="T" stats={baseStats} progress={progress} />
    );
    const bar = container.querySelector(".h-full.rounded-sm") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("does not render progress section when progress is absent", () => {
    const { container } = render(<StatCard eyebrow="E" title="T" stats={baseStats} />);
    expect(container.querySelector(".space-y-2.pt-1")).toBeNull();
  });

  it("does not render progress section when progress is empty array", () => {
    const { container } = render(
      <StatCard eyebrow="E" title="T" stats={baseStats} progress={[]} />
    );
    expect(container.querySelector(".space-y-2.pt-1")).toBeNull();
  });

  it.each([
    [2, "grid-cols-2"],
    [3, "grid-cols-3"],
  ] as const)("applies cols=%d grid class", (cols, expectedClass) => {
    const { container } = render(<StatCard eyebrow="E" title="T" stats={baseStats} cols={cols} />);
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.classList.contains(expectedClass)).toBe(true);
  });

  it("applies cols=4 grid class (grid-cols-2 sm:grid-cols-4)", () => {
    const { container } = render(<StatCard eyebrow="E" title="T" stats={baseStats} cols={4} />);
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.classList.contains("grid-cols-2")).toBe(true);
    expect(grid.classList.contains("sm:grid-cols-4")).toBe(true);
  });

  it("defaults cols to 2", () => {
    const { container } = render(<StatCard eyebrow="E" title="T" stats={baseStats} />);
    const grid = container.querySelector(".grid") as HTMLElement;
    expect(grid.classList.contains("grid-cols-2")).toBe(true);
  });

  it("merges custom className onto card container", () => {
    const { container } = render(
      <StatCard eyebrow="E" title="T" stats={baseStats} className="custom-card" />
    );
    const card = container.firstChild as HTMLElement;
    expect(card.classList.contains("custom-card")).toBe(true);
  });
});
