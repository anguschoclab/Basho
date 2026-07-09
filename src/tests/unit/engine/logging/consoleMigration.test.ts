import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC_ROOT = join(import.meta.dirname, "..", "..", "..", "..");

const PRODUCTION_EXCLUSIONS = new Set<string>(["engine/utils/Logger.ts"]);

const CONSOLE_CALL_RE = /console\.(log|warn|error|info|debug)\s*\(/g;
const JSDOC_LINE_RE = /^\s*\*/;

describe("console migration audit", () => {
  it("Logger.ts is the only production file with direct console.* calls", () => {
    const violators: string[] = [];

    function walk(d: string) {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          if (entry === "tests" || entry === "__tests__") continue;
          walk(full);
        } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
          const rel = relative(SRC_ROOT, full).replace(/\\/g, "/");
          if (PRODUCTION_EXCLUSIONS.has(rel)) continue;

          const content = readFileSync(full, "utf8");
          const lines = content.split("\n");
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
      }
    }

    walk(SRC_ROOT);

    expect(violators).toEqual([]);
  });
});
