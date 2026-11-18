import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { NotableBouts } from "@/components/rikishi/career/NotableBouts";
import { PromotionHistory } from "@/components/rikishi/career/CareerHistorySections";
import type { NotableBoutEntry, PromotionHistoryEntry } from "@/engine/almanac/types";

// PbpLineText → ClickableName renders TanStack Link — stub it as a plain <a>.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    className,
    onClick,
    children,
  }: {
    to: string;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    children?: React.ReactNode;
  }) => (
    <a href={to} className={className} onClick={onClick} data-testid="router-link">
      {children}
    </a>
  ),
}));

const bout: NotableBoutEntry = {
  boutId: "b-2026-hatsu-d12-RK-1-RK-2",
  year: 2026,
  bashoName: "hatsu",
  day: 12,
  opponentId: "RK-2",
  opponentShikona: "Akiho",
  winner: true,
  kimarite: "yorikiri",
  isKinboshi: true,
  isUpset: true,
  isYushoRace: false,
  excitementScore: 71,
  narrativeLines: ["[[rikishi:RK-1:Musashimaru]] finally breaks [[rikishi:RK-2:Akiho]]!"],
};

const promotion: PromotionHistoryEntry = {
  year: 2026,
  bashoName: "haru",
  fromRank: "makushita:幕下3E",
  toRank: "juryo:十両14W",
  kind: "promotion",
  isJump: false,
  isSanyaku: false,
  isSekitori: true,
};

describe("NotableBouts", () => {
  it("renders outcome, opponent, kimarite, date and flag badges", () => {
    render(<NotableBouts notableBouts={[bout]} />);
    expect(screen.getByText("W vs Akiho")).toBeTruthy();
    expect(screen.getByText("yorikiri")).toBeTruthy();
    expect(screen.getByText("2026 hatsu Day 12")).toBeTruthy();
    expect(screen.getByText("Kinboshi")).toBeTruthy();
    expect(screen.getByText("UPSET")).toBeTruthy();
  });

  it("expands a bout to reveal narrative lines with entity links resolved", () => {
    render(<NotableBouts notableBouts={[bout]} />);
    // Collapsed: narrative line hidden, raw marker must never appear.
    expect(screen.queryByText(/rikishi:RK-1/)).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    const links = screen.getAllByTestId("router-link");
    expect(links.map((l) => l.textContent)).toEqual(["Musashimaru", "Akiho"]);
    expect(links[0].getAttribute("href")).toBe("/rikishi/RK-1");
    expect(screen.queryByText(/\[\[/)).toBeNull();
  });

  it("renders nothing when there are no notable bouts", () => {
    const { container } = render(<NotableBouts notableBouts={[]} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<NotableBouts notableBouts={undefined} />);
    expect(c2.firstChild).toBeNull();
  });
});

describe("PromotionHistory", () => {
  it("renders rank movement with event badges", () => {
    render(<PromotionHistory promotionHistory={[promotion]} />);
    expect(screen.getByText("makushita:幕下3E")).toBeTruthy();
    expect(screen.getByText("juryo:十両14W")).toBeTruthy();
    expect(screen.getByText("2026 haru")).toBeTruthy();
    expect(screen.getByText("Sekitori")).toBeTruthy();
  });

  it("renders nothing when there is no promotion history", () => {
    const { container } = render(<PromotionHistory promotionHistory={undefined} />);
    expect(container.firstChild).toBeNull();
  });
});
