import { clamp } from "@/presenters/engineAccess";

export { clamp };

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 2);
}

export function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
