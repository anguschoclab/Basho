import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { BoutLog } from "@/components/game/BoutLog";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { BoutLogEntry } from "@/engine/types/basho";

function renderLog(log?: BoutLogEntry[] | null) {
  return render(
    <TooltipProvider>
      <BoutLog log={log} />
    </TooltipProvider>
  );
}

describe("BoutLog", () => {
  afterEach(cleanup);

  it("renders empty state for undefined log", () => {
    renderLog();
    expect(screen.getByText("No log entries.")).toBeTruthy();
  });

  it("renders empty state for empty log", () => {
    renderLog([]);
    expect(screen.getByText("No log entries.")).toBeTruthy();
  });

  it("renders entries with known phase labels", () => {
    const log = [
      { phase: "tachiai", clock: 0, description: "Initial charge" },
      { phase: "clinch", clock: 2, description: "Belt grip established" },
      { phase: "finish", clock: 5, description: "Yorikiri" },
    ] as BoutLogEntry[];
    renderLog(log);
    expect(screen.getByText("Initial charge")).toBeTruthy();
    expect(screen.getByText("Belt grip established")).toBeTruthy();
    expect(screen.getByText("Yorikiri")).toBeTruthy();
  });

  it("falls back to Event label for unknown phases", () => {
    const log = [
      { phase: "intermission", clock: 1, description: "Pause" },
    ] as unknown as BoutLogEntry[];
    renderLog(log);
    expect(screen.getByText("Pause")).toBeTruthy();
    expect(screen.getByText("intermission")).toBeTruthy();
  });

  it("renders Event fallback for missing phase and dash for missing description", () => {
    const log = [{ clock: 1 }, { phase: undefined, description: "" }] as unknown as BoutLogEntry[];
    renderLog(log);
    expect(screen.getAllByText("Event")).toHaveLength(2);
    expect(screen.getAllByText("—")).toHaveLength(2);
  });
});
