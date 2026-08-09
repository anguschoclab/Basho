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
});
