/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(s: string): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Formats a currency amount (Japanese Yen).
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(amount);
}

/**
 * Standardizes rikshina/name formatting.
 */
export function formatShikona(shikona: string | undefined, name: string): string {
  return shikona || name || "Unknown Rikishi";
}
