import { describe, it, expect } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execAsync = promisify(exec);
const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

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
      const err = e as { stdout?: string };
      stdout = err.stdout || "";
    }

    const circles = stdout.split("\n").filter((l) => l.includes("→") || l.includes("Circular"));

    expect(circles, `Circular dependencies in src/engine/:\n${circles.join("\n")}`).toEqual([]);
  }, 60000);
});
