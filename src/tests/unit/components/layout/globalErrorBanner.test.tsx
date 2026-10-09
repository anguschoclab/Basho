/**
 * globalErrorBanner.test.tsx
 *
 * Contract test for the worker-error surfacing component (audit W1/W2).
 *
 * `gameStore` already stores `error` when the worker posts an `ERROR`
 * event, but nothing in the app renders it — worker failures are invisible
 * to the player. The fix adds a `GlobalErrorBanner` that renders
 * `useGameStore(s => s.error)` and dismisses via `setError(null)`.
 *
 * RED note: this file fails at module resolution until the component
 * exists — that is the intended Phase-4A red state for a new component.
 */
import { describe, it, expect, afterEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { GlobalErrorBanner } from "@/components/layout/GlobalErrorBanner";
import { useGameStore } from "@/store/gameStore";

describe("GlobalErrorBanner", () => {
  afterEach(() => {
    cleanup();
    useGameStore.setState({ error: null });
  });

  it("renders the store error message", () => {
    useGameStore.setState({ error: "SCOUT_CANDIDATE failed: pool exhausted" });
    const { getByText } = render(<GlobalErrorBanner />);
    expect(getByText(/SCOUT_CANDIDATE failed: pool exhausted/)).toBeDefined();
  });

  it("renders nothing when there is no error", () => {
    useGameStore.setState({ error: null });
    const { container } = render(<GlobalErrorBanner />);
    expect(container.innerHTML).toBe("");
  });

  it("dismiss clears the store error", () => {
    useGameStore.setState({ error: "boom" });
    const { getByRole } = render(<GlobalErrorBanner />);
    fireEvent.click(getByRole("button"));
    expect(useGameStore.getState().error).toBeNull();
  });
});
