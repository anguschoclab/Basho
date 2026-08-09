import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { BardEngine } from "@/engine/bard/BardEngine";

import { useDomainsReady } from "@/hooks/useDomainsReady";

describe("useDomainsReady", () => {
  beforeEach(() => {
    BardEngine.resetCache();
    BardEngine.resetDomains();
  });

  it("returns false synchronously on first render when domains are not loaded", () => {
    const { result } = renderHook(() => useDomainsReady());
    expect(result.current).toBe(false);
  });

  it("flips to true after BardEngine.loadDomains() resolves", async () => {
    const { result } = renderHook(() => useDomainsReady());
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("returns true immediately when domains were already loaded before mount", async () => {
    await BardEngine.loadDomains();
    const { result } = renderHook(() => useDomainsReady());
    expect(result.current).toBe(true);
  });

  it("does not throw and stays false if loadDomains() rejects", async () => {
    const loadSpy = vi
      .spyOn(BardEngine, "loadDomains")
      .mockRejectedValueOnce(new Error("test failure"));

    const { result } = renderHook(() => useDomainsReady());
    // Should not throw; should remain false
    await waitFor(() => expect(result.current).toBe(false));
    expect(loadSpy).toHaveBeenCalled();
    loadSpy.mockRestore();
  });
});
