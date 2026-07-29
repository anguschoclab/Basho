import { vi, afterEach, beforeAll } from "vitest";
import { setSeed } from "../../engine/rng";
import { resetImpactTimestampCounter } from "../../engine/core/StateImpact";
import { BardEngine } from "../../engine/bard/BardEngine";

// Pre-warm BardEngine domains so resolve/has work synchronously in all tests.
beforeAll(async () => {
  await BardEngine.loadDomains();
});

// Guard for node environment where DOM APIs don't exist.
const hasDOM = typeof Element !== "undefined" && typeof HTMLElement !== "undefined";

let cleanup: (() => void) | undefined;
if (hasDOM) {
  try {
    cleanup = require("@testing-library/react").cleanup;
  } catch {
    cleanup = undefined;
  }
}

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
});
