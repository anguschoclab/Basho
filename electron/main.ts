import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  Menu,
  Tray,
  nativeImage,
  net,
  protocol,
  session,
} from "electron";
import path, { join } from "path";
import { randomBytes, createHash } from "crypto";
import { is } from "@electron-toolkit/utils";
import { promises as fs } from "fs";
import { validatePath as validatePathImpl } from "../src/utils/validatePath";
import { isValidStorageKey } from "../src/utils/storageKeyValidation";
import { logger } from "./logger";

// Initialize electron-store for configuration persistence
// Using dynamic import to handle ESM/CommonJS compatibility
type StoreType = {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => void;
  delete: (key: string) => void;
  clear: () => void;
  store: Record<string, unknown>;
};

let store: StoreType;

async function initStore() {
  const module = await import("electron-store");
  const StoreConstructor = module.default as new (...args: unknown[]) => StoreType;
  store = new StoreConstructor();
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

/**
 * sonner injects its stylesheet as an inline <style> at module load and has no
 * nonce support, so the strict style-src policy must whitelist that exact block
 * by hash. The injected CSS lives in the installed package, so we read it from
 * node_modules at startup (in packaged builds this resolves inside the asar).
 * If it can't be read the source is simply omitted — sonner stays styled via
 * the bundled styles.css import in src/main.tsx.
 */
async function sonnerStyleHashes(): Promise<string> {
  try {
    const dist = await fs.readFile(
      join(app.getAppPath(), "node_modules/sonner/dist/index.mjs"),
      "utf-8"
    );
    return [...dist.matchAll(/__insertCSS\("((?:[^"\\]|\\.)*)"\)/g)]
      .map(
        (m) =>
          ` 'sha256-${createHash("sha256")
            .update(JSON.parse(`"${m[1]}"`))
            .digest("base64")}'`
      )
      .join("");
  } catch {
    return "";
  }
}

/**
 * Build the Content-Security-Policy for the renderer. The same policy applies
 * in dev (HTTP response header via onHeadersReceived) and production (injected
 * into file:// HTML responses via protocol.handle) — the only difference is
 * that dev needs ws: in connect-src for the Vite HMR websocket.
 */
function buildCsp(cspNonce: string, styleHashes: string, dev: boolean): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    `style-src 'self' 'nonce-${cspNonce}'${styleHashes} https://fonts.googleapis.com`,
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'none'",
  ].join("; ");
}

