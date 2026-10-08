import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { REPO_ROOT } from "@/tests/helpers/fsScan";

const TIMINGS_PATH = join(REPO_ROOT, "docs", "audit", "test-timings.json");

/** Max per-file measured time allowed in the fast suite (ms). Headroom over
 *  the serial-file reality (~2s max) absorbs parallel-contention inflation —
 *  a file measuring >10s under vmThreads+parallelism is genuinely slow. */
const FAST_FILE_BUDGET_MS = 10_000;
/** Warn (don't fail) when the committed baseline is older than this. */
const STALENESS_WARN_DAYS = 30;

interface TimingsReport {
  generatedAt: string;
  suites: Record<
    string,
    { files: Array<{ file: string; durationMs: number; testCount: number }> }
  >;
}

// Reads the committed timing baseline (docs/audit/test-timings.json, refreshed
// via `bun run test:timings -- fast`) and fails if any fast-suite file drifts
// over the budget — catches slow tests creeping into `bun run test` before
// they're noticed. See docs/test-suite-optimization-plan.md Phase 5.
describe("fast suite timing budget", () => {
  it("docs/audit/test-timings.json exists and parses", () => {
    expect(
      existsSync(TIMINGS_PATH),
      "Missing test-timings.json — run: bun run test:timings -- fast"
    ).toBe(true);
    const report = JSON.parse(readFileSync(TIMINGS_PATH, "utf-8")) as TimingsReport;
    expect(report.suites?.fast?.files?.length).toBeGreaterThan(0);
  });

  it("no fast-suite file exceeds the per-file duration budget", () => {
    const report = JSON.parse(readFileSync(TIMINGS_PATH, "utf-8")) as TimingsReport;
    const over = (report.suites?.fast?.files ?? []).filter(
      (f) => f.durationMs > FAST_FILE_BUDGET_MS
    );
    expect(
      over,
      `Fast-suite files over ${FAST_FILE_BUDGET_MS}ms — move to src/tests/slow/ ` +
        `or optimize (baseline: bun run test:timings):\n` +
        over.map((f) => `  ${(f.durationMs / 1000).toFixed(1)}s ${f.file}`).join("\n")
    ).toEqual([]);
  });

  it("every measured fast-suite file still exists (baseline not stale)", () => {
    const report = JSON.parse(readFileSync(TIMINGS_PATH, "utf-8")) as TimingsReport;
    const gone = (report.suites?.fast?.files ?? []).filter(
      (f) => !existsSync(join(REPO_ROOT, f.file))
    );
    expect(
      gone,
      `Timings baseline references moved/deleted files — regenerate: ` +
        `bun run test:timings -- fast\n` +
        gone.map((f) => `  ${f.file}`).join("\n")
    ).toEqual([]);
  });

  it("baseline is not stale", () => {
    const ageDays =
      (Date.now() - statSync(TIMINGS_PATH).mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays > STALENESS_WARN_DAYS) {
      console.warn(
        `test-timings.json is ${Math.round(ageDays)}d old — ` +
          `refresh with: bun run test:timings -- fast`
      );
    }
    expect(true).toBe(true);
  });
});
