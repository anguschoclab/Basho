import { describe, it, expect } from "vitest";
import { ChronicleService } from "@/engine/simulation/ChronicleService";
import { mockRikishi, makeMockWorld } from "../utils";

describe("ChronicleService.finalizeReport", () => {
  it("populates biggestScandals from discipline scandal events", () => {
    const world = makeMockWorld({ year: 2025 }) as any;
    world.events.log = [
      {
        year: 2025,
        category: "discipline",
        title: "Heiya scandal erupts",
        data: { incident: "scandal_reported", status: "major" },
      },
      {
        year: 2025,
        category: "discipline",
        title: "Minor warning",
        data: { incident: "scandal_reported", status: "minor" },
      },
      {
        year: 2025,
        category: "media",
        title: "Press coverage",
        data: {},
      },
    ];

    const report = ChronicleService.finalizeReport(
      world,
      ChronicleService.createEmptyReport(),
      new Map(),
      2020
    );

    expect(report.biggestScandals).toEqual(["Heiya scandal erupts"]);
  });

  it("populates greatestRivalries from h2h records, deduping pairs", () => {
    const a = mockRikishi("r-a", { shikona: "Alpha" });
    const b = mockRikishi("r-b", { shikona: "Beta" });
    const c = mockRikishi("r-c", { shikona: "Gamma" });
    (a as any).h2h = { "r-b": { wins: 10, losses: 8 } };
    (b as any).h2h = { "r-a": { wins: 8, losses: 10 } };
    (c as any).h2h = { "r-a": { wins: 2, losses: 1 } };

    const world = makeMockWorld({
      year: 2025,
      rikishi: new Map([
        ["r-a", a],
        ["r-b", b],
        ["r-c", c],
      ]),
    }) as any;

    const report = ChronicleService.finalizeReport(
      world,
      ChronicleService.createEmptyReport(),
      new Map(),
      2020
    );

    expect(report.greatestRivalries).toHaveLength(2);
    // Alpha–Beta (18 meetings) outranks Gamma–Alpha (3 meetings)
    expect(report.greatestRivalries[0]).toMatchObject({
      meetingCount: 18,
    });
    expect(report.greatestRivalries[0].eastName).toBeDefined();
    expect(report.greatestRivalries[1].meetingCount).toBe(3);
  });

  it("includes full retired rikishi h2h records from historicalRikishi", () => {
    const a = mockRikishi("r-a", { shikona: "Alpha" });
    const b = mockRikishi("r-b", { shikona: "Beta" });
    (a as any).h2h = { "r-b": { wins: 5, losses: 5 } };
    (b as any).h2h = { "r-a": { wins: 5, losses: 5 } };

    const world = makeMockWorld({ year: 2025 }) as any;
    world.historicalRikishi.set("r-a", a);
    world.historicalRikishi.set("r-b", b);

    const report = ChronicleService.finalizeReport(
      world,
      ChronicleService.createEmptyReport(),
      new Map(),
      2020
    );

    expect(report.greatestRivalries).toHaveLength(1);
    expect(report.greatestRivalries[0].meetingCount).toBe(10);
  });

  it("leaves greatestRivalries empty when no h2h records exist", () => {
    const world = makeMockWorld({ year: 2025 }) as any;

    const report = ChronicleService.finalizeReport(
      world,
      ChronicleService.createEmptyReport(),
      new Map(),
      2020
    );

    expect(report.greatestRivalries).toEqual([]);
  });
});
