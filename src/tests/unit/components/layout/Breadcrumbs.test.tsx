/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

// Mock TanStack Router: Link as real <a>, useLocation returns controllable pathname
const mockLocation = { pathname: "/dashboard" };
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    className,
    children,
  }: {
    to: string;
    className?: string;
    children?: React.ReactNode;
  }) => (
    <a href={to} className={className} data-testid="router-link">
      {children}
    </a>
  ),
  useLocation: () => mockLocation,
}));

describe("Breadcrumbs", () => {
  beforeEach(() => {
    mockLocation.pathname = "/dashboard";
  });

  afterEach(() => {
    // Reset to desktop width after each test
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it("returns null when pathname is / (only Home crumb)", () => {
    mockLocation.pathname = "/";
    const { container } = render(<Breadcrumbs />);
    expect(container.firstChild).toBeNull();
  });

  it("generates correct crumbs for /stable/roster", () => {
    mockLocation.pathname = "/stable/roster";
    render(<Breadcrumbs />);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Stable")).toBeTruthy();
    expect(screen.getByText("Roster")).toBeTruthy();
  });

  it("generates correct crumbs for /office/finances", () => {
    mockLocation.pathname = "/office/finances";
    render(<Breadcrumbs />);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Office")).toBeTruthy();
    expect(screen.getByText("Finances")).toBeTruthy();
  });

  it("marks last crumb with aria-current='page'", () => {
    mockLocation.pathname = "/stable/roster";
    render(<Breadcrumbs />);
    const currentEl = screen.getByText("Roster");
    expect(currentEl.getAttribute("aria-current")).toBe("page");
  });

  it("uses ROUTE_LABELS mapping for known routes", () => {
    mockLocation.pathname = "/jsa/governance";
    render(<Breadcrumbs />);
    expect(screen.getByText("Association")).toBeTruthy();
    expect(screen.getByText("Governance")).toBeTruthy();
  });

  it("falls back to raw segment for unknown routes", () => {
    mockLocation.pathname = "/unknown/path";
    render(<Breadcrumbs />);
    expect(screen.getByText("unknown")).toBeTruthy();
    expect(screen.getByText("path")).toBeTruthy();
  });

  it("custom items prop overrides generateBreadcrumbs", () => {
    mockLocation.pathname = "/stable/roster";
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Custom", href: "/custom", isCurrent: true },
        ]}
      />
    );
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByText("Stable")).toBeNull();
  });

  it("collapses middle crumbs on mobile when > 3 crumbs", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Stable", href: "/stable" },
          { label: "Roster", href: "/stable/roster" },
          { label: "Details", href: "/stable/roster/details", isCurrent: true },
        ]}
      />
    );
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("...")).toBeTruthy();
    expect(screen.getByText("Details")).toBeTruthy();
    expect(screen.queryByText("Stable")).toBeNull();
    expect(screen.queryByText("Roster")).toBeNull();
  });

  it("does not collapse on mobile when exactly 3 crumbs", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });
    mockLocation.pathname = "/stable/roster";
    // 3 crumbs: Home, Stable, Roster
    render(<Breadcrumbs />);
    // With 3 crumbs, no collapse (collapse only when > 3)
    expect(screen.queryByText("...")).toBeNull();
  });

  it("does not collapse on desktop when > 3 crumbs", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Stable", href: "/stable" },
          { label: "Roster", href: "/stable/roster" },
          { label: "Details", href: "/stable/roster/details", isCurrent: true },
        ]}
      />
    );
    expect(screen.queryByText("...")).toBeNull();
    expect(screen.getByText("Roster")).toBeTruthy();
  });

  it("renders Home icon for first crumb", () => {
    mockLocation.pathname = "/stable";
    const { container } = render(<Breadcrumbs />);
    const homeSvg = container.querySelector("svg.lucide-house");
    expect(homeSvg).toBeTruthy();
  });

  it("renders ChevronRight separators between crumbs", () => {
    mockLocation.pathname = "/stable/roster";
    const { container } = render(<Breadcrumbs />);
    const chevrons = container.querySelectorAll("svg.lucide-chevron-right");
    expect(chevrons.length).toBeGreaterThanOrEqual(2);
  });

  it("ellipsis crumb renders as span not anchor", () => {
    Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: 500 });
    render(
      <Breadcrumbs
        items={[
          { label: "Home", href: "/dashboard" },
          { label: "Stable", href: "/stable" },
          { label: "Roster", href: "/stable/roster" },
          { label: "Details", href: "/stable/roster/details", isCurrent: true },
        ]}
      />
    );
    const ellipsis = screen.getByText("...");
    expect(ellipsis.tagName).toBe("SPAN");
    expect(ellipsis.closest("a")).toBeNull();
  });

  it("merges custom className onto nav", () => {
    mockLocation.pathname = "/stable";
    const { container } = render(<Breadcrumbs className="custom-nav" />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.classList.contains("custom-nav")).toBe(true);
  });
});
