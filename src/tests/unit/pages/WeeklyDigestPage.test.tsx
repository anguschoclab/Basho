 
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import * as GameContext from "@/contexts/useGame";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/dashboard/DigestWidget", () => ({
  DigestWidget: ({ digest, fullPage }: any) => (
    <div data-testid="digest-widget" data-fullpage={fullPage ? "true" : "false"}>
      {digest?.sections?.map((s: any) => (
        <div key={s.id} data-testid="digest-section">
          <span data-testid="section-title">{s.title}</span>
        </div>
      ))}
    </div>
  ),
}));

import WeeklyDigestPage from "@/pages/WeeklyDigestPage";

describe("WeeklyDigestPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: { week: 5, year: 2025 } as any,
      },
      digest: {
        time: { label: "2025 — Week 5 (interim)" },
        headline: "A quiet week.",
        counts: { trainingEvents: 0, injuries: 0, recoveries: 0, economy: 0, scouting: 0 },
        sections: [],
      },
    } as any);

    render(<WeeklyDigestPage />);

    expect(screen.getByText("Weekly Report")).toBeTruthy();
    expect(screen.getByText(/Week 5/)).toBeTruthy();
    expect(screen.getByTestId("digest-widget")).toBeTruthy();
  });

  it("displays digest sections", () => {
    vi.spyOn(GameContext, "useGame").mockReturnValue({
      state: {
        world: { week: 5, year: 2025 } as any,
      },
      digest: {
        time: { label: "2025 — Week 5 (interim)" },
        headline: "Training gains across the stable.",
        counts: { trainingEvents: 2, injuries: 0, recoveries: 0, economy: 0, scouting: 0 },
        sections: [
          { id: "training-report", title: "Training Report", items: [] },
          { id: "injuries", title: "Injuries", items: [] },
        ],
      },
    } as any);

    render(<WeeklyDigestPage />);

    expect(screen.getByTestId("digest-widget")).toBeTruthy();
    const sections = screen.getAllByTestId("digest-section");
    expect(sections).toHaveLength(2);
    const titles = screen.getAllByTestId("section-title");
    expect(titles[0].textContent).toBe("Training Report");
    expect(titles[1].textContent).toBe("Injuries");
  });
});
