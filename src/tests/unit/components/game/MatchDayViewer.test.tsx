import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MatchDayViewer } from "@/components/game/MatchDayViewer";
import type { WorldState } from "@/engine/types/world";
import type { BoutMatchUI } from "@/presenters/uiDigestTypes";

vi.mock("@/presenters/uiDigest", () => ({
  compareRanks: vi.fn(() => 0),
  buildBoutPreviewUI: vi.fn(() => null),
}));

vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: () => null,
}));

vi.mock("@/components/bookmark/BookmarkButton", () => ({
  BookmarkButton: () => null,
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

function makeWorld(overrides: Partial<WorldState> = {}): WorldState {
  return {
    year: 2026,
    week: 5,
    rikishi: new Map(),
    activeRikishiIds: new Set(),
    heyas: new Map(),
    ...overrides,
  } as unknown as WorldState;
}

function makeMatch(overrides: Partial<BoutMatchUI> = {}): BoutMatchUI {
  return {
    boutId: "bout-1",
    day: 1,
    eastRikishiId: "r1",
    westRikishiId: "r2",
    eastRikishi: {
      id: "r1",
      shikona: "East Rikishi",
      rank: "maegashira",
      division: "makuuchi",
      condition: 90,
      avatarConfig: { hairstyle: "topknot", bodyType: "heavy" },
    } as any,
    westRikishi: {
      id: "r2",
      shikona: "West Rikishi",
      rank: "maegashira",
      division: "makuuchi",
      condition: 90,
      avatarConfig: { hairstyle: "topknot", bodyType: "heavy" },
    } as any,
    isPlayerBout: false,
    h2h: { wins: 0, losses: 0 },
    rivalry: null,
    heatBand: "cold",
    h2hCommentary: "",
    ...overrides,
  } as BoutMatchUI;
}

describe("MatchDayViewer", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders without crashing with empty matches", () => {
    const world = makeWorld();
    render(
      <MatchDayViewer
        matches={[]}
        world={world}
        playerRikishiIds={new Set()}
      />
    );
    expect(screen.getByText(/no matches scheduled/i)).toBeTruthy();
  });

  it("renders match cards when matches are provided", () => {
    const world = makeWorld();
    const match = makeMatch();
    render(
      <MatchDayViewer
        matches={[match]}
        world={world}
        playerRikishiIds={new Set(["r1"])}
      />
    );
    expect(screen.getByText("East Rikishi")).toBeTruthy();
    expect(screen.getByText("West Rikishi")).toBeTruthy();
  });

  it("renders multiple matches", () => {
    const world = makeWorld();
    const m1 = makeMatch({ boutId: "b1" });
    const m2 = makeMatch({
      boutId: "b2",
      eastRikishiId: "r3",
      westRikishiId: "r4",
      eastRikishi: { id: "r3", shikona: "Another East", rank: "maegashira", division: "makuuchi", avatarConfig: {} } as any,
      westRikishi: { id: "r4", shikona: "Another West", rank: "maegashira", division: "makuuchi", avatarConfig: {} } as any,
    });
    render(
      <MatchDayViewer
        matches={[m1, m2]}
        world={world}
        playerRikishiIds={new Set()}
      />
    );
    expect(screen.getByText("East Rikishi")).toBeTruthy();
    expect(screen.getByText("Another East")).toBeTruthy();
  });
});
