import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Cn.
 *  * @param inputs - The Inputs.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safe number utility that ensures the input is a finite number, otherwise returns a fallback.
 *
 * @param v - The value to check.
 * @param fallback - The fallback value if `v` is not a finite number.
 * @returns A finite number.
 */
export function safeNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
