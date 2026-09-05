import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { NPCAgentFeed } from "@/components/npc/NPCAgentFeed";
import type { NPCAgentProjection } from "@/presenters/npcAgentProjections";

function makeProjection(decisions: any[] = []): NPCAgentProjection {
  return {
    decisions,
    hasRecentActivity: decisions.length > 0,
    decisionsByHeya: {},
  };
}

describe("NPCAgentFeed", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no activity", () => {
    render(<NPCAgentFeed projection={makeProjection()} />);
    expect(screen.getByText("No recent rival activity.")).toBeDefined();
  });

  it("renders feed when decisions exist", () => {
    const decisions = [
      {
        heyaId: "h1",
        heyaName: "Dewanoumi",
        category: "recruitment",
        decision: "Scout Mongolian prospect",
        reasoning: "High potential",
        week: 5,
      },
    ];
    render(<NPCAgentFeed projection={makeProjection(decisions)} />);
    expect(screen.getByTestId("npc-agent-feed")).toBeDefined();
    expect(screen.getByText("Dewanoumi")).toBeDefined();
    expect(screen.getByText("Scout Mongolian prospect")).toBeDefined();
  });

  it("shows category badge", () => {
    const decisions = [
      {
        heyaId: "h1",
        heyaName: "Test",
        category: "training",
        decision: "Increase intensity",
        reasoning: "",
        week: 3,
      },
    ];
    render(<NPCAgentFeed projection={makeProjection(decisions)} />);
    expect(screen.getByText("Training")).toBeDefined();
  });

  it("shows reasoning when available", () => {
    const decisions = [
      {
        heyaId: "h1",
        heyaName: "Test",
        category: "strategy",
        decision: "Poach rival",
        reasoning: "Rival stable has weak retention",
        week: 7,
      },
    ];
    render(<NPCAgentFeed projection={makeProjection(decisions)} />);
    expect(screen.getByText("Rival stable has weak retention")).toBeDefined();
  });

  it("shows week number", () => {
    const decisions = [
      {
        heyaId: "h1",
        heyaName: "Test",
        category: "general",
        decision: "Do something",
        reasoning: "",
        week: 12,
      },
    ];
    render(<NPCAgentFeed projection={makeProjection(decisions)} />);
    expect(screen.getByText("Wk 12")).toBeDefined();
  });
});
