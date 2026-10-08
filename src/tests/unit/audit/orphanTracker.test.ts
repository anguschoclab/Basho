/**
 * Unit tests for scripts/orphanTracker.ts — the pure merge module that keeps
 * ORPH-XXXX tracker ids and triage statuses stable across audit regenerations.
 *
 * Contract: ids are append-only. A prior row matched by file|symbol keeps its
 * id and carries status/testFile/pr forward; genuinely new rows get fresh ids
 * above the prior maximum, allocated deterministically by sorted file|symbol.
 */

import { describe, it, expect } from "vitest";
import {
  mergeTrackerState,
  parseTrackerCsv,
  type PriorTrackerRow,
  type TrackedEntry,
} from "../../../../scripts/orphanTracker";

function entry(file: string, symbol: string): TrackedEntry {
  return { id: "", file, symbol, status: "candidate" };
}

function priorRow(
  id: string,
  file: string,
  symbol: string,
  status = "candidate",
  testFile = "",
  pr = ""
): PriorTrackerRow {
  return { id, file, symbol, testFile, status, pr };
}

const CSV_HEADER =
  "ID,File,Symbol,OrphanType,Priority,UIRoute,NPCConsumer,TickPhase,TestFile,Status,PR\n";

describe("parseTrackerCsv", () => {
  it("parses the tracker header and quoted rows", () => {
    const csv =
      CSV_HEADER +
      '"ORPH-0001","src/a.ts","foo","unreferenced-export","P3","","","","","candidate",""\n';
    expect(parseTrackerCsv(csv)).toEqual([
      {
        id: "ORPH-0001",
        file: "src/a.ts",
        symbol: "foo",
        testFile: "",
        status: "candidate",
        pr: "",
      },
    ]);
  });

  it("returns empty for header-only or empty input", () => {
    expect(parseTrackerCsv("")).toEqual([]);
    expect(parseTrackerCsv(CSV_HEADER)).toEqual([]);
  });

  it("unescapes doubled quotes inside fields and keeps populated columns", () => {
    const csv =
      CSV_HEADER +
      '"ORPH-0007","src/a.ts","say ""hi""","unreferenced-export","P3","","","","","genuine","#12"\n';
    const rows = parseTrackerCsv(csv);
    expect(rows[0].symbol).toBe('say "hi"');
    expect(rows[0].status).toBe("genuine");
    expect(rows[0].pr).toBe("#12");
  });
});

describe("mergeTrackerState", () => {
  it("reuses prior ORPH ids for matching file|symbol rows regardless of order or numbering", () => {
    const prior = [
      priorRow("ORPH-0042", "src/a.ts", "alpha"),
      priorRow("ORPH-0003", "src/b.ts", "beta"),
    ];
    const merged = mergeTrackerState(
      [entry("src/b.ts", "beta"), entry("src/a.ts", "alpha")],
      prior
    );
    expect(merged.map((m) => m.id)).toEqual(["ORPH-0003", "ORPH-0042"]);
  });

  it("carries status, testFile and pr forward for matched rows", () => {
    const prior = [priorRow("ORPH-0005", "src/a.ts", "alpha", "genuine", "x.test.ts", "#9")];
    const merged = mergeTrackerState([entry("src/a.ts", "alpha")], prior);
    expect(merged[0]).toMatchObject({
      id: "ORPH-0005",
      status: "genuine",
      testFile: "x.test.ts",
      pr: "#9",
    });
  });

  it("allocates fresh ids above the prior maximum for new rows, sorted by file|symbol", () => {
    const prior = [priorRow("ORPH-0007", "src/a.ts", "alpha")];
    const merged = mergeTrackerState(
      [entry("src/z.ts", "zeta"), entry("src/a.ts", "alpha"), entry("src/m.ts", "mu")],
      prior
    );
    const byKey = new Map(merged.map((m) => [`${m.file}:${m.symbol}`, m]));
    expect(byKey.get("src/a.ts:alpha")!.id).toBe("ORPH-0007");
    expect(byKey.get("src/m.ts:mu")!.id).toBe("ORPH-0008");
    expect(byKey.get("src/z.ts:zeta")!.id).toBe("ORPH-0009");
  });

  it("never backfills freed ids — numbering is append-only above the prior max", () => {
    const prior = [
      priorRow("ORPH-0001", "src/a.ts", "alpha"),
      priorRow("ORPH-0003", "src/c.ts", "gamma"),
    ];
    const merged = mergeTrackerState(
      [entry("src/a.ts", "alpha"), entry("src/c.ts", "gamma"), entry("src/n.ts", "nu")],
      prior
    );
    expect(merged.find((m) => m.symbol === "nu")!.id).toBe("ORPH-0004");
  });

  it("starts numbering at ORPH-0001 with no prior tracker", () => {
    const merged = mergeTrackerState([entry("src/n.ts", "nu")], []);
    expect(merged[0]).toMatchObject({
      id: "ORPH-0001",
      status: "candidate",
      testFile: "",
      pr: "",
    });
  });

  it("produces identical results on repeated calls (deterministic)", () => {
    const prior = [priorRow("ORPH-0002", "src/a.ts", "alpha")];
    const run = () =>
      mergeTrackerState(
        [entry("src/c.ts", "c"), entry("src/a.ts", "alpha"), entry("src/b.ts", "b")],
        prior
      ).map((m) => `${m.file}:${m.symbol}:${m.id}`);
    expect(run()).toEqual(run());
  });
});
