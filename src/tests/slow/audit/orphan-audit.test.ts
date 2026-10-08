import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  unlinkSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from "fs";
import { join } from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const ROOT = join(__dirname, "../../../..");
const AUDIT_DIR = join(ROOT, ".windsurf", "audit");
const BASELINE_PATH = join(AUDIT_DIR, "baseline-orphans.json");
const TRACKER_PATH = join(AUDIT_DIR, "orphan-tracker.csv");
const SYSTEMS_DIR = join(ROOT, "src", "engine", "systems");

let uniqueCounter = 0;
function uniqueJsonPath(): string {
  return join(AUDIT_DIR, `consistency-check-${Date.now()}-${++uniqueCounter}.json`);
}

async function runAudit(): Promise<AuditReport> {
  const tmpJson = uniqueJsonPath();
  await execAsync(`npx tsx scripts/audit-orphans.ts --json "${tmpJson}"`, {
    cwd: ROOT,
    timeout: 180000,
  });
  const raw = readFileSync(tmpJson, "utf-8");
  unlinkSync(tmpJson);
  return JSON.parse(raw) as AuditReport;
}

function cleanFixtures() {
  if (existsSync(SYSTEMS_DIR)) {
    for (const entry of readdirSync(SYSTEMS_DIR)) {
      if (entry.startsWith("__audit_")) {
        rmSync(join(SYSTEMS_DIR, entry), { recursive: true, force: true });
      }
    }
  }
}

// Top-level cleanup: remove any lingering __audit_* directories after all tests
afterAll(cleanFixtures);

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

describe("Audit runner consistency — two runs produce same orphan set", () => {
  // Two audit runs shared by both assertions (was 4 runs).
  let run1: { summary: AuditReport["summary"]; symbols: string[] };
  let run2: { summary: AuditReport["summary"]; symbols: string[] };

  const symbols = (r: AuditReport) =>
    r.entries.map((e) => `${e.file}:${e.symbol}`).sort();

  beforeAll(async () => {
    cleanFixtures();
    const a = await runAudit();
    cleanFixtures();
    const b = await runAudit();
    run1 = { summary: a.summary, symbols: symbols(a) };
    run2 = { summary: b.summary, symbols: symbols(b) };
  }, 480000);

  it("produces identical orphan counts across two runs", () => {
    expect(run1.summary.total).toBe(run2.summary.total);
    expect(run1.summary.unreferencedExports).toBe(run2.summary.unreferencedExports);
    expect(run1.summary.orphanRoutes).toBe(run2.summary.orphanRoutes);
    expect(run1.summary.writeOnlyState).toBe(run2.summary.writeOnlyState);
  });

  it("produces identical orphan symbol set across two runs", () => {
    expect(run1.symbols).toEqual(run2.symbols);
  });
});

describe("Audit runner fixtures — injected files", () => {
  // All three fixture scenarios are created together and checked by ONE audit
  // run (was 3 separate runs — the audit scans the whole tree each time, and
  // the scenarios assert disjoint symbols, so they share one scan).
  const stamp = Date.now();
  const injectDir = join(SYSTEMS_DIR, `__audit_injection_${stamp}__`);
  const nsDir = join(SYSTEMS_DIR, `__audit_ns_${stamp}__`);
  const collDir = join(SYSTEMS_DIR, `__audit_coll_${stamp}__`);
  const probeName = `__auditProbeOrphanFn_${stamp}__`;
  const nsProbeName = `__nsProbeFn_${stamp}__`;
  const collisionName = `__collisionFn_${stamp}__`;

  let report: AuditReport;

  beforeAll(async () => {
    cleanFixtures();
    // Scenario 1: a file with an unreferenced export (should be detected)
    mkdirSync(injectDir, { recursive: true });
    writeFileSync(
      join(injectDir, "tempOrphanProbe.ts"),
      `export function ${probeName}(): string { return "test"; }\n`
    );
    // Scenario 2: service consumed via namespace import (should NOT be unticked)
    mkdirSync(nsDir, { recursive: true });
    writeFileSync(
      join(nsDir, "NsProbeService.ts"),
      `export function ${nsProbeName}(): string { return "ns"; }\n`
    );
    writeFileSync(
      join(nsDir, "NsProbeConsumer.ts"),
      `import * as NsProbe from "./NsProbeService";\nexport function useNsProbe(): string { return NsProbe.${nsProbeName}(); }\n`
    );
    // Scenario 3: same-named exports, only one imported (B must still be flagged)
    mkdirSync(collDir, { recursive: true });
    writeFileSync(
      join(collDir, "CollisionSvcA.ts"),
      `export function ${collisionName}(): string { return "a"; }\n`
    );
    writeFileSync(
      join(collDir, "CollisionSvcB.ts"),
      `export function ${collisionName}(): string { return "b"; }\n`
    );
    writeFileSync(
      join(collDir, "CollisionConsumer.ts"),
      `import { ${collisionName} } from "./CollisionSvcA";\nexport function useCollision(): string { return ${collisionName}(); }\n`
    );

    report = await runAudit();
  }, 240000);

  afterAll(cleanFixtures);

  it("detects a temp file with an unreferenced export", () => {
    const found = report.entries.some(
      (e) => e.symbol === probeName && e.orphanType === "unreferenced-export"
    );
    expect(found, "Audit script did not detect the injected orphaned export").toBe(true);
  });

  it("does not flag services imported via namespace imports as unticked", () => {
    const found = report.entries.some(
      (e) => e.symbol === "NsProbeService" && e.orphanType === "unticked-service"
    );
    expect(
      found,
      "Service imported via namespace import should NOT be flagged as unticked"
    ).toBe(false);
  });

  it("flags services with same-named exports when only one is imported (no false negative)", () => {
    const bFlagged = report.entries.some(
      (e) => e.symbol === "CollisionSvcB" && e.orphanType === "unticked-service"
    );
    const aFlagged = report.entries.some(
      (e) => e.symbol === "CollisionSvcA" && e.orphanType === "unticked-service"
    );
    expect(
      bFlagged,
      "Service B (not imported) should be flagged as unticked despite name collision"
    ).toBe(true);
    expect(aFlagged, "Service A (imported) should NOT be flagged as unticked").toBe(false);
  });
});

describe("Audit fixture cleanup", () => {
  it("leaves no __audit_* directories after fixture tests", () => {
    if (existsSync(SYSTEMS_DIR)) {
      const leftover = readdirSync(SYSTEMS_DIR).filter((e: string) =>
        e.startsWith("__audit_")
      );
      expect(leftover, "Temp injection directories should be cleaned up").toEqual([]);
    }
  });
});
