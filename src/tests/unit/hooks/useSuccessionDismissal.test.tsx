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
});
