import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const TESTS_DIR = join(import.meta.dirname, "../../..", "tests");

function findTestFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.10: test quality — weak assertion audit", () => {
  it("no test files use only expect(true).toBe(true) as sole assertion", () => {
    const testFiles = findTestFiles(TESTS_DIR);
    const weakFiles: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, "utf-8");
      const hasExpectTrue = content.includes("expect(true).toBe(true)");
      const hasOtherExpects = (content.match(/expect\(/g) || []).length > 1;
      if (hasExpectTrue && !hasOtherExpects) {
        weakFiles.push(file);
      }
    }

    expect(weakFiles, `Files with only expect(true).toBe(true):\n${weakFiles.join("\n")}`).toEqual(
      []
    );
  });

  it("no test files use only toBeTruthy() without specific value checks", () => {
    const testFiles = findTestFiles(TESTS_DIR);
    const weakFiles: string[] = [];

    for (const file of testFiles) {
      const content = readFileSync(file, "utf-8");
      const truthyCount = (content.match(/\.toBeTruthy\(\)/g) || []).length;
      const totalExpects = (content.match(/expect\(/g) || []).length;
      if (truthyCount > 0 && truthyCount === totalExpects && totalExpects < 3) {
        weakFiles.push(file);
      }
    }

    expect(weakFiles, `Files with only toBeTruthy() assertions:\n${weakFiles.join("\n")}`).toEqual(
      []
    );
  });
});
