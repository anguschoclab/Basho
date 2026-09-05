/**
 * RecapPage.kihaku.test.tsx — tests top-5 kihaku performers section renders.
 * Plan Feature 2 Test-First Protocol item 3.
 */
import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/hooks/useRequireWorld", () => ({
  useRequireWorld: () => true,
}));

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({
    state: {
      world: {
        seed: "test",
        year: 2026,
        week: 1,
        playerHeyaId: "h1",
        heyas: new Map([["h1", { id: "h1", name: "Test Heya" }]]),
        rikishi: new Map([
          ["r1", { id: "r1", shikona: "Hakuho", heyaId: "h1", isRetired: false, kihakuIsenScore: 85 }],
          ["r2", { id: "r2", shikona: "Kakuryu", heyaId: "h1", isRetired: false, kihakuIsenScore: 70 }],
        ]),
        activeRikishiIds: ["r1", "r2"],
        events: { log: [] },
      },
    },
  }),
}));

vi.mock("@/store/gameStore", () => ({
  useGameStore: () => vi.fn(),
}));

vi.mock("@/presenters/projections/recapProjections", () => ({
  selectKeyBouts: () => [],
}));

vi.mock("@/presenters/projections/recapKihakuProjections", () => ({
  selectTopKihakuPerformers: () => [
    { rikishiId: "r1", shikona: "Hakuho", heyaId: "h1", heyaName: "Test Heya", kihakuIsenScore: 85, label: "Blazing Spirit" },
    { rikishiId: "r2", shikona: "Kakuryu", heyaId: "h1", heyaName: "Test Heya", kihakuIsenScore: 70, label: "Fierce Determination" },
  ],
}));

vi.mock("@/presenters/projections/recapKachiNokoriProjections", () => ({
  selectKachiNokoriLeaders: () => [],
}));

vi.mock("@/presenters/projections/recapExhibitionProjections", () => ({
  selectExhibitionResults: () => [],
}));

vi.mock("@/presenters/engineAccess", () => ({
  compareBanzuke: vi.fn(),
  formatRankPosition: vi.fn(),
  RANK_HIERARCHY: {},
  makeBashoKey: vi.fn(),
  EntityCollection: vi.fn(),
  getPlayerHeya: () => ({ id: "h1", name: "Test Heya" }),
  getHeya: () => ({ id: "h1", name: "Test Heya" }),
  getRikishi: () => null,
  getRikishiAnywhere: () => null,
  getRikishiMap: () => new Map(),
  selectRetiredRikishi: () => [],
}));

vi.mock("@/presenters/worldAccess", () => ({
  getHeya: () => ({ id: "h1", name: "Test Heya" }),
  getRikishi: () => null,
  getRikishiAnywhere: () => null,
  getHistory: () => [],
  getRikishiMap: () => new Map(),
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectPressConferenceData: () => null,
  projectGovernanceSummary: () => ({
    governanceLog: [],
    unresolvedRulings: [],
    pendingRulings: [],
    summary: { status: "good_standing" },
  }),
  projectBashoResults: () => null,
}));

vi.mock("@/presenters/uiModels", () => ({
  projectRikishi: () => null,
}));

vi.mock("@/components/game/KeyBoutsSection", () => ({
  KeyBoutsSection: () => null,
}));

vi.mock("@/components/game/PressConference", () => ({
  PressConference: () => null,
}));

vi.mock("@/components/game/YokozunaDeliberation", () => ({
  YokozunaDeliberation: () => null,
}));

vi.mock("@/components/game/HoFInductionCeremony", () => ({
  HoFInductionCeremony: () => null,
}));

vi.mock("@/components/game/IntaiCeremony", () => ({
  IntaiCeremony: () => null,
}));

vi.mock("@/components/game/PlayoffBracket", () => ({
  PlayoffBracket: () => null,
}));

vi.mock("@/components/game/BanzukeReveal", () => ({
  BanzukeReveal: () => null,
}));

vi.mock("@/components/recap/TournamentCeremony", () => ({
  TournamentCeremony: () => null,
}));

vi.mock("@/components/recap/NarrativeSummary", () => ({
  NarrativeSummary: () => null,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => React.createElement("button", props, children),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

import RecapPage from "@/pages/RecapPage";

describe("RecapPage kihaku performers section", () => {
  afterEach(() => cleanup());

  it("renders kihaku performers section with top-5 performers", () => {
    render(<RecapPage />);
    expect(screen.getByTestId("kihaku-performers-section")).toBeDefined();
    expect(screen.getByTestId("kihaku-performer-0")).toBeDefined();
    expect(screen.getByTestId("kihaku-performer-1")).toBeDefined();
  });

  it("displays performer shikona and score", () => {
    render(<RecapPage />);
    expect(screen.getByText("Hakuho")).toBeDefined();
    expect(screen.getByText("85")).toBeDefined();
  });
});
