import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { findFiles, SRC as SRC_DIR } from "@/tests/helpers/fsScan";

describe("L2.2: test timeout budget — no excessive per-test timeouts", () => {
  it("no test sets a timeout greater than 5000ms", () => {
    const testFiles = findFiles(join(SRC_DIR, "tests"));
    const violations: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const match = line.match(/(?:test|it|describe)\s*\([^,]*,\s*(\d+)\s*[,)]/);
        if (match && parseInt(match[1], 10) > 5000) {
          violations.push(`${file}:${i + 1}: timeout ${match[1]}ms — ${line.trim()}`);
        }
      });
    }

    expect(
      violations.length,
      `Tests with timeout >5000ms:\n${violations.join("\n")}`
    ).toBeLessThanOrEqual(5);
  });

  it("no test file uses vitest.setTimeout with >30000ms", () => {
    const testFiles = findFiles(join(SRC_DIR, "tests"));
    const violations: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const match = line.match(/vitest\.setTimeout\s*\(\s*(\d+)\s*\)/);
        if (match && parseInt(match[1], 10) > 30000) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      violations.length,
      `Files with vitest.setTimeout >30000ms:\n${violations.join("\n")}`
    ).toEqual(0);
  });
});
