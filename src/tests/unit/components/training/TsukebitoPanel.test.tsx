import { describe, it, expect, afterEach, vi } from "vitest";
import React from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { TsukebitoPanel } from "@/components/training/TsukebitoPanel";
import type { TsukebitoProjection } from "@/presenters/tsukebitoProjections";

function makeProjection(overrides: Partial<TsukebitoProjection> = {}): TsukebitoProjection {
  return {
    assignments: [],
    eligibleSeniors: [],
    eligibleJuniors: [],
    ...overrides,
  };
}

describe("TsukebitoPanel", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the panel", () => {
    render(<TsukebitoPanel projection={makeProjection()} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByTestId("tsukebito-panel")).toBeDefined();
  });

  it("shows no-eligible message when no seniors", () => {
    render(<TsukebitoPanel projection={makeProjection()} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText(/No eligible sekitori/)).toBeDefined();
  });

  it("renders current assignments", () => {
    const proj = makeProjection({
      assignments: [
        {
          seniorId: "s1",
          seniorShikona: "Yokozuna",
          seniorRankLabel: "Yokozuna",
          tsukebitoIds: ["j1"],
          tsukebito: [{ id: "j1", shikona: "Junior", rankLabel: "Jonokuchi" }],
        },
      ],
    });
    render(<TsukebitoPanel projection={proj} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByTestId("tsukebito-assignment-s1")).toBeDefined();
    expect(screen.getByText("Junior")).toBeDefined();
  });

  it("calls onClear when remove button is clicked", () => {
    const onClear = vi.fn();
    const proj = makeProjection({
      assignments: [
        {
          seniorId: "s1",
          seniorShikona: "Yokozuna",
          seniorRankLabel: "Yokozuna",
          tsukebitoIds: ["j1"],
          tsukebito: [{ id: "j1", shikona: "Junior", rankLabel: "Jonokuchi" }],
        },
      ],
    });
    render(<TsukebitoPanel projection={proj} onSet={vi.fn()} onClear={onClear} />);
    fireEvent.click(screen.getByTestId("clear-tsukebito-s1-j1"));
    expect(onClear).toHaveBeenCalledWith("s1", "j1");
  });

  it("renders eligible seniors with available juniors", () => {
    const proj = makeProjection({
      eligibleSeniors: [
        { id: "s1", shikona: "Ozeki", rankLabel: "Ozeki", currentCount: 0, maxCount: 2 },
      ],
      eligibleJuniors: [
        { id: "j1", shikona: "Junior 1", rankLabel: "Sandanme", assignedTo: null },
      ],
    });
    render(<TsukebitoPanel projection={proj} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByTestId("tsukebito-senior-s1")).toBeDefined();
    expect(screen.getByTestId("set-tsukebito-s1-j1")).toBeDefined();
  });

  it("calls onSet when assign button is clicked", () => {
    const onSet = vi.fn();
    const proj = makeProjection({
      eligibleSeniors: [
        { id: "s1", shikona: "Ozeki", rankLabel: "Ozeki", currentCount: 0, maxCount: 2 },
      ],
      eligibleJuniors: [
        { id: "j1", shikona: "Junior 1", rankLabel: "Sandanme", assignedTo: null },
      ],
    });
    render(<TsukebitoPanel projection={proj} onSet={onSet} onClear={vi.fn()} />);
    fireEvent.click(screen.getByTestId("set-tsukebito-s1-j1"));
    expect(onSet).toHaveBeenCalledWith("s1", "j1");
  });

  it("shows at-maximum message when senior is full", () => {
    const proj = makeProjection({
      eligibleSeniors: [
        { id: "s1", shikona: "Ozeki", rankLabel: "Ozeki", currentCount: 2, maxCount: 2 },
      ],
      eligibleJuniors: [
        { id: "j1", shikona: "Junior 1", rankLabel: "Sandanme", assignedTo: null },
      ],
    });
    render(<TsukebitoPanel projection={proj} onSet={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText("At maximum capacity")).toBeDefined();
  });
});
