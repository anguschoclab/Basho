import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PbpLineText } from "@/components/basho/PbpLineText";
import { GameContext } from "@/state/game/gameContextInstance";

// Mock TanStack Router Link — same pattern as ClickableName.test.tsx
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
    const resolved = params ? to.replace(/\$(\w+)/g, (m, k: string) => params[k] ?? m) : to;
    const safeHref = resolved.startsWith("/") && !resolved.includes("://") ? resolved : "#";
    return (
      <a href={safeHref} className={className} onClick={onClick} data-testid="router-link">
        {children}
      </a>
    );
  },
}));

describe("PbpLineText component", () => {
  it("renders plain text correctly", () => {
    render(<PbpLineText text="Hello world" />);
    expect(screen.getByText("Hello world")).toBeTruthy();
  });

  it("renders entity link as clickable element", () => {
    render(<PbpLineText text="Winner [[rikishi:r-1:Asanoyama]] wins" />);
    expect(screen.getByText("Asanoyama")).toBeTruthy();
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
  });

  it("renders stable link", () => {
    render(<PbpLineText text="[[stable:h-1:Kokonoe]] stable" />);
    expect(screen.getByText("Kokonoe")).toBeTruthy();
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/stable/h-1");
  });

  it("renders oyakata mention as plain text when it cannot be resolved to a stable", () => {
    // No GameContext / no matching oyakata — no /oyakata route exists, so the
    // mention must render as plain text rather than a dead link.
    render(<PbpLineText text="Master [[oyakata:o-1:Michinoku]] speaks" />);
    expect(screen.getByText("Michinoku")).toBeTruthy();
    expect(screen.queryByTestId("router-link")).toBeNull();
  });

  it("links an oyakata mention to their stable page", () => {
    const world = { oyakata: new Map([["o-1", { heyaId: "h-9" }]]) };
    render(
      <GameContext.Provider value={{ state: { world } } as never}>
        <PbpLineText text="Master [[oyakata:o-1:Michinoku]] speaks" />
      </GameContext.Provider>
    );
    expect(screen.getByText("Michinoku")).toBeTruthy();
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/stable/h-9");
  });

  it("renders multiple links in a single string", () => {
    render(<PbpLineText text="[[rikishi:r-1:Asanoyama]] beats [[rikishi:r-2:Terunofuji]]" />);
    expect(screen.getByText("Asanoyama")).toBeTruthy();
    expect(screen.getByText("Terunofuji")).toBeTruthy();
  });

  it("applies className to wrapper", () => {
    const { container } = render(<PbpLineText text="test" className="text-sm leading-relaxed" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.classList.contains("text-sm")).toBe(true);
    expect(wrapper.classList.contains("leading-relaxed")).toBe(true);
  });

  it("renders plain text with no links without crashing", () => {
    render(<PbpLineText text="A simple bout with no entity links." />);
    expect(screen.getByText("A simple bout with no entity links.")).toBeTruthy();
  });
});
