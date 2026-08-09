import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SparringPanel } from "@/components/game/SparringPanel";
import type { Rikishi } from "@/engine/types/rikishi";
import type { SparringPair } from "@/engine/types/training";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return MockFactory.createRikishi(id, {
    shikona: `Rikishi ${id}`,
    heyaId: "h1",
    injured: false,
    isRetired: false,
    combatProfile: {
      archetype: "oshi",
      familyPreferences: { push: 10, belt: 0, trick: 0, speed: 0 },
      preferredGrip: "none",
      preferredGripDepth: "standard",
      statModifiers: {},
      counterFamily: "push",
      archetypeBehavior: {
        tachiaiSpeedBonus: 0,
        lateralMovementBonus: 0,
        edgeEscapeBonus: 0,
        beltTorqueBonus: 0,
        pushVelocityBonus: 0,
      },
    },
    ...overrides,
  });
}

function makePair(
  aId: string,
  bId: string,
  chemistry: SparringPair["chemistry"] = "neutral"
): SparringPair {
  return {
    key: `${aId}|${bId}`,
    aId,
    bId,
    chemistry,
    weeksActive: 3,
    establishedWeek: 1,
  };
}

function renderPanel(props: Partial<React.ComponentProps<typeof SparringPanel>> = {}) {
  const defaults: React.ComponentProps<typeof SparringPanel> = {
    heyaRikishi: [],
    pairs: [],
    onAddPair: vi.fn(),
    onRemovePair: vi.fn(),
  };
  return render(
    <TooltipProvider>
      <SparringPanel {...defaults} {...props} />
    </TooltipProvider>
  );
}

describe("SparringPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders empty state message when pairs array is empty", () => {
    renderPanel({ heyaRikishi: [makeRikishi("r1"), makeRikishi("r2")], pairs: [] });

    expect(screen.getByText("No sparring pairs assigned")).not.toBeNull();
  });

  it("renders sparring pair cards when pairs exist", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const pair = makePair("r1", "r2", "friction");

    renderPanel({ heyaRikishi: [r1, r2], pairs: [pair] });

    expect(screen.getByText(/Rikishi r1/)).not.toBeNull();
    expect(screen.getByText(/Rikishi r2/)).not.toBeNull();
    expect(screen.getByText("Friction")).not.toBeNull();
    expect(screen.getByText("3w")).not.toBeNull();
  });

  it("calls onRemovePair when remove button clicked", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const onRemovePair = vi.fn();
    const pair = makePair("r1", "r2");

    renderPanel({ heyaRikishi: [r1, r2], pairs: [pair], onRemovePair });

    const removeBtn = screen.getByRole("button", { name: /Remove pair/i });
    fireEvent.click(removeBtn);
    expect(onRemovePair).toHaveBeenCalledWith("r1", "r2");
  });

  it("displays chemistry badge for each pair", () => {
    const r1 = makeRikishi("r1");
    const r2 = makeRikishi("r2");
    const r3 = makeRikishi("r3");
    const r4 = makeRikishi("r4");
    const pair1 = makePair("r1", "r2", "friction");
    const pair2 = makePair("r3", "r4", "rut");

    renderPanel({ heyaRikishi: [r1, r2, r3, r4], pairs: [pair1, pair2] });

    expect(screen.getByText("Friction")).not.toBeNull();
    expect(screen.getByText("Rut")).not.toBeNull();
  });

  it("does not show add pair UI when fewer than 2 available rikishi", () => {
    const r1 = makeRikishi("r1");
    renderPanel({ heyaRikishi: [r1], pairs: [] });

    expect(screen.queryByText("Pair")).toBeNull();
  });
});
