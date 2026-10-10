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
 */
export function activationKeyHandler(action: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      action();
    }
  };
}
