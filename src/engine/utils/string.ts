/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Standardizes rikshina/name formatting.
 */
export function formatShikona(shikona: string | undefined, name: string): string {
  return shikona || name || "Unknown Rikishi";
}
