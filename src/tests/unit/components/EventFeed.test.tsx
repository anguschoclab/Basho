import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { useGameStore } from "@/store/gameStore";
import type { EngineEvent } from "@/engine/types/events";

function makeEvent(
  id: string,
  type: EngineEvent["type"],
  importance: EngineEvent["importance"],
  year: number,
  week: number
): EngineEvent {
  return {
    id,
    type,
    year,
    week,
    phase: "weekly",
    category: "misc",
    importance,
    scope: "world",
    title: `Event ${id}`,
    summary: `Summary ${id}`,
  } as EngineEvent;
}

vi.mock("@/store/gameStore", () => ({
  useGameStore: vi.fn(),
}));

describe("EventFeed filtering", () => {
  const mockEvents: EngineEvent[] = [
    makeEvent("e1", "GLOBAL_CUP", "major", 2026, 10),
    makeEvent("e2", "BASHO_STATUS", "minor", 2026, 9),
    makeEvent("e3", "FINANCIAL_ALERT", "headline", 2026, 8),
    makeEvent("e4", "GLOBAL_CUP", "notable", 2026, 7),
  ];

  function mockStore(workerWorld: any) {
    const state = { workerWorld };
    vi.mocked(useGameStore).mockImplementation((selector: any) =>
      selector ? selector(state) : state
    );
  }

  beforeEach(() => {
    mockStore({ events: { log: mockEvents } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("filters events by filterTypes", () => {
    render(<EventFeed filterTypes={["GLOBAL_CUP"]} maxEvents={10} />);
    expect(screen.queryByText("Event e1")).toBeTruthy();
    expect(screen.queryByText("Event e4")).toBeTruthy();
    expect(screen.queryByText("Event e2")).toBeNull();
    expect(screen.queryByText("Event e3")).toBeNull();
  });

  it("shows all events when filterTypes is undefined", () => {
    render(<EventFeed maxEvents={10} />);
    expect(screen.queryByText("Event e1")).toBeTruthy();
    expect(screen.queryByText("Event e2")).toBeTruthy();
    expect(screen.queryByText("Event e3")).toBeTruthy();
    expect(screen.queryByText("Event e4")).toBeTruthy();
  });

  it("filters by minImportance", () => {
    render(<EventFeed minImportance="major" maxEvents={10} />);
    expect(screen.queryByText("Event e1")).toBeTruthy();
    expect(screen.queryByText("Event e3")).toBeTruthy();
    expect(screen.queryByText("Event e2")).toBeNull();
    expect(screen.queryByText("Event e4")).toBeNull();
  });

  it("sorts by most recent first", () => {
    render(<EventFeed maxEvents={10} />);
    const items = screen.getAllByText(/Event e/);
    expect(items[0].textContent).toContain("e1");
    expect(items[1].textContent).toContain("e2");
    expect(items[2].textContent).toContain("e3");
    expect(items[3].textContent).toContain("e4");
  });

  it("respects maxEvents limit", () => {
    render(<EventFeed maxEvents={2} />);
    const items = screen.getAllByText(/Event e/);
    expect(items).toHaveLength(2);
  });

  it("shows no events message when empty", () => {
    mockStore({ events: { log: [] } });
    render(<EventFeed maxEvents={10} />);
    expect(screen.queryByText("No recent events")).toBeTruthy();
  });
});
