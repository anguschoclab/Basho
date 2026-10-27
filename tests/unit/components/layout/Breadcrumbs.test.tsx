import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { MockFactory } from "@tests/helpers/utils/MockFactory";
import type { WorldState } from "@/engine/types/world";
import type { Rikishi } from "@/engine/types/rikishi";
import type { Heya } from "@/engine/types/heya";

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

function worldFixture(overrides: Partial<WorldState> = {}): WorldState {
  return MockFactory.createWorld(overrides);
}

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

  it("labels nested tournament routes correctly", () => {
    mockLocation.pathname = "/basho/banzuke";
    render(<Breadcrumbs />);
    expect(screen.getByText("Basho")).toBeTruthy();
    expect(screen.getByText("Banzuke")).toBeTruthy();
  });

  it("labels nested records routes with sidebar-canonical names", () => {
    mockLocation.pathname = "/records/history";
    render(<Breadcrumbs />);
    expect(screen.getByText("Records")).toBeTruthy();
    expect(screen.getByText("Stable History")).toBeTruthy();
  });

  it("labels /jsa/talent as Talent Pools", () => {
    mockLocation.pathname = "/jsa/talent";
    render(<Breadcrumbs />);
    expect(screen.getByText("Talent Pools")).toBeTruthy();
  });

  it("Title-Cases unknown segments instead of showing raw text", () => {
    mockLocation.pathname = "/unknown/some-path";
    render(<Breadcrumbs />);
    expect(screen.getByText("Unknown")).toBeTruthy();
    expect(screen.getByText("Some Path")).toBeTruthy();
    expect(screen.queryByText("unknown")).toBeNull();
    expect(screen.queryByText("some-path")).toBeNull();
  });

  it("resolves /rikishi/$id crumb to the rikishi's shikona from world", () => {
    const world = worldFixture({
      rikishi: new Map([["r42", { id: "r42", shikona: "Hakuho" } as unknown as Rikishi]]),
    });
    mockLocation.pathname = "/rikishi/r42";
    render(<Breadcrumbs world={world} />);
    expect(screen.getByText("Rikishi")).toBeTruthy();
    expect(screen.getByText("Hakuho")).toBeTruthy();
  });

  it("resolves retired rikishi via historicalRikishi", () => {
    const world = worldFixture({
      historicalRikishi: new Map([
        ["old1", { id: "old1", shikona: "Taiho", isSummary: true } as never],
      ]),
    });
    mockLocation.pathname = "/rikishi/old1";
    render(<Breadcrumbs world={world} />);
    expect(screen.getByText("Taiho")).toBeTruthy();
  });

  it("resolves /stable/$id crumb to the heya's name from world", () => {
    const world = worldFixture({
      heyas: new Map([["h7", { id: "h7", name: "Miyagino" } as unknown as Heya]]),
    });
    mockLocation.pathname = "/stable/h7";
    render(<Breadcrumbs world={world} />);
    expect(screen.getByText("Stable")).toBeTruthy();
    expect(screen.getByText("Miyagino")).toBeTruthy();
  });

  it("Title-Cases unresolved dynamic ids when world lacks the entity", () => {
    mockLocation.pathname = "/rikishi/r-missing";
    render(<Breadcrumbs world={worldFixture()} />);
    expect(screen.getByText("R Missing")).toBeTruthy();
  });

  it("section base crumbs link to a real landing page, not the dead base route", () => {
    mockLocation.pathname = "/office/finances";
    render(<Breadcrumbs />);
    const officeLink = screen.getByText("Office").closest("a");
    expect(officeLink?.getAttribute("href")).toBe("/office/finances");
  });

  it("Association section crumb links to /jsa/governance", () => {
    mockLocation.pathname = "/jsa/trends";
    render(<Breadcrumbs />);
    const link = screen.getByText("Association").closest("a");
    expect(link?.getAttribute("href")).toBe("/jsa/governance");
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

  it("ellipsis button expands to reveal hidden crumbs when clicked", () => {
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
    fireEvent.click(screen.getByLabelText("Show all breadcrumbs"));
    expect(screen.getByText("Stable")).toBeTruthy();
    expect(screen.getByText("Roster")).toBeTruthy();
    expect(screen.queryByText("...")).toBeNull();
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

  it("ellipsis crumb renders as a button (expandable), not a link", () => {
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
    const ellipsis = screen.getByLabelText("Show all breadcrumbs");
    expect(ellipsis.closest("a")).toBeNull();
  });

  it("merges custom className onto nav", () => {
    mockLocation.pathname = "/stable";
    const { container } = render(<Breadcrumbs className="custom-nav" />);
    const nav = container.querySelector("nav") as HTMLElement;
    expect(nav.classList.contains("custom-nav")).toBe(true);
  });
});

describe("Breadcrumbs a11y", () => {
  it("interactive crumbs and the ellipsis button carry focus-visible rings", () => {
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
    const ellipsis = screen.getByLabelText("Show all breadcrumbs");
    expect(ellipsis.className).toContain("focus-visible:ring-2");
    const homeLink = screen.getByText("Home").closest("a")!;
    expect(homeLink.className).toContain("focus-visible:ring-2");
  });
});
