/**
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BaseWidget } from "@/components/dashboard/BaseWidget";
import { Trophy } from "lucide-react";

function renderWidget(props: Partial<React.ComponentProps<typeof BaseWidget>> = {}) {
  const defaults: React.ComponentProps<typeof BaseWidget> = {
    title: "Test Widget",
    icon: Trophy,
    children: <div data-testid="widget-content">Content</div>,
  };
  return render(
    <TooltipProvider>
      <BaseWidget {...defaults} {...props} />
    </TooltipProvider>
  );
}

describe("BaseWidget", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders title and children", () => {
    renderWidget();

    expect(screen.getByText("Test Widget")).not.toBeNull();
    expect(screen.getByTestId("widget-content")).not.toBeNull();
  });

  it("renders header action with tooltip", () => {
    const onClick = vi.fn();
    renderWidget({ headerAction: { label: "View All", onClick, tooltip: "View all items" } });

    const btn = screen.getByRole("button", { name: "View all items" });
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toBe("View all items");

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders loading state instead of children", () => {
    renderWidget({ loading: true });

    expect(screen.queryByTestId("widget-content")).toBeNull();
    expect(document.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders footer when footerAction is provided", () => {
    const onClick = vi.fn();
    renderWidget({ footerAction: { label: "Navigate", onClick } });

    const btn = screen.getByRole("button", { name: /Navigate/ });
    expect(btn).not.toBeNull();

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("applies custom className", () => {
    const { container } = renderWidget({ className: "custom-widget-class" });

    expect((container.firstChild as HTMLElement).className).toContain("custom-widget-class");
  });
});
