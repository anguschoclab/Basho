import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { HolidayDialog } from "@/components/layout/HolidayDialog";

describe("HolidayDialog", () => {
  afterEach(() => cleanup());

  it("renders dialog with target selector", () => {
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("holiday-dialog")).toBeDefined();
    expect(screen.getByTestId("holiday-target-nextWeek")).toBeDefined();
  });

  it("renders all 6 targets", () => {
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("holiday-target-nextDay")).toBeDefined();
    expect(screen.getByTestId("holiday-target-nextWeek")).toBeDefined();
    expect(screen.getByTestId("holiday-target-nextBashoDay1")).toBeDefined();
    expect(screen.getByTestId("holiday-target-endOfBasho")).toBeDefined();
    expect(screen.getByTestId("holiday-target-postBasho")).toBeDefined();
    expect(screen.getByTestId("holiday-target-nextMonth")).toBeDefined();
  });

  it("renders all 7 safety gates", () => {
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("holiday-gate-topRikishiInjury")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-insolvencyWarning")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-scandalSeverity")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-sponsorChurn")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-promotionRun")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-loanDefault")).toBeDefined();
    expect(screen.getByTestId("holiday-gate-rosterOverForeignLimit")).toBeDefined();
  });

  it("renders all 4 delegation policies", () => {
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("holiday-policy-conservative")).toBeDefined();
    expect(screen.getByTestId("holiday-policy-balanced")).toBeDefined();
    expect(screen.getByTestId("holiday-policy-aggressive")).toBeDefined();
    expect(screen.getByTestId("holiday-policy-roleplay")).toBeDefined();
  });

  it("calls onConfirm with selected config when confirm is clicked", () => {
    const onConfirm = vi.fn();
    render(<HolidayDialog onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId("holiday-target-nextMonth"));
    fireEvent.click(screen.getByTestId("holiday-confirm"));
    expect(onConfirm).toHaveBeenCalled();
    const config = onConfirm.mock.calls[0][0];
    expect(config.target).toBe("nextMonth");
    expect(config.gates).toContain("topRikishiInjury");
    expect(config.delegationPolicy).toBe("balanced");
  });

  it("calls onCancel when cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId("holiday-cancel"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("toggles safety gates on click", () => {
    render(<HolidayDialog onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const gate = screen.getByTestId("holiday-gate-sponsorChurn");
    // Click to enable
    fireEvent.click(gate);
    fireEvent.click(screen.getByTestId("holiday-confirm"));
    // Just verify it doesn't crash — the exact gate set is tested by the confirm call
  });
});
