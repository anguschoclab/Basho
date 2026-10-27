import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InjuryRiskHeatmap } from "@/components/training/InjuryRiskHeatmap";

describe("InjuryRiskHeatmap", () => {
  it("renders the design-system EmptyState when the roster is empty (PR #1041)", () => {
    render(<InjuryRiskHeatmap rikishiList={[]} />);
    // Shared EmptyState copy — not a bare <p> tag.
    expect(screen.getByText("No Active Wrestlers")).toBeTruthy();
    expect(
      screen.getByText("There are no rikishi in your stable to evaluate for injury risk.")
    ).toBeTruthy();
  });

  it("still renders the card title in the empty state", () => {
    render(<InjuryRiskHeatmap rikishiList={[]} />);
    expect(screen.getByText("Roster Risk Matrix")).toBeTruthy();
  });
});
