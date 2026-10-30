import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import type { PbpLine } from "@/engine/bout/narrative/pbpTypes";
import { NarrationFeed } from "@/components/basho/boutReplay/NarrationFeed";

function line(partial: Partial<PbpLine> & { text: string }): PbpLine {
  return { id: `id-${partial.text.slice(0, 10)}-${Math.abs(partial.text.length)}`, ...partial };
}

const LINES: PbpLine[] = [
  line({ text: "The two wrestlers take their places.", phase: "opening", voice: "understated" }),
  line({ text: "Hakkeyoi! They clash at the tachiai!", phase: "tachiai", voice: "formal" }),
  line({ text: "Higashiyama drives forward relentlessly.", phase: "momentum" }),
  line({ text: "Yorikiri! Forced out — it's over!", phase: "finish", voice: "dramatic" }),
  line({
    text: "A famous kinboshi victory for the challenger!",
    phase: "post_bout",
    voice: "dramatic",
    tags: ["kinboshi", "upset"],
  }),
];

describe("NarrationFeed", () => {
  it("renders the active line's text", () => {
    render(<NarrationFeed lines={LINES} activeIndex={2} />);
    expect(screen.getByText("Higashiyama drives forward relentlessly.")).toBeTruthy();
  });

  it("shows a scrolling window of the most recent lines up to activeIndex", () => {
    render(<NarrationFeed lines={LINES} activeIndex={4} />);
    // active line + up to 2 previous
    expect(screen.getByText("Higashiyama drives forward relentlessly.")).toBeTruthy();
    expect(screen.getByText(/kinboshi victory/i)).toBeTruthy();
    // lines far above the window are not rendered
    expect(screen.queryByText("The two wrestlers take their places.")).toBeNull();
  });

  it("renders tag badges on lines that carry stakes tags", () => {
    render(<NarrationFeed lines={LINES} activeIndex={4} />);
    expect(screen.getByText("KINBOSHI")).toBeTruthy();
    expect(screen.getByText("UPSET")).toBeTruthy();
  });

  it("renders a plain-language explainer under lines that carry one", () => {
    render(<NarrationFeed lines={LINES} activeIndex={4} />);
    expect(screen.getByText(/beating a yokozuna earns a prized gold star/i)).toBeTruthy();
  });

  it("marks the live region for screen readers", () => {
    const { container } = render(<NarrationFeed lines={LINES} activeIndex={1} />);
    expect(container.querySelector('[aria-live="polite"]')).toBeTruthy();
  });

  it("applies headline styling to stakes-led lines and gyoji styling to gyoji calls", () => {
    const { container } = render(<NarrationFeed lines={LINES} activeIndex={4} windowSize={5} />);
    expect(container.querySelector(".feed-line--headline")).toBeTruthy();
    expect(container.querySelector(".feed-line--gyoji")).toBeTruthy();
  });
});
