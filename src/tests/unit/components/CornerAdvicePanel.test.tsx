import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CornerAdvicePanel } from "@/components/game/CornerAdvicePanel";

describe("CornerAdvicePanel", () => {
  it("renders nothing when there is no advice", () => {
    const { container } = render(<CornerAdvicePanel advice={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders corner advice for a player bout", () => {
    const advice = {
      playerRikishi: { id: "r1", shikona: "Takakeisho", name: "Takakeisho" },
      opponent: { id: "r2", shikona: "Terunofuji", name: "Terunofuji" },
      advice: [
        {
          id: "a1",
          title: "Suggested tactic: PUSH",
          detail: "Opponent trends yotsu; PUSH counters it.",
          priority: "high" as const,
          relatedEntityId: "r2",
          suggestedAction: "PUSH",
        },
      ],
    };
    const { container } = render(<CornerAdvicePanel advice={advice} />);
    expect(screen.getByText("Corner Advice")).toBeDefined();
    expect(screen.getByText("Takakeisho")).toBeDefined();
    expect(screen.getByText("Terunofuji")).toBeDefined();
    expect(container.querySelectorAll("[data-avatar]").length).toBe(2);
    expect(screen.getByText("Suggested tactic: PUSH")).toBeDefined();
    expect(screen.getByText("high")).toBeDefined();
  });
});
