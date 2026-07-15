# Sumo Manager Pro — Desktop App (Electron)

Sumo Manager Pro ships as both a **web PWA** (`bun run dev`) and a **native desktop app** via Electron. This document covers everything needed to run, build, and package the desktop version.

---

## Prerequisites

| Tool                          | Minimum Version | Notes                                                               |
| ----------------------------- | --------------- | ------------------------------------------------------------------- |
| [Bun](https://bun.sh)         | 1.3+            | Package manager and script runner                                   |
| [Node.js](https://nodejs.org) | 18+             | Required by Electron internals                                      |
| macOS                         | 12 Monterey+    | For Mac builds and `.icns` icon generation                          |
| Windows                       | 10+             | For Windows builds (or cross-compile from Mac via Wine — see below) |

---

## Installation

If you have not installed dependencies yet:

```bash
bun install
```

This installs all runtime dependencies **and** the Electron devDependencies:

- `electron` — Electron runtime
- `electron-vite` — Vite-based build tool for Electron (main + preload + renderer)
- `electron-builder` — Packaging into DMG/NSIS installers
- `@electron-toolkit/preload` — Typed contextBridge helper
- `@electron-toolkit/utils` — `is.dev` environment detection

---

## Running in Development Mode

```bash
bun run electron:dev
```

This starts the **Vite dev server** for the renderer, then launches Electron pointing at it over HTTP. You get:

- **Full HMR** — edit any `src/` file and the window updates instantly
- **Browser history routing** — all URLs work as `/dashboard`, `/stable/roster`, etc.
- **DevTools** — right-click the window → _Inspect Element_, or press `Cmd+Option+I` / `Ctrl+Shift+I`

> The web dev server (`bun run dev`) continues to work independently for browser-based development.

---

## Building for Production

### Build only (no packaging)

```bash
bunx electron-vite build
```

Outputs to `out/`:

```
out/
├── main/index.js       ← Bundled main process
├── preload/index.mjs   ← Bundled preload script
└── renderer/           ← Bundled React app (index.html + assets)
```

### Build + Package

```bash
bun run electron:build
```

Detects the current platform and packages accordingly. Outputs installers to `dist-electron/`.

### Platform-specific builds

```bash
# macOS — produces .dmg and .zip for both x64 (Intel) and arm64 (Apple Silicon)
bun run electron:build:mac

# Windows — produces an NSIS .exe installer for x64
bun run electron:build:win
```

> **Cross-compiling:** Building a Windows installer on macOS requires Wine and `mono`. It is easier to build Windows targets in a Windows environment or a CI runner (GitHub Actions with `windows-latest`).

---

## Build Output

After `bun run electron:build:mac`:

```
dist-electron/
├── Sumo Manager Pro-0.0.0.dmg          ← Mac installer (x64)
├── Sumo Manager Pro-0.0.0-arm64.dmg    ← Mac installer (Apple Silicon)
├── Sumo Manager Pro-0.0.0-mac.zip      ← Mac zip (x64)
└── Sumo Manager Pro-0.0.0-arm64-mac.zip
```

After `bun run electron:build:win`:

```
dist-electron/
└── Sumo Manager Pro Setup 0.0.0.exe    ← Windows NSIS installer (x64)
```

---

## How It Works

### Routing

TanStack Router uses **browser history** during dev (HTTP origin) and automatically switches to **hash routing** (`#/dashboard`) in production — when the app loads from `file://`. This is handled transparently in `src/routes.tsx` using the `window.__ELECTRON__` flag injected by the preload script.

### Storage

All saves use `window.localStorage` (same as the browser). No Node.js file system access is needed. OPFS (cold storage for Play-By-Play archives) also works in Electron's Chromium renderer.

### Web Worker

The game simulation engine runs in a Web Worker (`src/engine/worker/engine.worker.ts`). Electron's renderer is a full Chromium environment, so Web Workers work identically to the browser — no changes needed.

### Security

- `contextIsolation: true` — renderer and main process are isolated
- `nodeIntegration: false` — renderer cannot access Node.js
- `sandbox: true` — renderer process is sandboxed
- External links open in the OS browser via `shell.openExternal()`

---

## App Icons

Icons live in `resources/` and were generated from `public/pwa-512.png`:

| File                  | Platform | Format                  |
| --------------------- | -------- | ----------------------- |
| `resources/icon.icns` | macOS    | ICNS (multi-resolution) |
| `resources/icon.ico`  | Windows  | ICO (multi-resolution)  |

To regenerate from a new source PNG:

```bash
# macOS (.icns)
mkdir -p /tmp/app.iconset
sips -z 512 512 public/pwa-512.png --out /tmp/app.iconset/icon_512x512.png
# ... (add other sizes: 16, 32, 128, 256)
iconutil -c icns /tmp/app.iconset -o resources/icon.icns

# Windows (.ico) — requires Python with Pillow
python3 -c "
from PIL import Image
img = Image.open('public/pwa-512.png').convert('RGBA')
sizes = [(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)]
img.resize((256,256)).save('resources/icon.ico', format='ICO', sizes=sizes)
"
```

---

## Code Signing (macOS Notarization)

Unsigned builds will trigger Gatekeeper on macOS. To distribute publicly:

1. Join the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Create a **Developer ID Application** certificate in Xcode or the Apple portal
3. Export the `.p12` certificate and set these environment variables before building:

```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-cert-password
export APPLE_ID=your@apple.id
export APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=XXXXXXXXXX
bun run electron:build:mac
```

Windows code signing uses `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD` with a `.pfx` certificate.

---

## Troubleshooting

### `electron: command not found`

Run `bun install` to install devDependencies.

### Window is blank / white screen

Open DevTools and check the Console tab for errors. In dev mode, confirm `electron:dev` started the Vite dev server on `http://localhost:5173`.

### Routes show `file:///dashboard` (404) in production

This should not happen — hash routing is enabled automatically in production via `window.__ELECTRON__`. If it does, verify the preload script is being loaded by checking `window.__ELECTRON__` in DevTools console — it should be `true`.

### `OPFS` errors in console

Origin Private File System (cold storage for bout archives) may have limited support under `file://` on some Electron versions. This is non-critical — the core save/load system uses `localStorage` and is unaffected.

### `electron-builder` fails with missing icon

Ensure `resources/icon.icns` (Mac) and `resources/icon.ico` (Windows) exist. See the **App Icons** section above to regenerate them.
