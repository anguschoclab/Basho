## 2026-07-29 - [HIGH] Fix DoS via windowState in Electron
**Vulnerability:** Electron crashes (Denial of Service) when `NaN` or `Infinity` is passed to `BrowserWindow.setPosition` or `BrowserWindow.setSize`.
**Learning:** Checking `typeof rawWindowState.x === "number"` is insufficient because `NaN` and `Infinity` are also considered numbers in JavaScript. Since `windowState` is sourced from untrusted IPC-accessible `electron-store`, this coercion bug can lead to a crash upon startup.
**Prevention:** Defensively validate that untrusted inputs passed to native APIs (like Electron bounds) are finite using `Number.isFinite()` instead of just relying on `typeof ... === 'number'`.
