import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: any) => (
    <a href={to} data-testid="router-link">{children}</a>
  ),
  useNavigate: () => (opts: any) => mockNavigate(opts),
}));

vi.mock("@/presenters/projections/digestProjections", () => ({
  buildWeeklyDigest: vi.fn(() => null),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

import { DigestWidget } from "@/components/dashboard/DigestWidget";
import { useGame } from "@/contexts/useGame";
import { buildWeeklyDigest } from "@/presenters/projections/digestProjections";

function makeDigestItem(
  overrides: Partial<{
    id: string;
    kind: string;
    title: string;
    detail: string;
    rikishiId: string;
    heyaId: string;
  }> = {}
) {
  return {
    id: overrides.id ?? "item-1",
    kind: overrides.kind ?? "generic",
    title: overrides.title ?? "Test Item",
    detail: overrides.detail,
    rikishiId: overrides.rikishiId,
    heyaId: overrides.heyaId,
  };
}

function makeDigest(
  sections: Array<{
    id: string;
    title: string;
    items: ReturnType<typeof makeDigestItem>[];
  }>
) {
  return {
    time: { label: "2025 — Week 5" },
    headline: "A quiet week.",
    counts: {
      trainingEvents: 0,
      injuries: 0,
      recoveries: 0,
      economy: 0,
      scouting: 0,
    },
    sections,
  };
}

describe("DigestWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when no digest", () => {
    vi.mocked(useGame).mockReturnValue({ state: { world: null } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(null as any);
    const { container } = render(<DigestWidget />);
    expect(container.firstChild).toBeNull();
  });

  it("renders sections and items", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Training Report",
        items: [
          makeDigestItem({ id: "i1", title: "Training gain" }),
          makeDigestItem({ id: "i2", title: "Stamina boost" }),
        ],
      },
      {
        id: "sec-2",
        title: "Injuries",
        items: [makeDigestItem({ id: "i3", title: "Sprained ankle" })],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    expect(screen.getByText("Training Report")).toBeTruthy();
    expect(screen.getByText("Training gain")).toBeTruthy();
    expect(screen.getByText("Stamina boost")).toBeTruthy();
    expect(screen.getByText("Injuries")).toBeTruthy();
    expect(screen.getByText("Sprained ankle")).toBeTruthy();
  });

  it("renders entity links in item title", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Injuries",
        items: [
          makeDigestItem({
            id: "i1",
            title: "[[rikishi:r-1:Asanoyama]] injured",
          }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
    expect(screen.getByText("Asanoyama")).toBeTruthy();
  });

  it("renders entity links in item detail", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Transfers",
        items: [
          makeDigestItem({
            id: "i1",
            title: "New recruit",
            detail: "Joins [[stable:s-1:Miyagino]]",
          }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/stable/s-1");
    expect(screen.getByText("Miyagino")).toBeTruthy();
  });

  it("row with rikishiId is clickable", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Training",
        items: [
          makeDigestItem({ id: "i1", title: "Training gain", rikishiId: "r-5" }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const row = screen.getByRole("button");
    expect(row).toBeTruthy();
    expect(row.getAttribute("tabindex")).toBe("0");
  });

  it("clicking row with rikishiId navigates", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Training",
        items: [
          makeDigestItem({ id: "i1", title: "Training gain", rikishiId: "r-5" }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const row = screen.getByRole("button");
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/rikishi/r-5" });
  });

  it("row with heyaId navigates to stable", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Economy",
        items: [
          makeDigestItem({ id: "i1", title: "Budget update", heyaId: "s-3" }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const row = screen.getByRole("button");
    fireEvent.click(row);
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/stable/s-3" });
  });

  it("row without entity IDs is not clickable", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Misc",
        items: [makeDigestItem({ id: "i1", title: "Generic event" })],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keyboard activation navigates", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Training",
        items: [
          makeDigestItem({ id: "i1", title: "Training gain", rikishiId: "r-5" }),
        ],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    const row = screen.getByRole("button");
    fireEvent.keyDown(row, { key: "Enter" });
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/rikishi/r-5" });
  });

  it("handles undefined detail gracefully", () => {
    const digest = makeDigest([
      {
        id: "sec-1",
        title: "Misc",
        items: [makeDigestItem({ id: "i1", title: "No detail" })],
      },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    expect(screen.getByText("No detail")).toBeTruthy();
    expect(screen.queryByText(/—/)).toBeNull();
  });

  it("respects DIGEST_WIDGET_MAX_ITEMS limit", () => {
    const items = Array.from({ length: 10 }, (_, i) =>
      makeDigestItem({ id: `i${i}`, title: `Item ${i}` })
    );
    const digest = makeDigest([
      { id: "sec-1", title: "Big Section", items },
    ]);
    vi.mocked(useGame).mockReturnValue({ state: { world: {} } } as any);
    vi.mocked(buildWeeklyDigest).mockReturnValue(digest as any);
    render(<DigestWidget />);
    expect(screen.getByText("Item 0")).toBeTruthy();
    expect(screen.getByText("Item 3")).toBeTruthy();
    expect(screen.queryByText("Item 4")).toBeNull();
    expect(screen.getByText("+6 more")).toBeTruthy();
  });
});
