import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");
const DOCS_DIR = join(PROJECT_ROOT, "docs");
const README = join(PROJECT_ROOT, "README.md");

function findMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findMdFiles(fullPath));
    } else if (entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L1.2: stale documentation audit", () => {
  it("README.md exists", () => {
    expect(existsSync(README), "README.md not found at project root").toBe(true);
  });

  it("docs/ directory exists", () => {
    expect(existsSync(DOCS_DIR), "docs/ directory not found").toBe(true);
  });

  it("no markdown files reference deleted scripts or non-existent paths", () => {
    const mdFiles = [README, ...findMdFiles(DOCS_DIR)];
    const staleRefs: string[] = [];

    for (const mdFile of mdFiles) {
      if (!existsSync(mdFile)) continue;
      const content = readFileSync(mdFile, "utf-8");
      const scriptRefs = content.match(/`bun run \S+`/g) || [];
      for (const ref of scriptRefs) {
        const scriptName = ref.replace(/`bun run /, "").replace(/`/, "");
        if (scriptName.startsWith("src/")) {
          const fullPath = join(PROJECT_ROOT, scriptName);
          if (!existsSync(fullPath)) {
            staleRefs.push(`${mdFile}: references non-existent script '${scriptName}'`);
          }
        }
      }
    }

    expect(staleRefs, `Stale documentation references:\n${staleRefs.join("\n")}`).toEqual([]);
  });
});
