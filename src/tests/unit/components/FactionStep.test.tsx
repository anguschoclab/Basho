/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { FactionStep } from "@/components/wizard/FactionStep";

// Mock Button to avoid router/tooltip dependencies
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe("FactionStep", () => {
  const defaultProps = {
    ichimon: "",
    onIchimonChange: vi.fn(),
    onNext: vi.fn(),
    onPrev: vi.fn(),
  };

  it("renders all 5 ichimon factions", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText("Dewanoumi")).toBeTruthy();
    expect(screen.getByText("Nishonoseki")).toBeTruthy();
    expect(screen.getByText("Takasago")).toBeTruthy();
    expect(screen.getByText("Tokitsukaze")).toBeTruthy();
    expect(screen.getByText("Isegahama")).toBeTruthy();
  });

  it("Dewanoumi card shows +5% Power training", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText(/\+5%.*Power/i)).toBeTruthy();
  });

  it("Tokitsukaze card shows +10% Stamina training", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText(/\+10%.*Stamina/i)).toBeTruthy();
  });

  it("Isegahama card shows +5% Technique & Balance training", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText(/\+5%.*Technique.*Balance/i)).toBeTruthy();
  });

  it("Nishonoseki card shows +5% Speed training", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText(/\+5%.*Speed/i)).toBeTruthy();
  });

  it("Takasago card shows +10% Mental training", () => {
    render(<FactionStep {...defaultProps} />);
    expect(screen.getByText(/\+10%.*Mental/i)).toBeTruthy();
  });

  it("Dewanoumi card shows High political weight", () => {
    render(<FactionStep {...defaultProps} />);
    const dewanoumiCard = screen.getByText("Dewanoumi").closest("[class*='dossier']");
    expect(dewanoumiCard?.textContent).toMatch(/High/i);
  });

  it("Nishonoseki card shows Medium political weight", () => {
    render(<FactionStep {...defaultProps} />);
    const nishonosekiCard = screen.getByText("Nishonoseki").closest("[class*='dossier']");
    expect(nishonosekiCard?.textContent).toMatch(/Medium/i);
  });

  it("clicking a card calls onIchimonChange with faction id", () => {
    render(<FactionStep {...defaultProps} />);
    fireEvent.click(screen.getByText("Dewanoumi"));
    expect(defaultProps.onIchimonChange).toHaveBeenCalledWith("dewanoumi");
  });

  it("Next button calls onNext", () => {
    render(<FactionStep {...defaultProps} />);
    fireEvent.click(screen.getByText(/Verify Allegiance/i));
    expect(defaultProps.onNext).toHaveBeenCalled();
  });
});
