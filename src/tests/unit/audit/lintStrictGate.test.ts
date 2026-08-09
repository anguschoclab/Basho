import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

describe("L4.5: ESLint CI gate — --max-warnings 0", () => {
  it("eslint passes with zero warnings and zero errors", () => {
    let exitCode = 0;
    let stderr = "";
    try {
      execSync("bunx eslint . --max-warnings 0", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
      stderr = (err as { stderr?: string }).stderr ?? "";
    }

    expect(exitCode, `ESLint exited with ${exitCode}:\n${stderr}`).toBe(0);
  });

  it("no eslint-disable suppressions remain in the codebase", () => {
    let stdout = "";
    try {
      stdout = execSync("bunx eslint . --format json", {
        cwd: PROJECT_ROOT,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 60_000,
      });
    } catch (err: unknown) {
      stdout = (err as { stdout?: string }).stdout ?? "";
    }

    const data = JSON.parse(stdout) as Array<{
      suppressedMessages: Array<{ ruleId: string }>;
    }>;
    let total = 0;
    for (const file of data) {
      total += file.suppressedMessages?.length ?? 0;
    }

    expect(
      total,
      `Found ${total} suppressed ESLint messages — all suppressions must be removed`
    ).toBe(0);
  });
});
