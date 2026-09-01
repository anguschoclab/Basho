import { vi, afterEach, beforeAll } from "vitest";
import { cleanup as tlCleanup } from "@testing-library/react";
import { setSeed } from "../../engine/rng";
import { resetImpactTimestampCounter } from "../../engine/core/StateImpact";
import { BardEngine } from "../../engine/bard/BardEngine";

// Pre-warm BardEngine domains so resolve/has work synchronously in all tests.
beforeAll(async () => {
  await BardEngine.loadDomains();
});

// Guard for node environment where DOM APIs don't exist.
const hasDOM = typeof Element !== "undefined" && typeof HTMLElement !== "undefined";

const cleanup: (() => void) | undefined = hasDOM ? tlCleanup : undefined;

// jsdom does not implement pointer capture, but Radix Select relies on it.
beforeAll(() => {
  if (!hasDOM) return;
  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = () => {};
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = () => {};
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

// jsdom does not implement ResizeObserver, but recharts ResponsiveContainer relies on it.
beforeAll(() => {
  if (!hasDOM) return;
  if (typeof globalThis.ResizeObserver === "undefined") {
    globalThis.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  }
});

// Several storage/electron tests replace global window / navigator (some leave
// them undefined). Under the single-process runner that leaks into later files —
// e.g. routes.tsx's createBrowserHistory crashing on window.history, or react-dom
// reading navigator.userAgent at *import* time (before any hook runs). To make
// the suite order-independent we capture the pristine jsdom globals ONCE (stashed
// on globalThis so it survives vitest's per-file re-evaluation of this setup,
// taken while globals are still clean) and restore them both at setup eval —
// which runs before the test file's own imports — and after every test.
const BROWSER_GLOBALS = ["window", "document", "navigator", "history", "localStorage"] as const;

const g = globalThis as unknown as Record<string, unknown>;

// Node 26 declares a native `localStorage` global (lazy getter) that returns
// `undefined` unless `--localstorage-file` is passed. Its presence on globalThis
// makes vitest's `populateGlobal` skip copying jsdom's `window.localStorage`
// (because localStorage isn't in vitest's hardcoded LIVING_KEYS/OTHER_KEYS and
// `k in global` is true). The result: both `globalThis.localStorage` and
// `window.localStorage` are `undefined` under jsdom, breaking any test that calls
// `localStorage.clear()` / `getItem` / `setItem`. Install a spec-compliant
// in-memory polyfill once, before stashing pristine globals, so every test file
// sees a working localStorage.
function createInMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? (store.get(key) as string) : null;
    },
    key(index: number) {
      const keys = Array.from(store.keys());
      return index >= 0 && index < keys.length ? (keys[index] as string) : null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

function ensureLocalStorage(): Storage {
  const existing = g.localStorage;
  if (existing && typeof (existing as Storage).getItem === "function") {
    return existing as Storage;
  }
  const polyfill = createInMemoryLocalStorage();
  // Replace Node 26's native lazy getter (non-configurable at the global level
  // under some builds) with our polyfill. defineProperty first; fall back to
  // direct assignment if the descriptor rejects.
  try {
    Object.defineProperty(g, "localStorage", {
      value: polyfill,
      writable: true,
      configurable: true,
    });
  } catch {
    g.localStorage = polyfill;
  }
  // Also expose on window so code reading `window.localStorage` is consistent.
  const win = g.window as Record<string, unknown> | undefined;
  if (win && !win.localStorage) {
    try {
      Object.defineProperty(win, "localStorage", {
        value: polyfill,
        writable: true,
        configurable: true,
      });
    } catch {
      win.localStorage = polyfill;
    }
  }
  return polyfill;
}

ensureLocalStorage();

if (!g.__PRISTINE_BROWSER_GLOBALS__) {
  g.__PRISTINE_BROWSER_GLOBALS__ = {
    window: g.window,
    document: g.document,
    navigator: g.navigator,
    history: g.history,
    localStorage: g.localStorage,
  };
}
const PRISTINE = g.__PRISTINE_BROWSER_GLOBALS__ as Record<string, unknown>;

function restoreBrowserGlobals() {
  for (const key of BROWSER_GLOBALS) {
    const pristine = PRISTINE[key];
    if (pristine === undefined) continue;
    if (g[key] === pristine) continue;
    try {
      Object.defineProperty(g, key, { value: pristine, writable: true, configurable: true });
    } catch {
      try {
        g[key] = pristine;
      } catch {
        /* non-writable, non-configurable — nothing we can do */
      }
    }
  }
}

// Runs before the test file's modules (react-dom, routes.tsx) read these globals.
restoreBrowserGlobals();

// Reset all mocks and singleton state between tests to prevent state pollution
afterEach(() => {
  if (hasDOM && cleanup) cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setSeed("test-reset");
  resetImpactTimestampCounter();
  restoreBrowserGlobals();
  // Clear the in-memory localStorage polyfill between tests so persisted sort
  // state / tour-dismissal flags from one test don't leak into the next.
  const ls = g.localStorage as Storage | undefined;
  if (ls && typeof ls.clear === "function") ls.clear();
});
