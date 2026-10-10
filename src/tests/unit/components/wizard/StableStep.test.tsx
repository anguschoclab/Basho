import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StableStep } from "@/components/wizard/StableStep";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";

// Mock Button to avoid router/tooltip dependencies
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

// Mock ScrollArea — jsdom doesn't need virtualization
vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("StableStep", () => {
  const stables = [
    MockFactory.createHeya("h1", { name: "Miyagino" }),
    MockFactory.createHeya("h2", { name: "Isegahama" }),
  ];

  const defaultProps = {
    stables,
    selectedHeyaId: null as string | null,
    onHeyaSelect: vi.fn(),
    onPrev: vi.fn(),
    onFinish: vi.fn(),
  };

  it("renders all stables", () => {
    render(<StableStep {...defaultProps} />);
    expect(screen.getByText("Miyagino")).toBeTruthy();
    expect(screen.getByText("Isegahama")).toBeTruthy();
  });

  it("clicking a stable calls onHeyaSelect with heya id", () => {
    render(<StableStep {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Select Miyagino"));
    expect(defaultProps.onHeyaSelect).toHaveBeenCalledWith("h1");
  });

  it("pressing Enter on a stable calls onHeyaSelect with heya id", () => {
    render(<StableStep {...defaultProps} />);
    fireEvent.keyDown(screen.getByLabelText("Select Miyagino"), { key: "Enter" });
    expect(defaultProps.onHeyaSelect).toHaveBeenCalledWith("h1");
  });

  it("pressing Space on a stable calls onHeyaSelect with heya id", () => {
    render(<StableStep {...defaultProps} />);
    fireEvent.keyDown(screen.getByLabelText("Select Isegahama"), { key: " " });
    expect(defaultProps.onHeyaSelect).toHaveBeenCalledWith("h2");
  });

  it("Begin Journey is disabled until a stable is selected", () => {
    render(<StableStep {...defaultProps} />);
    const btn = screen.getByText(/Begin Journey/i).closest("button");
    expect(btn?.disabled).toBe(true);
  });

  it("Begin Journey is enabled once a stable is selected", () => {
    render(<StableStep {...defaultProps} selectedHeyaId="h1" />);
    const btn = screen.getByText(/Begin Journey/i).closest("button");
    expect(btn?.disabled).toBe(false);
  });
});
