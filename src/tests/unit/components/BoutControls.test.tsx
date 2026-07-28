import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BoutControls } from "@/components/game/boutReplay/BoutControls";
import { TooltipProvider } from "@/components/ui/tooltip";

function renderWithProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("BoutControls", () => {
  const defaultProps = {
    isPlaying: false,
    speed: 1 as const,
    progress: 0,
    onPlayPause: vi.fn(),
    onRestart: vi.fn(),
    onSpeedChange: vi.fn(),
    onSeek: vi.fn(),
  };

  it("renders play button with correct aria-label when not playing", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    expect(screen.getByLabelText("Play")).toBeTruthy();
  });

  it("renders pause button with correct aria-label when playing", () => {
    renderWithProvider(<BoutControls {...defaultProps} isPlaying />);
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  it("renders restart button with correct aria-label", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    expect(screen.getByLabelText("Restart replay")).toBeTruthy();
  });

  it("renders range input with value matching progress prop (0.5 → 500)", () => {
    renderWithProvider(<BoutControls {...defaultProps} progress={0.5} />);
    const slider = screen.getByLabelText("Seek replay progress") as HTMLInputElement;
    expect(slider.value).toBe("500");
  });

  it("changing range input to 250 calls onSeek with 0.25", () => {
    renderWithProvider(<BoutControls {...defaultProps} progress={0.5} />);
    const slider = screen.getByLabelText("Seek replay progress") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "250" } });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(0.25);
  });

  it("changing range input to 1000 calls onSeek with 1.0", () => {
    renderWithProvider(<BoutControls {...defaultProps} progress={0.5} />);
    const slider = screen.getByLabelText("Seek replay progress") as HTMLInputElement;
    fireEvent.change(slider, { target: { value: "1000" } });
    expect(defaultProps.onSeek).toHaveBeenCalledWith(1.0);
  });

  it("renders three speed buttons: 0.5×, 1×, 2×", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    expect(screen.getByLabelText("Set speed to 0.5x")).toBeTruthy();
    expect(screen.getByLabelText("Set speed to 1x")).toBeTruthy();
    expect(screen.getByLabelText("Set speed to 2x")).toBeTruthy();
  });

  it("active speed button (1×) has bg-primary class", () => {
    renderWithProvider(<BoutControls {...defaultProps} speed={1} />);
    const btn = screen.getByLabelText("Set speed to 1x");
    expect(btn.className).toContain("bg-primary");
  });

  it("clicking 0.5× calls onSpeedChange with 0.5", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Set speed to 0.5x"));
    expect(defaultProps.onSpeedChange).toHaveBeenCalledWith(0.5);
  });

  it("clicking 2× calls onSpeedChange with 2", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Set speed to 2x"));
    expect(defaultProps.onSpeedChange).toHaveBeenCalledWith(2);
  });

  it("play button click calls onPlayPause", () => {
    renderWithProvider(<BoutControls {...defaultProps} />);
    fireEvent.click(screen.getByLabelText("Play"));
    expect(defaultProps.onPlayPause).toHaveBeenCalledOnce();
  });
});
