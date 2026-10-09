/**
 * electronStorageProvider.test.ts
 *
 * Tests for ElectronStorageProvider and registerElectronStorage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ElectronStorageProvider,
  registerElectronStorage,
} from "@/contexts/electronStorageProvider";
import { getStorageProvider, resetStorageProvider } from "@/engine/storageProvider";
import { mockElectronAPI, clearElectronMock } from "@/tests/helpers/utils/electronMocks";
import { logger } from "@/engine/utils/Logger";

// Mock localStorage for web-fallback tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

describe("ElectronStorageProvider", () => {
  beforeEach(() => {
    resetStorageProvider();
  });

  afterEach(() => {
    clearElectronMock();
    resetStorageProvider();
    vi.restoreAllMocks();
  });

  describe("Electron path", () => {
    let provider: ElectronStorageProvider;
    let mocks: ReturnType<typeof mockElectronAPI>;

    beforeEach(async () => {
      mocks = mockElectronAPI({ storageKeys: { save1: "data1", save2: "data2" } });
      provider = new ElectronStorageProvider();
      // Hydrate the synchronous read-through cache from storage.keys().
      await provider.ready;
    });

    it("serves getItem from the hydrated cache — never the async storage.get", () => {
      const result = provider.getItem("save1");

      expect(result).toBe("data1");
      // storage.get resolves via ipcRenderer.invoke — a Promise. A provider
      // that delegated getItem to it would return that Promise to callers.
      expect(mocks.storage.get).not.toHaveBeenCalled();
    });

    it("returns null from getItem for keys absent from the store", () => {
      expect(provider.getItem("missing")).toBeNull();
    });

    it("setItem writes through to storage.set and is synchronously readable", () => {
      provider.setItem("my-key", "my-value");

      expect(mocks.storage.set).toHaveBeenCalledWith("my-key", "my-value");
      expect(provider.getItem("my-key")).toBe("my-value");
      expect(provider.length).toBe(3);
      expect(provider.key(2)).toBe("my-key");
    });

    it("removeItem deletes from storage and the cache synchronously", () => {
      provider.removeItem("save1");

      expect(mocks.storage.delete).toHaveBeenCalledWith("save1");
      expect(provider.getItem("save1")).toBeNull();
      expect(provider.length).toBe(1);
      expect(provider.key(0)).toBe("save2");
    });

    it("returns key from cached keys", () => {
      expect(provider.key(0)).toBe("save1");
      expect(provider.key(1)).toBe("save2");
      expect(provider.key(99)).toBeNull();
    });

    it("returns cached keys length", () => {
      expect(provider.length).toBe(2);
    });

    it("starts empty and logs when hydration fails", async () => {
      mocks.storage.keys.mockRejectedValue(new Error("Store failure"));
      const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

      provider = new ElectronStorageProvider();
      await provider.ready;

      expect(provider.length).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to hydrate electron-store cache",
        "ElectronStorage",
        expect.any(Error)
      );
      errorSpy.mockRestore();
    });
  });

  describe("Web fallback path", () => {
    let provider: ElectronStorageProvider;

    beforeEach(() => {
      clearElectronMock();
      Object.defineProperty(global, "localStorage", {
        value: localStorageMock,
        writable: true,
        configurable: true,
      });
      localStorageMock.clear();
      provider = new ElectronStorageProvider();
    });

    afterEach(() => {
      Object.defineProperty(global, "localStorage", {
        value: undefined,
        writable: true,
        configurable: true,
      });
    });

    it("delegates getItem to localStorage.getItem", () => {
      localStorageMock.setItem("test-key", "test-value");

      const result = provider.getItem("test-key");

      expect(result).toBe("test-value");
    });

    it("delegates setItem to localStorage.setItem", () => {
      provider.setItem("test-key", "test-value");

      // Values are LZ-compressed to fit the localStorage quota; the
      // contract is a lossless round-trip through the provider.
      expect(provider.getItem("test-key")).toBe("test-value");
      expect(localStorageMock.getItem("test-key")).toMatch(/^lz16:/);
    });

    it("reads legacy uncompressed values unchanged", () => {
      localStorageMock.setItem("test-key", "plain-json-value");

      expect(provider.getItem("test-key")).toBe("plain-json-value");
    });

    it("delegates removeItem to localStorage.removeItem", () => {
      localStorageMock.setItem("test-key", "test-value");
      provider.removeItem("test-key");

      expect(localStorageMock.getItem("test-key")).toBeNull();
    });

    it("delegates key(index) to localStorage.key", () => {
      localStorageMock.setItem("a", "1");
      localStorageMock.setItem("b", "2");

      expect(provider.key(0)).toBe("a");
      expect(provider.key(1)).toBe("b");
    });

    it("delegates length to localStorage.length", () => {
      localStorageMock.setItem("a", "1");
      localStorageMock.setItem("b", "2");

      expect(provider.length).toBe(2);
    });

    describe("IDB write failure fallback", () => {
      // jsdom has no indexedDB — provide just enough of the API to put the
      // provider on the web/IDB branch, then swap in a failing database.
      function fakeTx(fail: boolean) {
        const tx: any = {
          error: fail ? new DOMException("quota", "QuotaExceededError") : null,
          oncomplete: null as (() => void) | null,
          onerror: null as (() => void) | null,
          onabort: null as (() => void) | null,
          objectStore: () => ({
            getAllKeys: () => ({ result: [] as string[] }),
            getAll: () => ({ result: [] as string[] }),
            put: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
          }),
        };
        queueMicrotask(() => (fail ? tx.onerror?.() : tx.oncomplete?.()));
        return tx;
      }
      const failingDb = { transaction: () => fakeTx(true) };
      const healthyDb = { transaction: () => fakeTx(false) };

      beforeEach(async () => {
        Object.defineProperty(global, "indexedDB", {
          value: {
            open: () => {
              const req: any = {
                result: healthyDb,
                onupgradeneeded: null,
                onsuccess: null,
                onerror: null,
              };
              queueMicrotask(() => req.onsuccess?.());
              return req;
            },
          },
          writable: true,
          configurable: true,
        });
        localStorageMock.clear();
        provider = new ElectronStorageProvider();
        await provider.ready;
        (provider as any).idb = failingDb;
      });

      it("persists a compressed localStorage copy when idbPut fails", async () => {
        const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

        provider.setItem("big-key", "big-value");
        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

        // In-memory cache still serves the read, and the compressed
        // fallback survives a reload even though IDB rejected the write.
        expect(provider.getItem("big-key")).toBe("big-value");
        expect(localStorageMock.getItem("big-key")).toMatch(/^lz16:/);
        expect(errorSpy).toHaveBeenCalledWith(
          expect.stringContaining("QuotaExceededError"),
          "ElectronStorage",
          undefined
        );
      });

      it("keeps serving reads when both IDB and localStorage fail", async () => {
        vi.spyOn(localStorageMock, "setItem").mockImplementation(() => {
          throw new DOMException("quota", "QuotaExceededError");
        });
        const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

        expect(() => provider.setItem("big-key", "big-value")).not.toThrow();
        await vi.waitFor(() => expect(errorSpy).toHaveBeenCalled());

        expect(provider.getItem("big-key")).toBe("big-value");
      });

      afterEach(() => {
        Object.defineProperty(global, "indexedDB", {
          value: undefined,
          writable: true,
          configurable: true,
        });
      });
    });
  });

  describe("registerElectronStorage", () => {
    it("registers an ElectronStorageProvider instance", () => {
      mockElectronAPI();

      registerElectronStorage();

      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(ElectronStorageProvider);
    });

    // Under vitest's vmThreads pool the window global is a non-configurable
    // getter (the jsdom window.window self-reference) and cannot be
    // undefined — run this case only where window is replaceable.
    const windowIsReplaceable = Boolean(
      Object.getOwnPropertyDescriptor(globalThis, "window")?.writable
    );
    it.skipIf(!windowIsReplaceable)("does not throw when window is undefined", () => {
      clearElectronMock();
      // Ensure window is truly undefined
      Object.defineProperty(global, "window", {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(() => registerElectronStorage()).not.toThrow();
      expect(getStorageProvider()).toBeNull();
    });
  });
});
