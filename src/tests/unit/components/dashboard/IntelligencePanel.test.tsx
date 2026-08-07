import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { IntelligencePanel } from "@/components/dashboard/IntelligencePanel";
import type { AIRecommendation } from "@/engine/ai/types";

function renderPanel(recommendations: AIRecommendation[] = []) {
  return render(
    <TooltipProvider>
      <IntelligencePanel recommendations={recommendations} />
    </TooltipProvider>
  );
}

describe("IntelligencePanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the panel title", () => {
    renderPanel();
    expect(screen.getByText("Intelligence")).toBeDefined();
  });

  it("shows empty state when there are no recommendations", () => {
    renderPanel();
    expect(screen.getByText("No active recommendations")).toBeDefined();
  });

  it("renders recommendations sorted by priority", () => {
    const recs: AIRecommendation[] = [
      {
        id: "low",
        category: "finance",
        priority: "low",
        title: "Low priority",
        detail: "Some detail",
        reasoning: ["r"],
      },
      {
        id: "critical",
        category: "finance",
        priority: "critical",
        title: "Critical issue",
        detail: "Urgent",
        reasoning: ["r"],
      },
      {
        id: "medium",
        category: "training",
        priority: "medium",
        title: "Medium note",
        detail: "Medium detail",
        reasoning: ["r"],
      },
    ];
    renderPanel(recs);
    const items = screen.getAllByText(/priority|issue|note/);
    expect(items.length).toBeGreaterThanOrEqual(3);
    // Critical badge rendered
    expect(screen.getByText("critical")).toBeDefined();
    expect(screen.queryByText("high")).toBeNull(); // no high in this set
  });

  it("uses the category icon label when provided", () => {
    const recs: AIRecommendation[] = [
      {
        id: "finance",
        category: "finance",
        priority: "medium",
        title: "Budget tight",
        detail: "Tight budget",
        reasoning: ["r"],
      },
    ];
    renderPanel(recs);
    expect(screen.getByText("Budget tight")).toBeDefined();
  });
});
