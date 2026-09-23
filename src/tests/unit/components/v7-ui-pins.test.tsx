/**
 * v7 consolidation — UI behavior pins (strict test-first gate).
 *
 * Each pin asserts the POST-MERGE contract for a UI PR. Tests are RED on
 * pre-merge main and must turn GREEN when the corresponding PR lands.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import type { WorldState } from "@/engine/types/world";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: { children?: React.ReactNode; to?: string }) =>
    React.createElement("a", { href: to, ...props }, children),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
}));

vi.mock("@/contexts/useGame");
vi.mock("@/store/gameStore", () => ({ useGameStore: vi.fn() }));
vi.mock("@/hooks/useRequireWorld", () => ({ useRequireWorld: () => true }));
vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/layout/control-center", () => ({
  PageHeader: ({ title }: { title?: string }) => <div>{title}</div>,
}));

import * as GameContext from "@/contexts/useGame";
import { useGameStore } from "@/store/gameStore";
import { TooltipProvider } from "@/components/ui/tooltip";

const withProviders = (ui: React.ReactElement) =>
  render(<TooltipProvider>{ui}</TooltipProvider>);

function mockUseGame(world: Partial<WorldState> | null) {
  vi.mocked(GameContext.useGame).mockReturnValue({
    state: { world },
  } as ReturnType<typeof GameContext.useGame>);
}

function mockStore(world: Partial<WorldState> | null) {
  vi.mocked(useGameStore).mockImplementation(((sel: (s: unknown) => unknown) =>
    sel({ workerWorld: world, sendCommand: vi.fn() })) as never);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// #975: TrendsWidget — Meta Bias label must reflect world.meta.tone, not a
// hardcoded "Oshi-Strong".
// ---------------------------------------------------------------------------
describe("v7 pin — #975 TrendsWidget dynamic era tone", () => {
  it("renders the real era tone label", async () => {
    const { TrendsWidget } = await import("@/components/dashboard/TrendsWidget");
    mockUseGame({
      history: [{ bashoName: "hatsu", year: 2026 }],
      meta: { tone: "explosive", drift: {} },
      globalKimariteStats: {},
    } as Partial<WorldState>);
    withProviders(<TrendsWidget />);
    expect(screen.getByText(/Meta Bias:/).textContent).toContain("Explosive");
    expect(screen.getByText(/Meta Bias:/).textContent).not.toContain("Oshi-Strong");
  });
});

// ---------------------------------------------------------------------------
// #995: EventFeed — list must render inside a Radix ScrollArea viewport.
// ---------------------------------------------------------------------------
describe("v7 pin — #995 EventFeed uses ScrollArea", () => {
  it("wraps events in a radix scroll viewport", async () => {
    const { EventFeed } = await import("@/components/dashboard/EventFeed");
    mockStore({
      events: {
        log: [
          {
            id: "e1",
            type: "BASHO_STATUS",
            year: 2026,
            week: 1,
            phase: "weekly",
            category: "basho",
            importance: "minor",
            scope: "world",
            title: "T1",
            summary: "S1",
          },
        ],
      },
    } as Partial<WorldState>);
    const { container } = render(<EventFeed />);
    expect(container.querySelector("[data-radix-scroll-area-viewport]")).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// #978: RosterList — empty state must use the shared EmptyState component
// (renders title as an h3 heading, not a bespoke <p>).
// ---------------------------------------------------------------------------
describe("v7 pin — #978 RosterList shared EmptyState", () => {
  it("renders 'Dohyo Empty' as a heading via EmptyState", async () => {
    const { RosterList } = await import("@/components/rikishi/RosterList");
    withProviders(<RosterList rikishiList={[]} onRikishiClick={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Dohyo Empty" })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// #966: StaffPage — empty staff list shows an EmptyState with recruit action.
// ---------------------------------------------------------------------------
describe("v7 pin — #966 StaffPage empty state", () => {
  it("shows 'No Staff Members' empty state when the heya has no staff", async () => {
    const { default: StaffPage } = await import("@/pages/StaffPage");
    const world = {
      staff: new Map(),
      heyas: new Map([["h1", { id: "h1", name: "Test Heya", staffIds: [] }]]),
      oyakata: new Map(),
      playerHeyaId: "h1",
    } as unknown as WorldState;
    mockUseGame(world);
    mockStore(world);
    withProviders(<StaffPage />);
    expect(screen.getByText("No Staff Members")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// #987: OyakataPage — oyakata cards must be keyboard-activatable.
// ---------------------------------------------------------------------------
describe("v7 pin — #987 OyakataPage keyboard a11y", () => {
  it("Enter key on an oyakata card selects it", async () => {
    const { default: OyakataPage } = await import("@/pages/OyakataPage");
    const oyakata = {
      id: "o1",
      name: "Master One",
      heyaId: "h1",
      archetype: "traditionalist",
      age: 55,
      yearsInCharge: 10,
      traits: { ambition: 50, risk: 50, tradition: 80, patience: 60, compassion: 40 },
    };
    const world = {
      oyakata: new Map([["o1", oyakata]]),
      heyas: new Map([["h1", { id: "h1", name: "Test Heya", oyakataId: "o1" }]]),
      rikishi: new Map(),
      playerHeyaId: "h1",
      year: 2026,
    } as unknown as WorldState;
    mockUseGame(world);
    mockStore(world);
    render(<OyakataPage />);
    const card = screen.getAllByRole("button").find((el) => el.textContent?.includes("Master One"));
    expect(card).toBeDefined();
    fireEvent.keyDown(card!, { key: "Enter" });
    expect(screen.getAllByText("Master One").length).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// #976: aria-hidden must not cloak live content.
// ---------------------------------------------------------------------------
describe("v7 pin — #976 aria-hidden removed from live content", () => {
  it("DebtSection payoff progress bar is not aria-hidden", async () => {
    const { DebtSection } = await import("@/components/economy/DebtSection");
    const loan = {
      id: "l1",
      type: "bank",
      providerName: "Sumo Bank",
      amount: 1000,
      interestRate: 5,
      dueWeek: 20,
      remainingBalance: 500,
      principal: 1000,
      monthlyPayment: 100,
    };
    const { container } = render(<DebtSection activeLoans={[loan] as never} />);
    const bar = container.querySelector(".bg-success");
    expect(bar).not.toBeNull();
    expect(bar!.getAttribute("aria-hidden")).not.toBe("true");
  });
});

// ---------------------------------------------------------------------------
// V7-B01: PREPAY_LOAN must be reachable — DebtSection renders a prepay control
// per active loan that dispatches the worker command.
// ---------------------------------------------------------------------------
describe("v7 pin — V7-B01 PREPAY_LOAN reachable", () => {
  it("DebtSection exposes a prepay control per active loan", async () => {
    const { DebtSection } = await import("@/components/economy/DebtSection");
    const loan = {
      id: "l1",
      type: "bank",
      providerName: "Sumo Bank",
      amount: 1000,
      interestRate: 5,
      dueWeek: 20,
      remainingBalance: 500,
      principal: 1000,
      monthlyPayment: 100,
    };
    render(<DebtSection activeLoans={[loan] as never} />);
    expect(screen.getByRole("button", { name: /prepay/i })).toBeTruthy();
  });
});
