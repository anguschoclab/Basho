import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync, writeFileSync, unlinkSync, mkdirSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const ROOT = join(__dirname, "../../../..");
const AUDIT_DIR = join(ROOT, ".windsurf", "audit");
const BASELINE_PATH = join(AUDIT_DIR, "baseline-orphans.json");
const TRACKER_PATH = join(AUDIT_DIR, "orphan-tracker.csv");
const SYSTEMS_DIR = join(ROOT, "src", "engine", "systems");
const TEMP_ORPHAN_DIR = join(SYSTEMS_DIR, "__audit_test__");
const TEMP_ORPHAN_FILE = join(TEMP_ORPHAN_DIR, "tempOrphanProbe.ts");

let uniqueCounter = 0;
function uniqueJsonPath(): string {
  return join(AUDIT_DIR, `consistency-check-${Date.now()}-${++uniqueCounter}.json`);
}

// Top-level cleanup: remove any lingering __audit_* directories after all tests
afterAll(() => {
  if (existsSync(SYSTEMS_DIR)) {
    const entries = readdirSync(SYSTEMS_DIR);
    for (const entry of entries) {
      if (entry.startsWith("__audit_")) {
        rmSync(join(SYSTEMS_DIR, entry), { recursive: true, force: true });
      }
    }
  }
});

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
    const knownTypes = new Set([
      "unreferenced-export",
      "orphan-route",
      "unticked-service",
      "unused-component",
      "write-only-state",
    ]);
    const types = new Set(report.entries.map((e) => e.orphanType));
    const hasKnownType = [...types].some((t) => knownTypes.has(t));
    expect(
      hasKnownType,
      `Expected at least one known orphan type, got: ${[...types].join(", ")}`
    ).toBe(true);
  });
});

describe.serial("Audit runner consistency — two runs produce same orphan set", () => {
  beforeAll(() => {
    // Clean up any lingering temp files from the injection test
    if (existsSync(TEMP_ORPHAN_DIR)) {
      rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    }
  });

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
    if (existsSync(TEMP_ORPHAN_DIR)) rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    const run1 = await runAudit();
    if (existsSync(TEMP_ORPHAN_DIR)) rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    const run2 = await runAudit();
    expect(run1.summary.total).toBe(run2.summary.total);
    expect(run1.summary.unreferencedExports).toBe(run2.summary.unreferencedExports);
    expect(run1.summary.orphanRoutes).toBe(run2.summary.orphanRoutes);
    expect(run1.summary.writeOnlyState).toBe(run2.summary.writeOnlyState);
  });

  it("produces identical orphan symbol set across two runs", { timeout: 240000 }, async () => {
    // Clean up any temp files from concurrent test files before each run
    if (existsSync(TEMP_ORPHAN_DIR)) rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    const run1 = await runAudit();
    if (existsSync(TEMP_ORPHAN_DIR)) rmSync(TEMP_ORPHAN_DIR, { recursive: true, force: true });
    const run2 = await runAudit();
    expect(run1.symbols).toEqual(run2.symbols);
  });
});

describe.serial("Audit runner injection — detects a deliberately orphaned export", () => {
  it("detects a temp file with an unreferenced export", { timeout: 240000 }, async () => {
    // Use a unique temp directory to avoid interference with consistency tests
    const injectDir = join(SYSTEMS_DIR, `__audit_injection_${Date.now()}__`);
    const injectFile = join(injectDir, "tempOrphanProbe.ts");
    mkdirSync(injectDir, { recursive: true });
    // Use a unique name that won't appear in any test file to avoid false "referenced" matches
    const probeName = "__auditProbeOrphanFn_" + Date.now() + "__";
    writeFileSync(injectFile, `export function ${probeName}(): string { return "test"; }\n`);

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
      rmSync(injectDir, { recursive: true, force: true });
    }
  });

  it("cleans up temp files after injection test", () => {
    // Check that no __audit_injection_* directories remain
    if (existsSync(SYSTEMS_DIR)) {
      const entries = readdirSync(SYSTEMS_DIR);
      const leftover = entries.filter((e: string) => e.startsWith("__audit_injection_"));
      expect(leftover, "Temp injection directories should be cleaned up").toEqual([]);
    }
  });
});

