import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { FirstVisitHint } from "@/components/onboarding/FirstVisitHint";
import { ONBOARDING_HINTS } from "@/constants/ui/onboardingHints";

/**
 * T2-G6: FirstVisitHint — renders the hint copy for a gated system on first
 * visit, dismiss persists "seen" to localStorage, and seen hints stay hidden.
 */
function makeStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe("FirstVisitHint", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeStorage());
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the hint copy for an unseen hintId", () => {
    const { getByText } = render(<FirstVisitHint hintId="scouting" />);
    expect(getByText(ONBOARDING_HINTS.scouting.title)).toBeTruthy();
    expect(getByText(ONBOARDING_HINTS.scouting.body)).toBeTruthy();
  });

  it("dismiss hides the hint and persists 'seen' to localStorage", () => {
    const { getByLabelText, queryByText } = render(<FirstVisitHint hintId="finances" />);
    fireEvent.click(getByLabelText("Dismiss hint"));
    expect(queryByText(ONBOARDING_HINTS.finances.title)).toBeNull();
    expect(window.localStorage.getItem("basho:onboarding:finances")).toBe("seen");
  });

  it("does not render when the hint was previously seen", () => {
    window.localStorage.setItem("basho:onboarding:scouting", "seen");
    const { queryByText } = render(<FirstVisitHint hintId="scouting" />);
    expect(queryByText(ONBOARDING_HINTS.scouting.title)).toBeNull();
  });
});
