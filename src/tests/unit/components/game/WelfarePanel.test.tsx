import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { WelfarePanel } from "@/components/game/WelfarePanel";
import type { projectMedicalUIDigest } from "@/presenters/uiDigest";

function makeDigest(
  overrides: Partial<NonNullable<ReturnType<typeof projectMedicalUIDigest>>> = {}
): NonNullable<ReturnType<typeof projectMedicalUIDigest>> {
  return {
    welfare: {
      complianceState: "compliant",
      weeksInState: 0,
      welfareRisk: 10,
      activeDiet: "maintenance",
    },
    perception: {
      welfareRiskBand: "safe",
      moraleBand: "content",
      rosterStrengthBand: "competitive",
      stableMediaHeatBand: "low",
      rivalryPressureBand: "low",
      rikishiHealthPerceptions: [],
    },
    ...overrides,
  } as any;
}

describe("WelfarePanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders compliance status card", () => {
    render(<WelfarePanel digest={makeDigest()} />);
    expect(screen.getByText("Compliance Status")).toBeTruthy();
    expect(screen.getByText("Compliant")).toBeTruthy();
  });

  it("renders welfare risk label", () => {
    render(<WelfarePanel digest={makeDigest()} />);
    expect(screen.getByText("Safe")).toBeTruthy();
  });

  it("renders diet regimen buttons", () => {
    render(<WelfarePanel digest={makeDigest()} />);
    expect(screen.getByText("Austerity")).toBeTruthy();
    expect(screen.getByText("Maintenance")).toBeTruthy();
    expect(screen.getByText("Heavy Bulk")).toBeTruthy();
    expect(screen.getByText("Premium Nutrition")).toBeTruthy();
  });

  it("calls onSetDiet when diet button clicked", () => {
    const onSetDiet = vi.fn();
    render(<WelfarePanel digest={makeDigest()} onSetDiet={onSetDiet} />);
    screen.getByText("Austerity").click();
    expect(onSetDiet).toHaveBeenCalledWith("austerity");
  });
});
