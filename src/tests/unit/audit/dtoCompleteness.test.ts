import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const PRESENTERS_DIR = join(SRC_DIR, "presenters");
const PAGES_DIR = join(SRC_DIR, "pages");

function findFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.8: DTO completeness — presenter types exist", () => {
  it("presenter directory has type definition files", () => {
    const typeFiles = findFiles(PRESENTERS_DIR, ".ts").filter((f) =>
      f.includes("Types.ts") || f.includes("types.ts") || f.includes("uiDigestTypes.ts")
    );
    expect(typeFiles.length, "No presenter type files found").toBeGreaterThan(0);
  });

  it("no page imports raw WorldState type (should use presenter DTOs)", () => {
    const pageFiles = findFiles(PAGES_DIR, ".tsx");
    const violations: string[] = [];

    for (const file of pageFiles) {
      const content = readFileSync(file, "utf-8");
      if (content.includes("import") && content.includes("WorldState") && !content.includes("type { WorldState }")) {
        const lines = content.split("\n");
        lines.forEach((line, i) => {
          if (line.includes("import") && line.includes("WorldState")) {
            violations.push(`${file}:${i + 1}: ${line.trim()}`);
          }
        });
      }
    }

    expect(violations, `Pages importing raw WorldState:\n${violations.join("\n")}`).toEqual([]);
  });
});
