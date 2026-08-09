import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";

const ENGINE_DIR = join(import.meta.dirname, "../../../engine");

function scanForNewDate(
  dir: string,
  results: Array<{ file: string; line: number; text: string }>
): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && !entry.name.includes("__tests__")) {
        scanForNewDate(fullPath, results);
      }
    } else if (extname(entry.name) === ".ts" && !entry.name.endsWith(".test.ts")) {
      const content = readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        if (line.includes("new Date(")) {
          results.push({ file: fullPath, line: i + 1, text: trimmed });
        }
      });
    }
  }
}

describe("L4.3: Date arithmetic guard — no new Date() in engine production code", () => {
  it("engine code does not use new Date() except in utils/Logger and utils/formatters", () => {
    const results: Array<{ file: string; line: number; text: string }> = [];
    scanForNewDate(ENGINE_DIR, results);

    const ALLOWED = ["Logger.ts", "formatters.ts", "calendar.ts", "MigrationService.ts"];
    const violations = results.filter((r) => !ALLOWED.some((a) => r.file.endsWith(a)));

    expect(
      violations,
      `Found new Date() in engine code (determinism violation):\n${violations.map((v) => `  ${v.file}:${v.line} — ${v.text}`).join("\n")}`
    ).toEqual([]);
  });
});
