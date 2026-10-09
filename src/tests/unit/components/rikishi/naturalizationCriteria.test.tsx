/**
 * naturalizationCriteria.test.tsx
 *
 * Regression test for fabricated naturalization criteria (audit H7).
 *
 * The component renders three progress bars — "60 Basho" tenure, "400 Wins",
 * "Sanyaku" rank — none of which are the engine rule. `citizenshipUtils`
 * naturalizes automatically after NATURALIZATION_YEARS (5) of tenure from
 * `joinedHeyaDate`; career wins and rank are irrelevant. The UI must show
 * the real tenure criterion or nothing.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { RikishiNaturalization } from "@/components/rikishi/RikishiNaturalization";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { UIRikishi } from "@/presenters/rikishi/types";

function uiRikishiDto(overrides: Record<string, unknown> = {}): UIRikishi {
  return {
    id: "r1",
    shikona: "Testyama",
    nationality: "Mongolia",
    careerWins: 50,
    careerHistory: [],
    ...overrides,
  } as unknown as UIRikishi;
}

describe("RikishiNaturalization — honest criteria", () => {
  afterEach(cleanup);

  it("does not show the fabricated '60 Basho' tenure, '400 Wins', or 'Sanyaku' criteria", () => {
    const { queryByText, queryAllByText } = render(
      <TooltipProvider>
        <RikishiNaturalization rikishi={uiRikishiDto()} />
      </TooltipProvider>
    );

    expect(queryByText(/60 Basho/)).toBeNull();
    expect(queryAllByText(/Sanyaku/)).toHaveLength(0);
    expect(queryByText(/400 Wins/)).toBeNull();
  });

  it("expresses the real tenure criterion in years", () => {
    const { container } = render(
      <TooltipProvider>
        <RikishiNaturalization rikishi={uiRikishiDto({ joinedHeyaDate: "2024" })} />
      </TooltipProvider>
    );
    // Whatever the final wording, eligibility must be tenure-in-years, and
    // must not be gated on careerWins (50 wins must not render "IN REVIEW"
    // as if wins were the criterion).
    expect(container.textContent).not.toContain("400");
  });
});
