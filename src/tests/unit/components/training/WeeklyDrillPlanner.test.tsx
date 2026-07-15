/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { existsSync } from "fs";
import { resolve } from "path";
import { WeeklyDrillPlanner } from "@/components/training/WeeklyDrillPlanner";
import { MockFactory } from "@/tests/helpers/utils/MockFactory";
import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("@/components/ClickableName", () => ({
  RikishiName: ({ name }: { name: string }) => <span>{name}</span>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  SelectValue: () => <span />,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

describe("WeeklyDrillPlanner", () => {
  it("renders with a mock rikishi list", () => {
    render(
      <TooltipProvider>
        <WeeklyDrillPlanner
          rikishiList={[MockFactory.createRikishi("r1"), MockFactory.createRikishi("r2")]}
          weeklyPlan={{}}
          onPlanUpdate={vi.fn()}
          onBulkUpdate={vi.fn()}
          onMultiBulkUpdate={vi.fn()}
        />
      </TooltipProvider>
    );
    expect(screen.getByText("Rikishi r1")).toBeTruthy();
    expect(screen.getByText("Rikishi r2")).toBeTruthy();
  });

  it("does not have a duplicate .modified source file", () => {
    const modifiedPath = resolve(
      process.cwd(),
      "src/components/training/WeeklyDrillPlanner.tsx.modified"
    );
    expect(existsSync(modifiedPath)).toBe(false);
  });
});
