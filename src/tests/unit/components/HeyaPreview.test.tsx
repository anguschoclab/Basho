import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { HeyaPreview } from "@/components/menu/HeyaPreview";
import type { Heya } from "@/engine/types/heya";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to, ...props }: any) =>
    React.createElement("a", { href: to, ...props }, children),
}));

function makeHeya(overrides: Partial<Heya> = {}): Heya {
  return {
    id: "h1",
    name: "TestHeya",
    statureBand: "new",
    ...overrides,
  } as any;
}

describe("HeyaPreview", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders null when no heya", () => {
    const { container } = render(
      <HeyaPreview heya={null} onClose={vi.fn()} onConfirm={vi.fn()} sekitoriCount={0} rosterWithAge={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders stable name in header", () => {
    render(
      <HeyaPreview
        heya={makeHeya()}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        sekitoriCount={1}
        rosterWithAge={[]}
      />
    );
    expect(screen.getAllByText(/TestHeya/i).length).toBeGreaterThan(0);
  });

  it("calls onConfirm when inaugurate button clicked", () => {
    const onConfirm = vi.fn();
    render(
      <HeyaPreview
        heya={makeHeya()}
        onClose={vi.fn()}
        onConfirm={onConfirm}
        sekitoriCount={1}
        rosterWithAge={[]}
      />
    );
    const btn = screen.getByText(/Inaugurate/i);
    fireEvent.click(btn);
    expect(onConfirm).toHaveBeenCalledWith("h1");
  });
});
