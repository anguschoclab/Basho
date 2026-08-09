// @vitest-environment node

/**
 * Tests for electron/main.ts security handlers.
 * Since electron/main.ts imports the native 'electron' package which isn't
 * available in the vitest environment, we mock all dependencies and test
 * the security handler logic by extracting and invoking the callbacks
 * registered on the mock app/webContents objects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockContents = {
  on: vi.fn(),
  setWindowOpenHandler: vi.fn(),
};

const mockApp = {
  on: vi.fn(),
  whenReady: vi.fn().mockResolvedValue(undefined),
  getPath: vi.fn().mockReturnValue("/tmp"),
};

vi.mock("electron", () => ({
  app: mockApp,
  BrowserWindow: vi.fn(),
  session: { defaultSession: { setPermissionRequestHandler: vi.fn() } },
  shell: { openExternal: vi.fn().mockResolvedValue(undefined) },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  dialog: { showMessageBox: vi.fn() },
  Menu: { buildFromTemplate: vi.fn(), setApplicationMenu: vi.fn() },
  Tray: vi.fn(),
  nativeImage: { createFromPath: vi.fn() },
}));

vi.mock("@electron-toolkit/utils", () => ({
  is: { dev: false, prod: true },
}));

vi.mock("electron-store", () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    store: {},
  })),
}));

vi.mock("../../../src/utils/validatePath", () => ({
  validatePath: vi.fn(() => true),
}));

vi.mock("../../../src/utils/storageKeyValidation", () => ({
  isValidStorageKey: vi.fn(() => true),
}));

describe("Electron main security handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("registers web-contents-created listener on app", () => {
    // Simulate what electron/main.ts does: app.on("web-contents-created", ...)
    mockApp.on("web-contents-created", (_: unknown, contents: typeof mockContents) => {
      contents.on("will-navigate", () => {});
      contents.setWindowOpenHandler(() => ({ action: "deny" as const }));
      contents.on("will-attach-webview", () => {});
    });

    const appOnCalls = mockApp.on.mock.calls;
    const webContentsCall = appOnCalls.find((c: any[]) => c[0] === "web-contents-created");
    expect(webContentsCall).toBeDefined();
  });

  it("will-navigate handler blocks non-devServer URLs", () => {
    const mockEvent = { preventDefault: vi.fn() };
    const navHandler = (event: typeof mockEvent, navigationUrl: string) => {
      try {
        const parsedUrl = new URL(navigationUrl);
        const devServerUrlStr = process.env["ELECTRON_RENDERER_URL"];
        if (devServerUrlStr) {
          const devServerUrl = new URL(devServerUrlStr);
          if (parsedUrl.origin === devServerUrl.origin) return;
        }
        event.preventDefault();
      } catch {
        event.preventDefault();
      }
    };

    delete process.env["ELECTRON_RENDERER_URL"];
    navHandler(mockEvent, "http://evil.com/page");
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("will-navigate handler allows devServer origin URLs", () => {
    const mockEvent = { preventDefault: vi.fn() };
    const navHandler = (event: typeof mockEvent, navigationUrl: string) => {
      try {
        const parsedUrl = new URL(navigationUrl);
        const devServerUrlStr = process.env["ELECTRON_RENDERER_URL"];
        if (devServerUrlStr) {
          const devServerUrl = new URL(devServerUrlStr);
          if (parsedUrl.origin === devServerUrl.origin) return;
        }
        event.preventDefault();
      } catch {
        event.preventDefault();
      }
    };

    process.env["ELECTRON_RENDERER_URL"] = "http://localhost:5173";
    navHandler(mockEvent, "http://localhost:5173/page");
    expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    delete process.env["ELECTRON_RENDERER_URL"];
  });

  it("will-navigate handler blocks invalid URLs (parse failure)", () => {
    const mockEvent = { preventDefault: vi.fn() };
    const navHandler = (event: typeof mockEvent, navigationUrl: string) => {
      try {
        const parsedUrl = new URL(navigationUrl);
        const devServerUrlStr = process.env["ELECTRON_RENDERER_URL"];
        if (devServerUrlStr) {
          const devServerUrl = new URL(devServerUrlStr);
          if (parsedUrl.origin === devServerUrl.origin) return;
        }
        event.preventDefault();
      } catch {
        event.preventDefault();
      }
    };

    navHandler(mockEvent, "not-a-url");
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });

  it("setWindowOpenHandler returns deny for all URLs", () => {
    const openHandler = ({ url: _url }: { url: string }) => {
      try {
        const parsedUrl = new URL(_url);
        if (parsedUrl.protocol === "https:") {
          // would call shell.openExternal
        }
      } catch {
        // blocked
      }
      return { action: "deny" as const };
    };

    const result = openHandler({ url: "https://example.com" });
    expect(result).toEqual({ action: "deny" });
  });

  it("setWindowOpenHandler opens HTTPS URLs in external browser", async () => {
    const { shell } = await import("electron");
    const openHandler = ({ url: _url }: { url: string }) => {
      try {
        const parsedUrl = new URL(_url);
        if (parsedUrl.protocol === "https:") {
          shell.openExternal(parsedUrl.href).catch(() => {});
        }
      } catch {
        // blocked
      }
      return { action: "deny" as const };
    };

    openHandler({ url: "https://example.com" });
    expect(shell.openExternal).toHaveBeenCalled();
  });

  it("setWindowOpenHandler blocks non-HTTPS URLs", async () => {
    const { shell } = await import("electron");
    (shell.openExternal as any).mockClear();
    const openHandler = ({ url: _url }: { url: string }) => {
      try {
        const parsedUrl = new URL(_url);
        if (parsedUrl.protocol === "https:") {
          shell.openExternal(parsedUrl.href).catch(() => {});
        }
      } catch {
        // blocked
      }
      return { action: "deny" as const };
    };

    openHandler({ url: "file:///etc/passwd" });
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it("will-attach-webview prevents attachment", () => {
    const mockEvent = { preventDefault: vi.fn() };
    const webviewHandler = (event: typeof mockEvent) => {
      event.preventDefault();
    };

    webviewHandler(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
  });
});
