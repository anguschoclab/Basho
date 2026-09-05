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
  projectBashoResults: () => null,
}));

vi.mock("@/presenters/projections/governanceProjections", () => ({
  projectGovernanceSummary: () => null,
}));

vi.mock("@/presenters/projections/financeProjections", () => ({
  projectFinanceSummary: () => null,
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
  getRikishi: vi.fn(),
  getHeya: vi.fn(),
}));

vi.mock("@/presenters/worldAccess", () => ({
  getRikishi: () => null,
  getHeya: () => null,
  getHistory: () => [],
}));

vi.mock("@/presenters/uiDigest", () => ({
  projectPressConferenceData: () => null,
}));

vi.mock("@/components/game/KeyBoutsSection", () => ({
  KeyBoutsSection: () => null,
}));

vi.mock("@/components/game/PressConference", () => ({
  PressConference: () => null,
}));

vi.mock("@/components/game/YokozunaDeliberationModal", () => ({
  YokozunaDeliberationModal: () => null,
}));

vi.mock("@/components/game/RetirementModal", () => ({
  RetirementModal: () => null,
}));

vi.mock("@/components/game/RecapPhaseGate", () => ({
  RecapPhaseGate: ({ children }: any) => children,
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
