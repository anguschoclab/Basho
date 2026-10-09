/**
 * useSaveSlotManager.continue.test.tsx
 *
 * Regression test for the Continue-button success lie (audit U1).
 *
 * `handleContinue` calls `loadFromAutosave()` and unconditionally fires
 * `onLoadSuccess()` — if the autosave is corrupt or the load is rejected
 * (e.g. a tick is in flight), the user is still navigated into the game with
 * a stale/empty world. The hook must only signal success when the load
 * actually returned success.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSaveSlotManager } from "@/hooks/useSaveSlotManager";
import type { SaveSlotInfo } from "@/engine/saveload";

vi.mock("@/presenters/uiDigest", () => ({
  BASHO_CALENDAR: { hatsu: { nameEn: "January" } },
  deleteSave: vi.fn(),
  importSave: vi.fn(),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

function makeProps(overrides: Partial<any> = {}) {
  return {
    getSaveSlots: vi.fn((): SaveSlotInfo[] => []),
    loadFromSlot: vi.fn(() => true),
    loadFromAutosave: vi.fn(() => true),
    hasAutosave: vi.fn(() => true),
    onLoadSuccess: vi.fn(),
    loadWorldDirect: vi.fn(),
    ...overrides,
  };
}

describe("useSaveSlotManager — continue", () => {
  afterEach(() => vi.clearAllMocks());

  it("does not call onLoadSuccess when loadFromAutosave returns false", () => {
    const loadFromAutosave = vi.fn(() => false);
    const onLoadSuccess = vi.fn();
    const props = makeProps({ loadFromAutosave, onLoadSuccess });

    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());

    expect(loadFromAutosave).toHaveBeenCalledTimes(1);
    expect(onLoadSuccess).not.toHaveBeenCalled();
  });

  it("calls onLoadSuccess when loadFromAutosave returns true", () => {
    const onLoadSuccess = vi.fn();
    const props = makeProps({ onLoadSuccess });

    const { result } = renderHook(() => useSaveSlotManager(props));
    act(() => result.current.handleContinue());

    expect(onLoadSuccess).toHaveBeenCalledTimes(1);
  });
});
