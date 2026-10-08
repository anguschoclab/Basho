import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { findFiles } from "@/tests/helpers/fsScan";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "..", "..");

const PRODUCTION_EXCLUSIONS = new Set<string>(["engine/utils/Logger.ts"]);

const CONSOLE_CALL_RE = /console\.(log|warn|error|info|debug)\s*\(/g;
const JSDOC_LINE_RE = /^\s*\*/;

describe("console migration audit", () => {
  it("Logger.ts is the only production file with direct console.* calls", () => {
    const violators: string[] = [];

    const files = findFiles(SRC_ROOT, {
      skipDirs: new Set(["node_modules", ".git", "dist", "coverage", "tests", "__tests__"]),
    });
    for (const full of files) {
      const rel = relative(SRC_ROOT, full).replace(/\\/g, "/");
      if (PRODUCTION_EXCLUSIONS.has(rel)) continue;

      const lines = readFileSync(full, "utf8").split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (JSDOC_LINE_RE.test(line)) continue;
        if (line.trim().startsWith("//")) continue;
        CONSOLE_CALL_RE.lastIndex = 0;
        if (CONSOLE_CALL_RE.test(line)) {
          violators.push(`${rel}:${i + 1}: ${line.trim()}`);
        }
      }
    }

    expect(violators).toEqual([]);
  });
});
