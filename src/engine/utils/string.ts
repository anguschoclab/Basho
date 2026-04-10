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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(amount).replace('￥', '¥');
}

/**
 * Standardizes rikshina/name formatting.
 */
export function formatShikona(shikona: string | undefined, name: string): string {
  return shikona || name || "Unknown Rikishi";
}
