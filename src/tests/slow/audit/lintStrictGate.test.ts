import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

interface EslintFileResult {
  errorCount: number;
  suppressedMessages: Array<{ ruleId: string }>;
}

describe("L4.5: ESLint CI gate — zero errors", () => {
  // One `eslint . --format json` run answers both assertions: the process exit
  // code / per-file errorCount covers "zero errors", and suppressedMessages
  // covers "no eslint-disable suppressions". Previously eslint ran twice.
  let exitCode = 0;
  let stderr = "";
  let results: EslintFileResult[] = [];

  beforeAll(() => {
    let stdout = "";
    try {
      stdout = execSync("bunx eslint . --format json", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 240_000,
      });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
      stderr = (err as { stderr?: string }).stderr ?? "";
      stdout = (err as { stdout?: string }).stdout ?? "";
    }
    if (stdout.trim()) {
      try {
        results = JSON.parse(stdout) as EslintFileResult[];
      } catch {
        results = [];
      }
    }
  }, 300_000);

  it("eslint passes with zero errors (warnings allowed)", () => {
    const errorCount = results.reduce((s, r) => s + r.errorCount, 0);
    expect(exitCode, `ESLint exited with ${exitCode}:\n${stderr}`).toBe(0);
    expect(errorCount).toBe(0);
  });

  it("no eslint-disable suppressions remain in the codebase", () => {
    let total = 0;
    for (const file of results) {
      total += file.suppressedMessages?.length ?? 0;
    }

    expect(
      total,
      `Found ${total} suppressed ESLint messages — all suppressions must be removed`
    ).toBe(0);
  });
});
