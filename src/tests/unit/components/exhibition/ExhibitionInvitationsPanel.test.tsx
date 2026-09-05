import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ExhibitionInvitationsPanel } from "@/components/exhibition/ExhibitionInvitationsPanel";
import type { ExhibitionProjection } from "@/presenters/exhibitionProjections";

function makeProjection(invitations: any[] = []): ExhibitionProjection {
  return {
    invitations,
    hasInvitations: invitations.length > 0,
  };
}

describe("ExhibitionInvitationsPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders empty state when no invitations", () => {
    render(
      <ExhibitionInvitationsPanel
        projection={makeProjection()}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByText("No pending exhibition invitations.")).toBeDefined();
  });

  it("renders invitation rows when invitations exist", () => {
    const invitations = [
      { id: "ex1", region: "Mongolia", prestige: 85, expiresAtWeek: 10, prestigeLabel: "Prestigious" },
    ];
    render(
      <ExhibitionInvitationsPanel
        projection={makeProjection(invitations)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />
    );
    expect(screen.getByTestId("exhibition-invitations-panel")).toBeDefined();
    expect(screen.getByTestId("invitation-row-ex1")).toBeDefined();
    expect(screen.getByText("Mongolia")).toBeDefined();
  });

  it("calls onAccept when accept button is clicked", () => {
    const onAccept = vi.fn();
    const invitations = [
      { id: "ex1", region: "Mongolia", prestige: 50, expiresAtWeek: 10, prestigeLabel: "Standard" },
    ];
    render(
      <ExhibitionInvitationsPanel
        projection={makeProjection(invitations)}
        onAccept={onAccept}
        onDecline={vi.fn()}
        eligibleRikishiCount={3}
      />
    );
    fireEvent.click(screen.getByTestId("accept-ex1"));
    expect(onAccept).toHaveBeenCalledWith("ex1", "");
  });

  it("calls onDecline when decline button is clicked", () => {
    const onDecline = vi.fn();
    const invitations = [
      { id: "ex1", region: "Mongolia", prestige: 50, expiresAtWeek: 10, prestigeLabel: "Standard" },
    ];
    render(
      <ExhibitionInvitationsPanel
        projection={makeProjection(invitations)}
        onAccept={vi.fn()}
        onDecline={onDecline}
      />
    );
    fireEvent.click(screen.getByTestId("decline-ex1"));
    expect(onDecline).toHaveBeenCalledWith("ex1");
  });

  it("disables accept button when no eligible rikishi", () => {
    const invitations = [
      { id: "ex1", region: "Mongolia", prestige: 50, expiresAtWeek: 10, prestigeLabel: "Standard" },
    ];
    render(
      <ExhibitionInvitationsPanel
        projection={makeProjection(invitations)}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
        eligibleRikishiCount={0}
      />
    );
    const acceptBtn = screen.getByTestId("accept-ex1");
    expect(acceptBtn.hasAttribute("disabled")).toBe(true);
  });
});
