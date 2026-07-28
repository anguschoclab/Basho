/**
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MentorAssignmentPanel } from "@/components/game/MentorAssignmentPanel";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Rikishi } from "@/engine/types/rikishi";

function makeRikishi(id: string, overrides: Partial<Rikishi> = {}): Rikishi {
  return {
    id,
    shikona: `Rikishi ${id}`,
    heyaId: "h1",
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    style: "oshi",
    stats: {
      power: 50,
      speed: 50,
      technique: 50,
      balance: 50,
      weight: 140,
      stamina: 50,
      mental: 50,
      adaptability: 50,
      experience: 50,
      aggression: 50,
    },
    fatigue: 0,
    injured: false,
    isRetired: false,
    isKyujo: false,
    careerWins: 0,
    careerLosses: 0,
    careerAbsences: 0,
    currentBashoWins: 0,
    currentBashoLosses: 0,
    ...overrides,
  } as Rikishi;
}

function renderPanel(props: Partial<React.ComponentProps<typeof MentorAssignmentPanel>> = {}) {
  const defaults: React.ComponentProps<typeof MentorAssignmentPanel> = {
    apprenticeId: "apprentice",
    mentorId: "",
    roster: [],
    onAssignMentor: vi.fn(),
    onRemoveMentor: vi.fn(),
  };
  return render(
    <TooltipProvider>
      <MentorAssignmentPanel {...defaults} {...props} />
    </TooltipProvider>
  );
}

describe("MentorAssignmentPanel", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows current mentor badge and remove button when a mentor is assigned", () => {
    const mentor = makeRikishi("mentor");
    renderPanel({ mentorId: "mentor", roster: [mentor] });

    expect(screen.getByText(/Mentor: Rikishi mentor/)).not.toBeNull();
    expect(screen.getByRole("button", { name: /Remove/ })).not.toBeNull();
  });

  it("lists only eligible mentors in the dropdown", async () => {
    const apprentice = makeRikishi("apprentice", { rank: "makushita", division: "makushita" });
    const eligibleMentor = makeRikishi("eligible", { rank: "maegashira", heyaId: "h1" });
    const injuredMentor = makeRikishi("injured", {
      rank: "maegashira",
      heyaId: "h1",
      injured: true,
    });
    const otherHeya = makeRikishi("other", { rank: "maegashira", heyaId: "h2" });
    const nonSekitori = makeRikishi("nonsekitori", {
      rank: "makushita",
      division: "makushita",
      heyaId: "h1",
    });

    const user = userEvent.setup();
    renderPanel({
      apprenticeId: "apprentice",
      roster: [apprentice, eligibleMentor, injuredMentor, otherHeya, nonSekitori],
    });

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    expect(screen.getByText("Rikishi eligible (maegashira)")).not.toBeNull();
    expect(screen.queryByText("Rikishi injured (maegashira)")).toBeNull();
    expect(screen.queryByText("Rikishi other (maegashira)")).toBeNull();
    expect(screen.queryByText("Rikishi nonsekitori (makushita)")).toBeNull();
    expect(screen.queryByText("Rikishi apprentice (makushita)")).toBeNull();
  });

  it("calls onAssignMentor with the selected mentor id", async () => {
    const apprentice = makeRikishi("apprentice", { rank: "makushita", division: "makushita" });
    const mentor = makeRikishi("mentor", { rank: "maegashira", heyaId: "h1" });
    const onAssignMentor = vi.fn();

    const user = userEvent.setup();
    renderPanel({ apprenticeId: "apprentice", roster: [apprentice, mentor], onAssignMentor });

    const trigger = screen.getByRole("combobox");
    await user.click(trigger);

    const option = screen.getByText("Rikishi mentor (maegashira)");
    await user.click(option);

    expect(onAssignMentor).toHaveBeenCalledWith("mentor");
  });

  it("calls onRemoveMentor when remove is clicked", () => {
    const mentor = makeRikishi("mentor");
    const onRemoveMentor = vi.fn();
    renderPanel({ mentorId: "mentor", roster: [mentor], onRemoveMentor });

    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));
    expect(onRemoveMentor).toHaveBeenCalledTimes(1);
  });

  it("shows helper text when no mentors are available", () => {
    const apprentice = makeRikishi("apprentice", { rank: "makushita", division: "makushita" });
    renderPanel({ apprenticeId: "apprentice", roster: [apprentice] });

    expect(screen.getByText(/Requires a sekitori in the same heya/)).not.toBeNull();
  });
});
