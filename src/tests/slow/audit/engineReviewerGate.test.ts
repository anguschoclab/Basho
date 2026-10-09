import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

/**
 * V10-R04: engine-reviewer.ts was self-tested but never run over
 * src/engine — CLAUDE.md claimed it "flags any reintroduced call site"
 * while nothing invoked it. This gate makes the claim true: banned
 * economics calls, Math.random, positional generateGovernanceHeadline,
 * and unannotated world.* mutations fail the slow suite.
 */
describe("engine-reviewer — production gate", () => {
  it("src/engine passes the static review with zero violations", () => {
    let stdout = "";
    let exitCode = 0;
    try {
      stdout = execSync("bun scripts/engine-reviewer.ts", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 120_000,
      });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
      stdout = (err as { stdout?: string }).stdout ?? "";
    }
    expect(exitCode, `engine-reviewer reported violations:\n${stdout}`).toBe(0);
  });
});