describe.serial("Audit import-statement parsing — namespace imports and name collisions", () => {
  it("does not flag services imported via namespace imports as unticked", { timeout: 240000 }, async () => {
    // Create a temp service file with an export, and a temp consumer that uses `import * as X`
    const nsDir = join(SYSTEMS_DIR, `__audit_ns_${Date.now()}__`);
    const svcFile = join(nsDir, "NsProbeService.ts");
    const consumerFile = join(nsDir, "NsProbeConsumer.ts");
    mkdirSync(nsDir, { recursive: true });

    const probeName = "__nsProbeFn_" + Date.now() + "__";
    writeFileSync(svcFile, `export function ${probeName}(): string { return "ns"; }\n`);
    // Consumer uses namespace import — individual export names won't appear as bare words
    writeFileSync(consumerFile, `import * as NsProbe from "./NsProbeService";\nexport function useNsProbe(): string { return NsProbe.${probeName}(); }\n`);

    try {
      const tmpJson = uniqueJsonPath();
      await execAsync(`npx tsx scripts/audit-orphans.ts --json "${tmpJson}"`, {
        cwd: ROOT,
        timeout: 180000,
      });
      const raw = readFileSync(tmpJson, "utf-8");
      const report = JSON.parse(raw) as AuditReport;
      unlinkSync(tmpJson);

      // The service should NOT be flagged as unticked because it's imported via namespace
      const found = report.entries.some(
        (e) => e.symbol === "NsProbeService" && e.orphanType === "unticked-service"
      );
      expect(found, "Service imported via namespace import should NOT be flagged as unticked").toBe(false);
    } finally {
      rmSync(nsDir, { recursive: true, force: true });
    }
  });

  it("flags services with same-named exports when only one is imported (no false negative)", { timeout: 240000 }, async () => {
    // Create two service files with the same export name, import only one
    const collDir = join(SYSTEMS_DIR, `__audit_coll_${Date.now()}__`);
    const svcA = join(collDir, "CollisionSvcA.ts");
    const svcB = join(collDir, "CollisionSvcB.ts");
    const consumer = join(collDir, "CollisionConsumer.ts");
    mkdirSync(collDir, { recursive: true });

    const sharedName = "__collisionFn_" + Date.now() + "__";
    writeFileSync(svcA, `export function ${sharedName}(): string { return "a"; }\n`);
    writeFileSync(svcB, `export function ${sharedName}(): string { return "b"; }\n`);
    // Consumer imports only from svcA
    writeFileSync(consumer, `import { ${sharedName} } from "./CollisionSvcA";\nexport function useCollision(): string { return ${sharedName}(); }\n`);

    try {
      const tmpJson = uniqueJsonPath();
      await execAsync(`npx tsx scripts/audit-orphans.ts --json "${tmpJson}"`, {
        cwd: ROOT,
        timeout: 180000,
      });
      const raw = readFileSync(tmpJson, "utf-8");
      const report = JSON.parse(raw) as AuditReport;
      unlinkSync(tmpJson);

      // CollisionSvcB should BE flagged as unticked (its export is not imported by anyone)
      const bFlagged = report.entries.some(
        (e) => e.symbol === "CollisionSvcB" && e.orphanType === "unticked-service"
      );
      // CollisionSvcA should NOT be flagged (it IS imported)
      const aFlagged = report.entries.some(
        (e) => e.symbol === "CollisionSvcA" && e.orphanType === "unticked-service"
      );
      expect(bFlagged, "Service B (not imported) should be flagged as unticked despite name collision").toBe(true);
      expect(aFlagged, "Service A (imported) should NOT be flagged as unticked").toBe(false);
    } finally {
      rmSync(collDir, { recursive: true, force: true });
    }
  });
});
