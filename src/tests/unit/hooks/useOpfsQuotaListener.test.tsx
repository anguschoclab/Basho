import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import { useOpfsQuotaListener } from "@/hooks/useOpfsQuotaListener";

const EVENT_NAME = "engine:storage:quota-exceeded";

function dispatchQuotaEvent(detail?: { message: string } | null) {
  const event = new CustomEvent(EVENT_NAME, { detail: detail ?? null });
  window.dispatchEvent(event);
}

describe("useOpfsQuotaListener", () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockToast.mockReset();
    addSpy = vi.spyOn(window, "addEventListener");
    removeSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("registers listener on mount", () => {
    renderHook(() => useOpfsQuotaListener());
    const calls = addSpy.mock.calls.filter((call: unknown[]) => call[0] === EVENT_NAME);
    expect(calls).toHaveLength(1);
    expect(typeof calls[0][1]).toBe("function");
  });

  it("toast fires with detail message", () => {
    renderHook(() => useOpfsQuotaListener());
    dispatchQuotaEvent({ message: "quota hit" });
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Storage Warning",
      description: "quota hit",
      variant: "destructive",
    });
  });

  it("toast fires with fallback message when no detail", () => {
    renderHook(() => useOpfsQuotaListener());
    dispatchQuotaEvent(null);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Local storage full. Older archives may need to be cleared.",
      })
    );
  });

  it("toast fires with fallback when detail has no message", () => {
    renderHook(() => useOpfsQuotaListener());
    dispatchQuotaEvent({} as { message: string });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Local storage full. Older archives may need to be cleared.",
      })
    );
  });

  it("listener removed on unmount", () => {
    const { unmount } = renderHook(() => useOpfsQuotaListener());
    unmount();
    const calls = removeSpy.mock.calls.filter((call: unknown[]) => call[0] === EVENT_NAME);
    expect(calls).toHaveLength(1);
  });

  it("no toast after unmount", () => {
    const { unmount } = renderHook(() => useOpfsQuotaListener());
    unmount();
    dispatchQuotaEvent({ message: "post-unmount" });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("re-subscribes on re-render (old listener removed, new added)", () => {
    const { rerender } = renderHook(() => useOpfsQuotaListener());
    const initialAddCount = addSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === EVENT_NAME
    ).length;
    const initialRemoveCount = removeSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === EVENT_NAME
    ).length;
    rerender();
    const afterAddCount = addSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === EVENT_NAME
    ).length;
    const afterRemoveCount = removeSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === EVENT_NAME
    ).length;
    // Effect with [] deps should NOT re-run on rerender, so counts stay equal.
    expect(afterAddCount).toBe(initialAddCount);
    expect(afterRemoveCount).toBe(initialRemoveCount);
  });
});
