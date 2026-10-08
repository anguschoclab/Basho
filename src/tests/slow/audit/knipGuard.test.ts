import { describe, it, expect } from "vitest";
import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = join(import.meta.dirname, "../../../..");

describe("knip dead code scan", () => {
  it("no unused source files in src/ (excluding barrel index.ts files)", async () => {
    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync("npx", ["knip", "--no-gitignore"], {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (e: unknown) {
      const err = e as { stdout?: string; stderr?: string };
      stdout = err.stdout || "";
      stderr = err.stderr || "";
    }

    const output = stdout + stderr;
    const knownBarrelReExports = new Set([
      "src/components/ui/Sparkline.tsx",
      "src/components/media/PressConference.tsx",
      "src/constants/ui/kesho.ts",
      "src/constants/ui/presenters.ts",
      "src/engine/npcAI/strategies/sponsor/SponsorStrategy.ts",
      "src/tests/unit/utils/testFixtures.ts",
    ]);
    const lines = output
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.startsWith("src/") && !l.endsWith("index.ts") && !l.includes(".test."))
      .filter((l) => !knownBarrelReExports.has(l));

    expect(lines, `Unused source files detected by knip:\n${lines.join("\n")}`).toEqual([]);
  }, 60000);
});
