/**
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { PbpLineText } from "@/components/game/PbpLineText";

// Mock TanStack Router Link — same pattern as ClickableName.test.tsx
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
  }) => {
    const safeHref = to.startsWith("/") && !to.includes("://") ? to : "#";
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

  it("renders oyakata link", () => {
    render(<PbpLineText text="Master [[oyakata:o-1:Michinoku]] speaks" />);
    expect(screen.getByText("Michinoku")).toBeTruthy();
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/oyakata/o-1");
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
