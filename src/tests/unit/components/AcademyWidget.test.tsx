import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { AcademyWidget } from "@/components/dashboard/AcademyWidget";
import type { YouthAcademyProjection } from "@/presenters/youthAcademyProjections";

/**
 * Coverage for PR #937: AcademyWidget must render a proper EmptyState
 * (icon + title + description) when no academy is built, not a bare
 * <p> with no structure.
 */
describe("AcademyWidget", () => {
  afterEach(() => cleanup());

  it("renders an EmptyState with title and guidance when no academy exists", () => {
    const projection = {
      academy: null,
      hasAcademy: false,
      canUpgrade: false,
      upgradeCost: 0,
    } as unknown as YouthAcademyProjection;

    render(<AcademyWidget projection={projection} currentYear={2030} />);

    // Post-#937 contract: EmptyState exposes a real <h3> heading + description,
    // not an unlabelled <p>.
    expect(screen.getByRole("heading", { name: /no youth academy/i })).toBeDefined();
    expect(screen.getByText(/build one/i)).toBeDefined();
  });
});
