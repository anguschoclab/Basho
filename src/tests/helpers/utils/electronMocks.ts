import { vi } from "vitest";

export function mockElectronAPI(opts?: {
  appPath?: string;
  storageKeys?: Record<string, unknown>;
}) {
  const fsMock = {
    writeFile: vi.fn().mockResolvedValue(true),
    readFile: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(false),
    mkdir: vi.fn().mockResolvedValue(true),
    readDir: vi.fn().mockResolvedValue([]),
    deleteFile: vi.fn().mockResolvedValue(true),
  };

  const appPathMock = {
    getPath: vi.fn().mockResolvedValue(opts?.appPath ?? "/fake/userData"),
  };

  const storageMock = {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn().mockReturnValue(undefined),
    delete: vi.fn().mockReturnValue(undefined),
    clear: vi.fn().mockReturnValue(undefined),
    keys: vi.fn().mockResolvedValue(opts?.storageKeys ?? {}),
    size: vi.fn().mockReturnValue(0),
  };

  const win = globalThis as unknown as Record<string, unknown>;
  win.__ELECTRON__ = true;
  const electronCustom = {
    fs: fsMock,
    appPath: appPathMock,
    storage: storageMock,
    get: vi.fn().mockReturnValue(null),
    set: vi.fn().mockReturnValue(undefined),
    delete: vi.fn().mockReturnValue(undefined),
  };
  win.electronCustom = electronCustom;
  return { fs: fsMock, appPath: appPathMock, storage: storageMock, electronCustom };
}

export function clearElectronMock() {
  const win = (global as typeof globalThis).window as unknown as Record<string, unknown> | undefined;
  if (win) {
    delete win.__ELECTRON__;
    delete win.electronCustom;
  }
}
