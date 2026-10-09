/**
 * infrastructureDashboard.honesty.test.tsx
 *
 * Regression test for the fixed construction-progress bar (audit WS4-02).
 *
 * The construction panel renders `<Progress value={45}>` unconditionally —
 * `constructionQueue` entries carry `completionYear`/`completionBasho` but no
 * start date or duration, so no honest percentage exists. The bar must be
 * removed (or driven by a real progress field added to the queue datum);
 * it must never display a fabricated constant.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup } from "@testing-library/react";
import { InfrastructureDashboard } from "@/components/stable/InfrastructureDashboard";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FACILITY_REGISTRY } from "@/engine/types/infrastructure";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import type { Heya } from "@/engine/types/heya";

function heyaUnderConstruction(): Heya {
  const firstFacilityId = Object.keys(FACILITY_REGISTRY)[0];
  return MockFactory.createHeya("h1", {
    constructionQueue: [
      {
        facilityId: firstFacilityId,
        completionYear: 2027,
        completionBasho: "haru",
        level: 1,
      },
    ],
  } as Partial<Heya>);
}

describe("InfrastructureDashboard — construction progress honesty", () => {
  afterEach(cleanup);

  it("never renders a hardcoded 45% construction bar", () => {
    const { queryByLabelText, getByText } = render(
      <TooltipProvider>
        <InfrastructureDashboard heya={heyaUnderConstruction()} onUpgrade={() => {}} />
      </TooltipProvider>
    );

    // The ETA text stays — it's real queue data.
    expect(getByText(/ETA:/)).toBeDefined();
    // The queue datum carries no start date/duration, so no honest
    // percentage exists — the fabricated bar must not render at all.
    expect(queryByLabelText("Construction progress")).toBeNull();
  });
});
