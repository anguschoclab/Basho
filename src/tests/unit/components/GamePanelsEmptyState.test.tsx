/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { InjuryRecoveryPanel } from "@/components/game/InjuryRecoveryPanel";
import { SponsorContractsPanel } from "@/components/game/SponsorContractsPanel";

vi.mock("@/store/gameStore", () => ({
  useGameStore: vi.fn(() => ({ sendCommand: vi.fn() })),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

describe("InjuryRecoveryPanel — empty state", () => {
  it("renders 'All Clear' when injuredRikishi is empty", () => {
    const digest = {
      facilityLevel: 50,
      facilityLabel: "Standard",
      injuredRikishi: [],
    } as any;
    render(<InjuryRecoveryPanel digest={digest} />);
    expect(screen.getByText("All Clear")).toBeTruthy();
    expect(screen.getByText(/No injuries in your stable/i)).toBeTruthy();
  });
});

describe("SponsorContractsPanel — empty state", () => {
  it("renders 'No Active Sponsors' when activeSponsors is empty", () => {
    const digest = {
      activeSponsors: [],
      totalMonthlyIncome: 0,
      expiringCount: 0,
      totalSponsorCount: 0,
      avgTier: "T0",
    } as any;
    render(<SponsorContractsPanel digest={digest} />);
    expect(screen.getByText("No Active Sponsors")).toBeTruthy();
    expect(screen.getByText(/Build your stable's prestige/i)).toBeTruthy();
  });
});
