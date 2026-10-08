import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { findFiles, SRC as SRC_DIR } from "@/tests/helpers/fsScan";

const NON_TEST_RE = /\.test\.tsx?$|\.d\.ts$/;

describe("L2.3: determinism gate — Math.random scan", () => {
  it("no Math.random() calls in engine production code (only in comments)", () => {
    const engineFiles = findFiles(join(SRC_DIR, "engine"), {
      exts: [".ts"],
      exclude: NON_TEST_RE,
    });
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
          return;
        }
        const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "");
        if (/\bMath\.random\s*\(/.test(stripped)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(violations, `Math.random() calls in engine code:\n${violations.join("\n")}`).toEqual([]);
  });
});
