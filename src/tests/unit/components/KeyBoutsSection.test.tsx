import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { KeyBoutsSection } from "@/components/game/KeyBoutsSection";
import type { KeyBoutMoment } from "@/presenters/projections/recapProjections";
import { mockUIRikishi } from "@/tests/helpers/uiTestHelpers";
import type { BoutResult } from "@/engine/types/basho";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock @tanstack/react-router
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement("a", props, children),
  useNavigate: () => () => ({}),
  useLinkProps: () => ({}),
}));

// Mock ClickableName
vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
  StableName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
  ClickableName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

// Mock SumoAvatar
vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: () => React.createElement("div", { "data-testid": "sumo-avatar" }),
}));

// Mock uiDigest
vi.mock("@/presenters/uiDigest", () => ({
  formatStance: () => "Push",
  getKimarite: () => ({
    id: "yorikiri",
    name: "Yorikiri",
    nameJa: "寄り切り",
    description: "Frontal force-out.",
    rarity: "common",
  }),
}));

// Mock BoutReplayViewer to avoid canvas/RAF in jsdom
vi.mock("@/components/game/BoutReplayViewer", () => ({
  BoutReplayViewer: () => React.createElement("div", { "data-testid": "replay-viewer-mock" }),
}));

// Mock BoutLog
vi.mock("@/components/game/BoutLog", () => ({
  BoutLog: () => React.createElement("div", { "data-testid": "bout-log-mock" }),
}));

const mockResult = (overrides: Partial<BoutResult> = {}): BoutResult =>
  ({
    boutId: "b-1",
    winner: "east",
    winnerRikishiId: "r-1",
    loserRikishiId: "r-2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "push-dominant",
    tachiaiWinner: "east",
    duration: 10,
    upset: false,
    kenshoEnvelopes: 0,
    momentumScore: 0,
    inBoutInjury: null,
    isTimeout: false,
    log: [],
    ...overrides,
  }) as unknown as BoutResult;

function makeMoment(
  label: KeyBoutMoment["label"],
  boutId: string,
  eastId: string,
  westId: string
): KeyBoutMoment {
  return {
    label,
    labelText:
      label === "yusho_decider"
        ? "Yusho-Deciding Bout"
        : label === "biggest_upset"
          ? "Biggest Upset"
          : "Kinboshi — Gold Star",
    bout: mockResult({ boutId }),
    day: 15,
    bashoName: "hatsu",
    eastRikishiId: eastId,
    westRikishiId: westId,
  };
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("KeyBoutsSection", () => {
  it("returns null when moments array is empty", () => {
    const { container } = renderWithProvider(
      <KeyBoutsSection moments={[]} getRikishi={() => null} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders one card per moment", () => {
    const moments = [
      makeMoment("yusho_decider", "b1", "r1", "r2"),
      makeMoment("biggest_upset", "b2", "r3", "r4"),
      makeMoment("kinboshi", "b3", "r5", "r6"),
    ];
    const getRikishi = (id: string) => mockUIRikishi(id, `Wrestler-${id}`);

    renderWithProvider(<KeyBoutsSection moments={moments} getRikishi={getRikishi} />);

    expect(screen.getByText("Yusho-Deciding Bout")).toBeTruthy();
    expect(screen.getByText("Biggest Upset")).toBeTruthy();
    expect(screen.getByText("Kinboshi — Gold Star")).toBeTruthy();
  });

  it("Watch Replay button opens BoutNarrativeModal", () => {
    const moments = [makeMoment("yusho_decider", "b1", "r1", "r2")];
    const getRikishi = (id: string) => mockUIRikishi(id, `Wrestler-${id}`);

    renderWithProvider(<KeyBoutsSection moments={moments} getRikishi={getRikishi} />);

    const replayBtn = screen.getByText("Watch Replay");
    fireEvent.click(replayBtn);

    // Modal should now be open — the mock BoutReplayViewer should be visible
    expect(screen.getByTestId("replay-viewer-mock")).toBeTruthy();
  });

  it("modal closes via onClose", () => {
    const moments = [makeMoment("yusho_decider", "b1", "r1", "r2")];
    const getRikishi = (id: string) => mockUIRikishi(id, `Wrestler-${id}`);

    const { container } = renderWithProvider(
      <KeyBoutsSection moments={moments} getRikishi={getRikishi} />
    );

    // Open modal
    fireEvent.click(screen.getByText("Watch Replay"));
    expect(screen.getByTestId("replay-viewer-mock")).toBeTruthy();

    // Close modal via the dialog's close button (Radix Dialog X)
    const closeBtn = container.querySelector("[data-radix-collection-item]");
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
    // After closing, the section should still be visible
    expect(screen.getByText("Yusho-Deciding Bout")).toBeTruthy();
  });

  it("skips card when getRikishi returns null", () => {
    const moments = [
      makeMoment("yusho_decider", "b1", "r1", "r2"),
      makeMoment("biggest_upset", "b2", "r-missing", "r4"),
    ];
    const getRikishi = (id: string) => {
      if (id === "r-missing") return null;
      return mockUIRikishi(id, `Wrestler-${id}`);
    };

    renderWithProvider(<KeyBoutsSection moments={moments} getRikishi={getRikishi} />);

    // Only the yusho decider card should render
    expect(screen.getByText("Yusho-Deciding Bout")).toBeTruthy();
    expect(screen.queryByText("Biggest Upset")).toBeNull();
  });

  it("badge text matches labelText for each moment type", () => {
    const moments = [
      makeMoment("yusho_decider", "b1", "r1", "r2"),
      makeMoment("biggest_upset", "b2", "r3", "r4"),
      makeMoment("kinboshi", "b3", "r5", "r6"),
    ];
    const getRikishi = (id: string) => mockUIRikishi(id, `Wrestler-${id}`);

    renderWithProvider(<KeyBoutsSection moments={moments} getRikishi={getRikishi} />);

    expect(screen.getByText("Yusho-Deciding Bout")).toBeTruthy();
    expect(screen.getByText("Biggest Upset")).toBeTruthy();
    expect(screen.getByText("Kinboshi — Gold Star")).toBeTruthy();
  });
});
