/**
 * Unit tests for the shared keyboard-activation handler used by
 * role="button" elements across the app.
 */

import { describe, it, expect, vi } from "vitest";
import type { KeyboardEvent } from "react";
import { activationKeyHandler } from "@/lib/a11y";

function fakeKeyEvent(key: string) {
  const preventDefault = vi.fn();
  const event = { key, preventDefault } as unknown as KeyboardEvent<HTMLElement>;
  return { event, preventDefault };
}

describe("activationKeyHandler", () => {
  it("fires the action and prevents default on Enter", () => {
    const action = vi.fn();
    const { event, preventDefault } = fakeKeyEvent("Enter");
    activationKeyHandler(action)(event);
    expect(action).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("fires the action and prevents default on Space", () => {
    const action = vi.fn();
    const { event, preventDefault } = fakeKeyEvent(" ");
    activationKeyHandler(action)(event);
    expect(action).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it("ignores non-activation keys", () => {
    const action = vi.fn();
    for (const key of ["Escape", "Tab", "a", "ArrowDown", "Enter2"]) {
      const { event, preventDefault } = fakeKeyEvent(key);
      activationKeyHandler(action)(event);
      expect(preventDefault).not.toHaveBeenCalled();
    }
    expect(action).not.toHaveBeenCalled();
  });
});
