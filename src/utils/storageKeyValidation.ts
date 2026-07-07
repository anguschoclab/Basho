/**
 * storageKeyValidation.ts
 * ========================
 * Validates storage keys to prevent prototype pollution attacks
 * in electron-store dot-notation keys.
 */

/**
 * Returns true if the key is a safe storage key (not a prototype pollution vector).
 * Rejects keys containing __proto__, constructor, or prototype (case-insensitive).
 */
export function isValidStorageKey(key: string): boolean {
  if (typeof key !== "string") return false;
  const lowerKey = key.toLowerCase();
  return !(
    lowerKey.includes("__proto__") ||
    lowerKey.includes("constructor") ||
    lowerKey.includes("prototype")
  );
}
