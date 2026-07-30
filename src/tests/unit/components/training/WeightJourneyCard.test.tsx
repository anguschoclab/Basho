/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { WeightJourneyCard } from "@/components/training/WeightJourneyCard";

describe("WeightJourneyCard", () => {
  const baseJourney = {
    targetKg: 130,
    progressKg: 45,
    stalled: false,
    phases: ["bulking"],
  };

  afterEach(() => {
    cleanup();
  });

  it("renders progress bar with correct percentage", () => {
    render(<WeightJourneyCard journey={baseJourney} shikona="Test Rikishi" />);
    expect(screen.getByText("Weight Journey")).not.toBeNull();
    expect(screen.getByText("45.0 / 130 kg")).not.toBeNull();
  });

  it("shows target weight and current progress", () => {
    render(<WeightJourneyCard journey={baseJourney} shikona="Test Rikishi" />);
    expect(screen.getByText(/130/)).not.toBeNull();
    expect(screen.getByText(/45/)).not.toBeNull();
  });

  it("displays stalled badge when stalled === true", () => {
    render(
      <WeightJourneyCard
        journey={{ ...baseJourney, stalled: true }}
        shikona="Test Rikishi"
      />
    );
    expect(screen.getByText("Stalled")).not.toBeNull();
  });

  it("does not display stalled badge when stalled === false", () => {
    render(<WeightJourneyCard journey={baseJourney} shikona="Test Rikishi" />);
    expect(screen.queryByText("Stalled")).toBeNull();
  });

  it("shows stat bonus indicators (power +3, balance +2)", () => {
    render(<WeightJourneyCard journey={baseJourney} shikona="Test Rikishi" />);
    expect(screen.getByText(/Power \+3/)).not.toBeNull();
    expect(screen.getByText(/Balance \+2/)).not.toBeNull();
  });

  it("renders nothing when no weightJourney present", () => {
    const { container } = render(
      <WeightJourneyCard journey={undefined} shikona="Test Rikishi" />
    );
    expect(container.firstChild).toBeNull();
  });
});
