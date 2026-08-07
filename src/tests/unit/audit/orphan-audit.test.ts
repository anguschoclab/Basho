import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const AUDIT_DIR = join(ROOT, ".windsurf", "audit");
const BASELINE_PATH = join(AUDIT_DIR, "baseline-orphans.json");
const TRACKER_PATH = join(AUDIT_DIR, "orphan-tracker.csv");

interface AuditReport {
  generatedAt: string;
  summary: {
    total: number;
    unreferencedExports: number;
    orphanRoutes: number;
    untickedServices: number;
    unusedComponents: number;
    writeOnlyState: number;
  };
  entries: Array<{
    id: string;
    file: string;
    symbol: string;
    orphanType: string;
    priority: string;
    status: string;
  }>;
}

describe("Audit runner self-test", () => {
  it("baseline-orphans.json exists and is valid JSON", () => {
    expect(existsSync(BASELINE_PATH)).toBe(true);
    const raw = readFileSync(BASELINE_PATH, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    expect(report.generatedAt).toBeTruthy();
    expect(report.summary.total).toBeGreaterThan(0);
    expect(report.entries.length).toBe(report.summary.total);
  });

  it("orphan-tracker.csv exists and has a header row with test-file column", () => {
    expect(existsSync(TRACKER_PATH)).toBe(true);
    const csv = readFileSync(TRACKER_PATH, "utf-8");
    const lines = csv.split("\n");
    expect(lines[0]).toContain("ID,File,Symbol,OrphanType,Priority");
    expect(lines[0]).toContain("TestFile");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("every entry has a unique ID and required fields", () => {
    const raw = readFileSync(BASELINE_PATH, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    const ids = new Set<string>();
    for (const entry of report.entries) {
      expect(entry.id).toBeTruthy();
      expect(ids.has(entry.id)).toBe(false);
      ids.add(entry.id);
      expect(entry.file).toBeTruthy();
      expect(entry.symbol).toBeTruthy();
      expect(entry.orphanType).toBeTruthy();
      expect(entry.priority).toMatch(/^P[0-3]$/);
    }
  });

  it("summary counts match entry counts by type", () => {
    const raw = readFileSync(BASELINE_PATH, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    const byType = (type: string) => report.entries.filter((e) => e.orphanType === type).length;
    expect(byType("unreferenced-export")).toBe(report.summary.unreferencedExports);
    expect(byType("orphan-route")).toBe(report.summary.orphanRoutes);
    expect(byType("unticked-service")).toBe(report.summary.untickedServices);
    expect(byType("unused-component")).toBe(report.summary.unusedComponents);
    expect(byType("write-only-state")).toBe(report.summary.writeOnlyState);
  });

  it("audit detects at least one known orphan type per category", () => {
    const raw = readFileSync(BASELINE_PATH, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    const types = new Set(report.entries.map((e) => e.orphanType));
    expect(types.has("unreferenced-export")).toBe(true);
    expect(types.has("orphan-route")).toBe(true);
    expect(types.has("write-only-state")).toBe(true);
  });
});
