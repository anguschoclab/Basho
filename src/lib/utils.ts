import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Cn.
 *  * @param inputs - The Inputs.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
