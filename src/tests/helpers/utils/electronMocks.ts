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

  // Every bridge call resolves via ipcRenderer.invoke — the mock must return
  // Promises like the real preload or it silently papers over the async
  // boundary (see audit WS5-01).
  const backing: Record<string, unknown> = { ...(opts?.storageKeys ?? {}) };
  const storageMock = {
    get: vi.fn((key: string) => Promise.resolve(backing[key] ?? null)),
    set: vi.fn((key: string, value: unknown) => {
      backing[key] = value;
      return Promise.resolve();
    }),
    delete: vi.fn((key: string) => {
      delete backing[key];
      return Promise.resolve();
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(backing)) delete backing[k];
      return Promise.resolve();
    }),
    keys: vi.fn(() => Promise.resolve({ ...backing })),
    size: vi.fn(() => Promise.resolve(Object.keys(backing).length)),
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
  const win = (global as typeof globalThis).window as unknown as
    Record<string, unknown> | undefined;
  if (win) {
    delete win.__ELECTRON__;
    delete win.electronCustom;
  }
}
