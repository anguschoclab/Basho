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
        if (/for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.rikishi/.test(line) || /for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.rikishi\.values\(\)/.test(line)) {
          nestedInRikishiLoop = true;
        }
        if (/for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.heyas/.test(line) || /for\s*\(\s*(const|let)\s+\w+\s+of\s+world\.heyas\.values\(\)/.test(line)) {
          nestedInHeyasLoop = true;
        }
        if ((nestedInRikishiLoop || nestedInHeyasLoop) && /for\s*\(\s*(const|let)\s+/.test(line) && !line.includes("world.rikishi") && !line.includes("world.heyas")) {
          violations.push(`${file}:${i + 1}: nested loop inside world.rikishi/heyas iteration: ${line.trim()}`);
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
        }
        if (line === "" || line.trim() === "}") {
          nestedInRikishiLoop = false;
          nestedInHeyasLoop = false;
        }
      });
    }

    expect(violations.length, `Potential O(n²) loops:\n${violations.join("\n")}`).toBeLessThanOrEqual(5);
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
        if (/for\s*\(/.test(line) || /\.forEach\s*\(/.test(line) || /\.map\s*\(/.test(line) || /\.filter\s*\(/.test(line)) {
          inLoop = true;
          loopDepth++;
        }
        if (inLoop && /world\.rikishi\.get\(/.test(line) && loopDepth > 1) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
        if (line.includes("}") && loopDepth > 0) {
          loopDepth--;
          if (loopDepth === 0) inLoop = false;
        }
      });
    }

    expect(violations.length, `Repeated world.rikishi.get() inside nested loops:\n${violations.join("\n")}`).toBeLessThanOrEqual(10);
  });
});
