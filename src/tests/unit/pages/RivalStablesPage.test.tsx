import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: any) => React.createElement("div", { "data-testid": "app-layout" }, children),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => React.createElement("div", null, children),
}));

vi.mock("@/components/governance/RivalOyakataCard", () => ({
  RivalOyakataCard: ({ heyaId, heyaName }: any) =>
    React.createElement("div", { "data-testid": `rival-oyakata-card-${heyaId}` }, heyaName),
}));

vi.mock("@/components/npc/NPCAgentFeed", () => ({
  NPCAgentFeed: () => React.createElement("div", { "data-testid": "npc-agent-feed" }),
}));

vi.mock("@/presenters/npcAgentProjections", () => ({
  projectNPCAgentActivity: () => ({ decisions: [], decisionsByHeya: {} }),
}));

vi.mock("@/presenters/rivalStablesProjections", () => ({
  projectRivalStables: (_w: any, _d: any, _h: any) => ({
    rivals: [
      { heyaId: "rival-1", heyaName: "Rival Heya 1", ichimon: "Tatsunami", legacyTier: "dynasty", decisionCount: 0, recentDecisions: [] },
      { heyaId: "rival-2", heyaName: "Rival Heya 2", ichimon: undefined, legacyTier: undefined, decisionCount: 0, recentDecisions: [] },
    ],
    hasRivals: true,
  }),
}));

const mockUseGame = vi.fn();
vi.mock("@/contexts/useGame", () => ({
  useGame: () => mockUseGame(),
}));

import RivalStablesPage from "@/pages/RivalStablesPage";

describe("RivalStablesPage", () => {
  afterEach(() => cleanup());

  it("renders no game loaded message when world is null", () => {
    mockUseGame.mockReturnValue({ state: { world: null } });
    render(<RivalStablesPage />);
    expect(screen.getByText("No game loaded.")).toBeDefined();
  });

  it("renders rival stables page with rival count", () => {
    mockUseGame.mockReturnValue({ state: { world: { seed: "test", heyas: new Map() } } });
    render(<RivalStablesPage />);
    expect(screen.getByTestId("rival-stables-page")).toBeDefined();
    expect(screen.getByText("Rival Oyakata (2)")).toBeDefined();
  });

  it("renders rival oyakata cards for each rival", () => {
    mockUseGame.mockReturnValue({ state: { world: { seed: "test", heyas: new Map() } } });
    render(<RivalStablesPage />);
    expect(screen.getByTestId("rival-oyakata-card-rival-1")).toBeDefined();
    expect(screen.getByTestId("rival-oyakata-card-rival-2")).toBeDefined();
  });
});
