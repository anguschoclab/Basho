import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);
const PROJECT_ROOT = join(import.meta.dirname, "../../../");

describe("circular dependency detection", () => {
  it("no circular dependencies in src/engine/", async () => {
    let stdout = "";
    try {
      const result = await execAsync(
        "npx madge --circular --extensions ts src/engine/ --exclude '\\.test\\.'",
        { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }
      );
      stdout = result.stdout;
    } catch (e: unknown) {
      const err = e as { stdout?: string; message?: string };
      stdout = err.stdout || "";
      // Fail-closed (S9-6): a spawn/timeout failure produces no stdout and
      // previously passed as "no circles". If madge didn't run, fail.
      if (!stdout) {
        throw new Error(
          `madge did not run — no output captured. Underlying error: ${err.message ?? e}`,
          { cause: e }
        );
      }
    }

    const circles = stdout
      .split("\n")
      .filter((l) => /circular|→|^\s*\d+\)/i.test(l) && !l.includes("No circular"));

    // Fail-closed: a real madge run always reports — either "No circular
    // dependencies found" or a findings list. Neither means madge produced
    // unusable output and the gate must not pass silently.
    if (!stdout.includes("No circular") && circles.length === 0) {
      throw new Error(
        `madge produced no completion marker — output not parseable:\n${stdout.slice(0, 500)}`
      );
    }

    expect(circles, `Circular dependencies in src/engine/:\n${circles.join("\n")}`).toEqual([]);
  }, 60000);
});
