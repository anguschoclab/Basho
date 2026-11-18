import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { AcademyWidget } from "@/components/dashboard/AcademyWidget";
import { AcademyIntakeCard } from "@/components/academy/AcademyIntakeCard";
import type {
  YouthAcademyProjection,
  YouthProspectDTO,
} from "@/presenters/projections/youthAcademyProjections";

// jsdom has no layout — ResponsiveContainer renders 0×0 children.
// Pin it to a fixed box so the recharts SVG actually materializes.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => {
      const child = React.Children.only(children) as React.ReactElement<{
        width?: number;
        height?: number;
      }>;
      return (
        <div style={{ width: 400, height: 80 }}>
          {React.cloneElement(child, { width: 400, height: 80 })}
        </div>
      );
    },
  };
});

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

describe("AcademyIntakeCard — growth sparkline", () => {
  afterEach(() => cleanup());

  function prospect(history: Array<{ week: number; ability: number }>): YouthProspectDTO {
    return {
      id: "p1",
      shikona: "Young Hopeful",
      age: 16,
      region: "Kanto",
      potential: 60,
      currentAbility: 25,
      developmentPoints: 30,
      developmentHistory: history,
    };
  }

  it("renders the ability line and potential reference line with >= 2 readings", () => {
    const { container } = render(
      <AcademyIntakeCard
        prospect={prospect([
          { week: 5, ability: 22 },
          { week: 6, ability: 22 },
          { week: 7, ability: 25 },
        ])}
      />
    );
    expect(screen.getByTestId("growth-p1")).toBeDefined();
    // The ability series line and the dashed potential ceiling are real SVG.
    expect(container.querySelector(".recharts-line")).not.toBeNull();
    expect(container.querySelector(".recharts-reference-line")).not.toBeNull();
  });

  it("renders an honest placeholder when fewer than 2 readings exist", () => {
    const { container } = render(
      <AcademyIntakeCard prospect={prospect([{ week: 5, ability: 22 }])} />
    );
    expect(screen.getByTestId("growth-p1")).toBeDefined();
    expect(container.querySelector(".recharts-line")).toBeNull();
  });
});
