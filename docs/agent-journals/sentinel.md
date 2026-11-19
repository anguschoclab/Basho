# Sentinel Journal

## 2026-05-26 - Input limits belong at the shared parse boundary

**Vulnerability:** Save-file import read an unbounded user-picked `File` via
`file.text()` and `JSON.parse`d it; every other boundary (IPC path validation,
storage-key pollution, save-shape checks, strict version gating) was already
hardened — input *length* was the one unchecked dimension (CWE-400).

**Learning:** `parseSave` in `collectionCodec.ts` is the single funnel for all
four parse sites (slot load, slot-info scan, saveGame's existing-read, file
import). Putting the size gate there covers every path at once; the extra
`file.size` pre-check in `importSave` matters separately because it rejects
before `file.text()` even allocates the buffer. Also note: `file.size` is Blob
metadata and cannot be forged by file contents — it's a trustworthy pre-read
gate.

**Prevention:** When auditing boundaries, check the three dimensions
separately — shape, content, *size*. A validation-heavy codebase can still
miss length limits. Reusable pattern: enforce the cap inside the shared codec
(`MAX_SAVE_BYTES` in `collectionCodec.ts`) so new call sites inherit it.


---

## Archived `.Jules/` entries (folded in v20 consolidation)

## 2026-07-29 - [HIGH] Fix DoS via windowState in Electron

**Vulnerability:** Electron crashes (Denial of Service) when `NaN` or `Infinity` is passed to `BrowserWindow.setPosition` or `BrowserWindow.setSize`.
**Learning:** Checking `typeof rawWindowState.x === "number"` is insufficient because `NaN` and `Infinity` are also considered numbers in JavaScript. Since `windowState` is sourced from untrusted IPC-accessible `electron-store`, this coercion bug can lead to a crash upon startup.
**Prevention:** Defensively validate that untrusted inputs passed to native APIs (like Electron bounds) are finite using `Number.isFinite()` instead of just relying on `typeof ... === 'number'`.
