/**
 * localStorageProvider.test.ts
 *
 * Tests for the IStorageProvider-compliant LocalStorageProvider in src/contexts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  LocalStorageProvider,
  registerLocalStorage,
} from "@/contexts/localStorageProvider";
import {
  getStorageProvider,
  resetStorageProvider,
} from "@/engine/storageProvider";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
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

describe("LocalStorageProvider (contexts)", () => {
  let provider: LocalStorageProvider;

  beforeEach(() => {
    resetStorageProvider();
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });
    localStorageMock.clear();
    provider = new LocalStorageProvider();
  });

  afterEach(() => {
    resetStorageProvider();
    vi.restoreAllMocks();
  });

  it("delegates getItem to localStorage.getItem", () => {
    localStorageMock.setItem("foo", "bar");
    expect(provider.getItem("foo")).toBe("bar");
    expect(provider.getItem("missing")).toBeNull();
  });

  it("delegates setItem to localStorage.setItem", () => {
    provider.setItem("foo", "bar");
    expect(localStorageMock.getItem("foo")).toBe("bar");
  });

  it("delegates removeItem to localStorage.removeItem", () => {
    localStorageMock.setItem("foo", "bar");
    provider.removeItem("foo");
    expect(localStorageMock.getItem("foo")).toBeNull();
  });

  it("delegates key(index) to localStorage.key", () => {
    localStorageMock.setItem("a", "1");
    localStorageMock.setItem("b", "2");
    expect(provider.key(0)).toBe("a");
    expect(provider.key(1)).toBe("b");
    expect(provider.key(99)).toBeNull();
  });

  it("delegates length to localStorage.length", () => {
    expect(provider.length).toBe(0);
    localStorageMock.setItem("a", "1");
    expect(provider.length).toBe(1);
  });
});

describe("registerLocalStorage", () => {
  beforeEach(() => {
    resetStorageProvider();
  });

  afterEach(() => {
    resetStorageProvider();
  });

  it("registers a LocalStorageProvider instance", () => {
    Object.defineProperty(global, "localStorage", {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    registerLocalStorage();

    expect(getStorageProvider()).toBeInstanceOf(LocalStorageProvider);
  });

  it("does nothing when localStorage is undefined", () => {
    Object.defineProperty(global, "localStorage", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    registerLocalStorage();

    expect(getStorageProvider()).toBeNull();
  });
});
