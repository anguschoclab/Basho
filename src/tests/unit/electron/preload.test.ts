// @vitest-environment node

/**
 * Tests for electron/preload.ts API surface.
 * Verifies that the preload script exposes the complete window control API
 * (including isMaximized) via contextBridge.exposeInMainWorld.
 *
 * The electron module is mocked since contextBridge/ipcRenderer are not
 * available outside the Electron runtime.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const exposeInMainWorld = vi.fn();
const ipcRendererInvoke = vi.fn();

vi.mock("electron", () => ({
  contextBridge: { exposeInMainWorld },
  ipcRenderer: {
    invoke: ipcRendererInvoke,
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}));

describe("electron/preload.ts API surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("exposes electronCustom API via contextBridge", async () => {
    await import("../../../../electron/preload");
    expect(exposeInMainWorld).toHaveBeenCalledWith("electronCustom", expect.any(Object));
  });

  it("exposes __ELECTRON__ flag via contextBridge", async () => {
    await import("../../../../electron/preload");
    expect(exposeInMainWorld).toHaveBeenCalledWith("__ELECTRON__", true);
  });

  it("exposes window.isMaximized (G1 bug fix)", async () => {
    await import("../../../../electron/preload");
    const [, api] = exposeInMainWorld.mock.calls.find(([name]) => name === "electronCustom") ?? [];
    expect(api).toBeDefined();
    const windowApi = (api as { window: Record<string, unknown> }).window;
    expect(windowApi).toBeDefined();
    expect(typeof windowApi.isMaximized).toBe("function");
  });

  it("exposes all window control methods", async () => {
    await import("../../../../electron/preload");
    const [, api] = exposeInMainWorld.mock.calls.find(([name]) => name === "electronCustom") ?? [];
    const windowApi = (api as { window: Record<string, unknown> }).window;
    expect(typeof windowApi.minimize).toBe("function");
    expect(typeof windowApi.maximize).toBe("function");
    expect(typeof windowApi.isMaximized).toBe("function");
    expect(typeof windowApi.close).toBe("function");
    expect(typeof windowApi.hide).toBe("function");
    expect(typeof windowApi.show).toBe("function");
  });

  it("isMaximized invokes ipcRenderer with window:isMaximized channel", async () => {
    await import("../../../../electron/preload");
    const [, api] = exposeInMainWorld.mock.calls.find(([name]) => name === "electronCustom") ?? [];
    const windowApi = (api as { window: { isMaximized: () => void } }).window;
    ipcRendererInvoke.mockClear();
    windowApi.isMaximized();
    expect(ipcRendererInvoke).toHaveBeenCalledWith("window:isMaximized");
  });

  it("exposes onMenuEvent returning a cleanup function", async () => {
    await import("../../../../electron/preload");
    const [, api] = exposeInMainWorld.mock.calls.find(([name]) => name === "electronCustom") ?? [];
    const onMenuEvent = (api as { onMenuEvent: (cb: (e: string) => void) => () => void }).onMenuEvent;
    expect(typeof onMenuEvent).toBe("function");
    const cleanup = onMenuEvent(() => {});
    expect(typeof cleanup).toBe("function");
  });
});
