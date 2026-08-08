import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

const SRC_DIR = join(import.meta.dirname, "../../../..", "src");
const ENGINE_DIR = join(SRC_DIR, "engine");

function findTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTsFiles(fullPath));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("L4.2: performance hotspots — O(n²) loop detection", () => {
  it("no nested for...of loops over world.rikishi or world.heyas (O(n²) risk)", () => {
    const engineFiles = findTsFiles(ENGINE_DIR);
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      let nestedInRikishiLoop = false;
      let nestedInHeyasLoop = false;
      lines.forEach((line, i) => {
        // Reset flags when encountering a new world-collection loop (sequential, not nested)
        const isRikishiLoop = /for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.rikishi/.test(line);
        const isHeyasLoop = /for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.heyas/.test(line);
        if (isRikishiLoop) {
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
          // Single-line loop (no opening brace) — not a nesting context
          nestedInRikishiLoop = line.includes("{") ? true : false;
        }
        if (isHeyasLoop) {
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
          nestedInHeyasLoop = line.includes("{") ? true : false;
        }
        // Only flag inner loops that iterate over another world-scale collection (true O(n²))
        const innerIsWorldCollection = line.includes("world.rikishi") || line.includes("world.heyas") || line.includes("world.historicalRikishi") || line.includes("world.staff") || line.includes("world.oyakata");
        if ((nestedInRikishiLoop || nestedInHeyasLoop) && /for\s*\(\s*(const|let)\s+/.test(line) && innerIsWorldCollection && !isRikishiLoop && !isHeyasLoop) {
          violations.push(`${file}:${i + 1}: nested loop inside world.rikishi/heyas iteration: ${line.trim()}`);
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
        }
        // Reset on closing brace or blank line
        if (line === "" || /^\s*}\s*$/.test(line) || /^\s*}\s*;?\s*$/.test(line)) {
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
        }
      });
    }

    expect(violations.length, `Potential O(n²) loops:\n${violations.join("\n")}`).toEqual(0);
  });

  it("no repeated world.rikishi.get(id) inside inner loops (should cache outside)", () => {
    const engineFiles = findTsFiles(ENGINE_DIR);
    const violations: string[] = [];

    for (const file of engineFiles) {
      const content = readFileSync(file, "utf-8");
      const lines = content.split("\n");
      let inLoop = false;
      let loopDepth = 0;
      lines.forEach((line, i) => {
        // Only count for() and .forEach() as loop constructs, not .filter()/.map() which create arrays
        if (/for\s*\(/.test(line) || /\.forEach\s*\(/.test(line)) {
          inLoop = true;
          loopDepth++;
        }
        if (inLoop && /world\.rikishi\.get\(/.test(line) && loopDepth > 1) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
        // Decrement loop depth for each closing brace on the line
        const closeBraces = (line.match(/\}/g) || []).length;
        if (closeBraces > 0 && loopDepth > 0) {
          loopDepth = Math.max(0, loopDepth - closeBraces);
          if (loopDepth === 0) inLoop = false;
        }
      });
    }

    expect(violations.length, `Repeated world.rikishi.get() inside nested loops:\n${violations.join("\n")}`).toEqual(0);
  });
});
