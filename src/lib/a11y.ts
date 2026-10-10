/**
 * a11y.ts
 *
 * Shared accessibility helpers for interactive non-button elements
 * (`role="button"` cards, rows, badges).
 */

import type { KeyboardEvent } from "react";

/**
 * Returns a keydown handler that fires `action` on Enter or Space —
 * the activation keys expected of `role="button"` elements — and
 * prevents the default scroll behavior for Space.
 *
 * `selfOnly` ignores keys that bubble up from descendants (keydown
 * bubbles — without it, Enter on a child button would double-activate).
 */
export function activationKeyHandler(action: () => void, opts?: { selfOnly?: boolean }) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (opts?.selfOnly && e.target !== e.currentTarget) return;
    e.preventDefault();
    action();
  };
}
