import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { EraToneBadge } from "@/components/layout/EraToneBadge";
import type { EraTone } from "@/presenters/eraTone";

function renderBadge(tone: EraTone) {
  return render(
    <TooltipProvider>
      <EraToneBadge tone={tone} />
    </TooltipProvider>
  );
}

describe("EraToneBadge", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders Classic label for classic tone", () => {
    renderBadge("classic");
    const badge = screen.getByTestId("era-tone-badge");
    expect(badge.textContent).toContain("Classic");
  });

  it("renders Explosive label for explosive tone", () => {
    renderBadge("explosive");
    const badge = screen.getByTestId("era-tone-badge");
    expect(badge.textContent).toContain("Explosive");
  });

  it("renders Technical label for technical tone", () => {
    renderBadge("technical");
    const badge = screen.getByTestId("era-tone-badge");
    expect(badge.textContent).toContain("Technical");
  });

  it("renders Defensive label for defensive tone", () => {
    renderBadge("defensive");
    const badge = screen.getByTestId("era-tone-badge");
    expect(badge.textContent).toContain("Defensive");
  });

  it("renders the 'Era' prefix label", () => {
    renderBadge("classic");
    const badge = screen.getByTestId("era-tone-badge");
    expect(badge.textContent).toContain("Era");
  });
});
