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

function makeAcademyDTO(overrides: Record<string, unknown> = {}) {
  return {
    level: 1,
    maxLevel: 5,
    prospectCount: 0,
    maxProspects: 3,
    totalGraduated: 0,
    budget: 10_000,
    staff: [],
    maxStaff: 1,
    lastIntakeYear: 0,
    prospects: [],
    ...overrides,
  };
}

const noop = vi.fn();

describe("YouthAcademyPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders build prompt when no academy", () => {
    render(
      <YouthAcademyPanel
        projection={makeProjection()}
        cash={100_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
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
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
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
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    fireEvent.click(screen.getByTestId("build-youth-academy"));
    expect(onBuild).toHaveBeenCalled();
  });

  it("renders academy level and prospects when built", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({
        level: 2,
        maxLevel: 5,
        prospectCount: 1,
        maxProspects: 5,
        totalGraduated: 3,
        prospects: [
          { id: "p1", shikona: "Young Hopeful", age: 15, region: "Japan", potential: 75, currentAbility: 30, developmentPoints: 10 },
        ],
      }),
      canUpgrade: true,
      upgradeCost: 400_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    expect(screen.getByText("Level 2/5")).toBeDefined();
    expect(screen.getByTestId("prospect-p1")).toBeDefined();
    expect(screen.getByText("Young Hopeful")).toBeDefined();
  });

  it("shows upgrade button when canUpgrade is true", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({
        level: 1,
        maxLevel: 5,
        prospectCount: 0,
        maxProspects: 3,
        totalGraduated: 0,
      }),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={200_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    expect(screen.getByTestId("upgrade-youth-academy")).toBeDefined();
  });

  it("shows max-level message when at max", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({
        level: 5,
        maxLevel: 5,
        prospectCount: 0,
        maxProspects: 16,
        totalGraduated: 5,
      }),
      canUpgrade: false,
      upgradeCost: 0,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    expect(screen.getByText("Academy at maximum level")).toBeDefined();
  });

  it("calls onUpgrade when upgrade button is clicked", () => {
    const onUpgrade = vi.fn();
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({
        level: 1,
        maxLevel: 5,
        prospectCount: 0,
        maxProspects: 3,
        totalGraduated: 0,
      }),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={200_000}
        onBuild={noop}
        onUpgrade={onUpgrade}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    fireEvent.click(screen.getByTestId("upgrade-youth-academy"));
    expect(onUpgrade).toHaveBeenCalled();
  });

  it("renders invest buttons when academy is built", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO(),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    expect(screen.getByTestId("invest-50k")).toBeDefined();
    expect(screen.getByTestId("invest-100k")).toBeDefined();
    expect(screen.getByTestId("invest-500k")).toBeDefined();
  });

  it("calls onInvest with amount when invest button is clicked", () => {
    const onInvest = vi.fn();
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO(),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={onInvest}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    fireEvent.click(screen.getByTestId("invest-100k"));
    expect(onInvest).toHaveBeenCalledWith(100_000);
  });

  it("renders hire staff buttons for unfilled roles", () => {
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({ maxStaff: 2 }),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={noop}
      />
    );
    expect(screen.getByTestId("hire-staff-head_coach")).toBeDefined();
    expect(screen.getByTestId("hire-staff-conditioning")).toBeDefined();
  });

  it("calls onHireStaff with role when hire button is clicked", () => {
    const onHireStaff = vi.fn();
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({ maxStaff: 2 }),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={onHireStaff}
        onPromote={noop}
      />
    );
    fireEvent.click(screen.getByTestId("hire-staff-technique"));
    expect(onHireStaff).toHaveBeenCalledWith("technique");
  });

  it("calls onPromote when promote button is clicked", () => {
    const onPromote = vi.fn();
    const proj = makeProjection({
      hasAcademy: true,
      academy: makeAcademyDTO({
        prospectCount: 1,
        prospects: [
          { id: "p1", shikona: "Young Hopeful", age: 15, region: "Japan", potential: 75, currentAbility: 50, developmentPoints: 100 },
        ],
      }),
      canUpgrade: true,
      upgradeCost: 150_000,
    });
    render(
      <YouthAcademyPanel
        projection={proj}
        cash={500_000}
        onBuild={noop}
        onUpgrade={noop}
        onInvest={noop}
        onHireStaff={noop}
        onPromote={onPromote}
      />
    );
    fireEvent.click(screen.getByTestId("promote-p1"));
    expect(onPromote).toHaveBeenCalledWith("p1");
  });
});
