import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const ROOT = join(__dirname, "../../../..");
const AUDIT_DIR = join(ROOT, ".windsurf", "audit");
const BASELINE_PATH = join(AUDIT_DIR, "baseline-orphans.json");
const TRACKER_PATH = join(AUDIT_DIR, "orphan-tracker.csv");
const TEMP_ORPHAN_DIR = join(ROOT, "src", "engine", "systems", "__audit_test__");
const TEMP_ORPHAN_FILE = join(TEMP_ORPHAN_DIR, "tempOrphanProbe.ts");

let uniqueCounter = 0;
function uniqueJsonPath(): string {
  return join(AUDIT_DIR, `consistency-check-${Date.now()}-${++uniqueCounter}.json`);
}

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
    expect(report.summary.total).toBeGreaterThanOrEqual(0);
    expect(report.entries.length).toBe(report.summary.total);
  });

  it("orphan-tracker.csv exists and has a header row with test-file column", () => {
    expect(existsSync(TRACKER_PATH)).toBe(true);
    const csv = readFileSync(TRACKER_PATH, "utf-8");
    const lines = csv.split("\n");
    expect(lines[0]).toContain("ID,File,Symbol,OrphanType,Priority");
    expect(lines[0]).toContain("TestFile");
    expect(lines.length).toBeGreaterThanOrEqual(1);
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

  it("audit detects at least one known orphan type when entries exist", () => {
    const raw = readFileSync(BASELINE_PATH, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    if (report.entries.length === 0) return; // baseline may be fully clean
    const knownTypes = new Set(["unreferenced-export", "orphan-route", "unticked-service", "unused-component", "write-only-state"]);
    const types = new Set(report.entries.map((e) => e.orphanType));
    const hasKnownType = [...types].some((t) => knownTypes.has(t));
    expect(hasKnownType, `Expected at least one known orphan type, got: ${[...types].join(", ")}`).toBe(true);
  });
});

describe("Audit runner consistency — two runs produce same orphan set", () => {
  async function runAudit(): Promise<{ summary: AuditReport["summary"]; symbols: string[] }> {
    const tmpJson = uniqueJsonPath();
    await execAsync(`npx tsx scripts/audit-orphans.ts --json "${tmpJson}"`, {
      cwd: ROOT,
      timeout: 180000,
    });
    const raw = readFileSync(tmpJson, "utf-8");
    const report = JSON.parse(raw) as AuditReport;
    unlinkSync(tmpJson);
    return {
      summary: report.summary,
      symbols: report.entries.map((e) => `${e.file}:${e.symbol}`).sort(),
    };
  }

  it("produces identical orphan counts across two runs", { timeout: 240000 }, async () => {
    const run1 = await runAudit();
    const run2 = await runAudit();
    expect(run1.summary.total).toBe(run2.summary.total);
    expect(run1.summary.unreferencedExports).toBe(run2.summary.unreferencedExports);
    expect(run1.summary.orphanRoutes).toBe(run2.summary.orphanRoutes);
    expect(run1.summary.writeOnlyState).toBe(run2.summary.writeOnlyState);
  });

  it("produces identical orphan symbol set across two runs", { timeout: 240000 }, async () => {
    const run1 = await runAudit();
    const run2 = await runAudit();
    expect(run1.symbols).toEqual(run2.symbols);
  });
});

describe("Audit runner injection — detects a deliberately orphaned export", () => {
  it("detects a temp file with an unreferenced export", { timeout: 240000 }, async () => {
    // Create a temp file with an exported function that nothing imports
    mkdirSync(TEMP_ORPHAN_DIR, { recursive: true });
    // Use a unique name that won't appear in any test file to avoid false "referenced" matches
    const probeName = "__auditProbeOrphanFn_" + Date.now() + "__";
    writeFileSync(
      TEMP_ORPHAN_FILE,
      `export function ${probeName}(): string { return "test"; }\n`
    );

    try {
      const tmpJson = uniqueJsonPath();
      await execAsync(`npx tsx scripts/audit-orphans.ts --json "${tmpJson}"`, {
        cwd: ROOT,
        timeout: 180000,
      });
      const raw = readFileSync(tmpJson, "utf-8");
      const report = JSON.parse(raw) as AuditReport;
      unlinkSync(tmpJson);

      const found = report.entries.some(
        (e) => e.symbol === probeName && e.orphanType === "unreferenced-export"
      );
      expect(found, "Audit script did not detect the injected orphaned export").toBe(true);
    } finally {
      rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    }
  });

  it("cleans up temp files after injection test", () => {
    expect(existsSync(TEMP_ORPHAN_DIR), "Temp orphan directory should be cleaned up").toBe(false);
  });
});
