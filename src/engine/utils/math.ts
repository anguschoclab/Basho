export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.trunc(n)));
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/**
 * Returns `n` when it is a finite number, otherwise `fallback`.
 * Unlike `n ?? fallback`, this also catches NaN and ±Infinity — stat fields can
 * arrive as NaN after upstream corruption and `??` does not filter them.
 */
export function finiteOr(n: number | undefined | null, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

/**
 * Standardizes the 'localClampInt' pattern used in banzuke logic.
 */
export function localClampInt(val: number, min: number, max: number): number {
  return clampInt(val, min, max);
}

export function simpleHashToIndex(s: string, mod: number): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % mod;
}

export { formatCurrency } from "./formatters";
