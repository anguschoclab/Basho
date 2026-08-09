import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/contexts/useGame", () => ({
  useGame: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: any) => (
    <a href={to} data-testid="router-link">
      {children}
    </a>
  ),
}));

import { InboxNewsTicker } from "@/components/game/InboxNewsTicker";
import { useGame } from "@/contexts/useGame";

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

function makeDigest(items: ReturnType<typeof makeDigestItem>[], sectionTitle = "Section 1") {
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
    sections: [{ id: "sec-1", title: sectionTitle, items }],
  };
}

describe("InboxNewsTicker", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("returns null when no digest", () => {
    vi.mocked(useGame).mockReturnValue({ digest: null } as any);
    const { container } = render(<InboxNewsTicker />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no sections", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: {
        time: { label: "test" },
        headline: "test",
        counts: {},
        sections: [],
      },
    } as any);
    const { container } = render(<InboxNewsTicker />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ticker items", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: makeDigest([
        makeDigestItem({ id: "i1", title: "First item", detail: "Detail 1" }),
        makeDigestItem({ id: "i2", title: "Second item", detail: "Detail 2" }),
      ]),
    } as any);
    render(<InboxNewsTicker />);
    expect(screen.getByText("First item")).toBeTruthy();
    expect(screen.getByText(/Detail 1/)).toBeTruthy();
    expect(screen.getByText("Second item")).toBeTruthy();
    expect(screen.getByText(/Detail 2/)).toBeTruthy();
  });

  it("renders entity links in title", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: makeDigest([
        makeDigestItem({
          id: "i1",
          title: "[[rikishi:r-1:Asanoyama]] promoted",
        }),
      ]),
    } as any);
    render(<InboxNewsTicker />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/rikishi/r-1");
    expect(screen.getByText("Asanoyama")).toBeTruthy();
  });

  it("renders entity links in detail", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: makeDigest([
        makeDigestItem({
          id: "i1",
          title: "Upset win",
          detail: "Beats [[stable:s-1:Miyagino]]",
        }),
      ]),
    } as any);
    render(<InboxNewsTicker />);
    const link = screen.getByTestId("router-link");
    expect(link.getAttribute("href")).toBe("/stable/s-1");
    expect(screen.getByText("Miyagino")).toBeTruthy();
  });

  it("handles undefined detail gracefully", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: makeDigest([makeDigestItem({ id: "i1", title: "No detail item" })]),
    } as any);
    render(<InboxNewsTicker />);
    expect(screen.getByText("No detail item")).toBeTruthy();
    expect(screen.queryByText(/—/)).toBeNull();
  });

  it("renders section badge", () => {
    vi.mocked(useGame).mockReturnValue({
      digest: makeDigest([makeDigestItem({ id: "i1", title: "Test" })], "Training Report"),
    } as any);
    render(<InboxNewsTicker />);
    expect(screen.getByText("Training Report")).toBeTruthy();
  });
});
