import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DivisionRecordsCard } from "@/components/rikishi/career/DivisionRecordsCard";
import type { Rikishi } from "@/engine/types/rikishi";

const fullRecords: Rikishi["divisionRecords"] = {
  makuuchi: { wins: 42, losses: 33 },
  juryo: { wins: 55, losses: 20 },
  makushita: { wins: 30, losses: 12 },
  sandanme: { wins: 0, losses: 0 },
  jonidan: { wins: 6, losses: 1 },
  jonokuchi: { wins: 0, losses: 0 },
};

describe("DivisionRecordsCard", () => {
  it("renders only divisions with recorded bouts, ordered top to bottom", () => {
    render(<DivisionRecordsCard records={fullRecords} />);
    expect(screen.getByText("Makuuchi")).toBeTruthy();
    expect(screen.getByText("Juryo")).toBeTruthy();
    expect(screen.getByText("Makushita")).toBeTruthy();
    expect(screen.getByText("Jonidan")).toBeTruthy();
    // Zero-bout divisions are hidden
    expect(screen.queryByText("Sandanme")).toBeNull();
    expect(screen.queryByText("Jonokuchi")).toBeNull();
  });

  it("shows W-L and computed win percentage per division", () => {
    render(<DivisionRecordsCard records={fullRecords} />);
    expect(screen.getByText("42-33")).toBeTruthy();
    // 42 / 75 = 56.0%
    expect(screen.getByText("56.0%")).toBeTruthy();
  });

  it("shows an honest empty state when no bouts are recorded", () => {
    render(<DivisionRecordsCard records={undefined} />);
    expect(screen.getByText("No recorded bouts yet.")).toBeTruthy();
  });
});
