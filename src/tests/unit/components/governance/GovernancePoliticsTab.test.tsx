import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { GovernanceDerivedData } from "@/hooks/useGovernanceDerived.tsx";

vi.mock("@/components/ui/tabs", () => ({
  TabsContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSpendPoliticalCapital = vi.fn();
const mockSendCommand = vi.fn();

vi.mock("@/contexts/useGame", () => ({
  useGame: () => ({ spendPoliticalCapital: mockSpendPoliticalCapital }),
}));

vi.mock("@/store/gameStore", () => ({
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

  it("spends political capital when heya has >= 100", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", { politicalCapital: 150 });
    renderTab({ world, heya, derived });
    fireEvent.click(screen.getByText("Spend 100"));
    expect(mockSpendPoliticalCapital).toHaveBeenCalledWith("h1", 100);
  });

  it("Spend 100 button is disabled when capital < 100", () => {
    const world = MockFactory.createWorld();
    const heya = MockFactory.createHeya("h1", { politicalCapital: 50 });
    renderTab({ world, heya, derived });
    const btn = screen.getByText("Spend 100").closest("button");
    expect(btn?.disabled).toBe(true);
  });
});
