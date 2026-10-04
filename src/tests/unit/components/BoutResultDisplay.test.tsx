import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { BoutResultDisplay } from "@/components/game/BoutResultDisplay";
import type { BoutResult } from "@/engine/types/basho";
import { mockUIRikishi } from "@/tests/helpers/uiTestHelpers";

// Mock ClickableName to avoid router dependency
vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name?: string }) => React.createElement("span", null, name),
}));

// Mock SumoAvatar to avoid canvas rendering in jsdom
vi.mock("@/components/avatar/SumoAvatar", () => ({
  SumoAvatar: () => React.createElement("div", { "data-testid": "sumo-avatar" }),
}));

// Mock uiDigest to control kimarite lookup results
vi.mock("@/presenters/uiDigest", () => ({
  formatStance: () => "Push",
  getKimarite: (id: string) => {
    if (id === "rare-kimarite") {
      return {
        id: "rare-kimarite",
        name: "Rare Move",
        nameJa: "レア技",
        description: "A very rare technique.",
        rarity: "rare",
      };
    }
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
}));

// Mock KimariteTag and GlossaryTip to avoid TooltipProvider requirement
vi.mock("@/components/ui/KimariteTag", () => ({
  KimariteTag: ({
    kimariteName,
    className,
  }: {
    kimariteId: string;
    kimariteName?: string;
    className?: string;
  }) => React.createElement("span", { className }, kimariteName),
}));
vi.mock("@/components/ui/GlossaryTip", () => ({
  GlossaryTip: ({ children }: { termId: string; children: React.ReactNode }) =>
    React.createElement("span", null, children),
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

const east = mockUIRikishi("r-1", "East Wrestler");
const west = mockUIRikishi("r-2", "West Wrestler");

describe("BoutResultDisplay", () => {
  describe("full mode", () => {
    it("renders winner shikona in full mode", () => {
      render(<BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} />);
      expect(screen.getAllByText("East Wrestler").length).toBeGreaterThan(0);
    });

    it("renders kimarite description in full mode", () => {
      render(<BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} />);
      expect(screen.getByText("Frontal force-out.")).toBeTruthy();
    });

    it("renders stats row (tachiai/stance/duration) in full mode", () => {
      render(<BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} />);
      expect(screen.getByText("Tachiai")).toBeTruthy();
      expect(screen.getByText("Stance")).toBeTruthy();
      expect(screen.getByText("Duration")).toBeTruthy();
    });

    it("renders rarity badge in full mode when rarity is not common", () => {
      render(
        <BoutResultDisplay
          result={mockResult({ kimarite: "rare-kimarite" as any, kimariteName: "Rare Move" })}
          eastRikishi={east}
          westRikishi={west}
        />
      );
      expect(screen.getByText("rare")).toBeTruthy();
    });
  });

  describe("compact mode", () => {
    it("renders winner shikona in compact mode", () => {
      render(
        <BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} compact />
      );
      expect(screen.getAllByText("East Wrestler").length).toBeGreaterThan(0);
    });

    it("does not render kimarite description in compact mode", () => {
      render(
        <BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} compact />
      );
      expect(screen.queryByText("Frontal force-out.")).toBeNull();
    });

    it("does not render stats row in compact mode", () => {
      render(
        <BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} compact />
      );
      expect(screen.queryByText("Tachiai")).toBeNull();
      expect(screen.queryByText("Stance")).toBeNull();
      expect(screen.queryByText("Duration")).toBeNull();
    });

    it("does not render rarity badge in compact mode", () => {
      render(
        <BoutResultDisplay
          result={mockResult({ kimarite: "rare-kimarite" as any, kimariteName: "Rare Move" })}
          eastRikishi={east}
          westRikishi={west}
          compact
        />
      );
      expect(screen.queryByText("rare")).toBeNull();
    });

    it("renders upset badge in compact mode", () => {
      render(
        <BoutResultDisplay
          result={mockResult({ upset: true })}
          eastRikishi={east}
          westRikishi={west}
          compact
        />
      );
      expect(screen.getByText("UPSET!")).toBeTruthy();
    });
  });

  describe("KimariteTag integration", () => {
    it("wraps kimarite name in KimariteTag (tooltip present)", () => {
      render(<BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} />);
      // The kimarite name "Yorikiri" should be rendered
      expect(screen.getByText("Yorikiri")).toBeTruthy();
    });
  });

  describe("GlossaryTip integration", () => {
    it("wraps Tachiai label in GlossaryTip", () => {
      render(<BoutResultDisplay result={mockResult()} eastRikishi={east} westRikishi={west} />);
      // The Tachiai label should still be present
      expect(screen.getByText("Tachiai")).toBeTruthy();
    });
  });
});
