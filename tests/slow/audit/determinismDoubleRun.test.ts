import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../");

/**
 * V14-R05: determinism-double-run catches the recurring bug family this
 * audit surfaced — module-scope state or repeating seeded-RNG labels that
 * make a second same-seed run diverge inside one process (V14-B04, V14-B09,
 * V14-B10). It existed as a script but was never gated; wiring it into the
 * slow suite makes the class fail at PR time.
 */
const runDoubleRun = (horizon: "basho" | "year") => {
  let stdout = "";
  let exitCode = 0;
  try {
    stdout = execSync(`bun scripts/sim/determinism-double-run.ts ${horizon}`, {
      cwd: PROJECT_ROOT,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 480_000,
    });
  } catch (err: unknown) {
    exitCode = (err as { status?: number }).status ?? 1;
    stdout = `${(err as { stdout?: string }).stdout ?? ""}${(err as { stderr?: string }).stderr ?? ""}`;
  }
  return { stdout, exitCode };
};

describe("determinism double-run — production gate", () => {
  it(
    "two sequential same-seed autosims serialize byte-identically (basho)",
    () => {
      const { stdout, exitCode } = runDoubleRun("basho");
      expect(exitCode, `determinism double-run diverged:\n${stdout}`).toBe(0);
    },
    480_000
  );

  // S9-8: the basho horizon alone never exercises year-boundary systems —
  // retirement waves, banzuke re-rolls, era drift, age progression. A year
  // run catches the divergence class that only fires across the boundary.
  it(
    "two sequential same-seed autosims serialize byte-identically (year)",
    () => {
      const { stdout, exitCode } = runDoubleRun("year");
      expect(exitCode, `determinism double-run (year) diverged:\n${stdout}`).toBe(0);
    },
    480_000
  );
});
