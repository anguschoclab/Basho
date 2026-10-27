import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MatchDayViewer } from "@/components/basho/MatchDayViewer";
import { buildBoutPreviewUI } from "@/presenters/uiDigest";
import type { WorldState } from "@/engine/types/world";
import type { BoutMatchUI } from "@/presenters/uiDigestTypes";

vi.mock("@/presenters/uiDigest", () => ({
  compareRanks: vi.fn(() => 0),
  toRankPosition: vi.fn(
    (args: { rank: string; side: string; rankNumber?: number }) => ({
      rank: args.rank,
      side: args.side,
      rankNumber: args.rankNumber,
    })
  ),
  buildBoutPreviewUI: vi.fn(() => null),
}));

vi.mock("@/components/basho/BoutPreMatchOverlay", () => ({
  BoutPreMatchOverlay: ({
    onBegin,
    onDismiss,
  }: {
    onBegin: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid="prematch-overlay">
      <button onClick={onBegin}>Begin</button>
      <button onClick={onDismiss}>Dismiss</button>
    </div>
  ),
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
    render(<MatchDayViewer matches={[]} world={world} playerRikishiIds={new Set()} />);
    expect(screen.getByText(/no matches scheduled/i)).toBeTruthy();
  });

  it("renders match cards when matches are provided", () => {
    const world = makeWorld();
    const match = makeMatch();
    render(<MatchDayViewer matches={[match]} world={world} playerRikishiIds={new Set(["r1"])} />);
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
      eastRikishi: {
        id: "r3",
        shikona: "Another East",
        rank: "maegashira",
        division: "makuuchi",
        avatarConfig: {},
      } as any,
      westRikishi: {
        id: "r4",
        shikona: "Another West",
        rank: "maegashira",
        division: "makuuchi",
        avatarConfig: {},
      } as any,
    });
    render(<MatchDayViewer matches={[m1, m2]} world={world} playerRikishiIds={new Set()} />);
    expect(screen.getByText("East Rikishi")).toBeTruthy();
    expect(screen.getByText("Another East")).toBeTruthy();
  });

  it("sorts player bouts first, then by rivalry heat, then pending before played", () => {
    const world = makeWorld();
    const played = makeMatch({ boutId: "played", result: { winner: "east" } as never });
    const heated = makeMatch({
      boutId: "heated",
      eastRikishiId: "r5",
      westRikishiId: "r6",
      rivalry: { heat: 80 } as never,
    });
    const player = makeMatch({ boutId: "player", isPlayerBout: true });
    render(
      <MatchDayViewer
        matches={[played, heated, player]}
        world={world}
        playerRikishiIds={new Set()}
      />
    );
    const cards = screen.getAllByText("East Rikishi");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("1/3")).toBeTruthy();
  });

  it("shows scout hint for player bouts when the opponent is scouted", () => {
    const match = makeMatch({ isPlayerBout: true });
    const world = makeWorld({
      playerKnowledge: {
        scouting: {
          r2: {
            publicInfo: { archetype: "pusher" },
            scoutingLevel: 3,
          },
        },
      } as unknown as WorldState["playerKnowledge"],
    });
    // West rikishi is the non-player-owned opponent.
    (match.westRikishi as { isPlayerOwned?: boolean }).isPlayerOwned = false;
    render(
      <MatchDayViewer
        matches={[match]}
        world={world}
        playerRikishiIds={new Set(["r1"])}
        onTacticChange={vi.fn()}
      />
    );
    expect(screen.getByText(/Scouting: likely pusher fighter/)).toBeTruthy();
  });

  it("does not show scout hint for non-player bouts", () => {
    const match = makeMatch({ isPlayerBout: false });
    const world = makeWorld({
      playerKnowledge: {
        scouting: {
          r2: { publicInfo: { archetype: "pusher" }, scoutingLevel: 3 },
        },
      } as unknown as WorldState["playerKnowledge"],
    });
    render(
      <MatchDayViewer
        matches={[match]}
        world={world}
        playerRikishiIds={new Set()}
        onTacticChange={vi.fn()}
      />
    );
    expect(screen.queryByText(/Scouting:/)).toBeNull();
  });

  it("opens the pre-match overlay when a pending player bout is confirmed", () => {
    vi.mocked(buildBoutPreviewUI).mockReturnValue({ boutId: "bout-1" } as never);
    const match = makeMatch({ isPlayerBout: true });
    const world = makeWorld();
    render(
      <MatchDayViewer
        matches={[match]}
        world={world}
        playerRikishiIds={new Set(["r1"])}
        onTacticChange={vi.fn()}
        onBoutClick={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText(/Confirm & Sim Bout/));
    expect(buildBoutPreviewUI).toHaveBeenCalledWith("bout-1", world);
    expect(screen.getByTestId("prematch-overlay")).toBeTruthy();
  });

  it("dismisses the overlay without starting the bout", () => {
    vi.mocked(buildBoutPreviewUI).mockReturnValue({ boutId: "bout-1" } as never);
    const onBoutClick = vi.fn();
    const match = makeMatch({ isPlayerBout: true });
    render(
      <MatchDayViewer
        matches={[match]}
        world={makeWorld()}
        playerRikishiIds={new Set(["r1"])}
        onTacticChange={vi.fn()}
        onBoutClick={onBoutClick}
      />
    );
    fireEvent.click(screen.getByText(/Confirm & Sim Bout/));
    fireEvent.click(screen.getByText("Dismiss"));
    expect(screen.queryByTestId("prematch-overlay")).toBeNull();
    expect(onBoutClick).not.toHaveBeenCalled();
  });

  it("begin from the overlay calls onBoutClick with the canonical match", () => {
    vi.mocked(buildBoutPreviewUI).mockReturnValue({ boutId: "bout-1" } as never);
    const onBoutClick = vi.fn();
    const match = makeMatch({ isPlayerBout: true });
    render(
      <MatchDayViewer
        matches={[match]}
        world={makeWorld()}
        playerRikishiIds={new Set(["r1"])}
        onTacticChange={vi.fn()}
        onBoutClick={onBoutClick}
      />
    );
    fireEvent.click(screen.getByText(/Confirm & Sim Bout/));
    fireEvent.click(screen.getByText("Begin"));
    expect(onBoutClick).toHaveBeenCalledWith(match);
    expect(screen.queryByTestId("prematch-overlay")).toBeNull();
  });

  it("calls onBoutClick with the canonical BoutMatchUI when a completed bout is clicked", () => {
    const onBoutClick = vi.fn();
    const match = makeMatch({ result: { winner: "east" } as never });
    render(
      <MatchDayViewer
        matches={[match]}
        world={makeWorld()}
        playerRikishiIds={new Set()}
        onBoutClick={onBoutClick}
      />
    );
    fireEvent.click(screen.getByText("East Rikishi").closest(".bout-card")!);
    expect(onBoutClick).toHaveBeenCalledWith(match);
  });

  it("ignores clicks on matches without a resolvable boutId", () => {
    const onBoutClick = vi.fn();
    const match = makeMatch({ boutId: undefined, result: { winner: "east" } as never });
    render(
      <MatchDayViewer
        matches={[match]}
        world={makeWorld()}
        playerRikishiIds={new Set()}
        onBoutClick={onBoutClick}
      />
    );
    fireEvent.click(screen.getByText("East Rikishi").closest(".bout-card")!);
    expect(onBoutClick).not.toHaveBeenCalled();
  });
});
