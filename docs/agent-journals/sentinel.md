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
