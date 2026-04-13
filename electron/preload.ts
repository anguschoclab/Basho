import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

// Custom API for Electron-specific functionality
const electronCustomAPI = {
  // Storage operations using electron-store
  storage: {
    get: (key: string) => ipcRenderer.invoke("storage:get", key),
    set: (key: string, value: any) => ipcRenderer.invoke("storage:set", key, value),
    delete: (key: string) => ipcRenderer.invoke("storage:delete", key),
    clear: () => ipcRenderer.invoke("storage:clear"),
    keys: () => ipcRenderer.invoke("storage:keys"),
    size: () => ipcRenderer.invoke("storage:size"),
  },

  // Window control operations
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
    hide: () => ipcRenderer.invoke("window:hide"),
    show: () => ipcRenderer.invoke("window:show"),
  },

  // File dialog operations
  dialog: {
    showSaveDialog: (options?: Electron.SaveDialogOptions) =>
      ipcRenderer.invoke("dialog:showSaveDialog", options),
    showOpenDialog: (options?: Electron.OpenDialogOptions) =>
      ipcRenderer.invoke("dialog:showOpenDialog", options),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    getPlatform: () => ipcRenderer.invoke("app:getPlatform"),
  },

  // Native notifications
  notification: {
    show: (options: { title: string; body: string }) =>
      ipcRenderer.invoke("notification:show", options),
  },

  // File system operations
  fs: {
    writeFile: (filePath: string, content: string) =>
      ipcRenderer.invoke("fs:writeFile", filePath, content),
    readFile: (filePath: string) => ipcRenderer.invoke("fs:readFile", filePath),
    exists: (filePath: string) => ipcRenderer.invoke("fs:exists", filePath),
    mkdir: (dirPath: string, recursive?: boolean) =>
      ipcRenderer.invoke("fs:mkdir", dirPath, recursive),
    readDir: (dirPath: string) => ipcRenderer.invoke("fs:readDir", dirPath),
    deleteFile: (filePath: string) => ipcRenderer.invoke("fs:deleteFile", filePath),
  },

  // App paths
  appPath: {
    getPath: (name: string) => ipcRenderer.invoke("app:getPath", name),
  },

  // Menu event listeners
  onMenuEvent: (callback: (event: string) => void) => {
    const events = ["menu:new-game", "menu:save-game", "menu:load-game", "menu:about"];
    events.forEach((event) => {
      ipcRenderer.on(event, () => callback(event));
    });
  },
};

contextBridge.exposeInMainWorld("electron", electronAPI);
contextBridge.exposeInMainWorld("electronCustom", electronCustomAPI);
// Signals to the renderer that it is running inside Electron.
// Used in src/routes.tsx to activate hash routing when loading from file://.
contextBridge.exposeInMainWorld("__ELECTRON__", true);
