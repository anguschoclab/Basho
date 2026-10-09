/**
 * electronStorageProvider.async.test.ts
 *
 * Regression tests for the real async IPC contract (audit WS5-01).
 *
 * The production preload bridge (`electron/preload.ts`) exposes
 * `storage.get` as `ipcRenderer.invoke(...)` — a Promise. The existing test
 * suite mocks `storage.get` synchronously, which masks the fact that
 * `getItem()` casts that Promise to `string`. These tests emulate the real
 * preload contract (Promise-returning get/set/delete, keys() resolving to
 * the whole store object) and pin synchronous string|null reads for the
 * provider, which the sync IStorageProvider interface requires.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ElectronStorageProvider } from "@/contexts/electronStorageProvider";
import { mockElectronAPI, clearElectronMock } from "@/tests/helpers/utils/electronMocks";

describe("ElectronStorageProvider — real async IPC contract", () => {
  afterEach(() => {
    clearElectronMock();
    vi.restoreAllMocks();
  });

  it("getItem returns a string|null (never a Promise) on Electron", async () => {
    const store: Record<string, string> = {
      "basho_save_autosave": '{"version":"1.4.0"}',
      "basho_save_slot_1": '{"version":"1.4.0","x":1}',
    };
    const mocks = mockElectronAPI({ storageKeys: store });
    // Real preload contract: ipcRenderer.invoke returns a Promise for every op.
    mocks.storage.get.mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
    mocks.storage.set.mockImplementation((k: string, v: unknown) => {
      store[k] = String(v);
      return Promise.resolve();
    });
    mocks.storage.delete.mockImplementation((k: string) => {
      Reflect.deleteProperty(store, k);
      return Promise.resolve();
    });

    const provider = new ElectronStorageProvider();
    // Flush hydration (loadKeys -> storage.keys resolves with the whole store).
    await Promise.resolve();
    await Promise.resolve();

    const value = provider.getItem("basho_save_autosave");
    expect(value === null || typeof value === "string").toBe(true);
    expect(value).toBe('{"version":"1.4.0"}');
  });

  it("getItem returns null for missing keys — hasAutosave must not see a truthy Promise", async () => {
    const store: Record<string, string> = {};
    const mocks = mockElectronAPI({ storageKeys: store });
    mocks.storage.get.mockImplementation(() => Promise.resolve(null));

    const provider = new ElectronStorageProvider();
    await Promise.resolve();
    await Promise.resolve();

    expect(provider.getItem("basho_save_autosave")).toBeNull();
  });

  it("setItem makes the value synchronously readable (write-through cache)", async () => {
    const store: Record<string, string> = {};
    const mocks = mockElectronAPI({ storageKeys: store });
    mocks.storage.get.mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
    mocks.storage.set.mockImplementation((k: string, v: unknown) => {
      store[k] = String(v);
      return Promise.resolve();
    });

    const provider = new ElectronStorageProvider();
    await Promise.resolve();
    await Promise.resolve();

    provider.setItem("basho_save_slot_2", "data");
    expect(provider.getItem("basho_save_slot_2")).toBe("data");
  });

  it("removeItem makes the key unreadable synchronously", async () => {
    const store: Record<string, string> = { k1: "v1" };
    const mocks = mockElectronAPI({ storageKeys: store });
    mocks.storage.get.mockImplementation((k: string) => Promise.resolve(store[k] ?? null));
    mocks.storage.delete.mockImplementation((k: string) => {
      Reflect.deleteProperty(store, k);
      return Promise.resolve();
    });

    const provider = new ElectronStorageProvider();
    await Promise.resolve();
    await Promise.resolve();

    provider.removeItem("k1");
    expect(provider.getItem("k1")).toBeNull();
  });
});
