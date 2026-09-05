import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { JungyoInvitationCard } from "@/components/basho/JungyoInvitationCard";
import type { ExhibitionInvitationDTO } from "@/presenters/exhibitionProjections";

function makeInvitation(overrides: Partial<ExhibitionInvitationDTO> = {}): ExhibitionInvitationDTO {
  return {
    id: "ex-1",
    region: "Mongolia",
    prestige: 70,
    expiresAtWeek: 4,
    prestigeLabel: "Notable",
    ...overrides,
  };
}

describe("JungyoInvitationCard", () => {
  afterEach(() => cleanup());

  it("renders invitation with region and prestige", () => {
    render(
      <JungyoInvitationCard
        invitation={makeInvitation()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByTestId("jungyo-card-ex-1")).toBeDefined();
    expect(screen.getByText("Mongolia")).toBeDefined();
    expect(screen.getByText("70")).toBeDefined();
  });

  it("renders accept and decline buttons", () => {
    render(
      <JungyoInvitationCard
        invitation={makeInvitation()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByTestId("accept-jungyo-ex-1")).toBeDefined();
    expect(screen.getByTestId("decline-jungyo-ex-1")).toBeDefined();
  });

  it("calls onAccept when accept button is clicked", () => {
    const onAccept = vi.fn();
    render(
      <JungyoInvitationCard
        invitation={makeInvitation()}
        onAccept={onAccept}
        onDecline={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId("accept-jungyo-ex-1"));
    expect(onAccept).toHaveBeenCalledWith("ex-1");
  });

  it("calls onDecline when decline button is clicked", () => {
    const onDecline = vi.fn();
    render(
      <JungyoInvitationCard
        invitation={makeInvitation()}
        onAccept={vi.fn()}
        onDecline={onDecline}
      />
    );
    fireEvent.click(screen.getByTestId("decline-jungyo-ex-1"));
    expect(onDecline).toHaveBeenCalledWith("ex-1");
  });

  it("shows requires rank when provided", () => {
    render(
      <JungyoInvitationCard
        invitation={makeInvitation({ requiresRank: "Sekiwake" })}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("Sekiwake")).toBeDefined();
  });
});
