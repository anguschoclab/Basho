/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}


