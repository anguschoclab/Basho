import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventLogPanel } from "@/components/layout/EventLogPanel";
import type { EngineEvent } from "@/engine/types/events";

function makeEvent(category: EngineEvent["category"], title: string, summary: string): EngineEvent {
  return {
    id: "e1",
    type: "MANAGEMENT_DECISION",
    category,
    phase: "weekly",
    importance: "notable",
    scope: "heya",
    title,
    summary,
    year: 2025,
    week: 1,
    day: 1,
    data: { reasoning: "AI selected recruitment blitz" },
    truthLevel: "private",
    heyaId: "h1",
  };
}

describe("EventLogPanel AI events", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders AI decision events with the correct category badge", () => {
    const event = makeEvent(
      "ai_decision",
      "AI Management Decision",
      "Recruitment blitz authorized."
    );
    render(
      <EventLogPanel
        eventLogData={{
          events: [event],
          getRikishi: () => null,
          getHeya: () => undefined,
          playerHeyaId: "h1",
        }}
      />
    );
    expect(screen.getByText("AI Management Decision")).toBeDefined();
    expect(screen.getByText("AI Decision")).toBeDefined();
  });

  it("renders AI plan change events", () => {
    const event = makeEvent(
      "ai_plan_change",
      "Strategic Plan Shift",
      "Switching to financial consolidation."
    );
    render(
      <EventLogPanel
        eventLogData={{
          events: [event],
          getRikishi: () => null,
          getHeya: () => undefined,
          playerHeyaId: "h1",
        }}
      />
    );
    expect(screen.getByText("Strategic Plan Shift")).toBeDefined();
    expect(screen.getByText("AI Plan")).toBeDefined();
  });
});
