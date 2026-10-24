import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EventLogPanel } from "@/components/layout/EventLogPanel";
import { useEventReadStore } from "@/store/eventReadStore";
import type { EngineEvent } from "@/engine/types/events";

vi.mock("@/components/EventDetailDialog", () => ({
  EventDetailDialog: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="event-detail-dialog" /> : null,
}));

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
    heyaId: "h1",
  };
}

describe("EventLogPanel AI events", () => {
  beforeEach(() => {
    localStorage.clear();
    useEventReadStore.setState({ readIds: new Set() });
  });
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

  it("opens the event detail dialog on Enter keydown of a row", () => {
    const event = makeEvent("ai_decision", "AI Management Decision", "Details here.");
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
    fireEvent.keyDown(screen.getByLabelText("AI Management Decision"), { key: "Enter" });
    expect(screen.getByTestId("event-detail-dialog")).toBeDefined();
  });

  it("groups multiple same-week events under one week header", () => {
    const e1 = { ...makeEvent("ai_decision", "First", "a"), id: "e1" };
    const e2 = { ...makeEvent("ai_decision", "Second", "b"), id: "e2" };
    render(
      <EventLogPanel
        eventLogData={{
          events: [e1, e2],
          getRikishi: () => null,
          getHeya: () => undefined,
          playerHeyaId: "h1",
        }}
      />
    );
    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
    // One shared week label rather than two headers.
    expect(screen.getAllByText(/Week 1/)).toHaveLength(1);
  });

  it("renders all filter options and toggles aria-pressed", () => {
    const event = makeEvent("ai_decision", "AI Management Decision", "Details here.");
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
    for (const label of ["All", "Basho", "Match", "Training", "Injury", "Economy", "Career"]) {
      expect(screen.getByLabelText(`Filter by ${label}`)).toBeDefined();
    }
    expect(screen.getByLabelText("Filter by All").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByLabelText("Filter by Training"));
    expect(screen.getByLabelText("Filter by Training").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Filter by All").getAttribute("aria-pressed")).toBe("false");
  });

  it("shows unread events with a marker and marks them read on click", () => {
    const event = {
      ...makeEvent("ai_decision", "AI Management Decision", "Details here."),
      id: "unread-1",
    };
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
    expect(screen.getByLabelText("Unread event")).toBeDefined();
    fireEvent.click(screen.getByLabelText("AI Management Decision"));
    expect(screen.queryByLabelText("Unread event")).toBeNull();
  });
});
