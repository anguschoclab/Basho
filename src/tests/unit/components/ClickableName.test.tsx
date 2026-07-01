/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { ClickableName, RikishiName, StableName, OyakataName } from "@/components/ClickableName";

// ── Mock TanStack Router Link ─────────────────────────────
// Render a real <a> so we can inspect props and fire events.
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

// ── Helpers ────────────────────────────────────────────────
const defaultClasses = [
  "cursor-pointer",
  "hover:text-primary",
  "hover:underline",
  "underline-offset-2",
  "transition-colors",
  "focus-visible:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-primary",
  "focus-visible:ring-offset-1",
  "rounded-sm",
];

describe("ClickableName", () => {
  it.each([
    ["rikishi", "r1", "/rikishi/r1"],
    ["stable", "s1", "/stable/s1"],
    ["oyakata", "o1", "/oyakata/o1"],
  ] as const)("renders correct route for type=%s id=%s", (type, id, expectedTo) => {
    render(<ClickableName type={type} id={id} name="Test" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe(expectedTo);
  });

  it("renders name text when children are absent", () => {
    render(<ClickableName type="rikishi" id="r1" name="Takakeisho" />);
    expect(screen.getByText("Takakeisho")).toBeTruthy();
  });

  it("prefers children string over name", () => {
    render(
      <ClickableName type="rikishi" id="r1" name="Takakeisho">
        Custom Text
      </ClickableName>
    );
    expect(screen.getByText("Custom Text")).toBeTruthy();
    expect(screen.queryByText("Takakeisho")).toBeNull();
  });

  it("prefers children element over name", () => {
    render(
      <ClickableName type="rikishi" id="r1" name="Takakeisho">
        <span data-testid="child-elem">Child Element</span>
      </ClickableName>
    );
    expect(screen.getByTestId("child-elem")).toBeTruthy();
    expect(screen.queryByText("Takakeisho")).toBeNull();
  });

  it("applies all default Tailwind classes", () => {
    render(<ClickableName type="rikishi" id="r1" name="Test" />);
    const link = screen.getByTestId("router-link");
    for (const cls of defaultClasses) {
      expect(link.classList.contains(cls)).toBe(true);
    }
  });

  it("merges custom className with defaults via cn", () => {
    render(<ClickableName type="rikishi" id="r1" name="Test" className="text-red-500 font-bold" />);
    const link = screen.getByTestId("router-link");
    expect(link.classList.contains("text-red-500")).toBe(true);
    expect(link.classList.contains("font-bold")).toBe(true);
    // defaults still present
    expect(link.classList.contains("cursor-pointer")).toBe(true);
  });

  it("calls e.stopPropagation() on click", () => {
    const parentHandler = vi.fn();
    render(
      <div onClick={parentHandler} data-testid="parent">
        <ClickableName type="rikishi" id="r1" name="Test" />
      </div>
    );
    const link = screen.getByTestId("router-link");
    fireEvent.click(link);
    expect(parentHandler).not.toHaveBeenCalled();
  });

  it("handles empty className gracefully", () => {
    render(<ClickableName type="rikishi" id="r1" name="Test" className="" />);
    const link = screen.getByTestId("router-link");
    // defaults still present, no duplication or empty-string leakage
    expect(link.classList.contains("cursor-pointer")).toBe(true);
    expect(link.className).not.toContain("  "); // no double spaces
  });

  it("renders numeric 0 child instead of name", () => {
    render(
      <ClickableName type="rikishi" id="r1" name="Takakeisho">
        {0}
      </ClickableName>
    );
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.queryByText("Takakeisho")).toBeNull();
  });

  it("handles empty-string id", () => {
    render(<ClickableName type="rikishi" id="" name="Test" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/");
  });

  it("sanitizes id with javascript: protocol scheme", () => {
    render(<ClickableName type="rikishi" id="javascript:alert(1)" name="Test" />);
    const link = screen.getByTestId("router-link");
    const href = link.getAttribute("href");
    expect(href).not.toContain("javascript:");
    expect(href).toBe("/rikishi/");
  });

  it("sanitizes id with data: protocol scheme", () => {
    render(<ClickableName type="rikishi" id="data:text/html,<script>alert(1)</script>" name="Test" />);
    const link = screen.getByTestId("router-link");
    const href = link.getAttribute("href");
    expect(href).not.toContain("data:");
    expect(href).toBe("/rikishi/");
  });

  it("sanitizes id with path traversal (..)", () => {
    render(<ClickableName type="rikishi" id="../etc/passwd" name="Test" />);
    const link = screen.getByTestId("router-link");
    const href = link.getAttribute("href");
    expect(href).not.toContain("..");
    expect(href).toBe("/rikishi/");
  });

  it("sanitizes id with leading slash (absolute path injection)", () => {
    render(<ClickableName type="rikishi" id="/admin" name="Test" />);
    const link = screen.getByTestId("router-link");
    const href = link.getAttribute("href");
    expect(href).not.toContain("/admin");
    expect(href).toBe("/rikishi/");
  });

  it("preserves safe alphanumeric id", () => {
    render(<ClickableName type="rikishi" id="RK-ABCD1234" name="Test" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/RK-ABCD1234");
  });
});

describe("Convenience wrappers", () => {
  it("RikishiName passes type=rikishi and forwards props", () => {
    render(<RikishiName id="r42" name="Hakuho" className="champion" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r42");
    expect(link.classList.contains("champion")).toBe(true);
    expect(screen.getByText("Hakuho")).toBeTruthy();
  });

  it("RikishiName forwards children", () => {
    render(
      <RikishiName id="r42" name="Hakuho">
        <span data-testid="rikishi-child">Child</span>
      </RikishiName>
    );
    expect(screen.getByTestId("rikishi-child")).toBeTruthy();
    expect(screen.queryByText("Hakuho")).toBeNull();
  });

  it("RikishiName renders numeric 0 child instead of name", () => {
    render(
      <RikishiName id="r42" name="Hakuho">
        {0}
      </RikishiName>
    );
    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.queryByText("Hakuho")).toBeNull();
  });

  it("StableName passes type=stable and forwards props", () => {
    render(<StableName id="s7" name="Miyagino" className="heya-badge" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/stable/s7");
    expect(link.classList.contains("heya-badge")).toBe(true);
    expect(screen.getByText("Miyagino")).toBeTruthy();
  });

  it("StableName forwards children", () => {
    render(
      <StableName id="s7" name="Miyagino">
        <span data-testid="stable-child">Child</span>
      </StableName>
    );
    expect(screen.getByTestId("stable-child")).toBeTruthy();
    expect(screen.queryByText("Miyagino")).toBeNull();
  });

  it("OyakataName passes type=oyakata and forwards props", () => {
    render(<OyakataName id="o3" name="Chiganoura" className="oyakata-link" />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/oyakata/o3");
    expect(link.classList.contains("oyakata-link")).toBe(true);
    expect(screen.getByText("Chiganoura")).toBeTruthy();
  });

  it("OyakataName forwards children", () => {
    render(
      <OyakataName id="o3" name="Chiganoura">
        <span data-testid="oyakata-child">Child</span>
      </OyakataName>
    );
    expect(screen.getByTestId("oyakata-child")).toBeTruthy();
    expect(screen.queryByText("Chiganoura")).toBeNull();
  });
});
