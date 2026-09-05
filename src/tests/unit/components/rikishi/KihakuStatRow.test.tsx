import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KihakuStatRow } from "@/components/rikishi/KihakuStatRow";

function renderRow(score: number, label: string) {
  return render(
    <TooltipProvider>
      <KihakuStatRow kihakuIsenScore={score} label={label} />
    </TooltipProvider>
  );
}

describe("KihakuStatRow", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the score value", () => {
    renderRow(78, "Fierce Determination");
    const row = screen.getByTestId("kihaku-stat-row");
    expect(row.textContent).toContain("78");
  });

  it("renders the label", () => {
    renderRow(78, "Fierce Determination");
    const row = screen.getByTestId("kihaku-stat-row");
    expect(row.textContent).toContain("Fierce Determination");
  });

  it("renders the Kihaku prefix label", () => {
    renderRow(50, "Steady Resolve");
    const row = screen.getByTestId("kihaku-stat-row");
    expect(row.textContent).toContain("Kihaku");
  });

  it("renders low scores without crashing", () => {
    renderRow(10, "Broken Spirit");
    const row = screen.getByTestId("kihaku-stat-row");
    expect(row.textContent).toContain("10");
    expect(row.textContent).toContain("Broken Spirit");
  });
});
