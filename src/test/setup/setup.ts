import { vi, afterEach } from "vitest";
import { setSeed } from "../../engine/rng";
import { resetImpactTimestampCounter } from "../../engine/core/StateImpact";

// Several storage/electron tests replace global window / navigator (some leave
// them undefined). Under the single-process runner that leaks into later files —
// e.g. routes.tsx's createBrowserHistory crashing on window.history, or react-dom
// reading navigator.userAgent at *import* time (before any hook runs). To make
// the suite order-independent we capture the pristine jsdom globals ONCE (stashed
// on globalThis so it survives vitest's per-file re-evaluation of this setup,
// taken while globals are still clean) and restore them both at setup eval —
// which runs before the test file's own imports — and after every test.
const BROWSER_GLOBALS = ["window", "navigator", "history"] as const;

const g = globalThis as unknown as Record<string, unknown>;
if (!g.__PRISTINE_BROWSER_GLOBALS__) {
  g.__PRISTINE_BROWSER_GLOBALS__ = {
    window: g.window,
    navigator: g.navigator,
    history: g.history,
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
  vi.clearAllMocks();
  vi.restoreAllMocks();
  setSeed("test-reset");
  resetImpactTimestampCounter();
  restoreBrowserGlobals();
});
