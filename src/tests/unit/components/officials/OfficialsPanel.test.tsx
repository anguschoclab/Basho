import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { OfficialsPanel } from "@/components/officials/OfficialsPanel";
import type { OfficialsProjection } from "@/presenters/officialsProjections";

function makeProjection(overrides: Partial<OfficialsProjection> = {}): OfficialsProjection {
  return {
    gyoji: [],
    shimpan: [],
    topGyoji: null,
    totalBoutsOfficiated: 0,
    totalReversals: 0,
    ...overrides,
  };
}

describe("OfficialsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the panel with gyoji and shimpan sections", () => {
    render(<OfficialsPanel projection={makeProjection()} />);
    expect(screen.getByTestId("officials-panel")).toBeDefined();
    expect(screen.getByText("Gyoji (Referees)")).toBeDefined();
    expect(screen.getByText("Shimpan (Judges)")).toBeDefined();
  });

  it("renders gyoji rows with names", () => {
    const proj = makeProjection({
      gyoji: [
        { id: "g1", name: "Kimura Shonosuke", rank: "tate", rankLabel: "Tate-gyoji", accuracy: 85, boutsOfficiated: 100, callsReversed: 5, reversalRate: 0.05 },
      ],
      topGyoji: { id: "g1", name: "Kimura Shonosuke", rank: "tate", rankLabel: "Tate-gyoji", accuracy: 85, boutsOfficiated: 100, callsReversed: 5, reversalRate: 0.05 },
    });
    render(<OfficialsPanel projection={proj} />);
    expect(screen.getByTestId("gyoji-row-g1")).toBeDefined();
    // Name appears in both top-gyoji section and the row
    expect(screen.getAllByText("Kimura Shonosuke").length).toBeGreaterThanOrEqual(1);
  });

  it("renders shimpan rows with names", () => {
    const proj = makeProjection({
      shimpan: [
        { id: "s1", name: "Iwai", accuracy: 75, consultations: 5 },
      ],
    });
    render(<OfficialsPanel projection={proj} />);
    expect(screen.getByTestId("shimpan-row-s1")).toBeDefined();
    expect(screen.getByText("Iwai")).toBeDefined();
  });

  it("shows total bouts officiated and reversals", () => {
    const proj = makeProjection({
      totalBoutsOfficiated: 250,
      totalReversals: 12,
    });
    render(<OfficialsPanel projection={proj} />);
    expect(screen.getByText(/250 bouts officiated/)).toBeDefined();
    expect(screen.getByText(/12 calls reversed/)).toBeDefined();
  });

  it("shows top gyoji when available", () => {
    const proj = makeProjection({
      topGyoji: { id: "g1", name: "Top Gyoji", rank: "tate", rankLabel: "Tate-gyoji", accuracy: 90, boutsOfficiated: 200, callsReversed: 3, reversalRate: 0.015 },
    });
    render(<OfficialsPanel projection={proj} />);
    expect(screen.getByText(/Top Gyoji/)).toBeDefined();
  });
});
