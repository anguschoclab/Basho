/**
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Trophy } from "lucide-react";

function renderEmptyState(props: Partial<React.ComponentProps<typeof EmptyState>> = {}) {
  const defaults: React.ComponentProps<typeof EmptyState> = {
    title: "Nothing here",
  };
  return render(<EmptyState {...defaults} {...props} />);
}

describe("EmptyState", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders title and description", () => {
    renderEmptyState({ title: "No data", description: "Try adding some items" });

    expect(screen.getByText("No data")).not.toBeNull();
    expect(screen.getByText("Try adding some items")).not.toBeNull();
  });

  it("renders icon when provided", () => {
    renderEmptyState({ icon: Trophy, title: "No trophy" });

    const svg = document.querySelector(".lucide-trophy");
    expect(svg).not.toBeNull();
  });

  it("renders action button with correct label", () => {
    const onClick = vi.fn();
    renderEmptyState({ title: "Empty", action: { label: "Add Item", onClick } });

    const btn = screen.getByRole("button", { name: "Add Item" });
    expect(btn).not.toBeNull();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders secondary action button", () => {
    const primary = vi.fn();
    const secondary = vi.fn();
    renderEmptyState({
      title: "Empty",
      action: { label: "Primary", onClick: primary },
      secondaryAction: { label: "Secondary", onClick: secondary },
    });

    expect(screen.getByRole("button", { name: "Primary" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Secondary" })).not.toBeNull();
  });

  it("applies compact mode classes", () => {
    const { container } = renderEmptyState({ title: "Compact", compact: true });

    expect((container.firstChild as HTMLElement).className).toContain("py-8");
    expect((container.firstChild as HTMLElement).className).toContain("px-4");
  });

  it("does not render icon container when icon is undefined", () => {
    const { container } = renderEmptyState({ title: "No icon" });

    expect(container.querySelector(".rounded-full")).toBeNull();
  });
});
