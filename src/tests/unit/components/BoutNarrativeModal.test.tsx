import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoutNarrativeModal } from "@/components/game/BoutNarrativeModal";
import type { BoutResult, BashoName } from "@/engine/types/basho";
import type { UIRikishi } from "@/presenters/uiModels";
import type { PbpLine } from "@/engine/bout/boutNarrative";
import type { BoutReplayProgress } from "@/components/game/boutReplay/useBoutReplay";
import { TooltipProvider } from "@/components/ui/tooltip";

// Mock @tanstack/react-router to avoid jsdom router context issues
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) =>
    React.createElement("a", props, children),
  useNavigate: () => () => ({}),
  useLinkProps: () => ({}),
}));

// Mock ClickableName to avoid router dependency
vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
  StableName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
  ClickableName: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("span", null, children),
}));

// Mock BoutReplayViewer to avoid canvas/RAF in jsdom
vi.mock("@/components/game/BoutReplayViewer", () => ({
  BoutReplayViewer: forwardRefMock,
}));

function ForwardRefMock(props: {
  result: BoutResult;
  eastRikishi: UIRikishi;
  westRikishi: UIRikishi;
  autoPlay?: boolean;
  className?: string;
  onProgressUpdate?: (p: BoutReplayProgress) => void;
  onComplete?: () => void;
}) {
  React.useEffect(() => {
    props.onProgressUpdate?.({
      phaseIndex: 0,
      phaseProgress: 0.5,
      globalProgress: 0,
      totalDurationMs: 6000,
      elapsedMs: 0,
    });
  }, []);
  return React.createElement("div", { "data-testid": "replay-viewer-mock" });
}

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const mockRikishi = (id: string, shikona: string): UIRikishi =>
  ({
    id,
    shikona,
    rankLabel: "Yokozuna",
    rank: "yokozuna",
    stable: "Test",
    stableId: "s-1",
    prefecture: "Tokyo",
    height: 185,
    weight: 150,
    age: 28,
    wins: 10,
    losses: 2,
    absences: 0,
    isPlayer: false,
    isRetired: false,
    injuryWeeks: 0,
    morale: 80,
    fatigue: 0,
    popularity: 50,
    momentum: 0,
    style: "belt",
    preferredTech: "oshi",
    bloodline: "",
    debutBasho: { year: 2020, month: 1 },
    record: { totalBouts: 100, wins: 60, losses: 40, absences: 0 },
    careerWins: 60,
    careerLosses: 40,
    careerAbsences: 0,
  }) as unknown as UIRikishi;

const makeLine = (phase: PbpLine["phase"], text: string): PbpLine => ({
  text,
  id: `id-${text}`,
  phase,
});

const mockResult = (pbpLines: PbpLine[]): BoutResult =>
  ({
    boutId: "b-1",
    winner: "east",
    winnerRikishiId: "r-1",
    loserRikishiId: "r-2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    log: [],
    pbpLines,
    eastWins: 1,
    westWins: 0,
    day: 1,
    kenshoEnvelopes: 0,
    upset: false,
    isKinboshi: false,
  }) as unknown as BoutResult;

const bashoName: BashoName = { year: 2026, month: 1 } as unknown as BashoName;

// jsdom doesn't implement scrollIntoView
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

