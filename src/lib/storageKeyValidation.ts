/**
 * storageKeyValidation.ts
 * ========================
 * Validates storage keys to prevent prototype pollution attacks
 * in electron-store dot-notation keys.
 */

/**
 * Path segments that must never appear in a storage key: the pollution trio
 * (__proto__, constructor, prototype), conf's reserved `__internal__` key
 * (readable/deletable over IPC even though set() rejects it), and every
 * Object.prototype member plus legacy accessor helpers — a root-level key
 * like `toString` would shadow a builtin on the store object. Compared
 * case-insensitively for margin beyond dot-prop's case-sensitive check.
 */
const DISALLOWED_KEY_SEGMENTS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "__internal__",
  "hasownproperty",
  "isprototypeof",
  "propertyisenumerable",
  "tolocalestring",
  "tostring",
  "valueof",
  "__definegetter__",
  "__definesetter__",
  "__lookupgetter__",
  "__lookupsetter__",
]);

/**
 * Returns true if the key is a safe storage key. Mirrors dot-prop's path
 * semantics conservatively: backslash escapes are stripped first (dot-prop
 * decodes `\x` to literal `x`, so `cons\tructor` decodes to `constructor`),
 * then the key is split on dot-notation separators and array brackets into
 * segments. The key is rejected if any segment exactly matches a disallowed
 * name (case-insensitive), or if it yields no segments at all.
 */
export function isValidStorageKey(key: string): boolean {
  if (typeof key !== "string" || key.length === 0) return false;
  const segments = key
    .replaceAll("\\", "")
    .split(/[.[\]]+/)
    .filter((segment) => segment.length > 0);
  if (segments.length === 0) return false;
  return !segments.some((segment) => DISALLOWED_KEY_SEGMENTS.has(segment.toLowerCase()));
}