async function createWindow(): Promise<void> {
  await initStore();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    frame: false, // Frameless window for custom title bar
    titleBarStyle: "hidden", // Hide default title bar
    webPreferences: {
      preload: join(__dirname, "../preload/preload.mjs"),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      navigateOnDragDrop: false,
      webviewTag: false,
      disableBlinkFeatures: "Auxclick",
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  // Security: Global navigation and window creation handled via app.on("web-contents-created")

  // Restore window state from electron-store
  const defaultWindowState = {
    x: undefined,
    y: undefined,
    width: 1280,
    height: 800,
  };
  const rawWindowState = store.get("windowState");

  // Defensively validate windowState since it's sourced from IPC-accessible storage
  const windowState =
    typeof rawWindowState === "object" && rawWindowState !== null && !Array.isArray(rawWindowState)
      ? {
          x: Number.isFinite((rawWindowState as Record<string, unknown>).x)
            ? ((rawWindowState as Record<string, unknown>).x as number)
            : undefined,
          y: Number.isFinite((rawWindowState as Record<string, unknown>).y)
            ? ((rawWindowState as Record<string, unknown>).y as number)
            : undefined,
          width: Number.isFinite((rawWindowState as Record<string, unknown>).width)
            ? ((rawWindowState as Record<string, unknown>).width as number)
            : defaultWindowState.width,
          height: Number.isFinite((rawWindowState as Record<string, unknown>).height)
            ? ((rawWindowState as Record<string, unknown>).height as number)
            : defaultWindowState.height,
        }
      : defaultWindowState;

  if (windowState.x !== undefined && windowState.y !== undefined) {
    mainWindow.setPosition(windowState.x, windowState.y);
  }
  mainWindow.setSize(windowState.width, windowState.height);

  // Save window state on close
  mainWindow.on("close", (e) => {
    if (process.platform === "darwin") {
      // On macOS, hide to tray instead of closing
      if (!mainWindow?.isFullScreen()) {
        e.preventDefault();
        mainWindow?.hide();
      }
    }
    const bounds = mainWindow?.getBounds();
    if (!bounds) return;
    store.set("windowState", {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    });
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    // Dev: load from Vite dev server (HTTP origin) — browser history works, HMR enabled
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    // Prod: load from file:// — renderer uses hash routing (#/dashboard)
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function createTray(): void {
  // Create tray icon (using a simple colored square as placeholder)
  const iconPath = path.join(__dirname, "../../resources/icon.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show Window",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "New Game",
      click: () => {
        mainWindow?.webContents.send("menu:new-game");
        mainWindow?.show();
      },
    },
    {
      label: "Load Game",
      click: () => {
        mainWindow?.webContents.send("menu:load-game");
        mainWindow?.show();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Basho");
  tray.setContextMenu(contextMenu);

  // Show window on tray icon click
  tray.on("click", () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          label: "New Game",
          accelerator: "CmdOrCtrl+N",
          click: () => {
            mainWindow?.webContents.send("menu:new-game");
          },
        },
        {
          label: "Save Game",
          accelerator: "CmdOrCtrl+S",
          click: () => {
            mainWindow?.webContents.send("menu:save-game");
          },
        },
        {
          label: "Load Game",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            mainWindow?.webContents.send("menu:load-game");
          },
        },
        { type: "separator" },
        {
          label: process.platform === "darwin" ? "Quit Basho" : "Exit",
          accelerator: process.platform === "darwin" ? "Cmd+Q" : "Ctrl+Q",
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo", accelerator: "CmdOrCtrl+Z" },
        { role: "redo", accelerator: "CmdOrCtrl+Shift+Z" },
        { type: "separator" },
        { role: "cut", accelerator: "CmdOrCtrl+X" },
        { role: "copy", accelerator: "CmdOrCtrl+C" },
        { role: "paste", accelerator: "CmdOrCtrl+V" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload", accelerator: "CmdOrCtrl+R" },
        { role: "forceReload", accelerator: "CmdOrCtrl+Shift+R" },
        { role: "toggleDevTools", accelerator: "CmdOrCtrl+Shift+I" },
        { type: "separator" },
        { role: "resetZoom", accelerator: "CmdOrCtrl+0" },
        { role: "zoomIn", accelerator: "CmdOrCtrl+Plus" },
        { role: "zoomOut", accelerator: "CmdOrCtrl+-" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "About",
          click: () => {
            mainWindow?.webContents.send("menu:about");
          },
        },
      ],
    },
  ];

  // Mac-specific app menu
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", accelerator: "Cmd+H" },
        { role: "hideOthers", accelerator: "Cmd+Shift+H" },
        { role: "unhide", accelerator: "Cmd+U" },
        { type: "separator" },
        { role: "quit", accelerator: "Cmd+Q" },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers for storage operations
ipcMain.handle("storage:get", (event, key: string) => {
  if (!isValidStorageKey(key)) throw new TypeError("Invalid storage key");
  return store.get(key);
});

ipcMain.handle("storage:set", (event, key: string, value: unknown) => {
  if (!isValidStorageKey(key)) throw new TypeError("Invalid storage key");
  store.set(key, value);
  return true;
});

ipcMain.handle("storage:delete", (event, key: string) => {
  if (!isValidStorageKey(key)) throw new TypeError("Invalid storage key");
  store.delete(key);
  return true;
});

ipcMain.handle("storage:clear", () => {
  store.clear();
  return true;
});

ipcMain.handle("storage:keys", () => {
  return store.store;
});

ipcMain.handle("storage:size", () => {
  return Object.keys(store.store).length;
});

// IPC Handlers for window controls
ipcMain.handle("window:minimize", () => {
  mainWindow?.minimize();
});

ipcMain.handle("window:hide", () => {
  mainWindow?.hide();
});

ipcMain.handle("window:show", () => {
  mainWindow?.show();
  mainWindow?.focus();
});

ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.handle("window:isMaximized", () => {
  return mainWindow?.isMaximized() || false;
});

ipcMain.handle("window:close", () => {
  mainWindow?.close();
});

// IPC Handlers for file dialogs
ipcMain.handle("dialog:showSaveDialog", async (event, options?: Electron.SaveDialogOptions) => {
  if (
    options !== undefined &&
    options !== null &&
    (typeof options !== "object" || Array.isArray(options))
  ) {
    throw new TypeError("Invalid options type for save dialog");
  }
  if (!mainWindow) return { canceled: true, filePath: "" };
  const result = await dialog.showSaveDialog(mainWindow, options || {});
  return result;
});

ipcMain.handle("dialog:showOpenDialog", async (event, options?: Electron.OpenDialogOptions) => {
  if (
    options !== undefined &&
    options !== null &&
    (typeof options !== "object" || Array.isArray(options))
  ) {
    throw new TypeError("Invalid options type for open dialog");
  }
  if (!mainWindow) return { canceled: true, filePaths: [] };
  const result = await dialog.showOpenDialog(mainWindow, options || {});
  return result;
});

// IPC Handlers for app info
ipcMain.handle("app:getVersion", () => {
  return app.getVersion();
});

ipcMain.handle("app:getPlatform", () => {
  return process.platform;
});

// IPC Handlers for native notifications
ipcMain.handle("notification:show", async (event, options: { title: string; body: string }) => {
  if (typeof options !== "object" || options === null || Array.isArray(options)) {
    throw new TypeError("Invalid options type for notification");
  }
  if (typeof options.title !== "string" || typeof options.body !== "string") {
    throw new TypeError("Invalid notification properties");
  }
  const { Notification } = await import("electron");
  if (Notification.isSupported()) {
    new Notification({
      title: options.title,
      body: options.body,
    }).show();
  }
  return true;
});

// Path validation - restrict file system operations to the archives subdirectory
// to prevent path traversal vulnerabilities against peer config files in userData.
const allowedBaseDir = path.join(app.getPath("userData"), "archives");

function validatePath(filePath: string): boolean {
  return validatePathImpl(filePath, allowedBaseDir);
}

// IPC Handlers for file system operations
ipcMain.handle("fs:writeFile", async (event, filePath: string, content: string) => {
  if (typeof filePath !== "string" || typeof content !== "string") {
    logger.error("Path and content must be strings");
    return false;
  }
  if (!validatePath(filePath)) {
    logger.error("Path validation failed - not in allowed directory:", filePath);
    return false;
  }
  try {
    await fs.writeFile(filePath, content, "utf-8");
    return true;
  } catch (error) {
    logger.error("Failed to write file:", error);
    return false;
  }
});

ipcMain.handle("fs:readFile", async (event, filePath: string) => {
  if (typeof filePath !== "string") {
    logger.error("Path must be a string");
    return null;
  }
  if (!validatePath(filePath)) {
    logger.error("Path validation failed - not in allowed directory:", filePath);
    return null;
  }
  try {
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    logger.error("Failed to read file:", error);
    return null;
  }
});

ipcMain.handle("fs:exists", async (event, filePath: string) => {
  if (typeof filePath !== "string") {
    logger.error("Path must be a string");
    return false;
  }
  if (!validatePath(filePath)) {
    logger.error("Path validation failed - not in allowed directory:", filePath);
    return false;
  }
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle("fs:mkdir", async (event, dirPath: string, recursive: boolean = true) => {
  if (typeof dirPath !== "string" || typeof recursive !== "boolean") {
    logger.error("Invalid arguments for mkdir");
    return false;
  }
  if (!validatePath(dirPath)) {
    logger.error("Path validation failed - not in allowed directory:", dirPath);
    return false;
  }
  try {
    await fs.mkdir(dirPath, { recursive });
    return true;
  } catch (error) {
    logger.error("Failed to create directory:", error);
    return false;
  }
});

ipcMain.handle("fs:readDir", async (event, dirPath: string) => {
  if (typeof dirPath !== "string") {
    logger.error("Path must be a string");
    return [];
  }
  if (!validatePath(dirPath)) {
    logger.error("Path validation failed - not in allowed directory:", dirPath);
    return [];
  }
  try {
    const files = await fs.readdir(dirPath);
    return files;
  } catch (error) {
    logger.error("Failed to read directory:", error);
    return [];
  }
});

ipcMain.handle("fs:deleteFile", async (event, filePath: string) => {
  if (typeof filePath !== "string") {
    logger.error("Path must be a string");
    return false;
  }
  if (!validatePath(filePath)) {
    logger.error("Path validation failed - not in allowed directory:", filePath);
    return false;
  }
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error) {
    logger.error("Failed to delete file:", error);
    return false;
  }
});

// Allowed paths for app:getPath IPC handler runtime validation
const ALLOWED_PATHS = [
  "home",
  "appData",
  "userData",
  "temp",
  "desktop",
  "documents",
  "downloads",
  "music",
  "pictures",
  "videos",
] as const;

type AllowedPath = (typeof ALLOWED_PATHS)[number];

// IPC Handler for getting app data path
ipcMain.handle("app:getPath", (event, name: string) => {
  if (typeof name !== "string") {
    throw new TypeError("Path name must be a string");
  }
  if (!ALLOWED_PATHS.includes(name as AllowedPath)) {
    logger.error(`Blocked attempt to get unauthorized path via IPC: ${name}`);
    throw new Error(`Unauthorized path requested: ${name}`);
  }

  return app.getPath(name as AllowedPath);
});

app.on("web-contents-created", (_, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    try {
      const parsedUrl = new URL(navigationUrl);

      // In production (file://), hash routing is used, so valid navigations won't trigger will-navigate.
      // We only allow will-navigate for the dev server origin to support HMR and dev reloads.
      const devServerUrlStr = process.env["ELECTRON_RENDERER_URL"];
      if (devServerUrlStr) {
        const devServerUrl = new URL(devServerUrlStr);
        if (parsedUrl.origin === devServerUrl.origin) {
          return; // Allow dev server navigation
        }
      }

      // Block all other navigations (including all file://) to prevent local file attacks
      event.preventDefault();
    } catch {
      // If URL parsing fails, prevent navigation to be safe
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === "https:") {
        shell
          .openExternal(parsedUrl.href)
          .catch((e) => logger.error("Failed to open external URL:", e));
      } else {
        logger.warn(`Blocked attempt to open non-HTTPS URL: ${url}`);
      }
    } catch (e) {
      logger.error(`Blocked attempt to open invalid URL: ${url}`, e);
    }
    return { action: "deny" };
  });

  contents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
});

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(false);
  });

  // Per-session CSP nonce for the style-src directive. Runtime-injected <style>
  // tags stamp this nonce: react-remove-scroll (Radix dialogs) reads it via
  // window.__webpack_nonce__ (the renderer copies it from __CSP_NONCE__), and
  // the Vite dev server reads it from <meta property="csp-nonce">, which the
  // preload injects. The env var must be set before BrowserWindow creation so
  // the sandboxed renderer process inherits it.
  const cspNonce = randomBytes(16).toString("base64");
  process.env.__CSP_NONCE__ = cspNonce;
  const styleSrcHashes = await sonnerStyleHashes();
  const isHttpRenderer = is.dev && !!process.env["ELECTRON_RENDERER_URL"];
  const csp = buildCsp(cspNonce, styleSrcHashes, isHttpRenderer);

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
        "X-Content-Type-Options": ["nosniff"],
      },
    });
  });

  // onHeadersReceived never fires for file:// loads, so production documents
  // would otherwise have no CSP at all. Patch the file protocol handler to
  // stamp the policy on HTML responses — both as a response header and as a
  // <meta> tag (the documented mechanism for file:// documents).
  if (!isHttpRenderer) {
    protocol.handle("file", async (request) => {
      const response = await net.fetch(request, { bypassCustomProtocolHandlers: true });
      if (!new URL(request.url).pathname.endsWith(".html")) return response;

      const headers = new Headers(response.headers);
      headers.set("Content-Security-Policy", csp);
      headers.set("X-Content-Type-Options", "nosniff");
      const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">`;
      const html = (await response.text()).replace(/<head(\s[^>]*)?>/, `<head$1>${meta}`);
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    });
  }

  try {
    await createWindow();
    createMenu();
    createTray();
  } catch (error) {
    logger.error("Failed to initialize Electron app:", error);
    dialog.showErrorBox(
      "Startup Error",
      "Failed to initialize the application. Please check the console for details."
    );
    app.quit();
  }

  app.on("activate", async () => {
    try {
      if (BrowserWindow.getAllWindows().length === 0) await createWindow();
    } catch (error) {
      logger.error("Failed to create window on activate:", error);
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    tray?.destroy();
    app.quit();
  }
});
