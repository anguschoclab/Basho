/**
 * electronHydration.test.ts
 *
 * Regression test for the Electron store hydration gap (audit WS5-01/E2).
 *
 * `storage.keys()` over IPC returns the whole key→value record — the
 * provider must hydrate a synchronous value cache from it so `getItem`
 * serves real data (not the raw invoke Promise). `provider.ready` must
 * resolve only after hydration completes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ElectronStorageProvider } from "@/contexts/electronStorageProvider";

function installElectronStore(initial: Record<string, string>) {
  const store = { ...initial };
  const storage = {
    get: vi.fn((k: string) => Promise.resolve(store[k] ?? null)),
    set: vi.fn((k: string, v: unknown) => {
      store[k] = v as string;
      return Promise.resolve();
    }),
    delete: vi.fn((k: string) => {
      delete store[k];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
      return Promise.resolve();
    }),
    keys: vi.fn(() => Promise.resolve({ ...store })),
  };
  (window as any).electronCustom = { storage };
  return { storage, store };
}

describe("ElectronStorageProvider — hydration", () => {
  beforeEach(() => {
    (window as any).electronCustom = undefined;
  });
  afterEach(() => {
    delete (window as any).electronCustom;
  });

  it("serves hydrated values synchronously from getItem after ready", async () => {
    installElectronStore({ basho_save_slot1: '{"meta":1}' });
    const provider = new ElectronStorageProvider();
    await provider.ready;

    const value = provider.getItem("basho_save_slot1");
    expect(typeof value).toBe("string");
    expect(value).toBe('{"meta":1}');
  });

  it("setItem then getItem round-trips synchronously on Electron", async () => {
    const { storage } = installElectronStore({});
    const provider = new ElectronStorageProvider();
    await provider.ready;

    provider.setItem("basho_save_slot2", "payload");
    expect(provider.getItem("basho_save_slot2")).toBe("payload");
    expect(storage.set).toHaveBeenCalledWith("basho_save_slot2", "payload");
  });

  it("removeItem makes a hydrated key unreadable", async () => {
    installElectronStore({ basho_save_slot3: "x" });
    const provider = new ElectronStorageProvider();
    await provider.ready;

    provider.removeItem("basho_save_slot3");
    expect(provider.getItem("basho_save_slot3")).toBeNull();
  });
});
