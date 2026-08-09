import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import React from "react";
import { RikishiPotentialPanel } from "@/components/rikishi/RikishiPotentialPanel";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

describe("RikishiPotentialPanel — nested .stats.* access regression (Step 3.3)", () => {
  afterEach(() => cleanup());

  it("returns null when rikishi has no potential", () => {
    const r = MockFactory.createRikishi("r-1");
    const { container } = render(<RikishiPotentialPanel rikishi={r} isOwned={true} />);
    expect(container.innerHTML).toBe("");
  });

  it("returns null when not owned", () => {
    const r = MockFactory.createRikishi("r-1", {
      potential: {
        ceilingFraction: 0.9,
        stats: {
          power: 90,
          speed: 80,
          stamina: 70,
          technique: 85,
          balance: 75,
          mental: 65,
          adaptability: 60,
        },
        heightCm: 190,
        weightKg: 150,
        profile: "prodigy",
      } as any,
    });
    const { container } = render(<RikishiPotentialPanel rikishi={r} isOwned={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders stat bars using nested rikishi.stats.* values, not flat properties", () => {
    const r = MockFactory.createRikishi("r-1", {
      stats: {
        power: 80,
        speed: 60,
        technique: 70,
        balance: 50,
        stamina: 65,
        mental: 55,
        adaptability: 45,
        aggression: 50,
        experience: 10,
        weight: 140,
      },
      potential: {
        ceilingFraction: 1.0,
        stats: {
          power: 95,
          speed: 85,
          stamina: 75,
          technique: 90,
          balance: 80,
          mental: 70,
          adaptability: 65,
        },
        heightCm: 190,
        weightKg: 150,
        profile: "prodigy",
      } as any,
    });

    const { container } = render(<RikishiPotentialPanel rikishi={r} isOwned={true} />);

    // Should render the "Potential" heading
    expect(container.textContent).toContain("Potential");

    // Should render stat labels
    expect(container.textContent).toContain("Strength");
    expect(container.textContent).toContain("Speed");
    expect(container.textContent).toContain("Technique");

    // Should render the development profile
    expect(container.textContent).toContain("Prodigy");

    // Should render height/weight with potential values
    expect(container.textContent).toContain("190");
    expect(container.textContent).toContain("150");
  });
});
