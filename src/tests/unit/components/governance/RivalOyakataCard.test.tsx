import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { RivalOyakataCard } from "@/components/governance/RivalOyakataCard";
import type { NPCDecisionDTO } from "@/presenters/npcAgentProjections";

function makeDecision(overrides: Partial<NPCDecisionDTO> = {}): NPCDecisionDTO {
  return {
    heyaId: "h-1",
    heyaName: "Test Heya",
    category: "governance",
    decision: "Voted yes on proposal",
    reasoning: "Strategic alignment",
    week: 10,
    ...overrides,
  };
}

describe("RivalOyakataCard", () => {
  afterEach(() => cleanup());

  it("renders heya name", () => {
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Azumazeki"
        decisions={[]}
      />
    );
    expect(screen.getByTestId("rival-oyakata-card-h-1")).toBeDefined();
    expect(screen.getByText("Azumazeki")).toBeDefined();
  });

  it("renders ichimon when provided", () => {
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Test"
        ichimon="Tatsunami"
        decisions={[]}
      />
    );
    expect(screen.getByText("Tatsunami")).toBeDefined();
  });

  it("renders legacy tier badge when provided", () => {
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Test"
        legacyTier="dynasty"
        decisions={[]}
      />
    );
    expect(screen.getByText("dynasty")).toBeDefined();
  });

  it("renders recent decisions", () => {
    const decisions = [
      makeDecision({ decision: "Voted yes", category: "governance" }),
      makeDecision({ decision: "Hired scout", category: "scouting" }),
    ];
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Test"
        decisions={decisions}
      />
    );
    expect(screen.getByTestId("rival-decision-h-1-0")).toBeDefined();
    expect(screen.getByTestId("rival-decision-h-1-1")).toBeDefined();
    expect(screen.getByText("governance")).toBeDefined();
    expect(screen.getByText("scouting")).toBeDefined();
  });

  it("shows no decisions message when empty", () => {
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Test"
        decisions={[]}
      />
    );
    expect(screen.getByText("No recent decisions logged.")).toBeDefined();
  });

  it("shows at most 3 decisions", () => {
    const decisions = Array.from({ length: 5 }, (_, i) =>
      makeDecision({ decision: `Decision ${i}`, category: `cat${i}` })
    );
    render(
      <RivalOyakataCard
        heyaId="h-1"
        heyaName="Test"
        decisions={decisions}
      />
    );
    expect(screen.getByTestId("rival-decision-h-1-0")).toBeDefined();
    expect(screen.getByTestId("rival-decision-h-1-1")).toBeDefined();
    expect(screen.getByTestId("rival-decision-h-1-2")).toBeDefined();
    expect(screen.queryByTestId("rival-decision-h-1-3")).toBeNull();
  });
});
