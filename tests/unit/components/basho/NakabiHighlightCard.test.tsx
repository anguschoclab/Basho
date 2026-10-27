import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { NakabiHighlightCard } from "@/components/basho/NakabiHighlightCard";
import type { NakabiProjection } from "@/presenters/projections/nakabiProjections";

// The leader name renders via RikishiName → TanStack <Link>; mock it to a
// plain anchor per ClickableName.test.tsx convention (no RouterProvider needed).
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    className,
    onClick,
    children,
  }: {
    to: string;
    params?: Record<string, string>;
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
    children?: React.ReactNode;
  }) => {
    const resolved = params
      ? to.replace(/\$(\w+)/g, (m, k: string) => params[k] ?? m)
      : to;
    const safeHref = resolved.startsWith("/") && !resolved.includes("://") ? resolved : "#";
    return (
      <a href={safeHref} className={className} onClick={onClick} data-testid="router-link">
        {children}
      </a>
    );
  },
}));

function makeProjection(overrides: Partial<NakabiProjection> = {}): NakabiProjection {
  return { summary: null, isNakabiDay: false, ...overrides };
}

describe("NakabiHighlightCard", () => {
  afterEach(() => cleanup());

  it("renders nothing when no summary and not nakabi day", () => {
    const { container } = render(<NakabiHighlightCard projection={makeProjection()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders placeholder when nakabi day but no summary yet", () => {
    render(<NakabiHighlightCard projection={makeProjection({ isNakabiDay: true })} />);
    expect(screen.getByTestId("nakabi-card")).toBeDefined();
    expect(screen.getByText("Checkpoint summary not yet available.")).toBeDefined();
  });

  it("renders summary with leader and undefeated count", () => {
    const proj = makeProjection({
      isNakabiDay: true,
      summary: {
        bashoName: "Aki",
        year: 2024,
        day: 8,
        leaderId: "r-1",
        leaderShikona: "Testkaze",
        leaderWins: 8,
        leaderLosses: 0,
        undefeatedCount: 3,
        notablePerformers: [],
      },
    });
    render(<NakabiHighlightCard projection={proj} />);
    expect(screen.getByTestId("nakabi-card")).toBeDefined();
    expect(screen.getByText("3")).toBeDefined();
    expect(screen.getByText("8-0")).toBeDefined();
  });

  it("renders notable performers", () => {
    const proj = makeProjection({
      isNakabiDay: true,
      summary: {
        bashoName: "Aki",
        year: 2024,
        day: 8,
        leaderId: "r-1",
        leaderShikona: "Testkaze",
        leaderWins: 8,
        leaderLosses: 0,
        undefeatedCount: 1,
        notablePerformers: [
          {
            rikishiId: "r-2",
            shikona: "Young Hopeful",
            wins: 7,
            losses: 1,
            note: "Upset specialist",
          },
        ],
      },
    });
    render(<NakabiHighlightCard projection={proj} />);
    expect(screen.getByTestId("nakabi-performer-r-2")).toBeDefined();
    expect(screen.getByText("Young Hopeful")).toBeDefined();
  });
});
