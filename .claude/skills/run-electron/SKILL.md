---
name: run-electron
description: Runs or packages the desktop (Electron) build of the game
disable-model-invocation: true
---

Electron desktop workflows (from the repository root). See `docs/ELECTRON.md` for the full setup; main process code lives in `electron/`, build config in `electron.vite.config.ts` + `electron-builder.json5`.

```bash
bun run electron:dev        # dev mode: electron-vite dev (HMR + Electron shell)
bun run electron:preview    # preview the production renderer in Electron
bun run electron:pack       # build + package unpacked dir (fast smoke of packaging)
bun run electron:build      # build + package macOS installer
bun run electron:build:win  # Windows installer; electron:build:all for all platforms
```

Outputs land in `dist-electron/` (bundles) and `out/` (packaged apps). The web build (`bun run build` → `dist/`) is separate — Electron packaging does `electron-vite build` first, which produces its own renderer/main/pre bundles.
