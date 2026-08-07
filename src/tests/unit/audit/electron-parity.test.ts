/**
 * Phase 4c: Electron/PWA parity regression tests.
 *
 * Proves that electron/main.ts exposes storage IPC handlers matching
 * the web storage provider API, and that hash routing is available
 * for Electron file:// production mode.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");
const ELECTRON = join(ROOT, "electron");

function readSrc(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

function readElectron(rel: string): string {
  const abs = join(ELECTRON, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

describe("Electron — storage IPC handlers", () => {
  const main = readElectron("main.ts");

  it("handles storage:get", () => {
    expect(main).toContain('ipcMain.handle("storage:get"');
  });

  it("handles storage:set", () => {
    expect(main).toContain('ipcMain.handle("storage:set"');
  });

  it("handles storage:delete", () => {
    expect(main).toContain('ipcMain.handle("storage:delete"');
  });

  it("handles storage:clear", () => {
    expect(main).toContain('ipcMain.handle("storage:clear"');
  });

  it("handles storage:keys", () => {
    expect(main).toContain('ipcMain.handle("storage:keys"');
  });

  it("handles storage:size", () => {
    expect(main).toContain('ipcMain.handle("storage:size"');
  });
});

describe("Electron — window control IPC handlers", () => {
  const main = readElectron("main.ts");

  it("handles window:minimize", () => {
    expect(main).toContain('ipcMain.handle("window:minimize"');
  });

  it("handles window:maximize", () => {
    expect(main).toContain('ipcMain.handle("window:maximize"');
  });

  it("handles window:close", () => {
    expect(main).toContain('ipcMain.handle("window:close"');
  });
});

describe("Electron — file system IPC handlers", () => {
  const main = readElectron("main.ts");

  it("handles fs:writeFile", () => {
    expect(main).toContain('ipcMain.handle("fs:writeFile"');
  });

  it("handles fs:readFile", () => {
    expect(main).toContain('ipcMain.handle("fs:readFile"');
  });

  it("handles fs:exists", () => {
    expect(main).toContain('ipcMain.handle("fs:exists"');
  });

  it("handles fs:mkdir", () => {
    expect(main).toContain('ipcMain.handle("fs:mkdir"');
  });

  it("handles fs:readDir", () => {
    expect(main).toContain('ipcMain.handle("fs:readDir"');
  });

  it("handles fs:deleteFile", () => {
    expect(main).toContain('ipcMain.handle("fs:deleteFile"');
  });
});

describe("Electron — dialog and app info IPC handlers", () => {
  const main = readElectron("main.ts");

  it("handles dialog:showSaveDialog", () => {
    expect(main).toContain('ipcMain.handle("dialog:showSaveDialog"');
  });

  it("handles dialog:showOpenDialog", () => {
    expect(main).toContain('ipcMain.handle("dialog:showOpenDialog"');
  });

  it("handles app:getVersion", () => {
    expect(main).toContain('ipcMain.handle("app:getVersion"');
  });

  it("handles app:getPlatform", () => {
    expect(main).toContain('ipcMain.handle("app:getPlatform"');
  });

  it("handles app:getPath", () => {
    expect(main).toContain('ipcMain.handle("app:getPath"');
  });
});

describe("Electron — security validation", () => {
  const main = readElectron("main.ts");

  it("validates storage keys", () => {
    expect(main).toContain("isValidStorageKey");
  });

  it("validates file paths", () => {
    expect(main).toContain("validatePath");
  });
});

describe("Routes — Electron/PWA history parity", () => {
  const routes = readSrc("routes.tsx");

  it("detects Electron production mode via __ELECTRON__ flag", () => {
    expect(routes).toContain("__ELECTRON__");
  });

  it("uses createHashHistory for Electron production", () => {
    expect(routes).toContain("createHashHistory");
  });

  it("uses createBrowserHistory for PWA/browser", () => {
    expect(routes).toContain("createBrowserHistory");
  });

  it("redirects root to dashboard in Electron production", () => {
    expect(routes).toContain("#/dashboard");
  });
});

describe("SaveSlotService — storage provider abstraction", () => {
  const svc = readSrc("engine/persistence/SaveSlotService.ts");

  it("exports getStorage method", () => {
    expect(svc).toContain("getStorage");
  });

  it("exports getAutosaveKey method", () => {
    expect(svc).toContain("getAutosaveKey");
  });
});
