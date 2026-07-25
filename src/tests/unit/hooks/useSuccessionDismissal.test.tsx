/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSuccessionDismissal } from "@/hooks/useSuccessionDismissal";

describe("useSuccessionDismissal", () => {
  it("is initially not dismissed", () => {
    const { result } = renderHook(() => useSuccessionDismissal(5));
    expect(result.current.isDismissed).toBe(false);
  });

  it("dismiss() sets dismissed for the current week", () => {
    const { result } = renderHook(() => useSuccessionDismissal(5));
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
  });

  it("week advancing clears the dismissal", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
    rerender({ week: 6 });
    expect(result.current.isDismissed).toBe(false);
  });

  it("dismissal persists within the same week", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    act(() => result.current.dismiss());
    rerender({ week: 5 });
    expect(result.current.isDismissed).toBe(true);
  });

  it("dismissal on a later week works independently", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    act(() => result.current.dismiss());
    rerender({ week: 6 });
    expect(result.current.isDismissed).toBe(false);
    act(() => result.current.dismiss());
    rerender({ week: 6 });
    expect(result.current.isDismissed).toBe(true);
  });

  it("week 0: dismiss works and advancing clears", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 0 } }
    );
    expect(result.current.isDismissed).toBe(false);
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
    rerender({ week: 1 });
    expect(result.current.isDismissed).toBe(false);
  });

  it("negative week (-3): dismiss works and advancing clears", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: -3 } }
    );
    expect(result.current.isDismissed).toBe(false);
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
    rerender({ week: -2 });
    expect(result.current.isDismissed).toBe(false);
  });

  it("dismissal persists across multiple rerenders within same week", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    act(() => result.current.dismiss());
    rerender({ week: 5 });
    rerender({ week: 5 });
    rerender({ week: 5 });
    expect(result.current.isDismissed).toBe(true);
  });

  it("dismiss on N, advance to N+1, dismiss, go back to N: N not dismissed", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    act(() => result.current.dismiss());
    rerender({ week: 6 });
    expect(result.current.isDismissed).toBe(false);
    act(() => result.current.dismiss());
    rerender({ week: 6 });
    expect(result.current.isDismissed).toBe(true);
    // Go back to week 5 — dismissedWeek is now 6, so week 5 is not dismissed
    rerender({ week: 5 });
    expect(result.current.isDismissed).toBe(false);
  });

  it("dismiss identity stable across rerenders with same week", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    const firstDismiss = result.current.dismiss;
    rerender({ week: 5 });
    expect(result.current.dismiss).toBe(firstDismiss);
  });

  it("dismiss identity changes when week changes", () => {
    const { result, rerender } = renderHook(
      ({ week }: { week: number }) => useSuccessionDismissal(week),
      { initialProps: { week: 5 } }
    );
    const firstDismiss = result.current.dismiss;
    rerender({ week: 6 });
    expect(result.current.dismiss).not.toBe(firstDismiss);
  });

  it("multiple dismissals same week are idempotent", () => {
    const { result } = renderHook(() => useSuccessionDismissal(5));
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.isDismissed).toBe(true);
  });
});
