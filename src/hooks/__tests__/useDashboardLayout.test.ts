// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      store = Object.fromEntries(Object.entries(store).filter(([k]) => k !== key));
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

/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

import { loadSavedOrder } from "../useDashboardLayout";

describe("useDashboardLayout: loadSavedOrder", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("should return null when localStorage is empty", () => {
    expect(loadSavedOrder()).toBeNull();
  });

  it("should load saved layout from localStorage correctly", () => {
    const saved = [
      { id: "w2", column: 0, order: 0 },
      { id: "w1", column: 0, order: 1 },
    ];
    localStorage.setItem("dashboard-widget-order", JSON.stringify(saved));

    const loaded = loadSavedOrder();
    expect(loaded).toEqual(saved);
  });

  it("should handle corrupted JSON in localStorage gracefully", () => {
    localStorage.setItem("dashboard-widget-order", "invalid-json{");
    expect(loadSavedOrder()).toBeNull();
  });

  it("should handle malicious/invalid data structure in localStorage", () => {
    // Missing required fields or wrong types
    const malicious = [
      { id: "w1", order: "0" }, // order should be number
      { id: 123, order: 1 }, // id should be string
      { id: "w3", order: 2 }, // unknown id (not handled here but types checked)
      { something: "else" },
    ];
    localStorage.setItem("dashboard-widget-order", JSON.stringify(malicious));

    expect(loadSavedOrder()).toBeNull();
  });

  it("should handle partially correct but malicious array elements", () => {
    const partiallyInvalid = [
      { id: "w1", order: 1, column: 0 },
      { order: 2, column: 0 }, // Missing id
    ];
    localStorage.setItem("dashboard-widget-order", JSON.stringify(partiallyInvalid));
    expect(loadSavedOrder()).toBeNull();
  });

  it("should handle prototype pollution attempts via destr", () => {
    const malicious = '[{"id": "w1", "order": 0, "__proto__": {"polluted": true}}]';
    localStorage.setItem("dashboard-widget-order", malicious);

    loadSavedOrder();
    expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
  });
});
