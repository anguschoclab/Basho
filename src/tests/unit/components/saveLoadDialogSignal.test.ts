import { describe, it, expect, beforeEach, vi } from "vitest";

describe("saveLoadDialogSignal", () => {
  let openListeners: Set<() => void>;
  let openSaveLoadDialog: () => void;

  beforeEach(async () => {
    const mod = await import("@/components/game/saveLoadDialogSignal");
    openListeners = mod.openListeners;
    openSaveLoadDialog = mod.openSaveLoadDialog;
    openListeners.clear();
  });

  it("openSaveLoadDialog calls all registered listeners", () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    openListeners.add(fn1);
    openListeners.add(fn2);
    openSaveLoadDialog();
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).toHaveBeenCalledTimes(1);
  });

  it("listeners can be added and removed", () => {
    const fn = vi.fn();
    openListeners.add(fn);
    openSaveLoadDialog();
    expect(fn).toHaveBeenCalledTimes(1);
    openListeners.delete(fn);
    openSaveLoadDialog();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("openSaveLoadDialog works when no listeners are registered", () => {
    expect(() => openSaveLoadDialog()).not.toThrow();
  });
});
