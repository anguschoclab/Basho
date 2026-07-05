/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ExhibitionBout } from "@/components/onboarding/ExhibitionBout";

// Mock GameContext
const mockUseGame = vi.fn();
vi.mock("@/contexts/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

// Mock boutResolver
vi.mock("@/engine/bout/boutResolver", () => ({
  resolveBout: () => ({
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
  }),
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
