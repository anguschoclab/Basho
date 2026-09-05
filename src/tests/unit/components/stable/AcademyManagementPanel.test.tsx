import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AcademyManagementPanel } from "@/components/stable/AcademyManagementPanel";
import type { AcademyManagementProjection } from "@/components/stable/AcademyManagementPanel";

function makeProjection(overrides: Partial<AcademyManagementProjection> = {}): AcademyManagementProjection {
  return {
    academies: [],
    buildableRegions: [],
    hasAcademies: false,
    ...overrides,
  };
}

describe("AcademyManagementPanel", () => {
  afterEach(() => cleanup());

  it("renders panel with no academies and no buildable regions", () => {
    render(<AcademyManagementPanel projection={makeProjection()} onBuild={vi.fn()} />);
    expect(screen.getByTestId("academy-management-panel")).toBeDefined();
    expect(screen.getByText("No foreign academies. Increase regional presence via exhibition tours.")).toBeDefined();
  });

  it("renders built academies", () => {
    const proj = makeProjection({
      academies: [
        { region: "Mongolia", builtAtYear: 2024, candidateQualityBonus: 10 },
      ],
      hasAcademies: true,
    });
    render(<AcademyManagementPanel projection={proj} onBuild={vi.fn()} />);
    expect(screen.getByTestId("academy-Mongolia")).toBeDefined();
    expect(screen.getByText("+10 Quality")).toBeDefined();
  });

  it("renders buildable regions with build button", () => {
    const proj = makeProjection({
      buildableRegions: [
        { region: "Georgia", presence: 85, canBuild: true },
      ],
    });
    render(<AcademyManagementPanel projection={proj} onBuild={vi.fn()} />);
    expect(screen.getByTestId("buildable-Georgia")).toBeDefined();
    expect(screen.getByTestId("build-academy-Georgia")).toBeDefined();
  });

  it("disables build button when canBuild is false", () => {
    const proj = makeProjection({
      buildableRegions: [
        { region: "Europe", presence: 50, canBuild: false },
      ],
    });
    render(<AcademyManagementPanel projection={proj} onBuild={vi.fn()} />);
    expect(screen.getByTestId("build-academy-Europe").hasAttribute("disabled")).toBe(true);
  });

  it("calls onBuild when build button is clicked", () => {
    const onBuild = vi.fn();
    const proj = makeProjection({
      buildableRegions: [
        { region: "Mongolia", presence: 90, canBuild: true },
      ],
    });
    render(<AcademyManagementPanel projection={proj} onBuild={onBuild} />);
    fireEvent.click(screen.getByTestId("build-academy-Mongolia"));
    expect(onBuild).toHaveBeenCalledWith("Mongolia");
  });
});