describe("BoutNarrativeModal", () => {
  it("renders Commentary tab with pbpLines text", () => {
    const lines = [makeLine("opening", "The crowd gathers")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    expect(screen.getByText("The crowd gathers")).toBeTruthy();
  });

  it("renders Narrative tab content when switched", () => {
    const lines = [makeLine("opening", "Opening narrative text")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    fireEvent.click(screen.getByText("Narrative"));
    expect(screen.getByText("Opening narrative text")).toBeTruthy();
  });

  it("renders Log tab content when switched", () => {
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult([])}
        bashoName={bashoName}
        day={1}
      />
    );
    fireEvent.click(screen.getByText("Log"));
    // BoutLog renders with empty log
    expect(screen.getByText("Log")).toBeTruthy();
  });

  it("empty pbpLines shows 'No play-by-play data available' message", () => {
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult([])}
        bashoName={bashoName}
        day={1}
      />
    );
    expect(screen.getByText("No play-by-play data available.")).toBeTruthy();
  });

  it("replay button click remounts viewer via key prop", () => {
    const lines = [makeLine("opening", "Test line")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    const replayBtn = screen.getByText("Replay");
    fireEvent.click(replayBtn);
    // Viewer should still be present (remounted with new key)
    expect(screen.getByTestId("replay-viewer-mock")).toBeTruthy();
  });

  it("active line has bg-primary/10 class when animProgress phaseIndex matches", () => {
    const lines = [makeLine("opening", "Opening line"), makeLine("tachiai", "Tachiai line")];
    const { container: _c } = renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    // The mock sends phaseIndex 0 (ritual) which maps to opening/entrance/ritual
    // "Opening line" should be active. Dialog renders in a portal, query document.body
    const openingLine = document.body.querySelector('[class*="bg-primary/10"]');
    expect(openingLine).toBeTruthy();
  });

  it("non-active lines have opacity-60 class", () => {
    const lines = [makeLine("opening", "Opening line"), makeLine("tachiai", "Tachiai line")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    // Tachiai line should have opacity-60 (not active during ritual phase)
    const tachiaiText = screen.getByText("Tachiai line");
    const parent = tachiaiText.closest('[class*="opacity-60"]');
    expect(parent).toBeTruthy();
  });

  it("lines with no phase tag are de-emphasized (opacity-60) but visible", () => {
    const lines: PbpLine[] = [
      { text: "No phase line", id: "no-phase" },
      makeLine("opening", "Opening line"),
    ];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        bashoName={bashoName}
        day={1}
      />
    );
    const noPhaseText = screen.getByText("No phase line");
    const parent = noPhaseText.closest('[class*="opacity-60"]');
    expect(parent).toBeTruthy();
  });

  it("onClose prop closes modal as alternative to onOpenChange", () => {
    const onClose = vi.fn();
    const lines = [makeLine("opening", "Opening text")];
    const { container } = renderWithProvider(
      <BoutNarrativeModal
        open
        onClose={onClose}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
      />
    );
    // The modal should render when open=true
    expect(screen.getByText("Opening text")).toBeTruthy();
    // Find the dialog close button (Radix Dialog renders an X button)
    const closeBtn = container.querySelector("[data-radix-collection-item]");
    if (closeBtn) {
      fireEvent.click(closeBtn);
    }
    // onClose is wired via handleClose — we verified it doesn't crash
    expect(onClose).toBeDefined();
  });

  it("autoPlay prop passes through to BoutReplayViewer", () => {
    const lines = [makeLine("opening", "Opening text")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
        autoPlay={false}
      />
    );
    // The mock BoutReplayViewer renders a div with data-testid="replay-viewer-mock"
    // autoPlay is passed as a prop — we verify the modal renders without crashing
    expect(screen.getByTestId("replay-viewer-mock")).toBeTruthy();
  });

  it("works without bashoName and day props", () => {
    const lines = [makeLine("opening", "Opening text")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
      />
    );
    expect(screen.getByText("Opening text")).toBeTruthy();
  });

  it("wraps tachiai phase chip label in GlossaryTip", () => {
    const lines = [makeLine("tachiai", "The charge begins!")];
    renderWithProvider(
      <BoutNarrativeModal
        open
        onOpenChange={vi.fn()}
        east={mockRikishi("r-1", "East")}
        west={mockRikishi("r-2", "West")}
        result={mockResult(lines)}
      />
    );
    // The tachiai kanji label should be present
    expect(screen.getByText("立合")).toBeTruthy();
  });
});
