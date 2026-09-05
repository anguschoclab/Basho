import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { GomenfudaStatusBadge } from "@/components/game/GomenfudaStatusBadge";
import type { GomenfudaProjection } from "@/presenters/projections/governanceProjections";

function makeProjection(overrides: Partial<GomenfudaProjection> = {}): GomenfudaProjection {
  return {
    count: 0,
    threshold: 3,
    hasSanctionWarning: false,
    sanctionRiskPercent: 0,
    recentEvents: [],
    ...overrides,
  };
}

describe("GomenfudaStatusBadge", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders nothing when count is 0", () => {
    render(<GomenfudaStatusBadge projection={makeProjection({ count: 0 })} />);
    expect(screen.queryByTestId("gomenfuda-status-badge")).toBeNull();
  });

  it("renders count X/3 when count > 0", () => {
    render(<GomenfudaStatusBadge projection={makeProjection({ count: 1 })} />);
    const badge = screen.getByTestId("gomenfuda-status-badge");
    expect(badge.textContent).toContain("1/3");
  });

  it("renders SANCTION RISK when hasSanctionWarning is true", () => {
    render(
      <GomenfudaStatusBadge
        projection={makeProjection({ count: 3, hasSanctionWarning: true })}
      />
    );
    const badge = screen.getByTestId("gomenfuda-status-badge");
    expect(badge.textContent).toContain("SANCTION RISK");
  });

  it("renders count 2/3 at 67% risk", () => {
    render(
      <GomenfudaStatusBadge
        projection={makeProjection({ count: 2, sanctionRiskPercent: 67 })}
      />
    );
    const badge = screen.getByTestId("gomenfuda-status-badge");
    expect(badge.textContent).toContain("2/3");
  });
});
