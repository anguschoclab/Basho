/**
 * useKeyboardShortcuts.test.tsx
 *
 * Covers the global-search focus bindings (/ and Cmd/Ctrl+K) and the
 * input-suppression guard shared by all shortcuts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { onFocusGlobalSearch } from "@/components/shared/searchFocusSignal";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: "/dashboard" }),
}));

vi.mock("@/state/game/useGame", () => ({
  useGame: () => ({
    state: { world: null, currentBoutIndex: 0 },
    advanceOneDay: vi.fn(),
    advanceDay: vi.fn(),
    simulateBout: vi.fn(),
    simulateAllBouts: vi.fn(),
    quickSave: vi.fn(),
  }),
}));

function Probe() {
  useKeyboardShortcuts({ eventLogOpen: false, onToggleEventLog: () => {} });
  return null;
}

describe("useKeyboardShortcuts — search focus bindings", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("/ focuses the global search input", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    render(<Probe />);
    fireEvent.keyDown(document.body, { key: "/" });
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("Cmd+K focuses the global search input", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    render(<Probe />);
    fireEvent.keyDown(document.body, { key: "k", metaKey: true });
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("Ctrl+K focuses the global search input", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    render(<Probe />);
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(spy).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("ignores / typed inside an input", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    render(
      <>
        <Probe />
        <input data-testid="field" />
      </>
    );
    const field = document.querySelector("input") as HTMLInputElement;
    fireEvent.keyDown(field, { key: "/" });
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });

  it("ignores plain k (no modifier) so it does not hijack typing", () => {
    const spy = vi.fn();
    const unsub = onFocusGlobalSearch(spy);
    render(<Probe />);
    fireEvent.keyDown(document.body, { key: "k" });
    expect(spy).not.toHaveBeenCalled();
    unsub();
  });
});
