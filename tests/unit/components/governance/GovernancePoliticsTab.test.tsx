import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { GovernanceDerivedData } from "@/hooks/useGovernanceDerived";

vi.mock("@/components/ui/tabs", () => ({
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSpendPoliticalCapital = vi.fn();
const mockSendCommand = vi.fn();

vi.mock("@/state/game/useGame", () => ({
  useGame: () => ({ spendPoliticalCapital: mockSpendPoliticalCapital }),
}));

vi.mock("@/state/stores/gameStore", () => ({
  useGameStore: (selector: (s: { sendCommand: typeof mockSendCommand }) => unknown) =>
    selector({ sendCommand: mockSendCommand }),
}));

import { GovernancePoliticsTab } from "@/components/governance/GovernancePoliticsTab";

const derived = {
  factionList: [],
  factionRows: [],
} as unknown as GovernanceDerivedData;

function renderTab(props: Parameters<typeof GovernancePoliticsTab>[0]) {
  return render(
    <TooltipProvider>
      <GovernancePoliticsTab {...props} />
    </TooltipProvider>
  );
}

describe("GovernancePoliticsTab", () => {
  beforeEach(() => vi.clearAllMocks());

  // Bare capital spending was a pure burn with no engine effect — the control
  // was removed; real spends go through POLITICAL_FAVORS sendCommand.
  it("does not offer a bare capital-burn control", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", { politicalCapital: 150 });
    renderTab({ world, heya, derived });
    expect(screen.queryByText("Spend 100")).toBeNull();
  });

  it("displays political capital value", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", { politicalCapital: 50 });
    renderTab({ world, heya, derived });
    expect(screen.getByText("Political Capital")).toBeTruthy();
  });
});
