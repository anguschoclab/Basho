/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExhibitionBout } from "@/components/onboarding/ExhibitionBout";
import { resolveBout } from "@/engine/bout/boutResolver";

// Mock GameContext
const mockUseGame = vi.fn();
vi.mock("@/contexts/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

// Mock boutResolver — use vi.fn() so we can change behavior per-test
vi.mock("@/engine/bout/boutResolver", () => ({
  resolveBout: vi.fn(() => ({
    result: {
      boutId: "exhibition-bout-001",
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
      log: [],
      pbpLines: [
        { id: "l1", phase: "tachiai", text: "The bout begins." },
        { id: "l2", phase: "finish", text: "East wins!" },
      ],
    },
  })),
}));

// Mock PbpLineText
vi.mock("@/components/game/PbpLineText", () => ({
  PbpLineText: ({ text }: { text: string }) => <span>{text}</span>,
}));

// Mock KimariteTag
vi.mock("@/components/ui/KimariteTag", () => ({
  KimariteTag: ({ kimariteName }: { kimariteId: string; kimariteName?: string }) => (
    <span data-testid="kimarite-tag">{kimariteName}</span>
  ),
}));

// Mock MentorOverlay
vi.mock("@/components/onboarding/MentorOverlay", () => ({
  MentorOverlay: () => null,
}));

// Mock getKimarite for KimariteTag (in case it's not mocked above)
vi.mock("@/presenters/uiDigest", () => ({
  getKimarite: (id: string) => {
    if (id === "yorikiri") {
      return {
        id: "yorikiri",
        name: "Yorikiri",
        nameJa: "寄り切り",
        description: "Frontal force-out.",
        rarity: "common",
      };
    }
    return undefined;
  },
  formatStance: () => "Push",
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const mockRikishi = (id: string, shikona: string) => ({
  id,
  shikona,
  name: shikona,
  rank: "Yokozuna",
  division: "makuuchi",
});

const mockWorld = {
  year: 2025,
  rikishi: new Map([
    ["r-1", mockRikishi("r-1", "East Wrestler")],
    ["r-2", mockRikishi("r-2", "West Wrestler")],
  ]),
};

const mockGameApi = {
  state: { world: mockWorld },
  advanceTutorialStep: vi.fn(),
  setTutorialFlag: vi.fn(),
  completeTutorial: vi.fn(),
};

describe("ExhibitionBout", () => {
  it("renders preparing message when no world", () => {
    mockUseGame.mockReturnValue({
      state: { world: null },
      advanceTutorialStep: vi.fn(),
      setTutorialFlag: vi.fn(),
      completeTutorial: vi.fn(),
    });
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
  });

  it("renders Live Bout Preview header with world", () => {
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Live Bout Preview")).toBeTruthy();
  });

  it("clicking Next increments revealed count", () => {
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("0/2 actions")).toBeTruthy();
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("1/2 actions")).toBeTruthy();
  });

  it("shows Begin My Career button after full reveal", () => {
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    // Click Next twice to reveal all lines
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Begin My Career")).toBeTruthy();
  });

  it("shows Your Role as Oyakata card after full reveal", () => {
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText(/Your Role as Oyakata/i)).toBeTruthy();
  });

  it("Begin My Career calls onComplete", () => {
    const onComplete = vi.fn();
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={onComplete} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Begin My Career"));
    expect(onComplete).toHaveBeenCalled();
  });

  it("result banner uses KimariteTag", () => {
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByTestId("kimarite-tag")).toBeTruthy();
  });
});

describe("ExhibitionBout — error paths", () => {
  const mockRikishi = (id: string, shikona: string, division = "makuuchi") => ({
    id,
    shikona,
    name: shikona,
    rank: "Yokozuna",
    division,
  });

  const mockWorld = {
    year: 2025,
    rikishi: new Map([
      ["r-1", mockRikishi("r-1", "East Wrestler")],
      ["r-2", mockRikishi("r-2", "West Wrestler")],
    ]),
  };

  const mockGameApi = {
    state: { world: mockWorld },
    advanceTutorialStep: vi.fn(),
    setTutorialFlag: vi.fn(),
    completeTutorial: vi.fn(),
  };

  beforeEach(() => {
    // Reset to default valid implementation
    vi.mocked(resolveBout).mockReturnValue({
      result: {
        boutId: "exhibition-bout-001",
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
        log: [],
        pbpLines: [
          { id: "l1", phase: "tachiai", text: "The bout begins." },
          { id: "l2", phase: "finish", text: "East wins!" },
        ],
      },
    } as unknown as ReturnType<typeof resolveBout>);
  });

  it("resolveBout throws → fallback renders 'Preparing exhibition bout...'", () => {
    vi.mocked(resolveBout).mockImplementation(() => {
      throw new Error("physics failed");
    });
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
    expect(screen.queryByText("Live Bout Preview")).toBeNull();
  });

  it("resolveBout returns { result: null } → fallback renders", () => {
    vi.mocked(resolveBout).mockReturnValue({ result: null } as unknown as ReturnType<typeof resolveBout>);
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
  });

  it("resolveBout returns undefined → fallback renders", () => {
    vi.mocked(resolveBout).mockReturnValue(undefined as unknown as ReturnType<typeof resolveBout>);
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
  });

  it("world with only jonokuchi rikishi → fallback pair used, bout renders", () => {
    const jonokuchiWorld = {
      year: 2025,
      rikishi: new Map([
        ["r-1", mockRikishi("r-1", "East Wrestler", "jonokuchi")],
        ["r-2", mockRikishi("r-2", "West Wrestler", "jonokuchi")],
      ]),
    };
    mockUseGame.mockReturnValue({
      state: { world: jonokuchiWorld },
      advanceTutorialStep: vi.fn(),
      setTutorialFlag: vi.fn(),
      completeTutorial: vi.fn(),
    });
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    // pickExhibitionPair falls back to any 2 rikishi, so bout should render
    expect(screen.getByText("Live Bout Preview")).toBeTruthy();
  });

  it("world with only 1 rikishi → fallback renders 'Preparing exhibition bout...'", () => {
    const singleRikishiWorld = {
      year: 2025,
      rikishi: new Map([["r-1", mockRikishi("r-1", "Lonely Wrestler")]]),
    };
    mockUseGame.mockReturnValue({
      state: { world: singleRikishiWorld },
      advanceTutorialStep: vi.fn(),
      setTutorialFlag: vi.fn(),
      completeTutorial: vi.fn(),
    });
    renderWithProvider(<ExhibitionBout onComplete={vi.fn()} />);
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
  });

  it("onComplete not called on error path", () => {
    vi.mocked(resolveBout).mockImplementation(() => {
      throw new Error("physics failed");
    });
    const onComplete = vi.fn();
    mockUseGame.mockReturnValue(mockGameApi);
    renderWithProvider(<ExhibitionBout onComplete={onComplete} />);
    // Fallback renders — no buttons to click, onComplete should never fire
    expect(screen.getByText("Preparing exhibition bout...")).toBeTruthy();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
