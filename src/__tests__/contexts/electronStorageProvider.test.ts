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
import {
  getStorageProvider,
  resetStorageProvider,
} from "@/engine/storageProvider";
import { mockElectronAPI, clearElectronMock } from "@/test/utils/electronMocks";

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

    beforeEach(() => {
      mocks = mockElectronAPI({ storageKeys: { save1: "data1", save2: "data2" } });
      provider = new ElectronStorageProvider();
    });

    it("delegates getItem to storage.get", () => {
      mocks.storage.get.mockReturnValue("stored-value");

      const result = provider.getItem("my-key");

      expect(mocks.storage.get).toHaveBeenCalledWith("my-key");
      expect(result).toBe("stored-value");
    });

    it("returns null from getItem when storage.get returns nullish", () => {
      mocks.storage.get.mockReturnValue(undefined);

      const result = provider.getItem("missing");

      expect(result).toBeNull();
    });

    it("delegates setItem to storage.set and reloads keys", async () => {
      mocks.storage.keys.mockResolvedValue({ newKey: "newValue" });

      provider.setItem("my-key", "my-value");

      expect(mocks.storage.set).toHaveBeenCalledWith("my-key", "my-value");
      // loadKeys is async; flush microtasks
      await Promise.resolve();
      expect(mocks.storage.keys).toHaveBeenCalled();
    });

    it("delegates removeItem to storage.delete and reloads keys", async () => {
      mocks.storage.keys.mockResolvedValue({});

      provider.removeItem("my-key");

      expect(mocks.storage.delete).toHaveBeenCalledWith("my-key");
      await Promise.resolve();
      expect(mocks.storage.keys).toHaveBeenCalled();
    });

    it("returns key from cached keys", async () => {
      // Force loadKeys to populate cache
      await Promise.resolve();

      expect(provider.key(0)).toBe("save1");
      expect(provider.key(1)).toBe("save2");
      expect(provider.key(99)).toBeNull();
    });

    it("returns cached keys length", async () => {
      await Promise.resolve();

      expect(provider.length).toBe(2);
    });

    it("keeps cachedKeys empty when storage.keys() throws during loadKeys", async () => {
      mocks.storage.keys.mockRejectedValue(new Error("Store failure"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Create a new provider to trigger loadKeys
      provider = new ElectronStorageProvider();
      await Promise.resolve();

      expect(provider.length).toBe(0);
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to load keys from electron-store:",
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

      expect(localStorageMock.getItem("test-key")).toBe("test-value");
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
  });

  describe("registerElectronStorage", () => {
    it("registers an ElectronStorageProvider instance", () => {
      mockElectronAPI();

      registerElectronStorage();

      const provider = getStorageProvider();
      expect(provider).toBeInstanceOf(ElectronStorageProvider);
    });

    it("does not throw when window is undefined", () => {
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
