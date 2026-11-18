/**
 * OyakataProfilePage.test.tsx
 *
 * Dedicated per-oyakata profile page (/oyakata/$oyakataId) — public record,
 * tenure counters, WS7-gated intel, succession, directory navigation, and
 * the /stable/oyakata → player profile redirect.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import React from "react";
import OyakataProfilePage, {
  PlayerOyakataRedirect,
} from "@/pages/OyakataProfilePage";
import { useGame } from "@/state/game/useGame";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Oyakata } from "@/engine/types/oyakata";
import type { Heya } from "@/engine/types/heya";
import type { ScoutedRikishi } from "@/engine/recruitment/ScoutingService";

let mockParams: Record<string, string> = { oyakataId: "o1" };
const mockNavigate = vi.fn();
const navigateCalls: Array<{ to: string; params?: Record<string, string>; replace?: boolean }> = [];

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/oyakata/o1" }),
  Link: ({
    to,
    params,
    children,
    ...rest
  }: {
    to: string;
    params?: Record<string, string>;
    children: React.ReactNode;
  }) => {
    const resolved = params
      ? to.replace(/\$(\w+)/g, (m: string, k: string) => params[k] ?? m)
      : to;
    return React.createElement("a", { href: resolved, ...rest }, children);
  },
  Navigate: (props: { to: string; params?: Record<string, string>; replace?: boolean }) => {
    navigateCalls.push(props);
    return null;
  },
}));

vi.mock("@/state/game/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@/state/stores/gameStore", () => ({
  useGameStore: (sel: (s: { workerWorld: null; sendCommand: unknown }) => unknown) =>
    sel({ workerWorld: null, sendCommand: vi.fn() }),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

vi.mock("@/components/layout/page-shell/index", () => ({
  PageHeader: ({ title, lede }: { title: string; lede?: string }) =>
    React.createElement("div", null, React.createElement("h1", null, title), lede),
}));

const FULL_TENURE = {
  startedYear: 2018,
  bashoServed: 60,
  championships: 8,
  sekitoriProduced: 9,
  sanyakuProduced: 4,
  ozekiProduced: 2,
  yokozunaProduced: 1,
  insolvencyEvents: 0,
  majorScandals: 0,
  forcedMergers: 0,
  boardSeatsWon: 3,
};

function profileWorld(options: {
  oyakata: Oyakata[];
  heyas?: Heya[];
  playerHeyaId?: string;
  scoutingHeyaIds?: string[];
}): WorldState {
  const world = MockFactory.createWorld({ year: 2030, playerHeyaId: options.playerHeyaId });
  for (const o of options.oyakata) world.oyakata.set(o.id, o);
  for (const h of options.heyas ?? []) world.heyas.set(h.id, h);
  if (options.scoutingHeyaIds?.length) {
    world.playerKnowledge = {
      scouting: Object.fromEntries(
        options.scoutingHeyaIds.map((hid, i) => [
          `s${i}`,
          { publicInfo: { heyaId: hid }, timesObserved: 2 } as ScoutedRikishi,
        ])
      ),
    };
  }
  return world;
}

function mockContext(world: WorldState | null) {
  vi.mocked(useGame).mockReturnValue({
    state: { world, playerHeyaId: world?.playerHeyaId },
    hasAutosave: () => false,
    loadFromAutosave: () => false,
  } as unknown as ReturnType<typeof useGame>);
}

describe("OyakataProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateCalls.length = 0;
    mockParams = { oyakataId: "o1" };
  });

  afterEach(() => cleanup());

  it("renders the oyakata header with the public record", () => {
    const o = MockFactory.createOyakata("o1", {
      name: "Chiganoura",
      age: 58,
      heyaId: "h1",
      yearsInCharge: 12,
      tenure: FULL_TENURE,
    });
    const world = profileWorld({
      oyakata: [o],
      heyas: [MockFactory.createHeya("h1", { name: "Miyagino", oyakataId: "o1" })],
      playerHeyaId: "h1",
    });
    mockContext(world);
    render(<OyakataProfilePage />);
    expect(screen.getByText("Chiganoura")).toBeTruthy();
    expect(screen.getByText(/12 years in charge/i)).toBeTruthy();
    expect(screen.getByText("Miyagino")).toBeTruthy();
  });

  it("renders the manager record grid including produced-rank counters", () => {
    const o = MockFactory.createOyakata("o1", { name: "Chiganoura", tenure: FULL_TENURE });
    const world = profileWorld({ oyakata: [o], playerHeyaId: "h1" });
    mockContext(world);
    render(<OyakataProfilePage />);
    expect(screen.getByText("60")).toBeTruthy(); // bashoServed
    expect(screen.getByText("8")).toBeTruthy(); // championships
    expect(screen.getByText("9")).toBeTruthy(); // sekitoriProduced
    expect(screen.getByText("4")).toBeTruthy(); // sanyakuProduced
    expect(screen.getByText("2")).toBeTruthy(); // ozekiProduced
    expect(screen.getByText("1")).toBeTruthy(); // yokozunaProduced
  });

  it("shows full intel for the player's own oyakata", () => {
    const o = MockFactory.createOyakata("o1", {
      name: "Chiganoura",
      heyaId: "h1",
      archetype: "traditionalist",
      mood: "content",
    });
    const world = profileWorld({ oyakata: [o], playerHeyaId: "h1" });
    mockContext(world);
    render(<OyakataProfilePage />);
    const intel = within(screen.getByTestId("oyakata-intel"));
    expect(intel.getByText(/traditionalist/i)).toBeTruthy();
    expect(intel.getByText(/content/i)).toBeTruthy();
  });

  it("hides private intel for an unscouted rival oyakata", () => {
    const o = MockFactory.createOyakata("o1", {
      name: "Chiganoura",
      heyaId: "h9",
      archetype: "traditionalist",
      mood: "furious",
    });
    const world = profileWorld({
      oyakata: [o],
      heyas: [MockFactory.createHeya("h9", { name: "Miyagino", oyakataId: "o1" })],
      playerHeyaId: "h1",
    });
    mockContext(world);
    render(<OyakataProfilePage />);
    const intel = within(screen.getByTestId("oyakata-intel"));
    expect(intel.getByText(/limited intel/i)).toBeTruthy();
    expect(intel.queryByText(/traditionalist/i)).toBeNull();
    expect(intel.queryByText(/furious/i)).toBeNull();
    expect(intel.queryByText(/ambition/i)).toBeNull();
  });

  it("reveals intel for a rival oyakata whose stable is scouted", () => {
    const o = MockFactory.createOyakata("o1", {
      name: "Chiganoura",
      heyaId: "h9",
      archetype: "scientist",
      mood: "inspired",
    });
    const world = profileWorld({
      oyakata: [o],
      heyas: [MockFactory.createHeya("h9", { name: "Miyagino", oyakataId: "o1" })],
      playerHeyaId: "h1",
      scoutingHeyaIds: ["h9"],
    });
    mockContext(world);
    render(<OyakataProfilePage />);
    const intel = within(screen.getByTestId("oyakata-intel"));
    expect(intel.getByText(/scientist/i)).toBeTruthy();
    expect(intel.getByText(/inspired/i)).toBeTruthy();
  });

  it("shows the succession card only for the player's own stable", () => {
    const own = MockFactory.createOyakata("o1", {
      name: "Own Elder",
      heyaId: "h1",
      successionReadiness: "transitioning",
    });
    const world = profileWorld({ oyakata: [own], playerHeyaId: "h1" });
    mockContext(world);
    const { unmount } = render(<OyakataProfilePage />);
    expect(screen.getByText(/succession/i)).toBeTruthy();
    unmount();

    const rival = MockFactory.createOyakata("o1", {
      name: "Rival Elder",
      heyaId: "h9",
      successionReadiness: "transitioning",
    });
    mockContext(profileWorld({ oyakata: [rival], playerHeyaId: "h1" }));
    render(<OyakataProfilePage />);
    expect(screen.queryByText(/succession/i)).toBeNull();
  });

  it("renders emeritus and elder-status badges", () => {
    const o = MockFactory.createOyakata("o1", {
      name: "Elder One",
      isEmeritus: true,
      elderStatus: "ichidai_toshiyori",
    });
    const world = profileWorld({ oyakata: [o], playerHeyaId: "h1" });
    mockContext(world);
    render(<OyakataProfilePage />);
    expect(screen.getByText(/emeritus/i)).toBeTruthy();
    expect(screen.getByText(/ichidai/i)).toBeTruthy();
  });

  it("renders a not-found state for an unknown oyakata id", () => {
    mockParams = { oyakataId: "missing" };
    mockContext(profileWorld({ oyakata: [], playerHeyaId: "h1" }));
    render(<OyakataProfilePage />);
    expect(screen.getByText(/not found/i)).toBeTruthy();
  });

  it("directory lists all oyakata and navigates to their profiles", () => {
    const o1 = MockFactory.createOyakata("o1", { name: "Alpha Elder" });
    const o2 = MockFactory.createOyakata("o2", { name: "Beta Elder", heyaId: "h2" });
    const world = profileWorld({ oyakata: [o1, o2], playerHeyaId: "h1" });
    mockContext(world);
    render(<OyakataProfilePage />);
    expect(screen.getByText("Alpha Elder")).toBeTruthy();
    expect(screen.getByText("Beta Elder")).toBeTruthy();
    fireEvent.click(screen.getByText("Beta Elder"));
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/oyakata/$oyakataId",
      params: { oyakataId: "o2" },
    });
  });
});

describe("PlayerOyakataRedirect (/stable/oyakata)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateCalls.length = 0;
  });

  afterEach(() => cleanup());

  it("redirects to the player's oyakata profile", () => {
    const world = profileWorld({
      oyakata: [MockFactory.createOyakata("o1", { heyaId: "h1" })],
      heyas: [MockFactory.createHeya("h1", { oyakataId: "o1" })],
      playerHeyaId: "h1",
    });
    mockContext(world);
    render(<PlayerOyakataRedirect />);
    expect(navigateCalls).toContainEqual({
      to: "/oyakata/$oyakataId",
      params: { oyakataId: "o1" },
      replace: true,
    });
  });

  it("renders a not-found state when the player heya has no oyakata", () => {
    const world = profileWorld({
      oyakata: [],
      heyas: [MockFactory.createHeya("h1", { oyakataId: "missing" })],
      playerHeyaId: "h1",
    });
    mockContext(world);
    render(<PlayerOyakataRedirect />);
    expect(navigateCalls).toHaveLength(0);
    expect(screen.getByText(/not found|unavailable|no oyakata/i)).toBeTruthy();
  });
});
