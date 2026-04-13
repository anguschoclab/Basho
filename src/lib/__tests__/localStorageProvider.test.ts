// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  writable: true,
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { localStorageProvider, STORAGE_KEYS } from "../localStorageProvider";

describe("localStorageProvider", () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("save", () => {
    it("should serialize and save data to localStorage", () => {
      const testData = { foo: "bar", num: 42 };

      localStorageProvider.save("test_key", testData);

      expect(localStorage.getItem("test_key")).toBe(JSON.stringify(testData));
    });

    it("should catch errors and log to console if save fails", () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const setItemSpy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
        throw new Error("Quota exceeded");
      });

      localStorageProvider.save("test_key", { data: "test" });

      expect(setItemSpy).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith("Failed to save to localStorage", expect.any(Error));

      setItemSpy.mockRestore();
    });
  });

  describe("load", () => {
    it("should load and deserialize data from localStorage", () => {
      const testData = { foo: "bar", num: 42 };
      localStorage.setItem("test_key", JSON.stringify(testData));

      const result = localStorageProvider.load("test_key", { default: true });

      expect(result).toEqual(testData);
    });

    it("should return defaultValue if item does not exist in localStorage", () => {
      const defaultValue = { default: true };

      const result = localStorageProvider.load("missing_key", defaultValue);

      expect(result).toBe(defaultValue);
    });

    it("should catch errors, log warning, and return defaultValue if load fails", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const getItemSpy = vi.spyOn(localStorage, "getItem").mockImplementation(() => {
        throw new Error("Access denied");
      });

      const defaultValue = { default: true };
      const result = localStorageProvider.load("test_key", defaultValue);

      expect(getItemSpy).toHaveBeenCalledWith("test_key");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load test_key from localStorage, using default.",
        expect.any(Error)
      );
      expect(result).toBe(defaultValue);

      getItemSpy.mockRestore();
    });

    it("should handle invalid JSON data gracefully using destr", () => {
      // Assuming destr handles invalid JSON by returning it as string or parsing whatever it can
      localStorage.setItem("test_key", "{ invalid json }");

      const result = localStorageProvider.load("test_key", { default: true });

      // destr parses '{ invalid json }' as a string if it's not valid JSON
      expect(result).toBe("{ invalid json }");
    });
  });

  describe("remove", () => {
    it("should remove item from localStorage", () => {
      localStorage.setItem("test_key", "some data");

      localStorageProvider.remove("test_key");

      expect(localStorage.getItem("test_key")).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all items from localStorage", () => {
      localStorage.setItem("test_key1", "data1");
      localStorage.setItem("test_key2", "data2");

      localStorageProvider.clear();

      expect(localStorage.getItem("test_key1")).toBeNull();
      expect(localStorage.getItem("test_key2")).toBeNull();
    });
  });

  describe("STORAGE_KEYS", () => {
    it("should define expected storage keys", () => {
      expect(STORAGE_KEYS).toHaveProperty("DASHBOARD_LAYOUT");
      expect(STORAGE_KEYS).toHaveProperty("WIDGET_CONFIG");
      expect(STORAGE_KEYS).toHaveProperty("UI_PREFERENCES");
    });
  });
});
