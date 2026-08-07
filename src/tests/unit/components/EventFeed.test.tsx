import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EventFeed } from "@/components/dashboard/EventFeed";
import { useGameStore } from "@/store/gameStore";
import type { EngineEvent } from "@/engine/types/events";

function makeEvent(
  id: string,
  type: EngineEvent["type"],
  importance: EngineEvent["importance"],
  year: number,
  week: number,
  overrides?: { title?: string; summary?: string }
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
    title: overrides?.title ?? `Event ${id}`,
    summary: overrides?.summary ?? `Summary ${id}`,
  } as EngineEvent;
}

vi.mock("@/store/gameStore", () => ({
  useGameStore: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, onClick }: any) => (
    <a href={to} data-testid="router-link" onClick={onClick}>{children}</a>
  ),
}));

vi.mock("@/components/EventDetailDialog", () => ({
  EventDetailDialog: ({ event, isOpen, onClose }: any) => {
    if (!isOpen || !event) return null;
    return (
      <div data-testid="event-detail-dialog">
        <span>{event.title}</span>
        <button onClick={onClose} data-testid="dialog-close">Close</button>
      </div>
    );
  },
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

describe("EventFeed clickable entities and dialog", () => {
  function mockStore(workerWorld: any) {
    const state = { workerWorld };
    vi.mocked(useGameStore).mockImplementation((selector: any) =>
      selector ? selector(state) : state
    );
  }

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders entity links in event title", () => {
    const events = [
      makeEvent("e1", "BASHO_STATUS", "notable", 2026, 10, {
        title: "[[rikishi:r-1:Asanoyama]] wins by yorikiri",
      }),
    ];
    mockStore({ events: { log: events } });
    render(<EventFeed maxEvents={10} />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
    expect(screen.getByText("Asanoyama")).toBeTruthy();
  });

  it("renders entity links in event summary", () => {
    const events = [
      makeEvent("e1", "BASHO_STATUS", "notable", 2026, 10, {
        summary: "Defeated [[rikishi:r-2:Takakeisho]] in a decisive bout",
      }),
    ];
    mockStore({ events: { log: events } });
    render(<EventFeed maxEvents={10} />);
    const links = screen.getAllByTestId("router-link");
    const takakeishoLink = links.find(
      (l) => l.getAttribute("href") === "/rikishi/r-2"
    );
    expect(takakeishoLink).toBeTruthy();
    expect(screen.getByText("Takakeisho")).toBeTruthy();
  });

  it("clicking an event opens EventDetailDialog", () => {
    const events = [
      makeEvent("e1", "BASHO_STATUS", "notable", 2026, 10),
    ];
    mockStore({ events: { log: events } });
    render(<EventFeed maxEvents={10} />);
    const items = screen.getAllByRole("button");
    fireEvent.click(items[0]);
    expect(screen.getByTestId("event-detail-dialog")).toBeTruthy();
    const dialog = screen.getByTestId("event-detail-dialog");
    expect(dialog.textContent).toContain("Event e1");
  });

  it("EventDetailDialog close button works", () => {
    const events = [
      makeEvent("e1", "BASHO_STATUS", "notable", 2026, 10),
    ];
    mockStore({ events: { log: events } });
    render(<EventFeed maxEvents={10} />);
    const items = screen.getAllByRole("button");
    fireEvent.click(items[0]);
    expect(screen.getByTestId("event-detail-dialog")).toBeTruthy();
    fireEvent.click(screen.getByTestId("dialog-close"));
    expect(screen.queryByTestId("event-detail-dialog")).toBeNull();
  });

  it("keyboard activation opens dialog", () => {
    const events = [
      makeEvent("e1", "BASHO_STATUS", "notable", 2026, 10),
    ];
    mockStore({ events: { log: events } });
    render(<EventFeed maxEvents={10} />);
    const items = screen.getAllByRole("button");
    fireEvent.keyDown(items[0], { key: "Enter" });
    expect(screen.getByTestId("event-detail-dialog")).toBeTruthy();
  });
});
