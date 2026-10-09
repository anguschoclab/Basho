/// <reference types="vite/client" />

interface Window {
  __ELECTRON__?: boolean;
  __CSP_NONCE__?: string;
  __webpack_nonce__?: string;
  electronCustom?: {
    /** All methods resolve via ipcRenderer.invoke — every call is async. */
    storage: {
      get: (key: string) => Promise<unknown>;
      set: (key: string, value: unknown) => Promise<void>;
      delete: (key: string) => Promise<void>;
      clear: () => Promise<void>;
      keys: () => Promise<Record<string, unknown>>;
      size: () => Promise<number>;
    };
    window: {
      minimize: () => void;
      maximize: () => void;
      isMaximized: () => Promise<boolean>;
      close: () => void;
      hide: () => void;
      show: () => void;
    };
    dialog: {
      showSaveDialog: (
        options?: Electron.SaveDialogOptions
      ) => Promise<Electron.SaveDialogReturnValue>;
      showOpenDialog: (
        options?: Electron.OpenDialogOptions
      ) => Promise<Electron.OpenDialogReturnValue>;
    };
    app: {
      getVersion: () => string;
      getPlatform: () => string;
    };
    notification: {
      show: (options: { title: string; body: string }) => Promise<void>;
    };
    fs: {
      writeFile: (filePath: string, content: string) => Promise<boolean>;
      readFile: (filePath: string) => Promise<string | null>;
      exists: (filePath: string) => Promise<boolean>;
      mkdir: (dirPath: string, recursive?: boolean) => Promise<boolean>;
      readDir: (dirPath: string) => Promise<string[]>;
      deleteFile: (filePath: string) => Promise<boolean>;
    };
    appPath: {
      getPath: (name: string) => Promise<string>;
    };
    onMenuEvent: (callback: (event: string) => void) => () => void;
  };
}
