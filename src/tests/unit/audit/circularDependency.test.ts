import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);
const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

describe("circular dependency detection", () => {
  it("no circular dependencies in src/", async () => {
    try {
      const { stdout } = await execAsync("npx madge --circular --extensions ts,tsx src/ --exclude '\\.test\\.'", {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
      const circles = stdout.trim();
      expect(circles, `Circular dependencies detected:\n${circles}`).toBe("");
    } catch (e: unknown) {
      const err = e as { stdout?: string };
      if (err.stdout && err.stdout.trim()) {
        expect.fail(`Circular dependencies detected:\n${err.stdout}`);
      }
    }
  }, 60000);
});
