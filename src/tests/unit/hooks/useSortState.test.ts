import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSortState } from "@/hooks/useSortState";

const STORAGE_KEY = "basho_sort_test_screen";

describe("useSortState", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("returns default key and order when no stored value exists", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    expect(result.current.sortKey).toBe("rank");
    expect(result.current.sortOrder).toBe("asc");
  });

  it("persists sort key and order to localStorage", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    act(() => {
      result.current.setSortKey("name");
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("name");
    expect(stored.order).toBe("asc");
  });

  it("restores sort key and order from localStorage on init", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: "name", order: "desc" }));
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    expect(result.current.sortKey).toBe("name");
    expect(result.current.sortOrder).toBe("desc");
  });

  it("falls back to defaults when localStorage contains corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json}");
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    expect(result.current.sortKey).toBe("rank");
    expect(result.current.sortOrder).toBe("asc");
  });

  it("falls back to defaults when localStorage throws", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage error");
    });
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    expect(result.current.sortKey).toBe("rank");
    expect(result.current.sortOrder).toBe("asc");
    spy.mockRestore();
  });

  it("toggleOrder flips asc to desc", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    act(() => {
      result.current.toggleOrder();
    });
    expect(result.current.sortOrder).toBe("desc");
  });

  it("toggleOrder flips desc to asc", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "desc"));
    act(() => {
      result.current.toggleOrder();
    });
    expect(result.current.sortOrder).toBe("asc");
  });

  it("setSortKey changes key and resets to default order", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "desc"));
    act(() => {
      result.current.toggleOrder(); // now asc
    });
    expect(result.current.sortOrder).toBe("asc");

    act(() => {
      result.current.setSortKey("name");
    });
    expect(result.current.sortKey).toBe("name");
    expect(result.current.sortOrder).toBe("desc"); // reset to default
  });

  it("setSortKey persists new key and reset order to localStorage", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "desc"));
    act(() => {
      result.current.setSortKey("name");
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.key).toBe("name");
    expect(stored.order).toBe("desc");
  });

  it("toggleOrder persists flipped order to localStorage", () => {
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    act(() => {
      result.current.toggleOrder();
    });
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.order).toBe("desc");
  });

  it("does not crash when localStorage.setItem throws", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useSortState<"rank" | "name">(STORAGE_KEY, "rank", "asc"));
    act(() => {
      result.current.setSortKey("name");
    });
    // Should not throw — state still updates in-memory
    expect(result.current.sortKey).toBe("name");
    spy.mockRestore();
  });
});
