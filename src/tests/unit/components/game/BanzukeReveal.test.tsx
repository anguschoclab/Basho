import { render, screen, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { BanzukeReveal } from "@/components/game/BanzukeReveal";

// RikishiName uses TanStack Router Link — render it as plain text here.
vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

const FABRICATED_NAMES = ["Hakuho", "Terunofuji", "Asanoyama"];

describe("BanzukeReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders the real rank-change entries it is given", () => {
    render(
      <BanzukeReveal
        onComplete={vi.fn()}
        entries={[
          {
            id: "r1",
            shikona: "Testoyama",
            oldRank: "Maegashira 5",
            newRank: "Sekiwake",
            change: "up",
          },
        ]}
      />
    );
    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.getByText("Testoyama")).toBeDefined();
    expect(screen.getByText("Maegashira 5")).toBeDefined();
    expect(screen.getByText("Sekiwake")).toBeDefined();
  });

  it("never renders fabricated wrestler names when there are no real entries", () => {
    const onComplete = vi.fn();
    const { container } = render(<BanzukeReveal onComplete={onComplete} entries={[]} />);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    for (const name of FABRICATED_NAMES) {
      expect(container.textContent).not.toContain(name);
    }
    // An empty reveal must not hang — it should complete promptly.
    expect(onComplete).toHaveBeenCalled();
  });
});
