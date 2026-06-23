/// <reference types="vite/client" />

interface Window {
  __ELECTRON__?: boolean;
  electronCustom?: {
    storage: {
      get: (key: string) => unknown;
      set: (key: string, value: unknown) => void;
      delete: (key: string) => void;
      clear: () => void;
      keys: () => Promise<Record<string, unknown>>;
      size: () => number;
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
