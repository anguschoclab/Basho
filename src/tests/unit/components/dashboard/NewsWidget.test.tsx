import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import type { EngineEvent } from "@/engine/types/events";

// Mock ScrollArea — jsdom doesn't need virtualization
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseGame = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

import { NewsWidget } from "@/components/dashboard/NewsWidget";

function makeEvent(overrides: Partial<EngineEvent>): EngineEvent {
  return {
    id: overrides.id ?? "e1",
    type: "MANAGEMENT_DECISION",
    category: "misc",
    phase: "weekly",
    importance: "notable",
    scope: "world",
    title: "Untitled",
    summary: "summary",
    year: 2025,
    week: 3,
    ...overrides,
  } as EngineEvent;
}

function renderWithEvents(log: EngineEvent[]) {
  mockUseGame.mockReturnValue({ state: { world: { events: { log } } } });
  return render(<NewsWidget />);
}

describe("NewsWidget", () => {
  it("renders empty state when there are no events", () => {
    renderWithEvents([]);
    expect(screen.getByText("No events yet.")).toBeTruthy();
  });

  it("renders a row per recent event", () => {
    renderWithEvents([
      makeEvent({ id: "e1", title: "Yusho decided", summary: "Epic finale", week: 3 }),
      makeEvent({ id: "e2", title: "New recruit", summary: "Promising debut", week: 2 }),
    ]);
    expect(screen.getByText("Yusho decided")).toBeTruthy();
    expect(screen.getByText("New recruit")).toBeTruthy();
    expect(screen.getByText("Epic finale")).toBeTruthy();
  });

  it("renders media events with outlet handling", () => {
    renderWithEvents([
      makeEvent({
        id: "e1",
        category: "media",
        title: "Tabloid scoop",
        summary: "Scandal!",
        data: { outlet: "TABLOID" } as EngineEvent["data"],
      }),
    ]);
    expect(screen.getByText("Tabloid scoop")).toBeTruthy();
  });
});
