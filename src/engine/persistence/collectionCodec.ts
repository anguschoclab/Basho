// collectionCodec.ts
// =======================================================
// JSON replacer/reviver pair for save serialization.
//
// SerializedWorldState converts top-level Maps explicitly, but nested
// collections copied verbatim into the DTO (e.g.
// `_preBashoAssessment.rikishiAssessments`) would silently serialize as {}
// and crash consumers on load. Tagging Map/Set at the JSON boundary makes
// fidelity recursive — any collection anywhere in the save round-trips.
// =======================================================

const MAP_TAG = "$$map";
const SET_TAG = "$$set";

/**
 * Upper bound on save text accepted at the parse/import boundary.
 * Exported saves are indented JSON and even a long-running world is only a
 * few MB — anything beyond this is corrupt or hostile. Enforcing it before
 * file.text()/JSON.parse stops a crafted "save" from exhausting renderer
 * memory (CWE-400, uncontrolled resource consumption).
 */
export const MAX_SAVE_BYTES = 32 * 1024 * 1024;

// @keep-export saveReplacer — live via same-file/dispatch call or public API contract
export function saveReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return { [MAP_TAG]: [...value.entries()] };
  }
  if (value instanceof Set) {
    return { [SET_TAG]: [...value.values()] };
  }
  return value;
}

// @keep-export saveReviver — live via same-file/dispatch call or public API contract
export function saveReviver(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    if (MAP_TAG in obj && Array.isArray(obj[MAP_TAG])) {
      return new Map(obj[MAP_TAG] as [unknown, unknown][]);
    }
    if (SET_TAG in obj && Array.isArray(obj[SET_TAG])) {
      return new Set(obj[SET_TAG] as unknown[]);
    }
  }
  return value;
}

export function stringifySave(value: unknown, space?: number): string {
  return JSON.stringify(value, saveReplacer, space);
}

/** Strict JSON parse with collection revival — throws on malformed input. */
export function parseSave(text: string): unknown {
  // Size gate covers every parse site (slot loads, slot-info scans, imports).
  // JSON is ASCII-dominant, so string length is a tight proxy for byte size.
  if (typeof text !== "string" || text.length > MAX_SAVE_BYTES) {
    throw new Error("Save data exceeds maximum supported size");
  }
  return JSON.parse(text, saveReviver);
}
