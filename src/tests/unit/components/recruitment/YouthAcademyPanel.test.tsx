import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { YouthAcademyPanel } from "@/components/recruitment/YouthAcademyPanel";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";

function makeProjection(overrides: Partial<YouthAcademyProjection> = {}): YouthAcademyProjection {
  return {
    academy: null,
    hasAcademy: false,
    canUpgrade: false,
    upgradeCost: 0,
    ...overrides,
  };
}

describe("YouthAcademyPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders build prompt when no academy", () => {
    render(
      <YouthAcademyPanel
        projection={makeProjection()}
        cash={100_000}
        onBuild={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );
    expect(screen.getByTestId("youth-academy-panel")).toBeDefined();
    expect(screen.getByTestId("build-youth-academy")).toBeDefined();
  });

  it("disables build button when not enough cash", () => {
    render(
      <YouthAcademyPanel
        projection={makeProjection()}
        cash={10_000}
        onBuild={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );
    expect(screen.getByTestId("build-youth-academy").hasAttribute("disabled")).toBe(true);
  });

  it("calls onBuild when build button is clicked", () => {
    const onBuild = vi.fn();
    render(
      <YouthAcademyPanel
        projection={makeProjection()}
        cash={100_000}
        onBuild={onBuild}
        onUpgrade={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("build-youth-academy"));
    expect(onBuild).toHaveBeenCalled();
  });

  it("renders academy level and prospects when built", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: {
        level: 2,
        maxLevel: 3,
        prospectCount: 1,
        maxProspects: 5,
        totalGraduated: 3,
        prospects: [
          { id: "p1", shikona: "Young Hopeful", age: 15, region: "Japan", potential: 75, developmentPoints: 10 },
        ],
      },
      canUpgrade: true,
      upgradeCost: 400_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );
    expect(screen.getByText("Level 2/3")).toBeDefined();
    expect(screen.getByTestId("prospect-p1")).toBeDefined();
    expect(screen.getByText("Young Hopeful")).toBeDefined();
  });

  it("shows upgrade button when canUpgrade is true", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: {
        level: 1,
        maxLevel: 3,
        prospectCount: 0,
        maxProspects: 3,
        totalGraduated: 0,
        prospects: [],
      },
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={200_000}
        onBuild={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );
    expect(screen.getByTestId("upgrade-youth-academy")).toBeDefined();
  });

  it("shows max-level message when at max", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: {
        level: 3,
        maxLevel: 3,
        prospectCount: 0,
        maxProspects: 8,
        totalGraduated: 5,
        prospects: [],
      },
      canUpgrade: false,
      upgradeCost: 0,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={vi.fn()}
        onUpgrade={vi.fn()}
      />
    );
    expect(screen.getByText("Academy at maximum level")).toBeDefined();
  });

  it("calls onUpgrade when upgrade button is clicked", () => {
    const onUpgrade = vi.fn();
    const proj = makeProjection({
      hasAcademy: true,
      academy: {
        level: 1,
        maxLevel: 3,
        prospectCount: 0,
        maxProspects: 3,
        totalGraduated: 0,
        prospects: [],
      },
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={200_000}
        onBuild={vi.fn()}
        onUpgrade={onUpgrade}
      />
    );
    fireEvent.click(screen.getByTestId("upgrade-youth-academy"));
    expect(onUpgrade).toHaveBeenCalled();
  });
});
