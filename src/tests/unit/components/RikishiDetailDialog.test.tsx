import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { RikishiDetailDialog } from "@/components/menu/RikishiDetailDialog";
import type { UIRikishi } from "@/presenters/uiModels";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

function makeUIRikishi(id: string, overrides: Partial<UIRikishi> = {}): UIRikishi {
  return {
    id,
    shikona: `Wrestler-${id}`,
    rank: "maegashira",
    rankNumber: 1,
    division: "makuuchi",
    side: "east",
    style: "oshi",
    stats: { power: 50, speed: 50, technique: 50, balance: 50 },
    age: 25,
    origin: "Tokyo",
    height: 180,
    weight: 140,
    ...overrides,
  } as any;
}

describe("RikishiDetailDialog", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders null when no selectedRikishi", () => {
    const { container } = render(
      <RikishiDetailDialog selectedRikishi={null} onClose={vi.fn()} rosterWithAge={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders rikishi shikona and rank", () => {
    const r = makeUIRikishi("r1", { shikona: "TestSumo", rank: "ozeki" });
    render(
      <RikishiDetailDialog selectedRikishi={r} onClose={vi.fn()} rosterWithAge={[]} />
    );
    expect(screen.getAllByText("TestSumo").length).toBeGreaterThan(0);
  });

  it("renders sekitori badge for sekitori rank", () => {
    const r = makeUIRikishi("r1", { rank: "ozeki" });
    render(
      <RikishiDetailDialog selectedRikishi={r} onClose={vi.fn()} rosterWithAge={[]} />
    );
    expect(screen.getByText("SEKITORI")).toBeTruthy();
  });

  it("renders junior badge for non-sekitori rank", () => {
    const r = makeUIRikishi("r1", { rank: "makushita" });
    render(
      <RikishiDetailDialog selectedRikishi={r} onClose={vi.fn()} rosterWithAge={[]} />
    );
    expect(screen.getByText("JUNIOR")).toBeTruthy();
  });
});
