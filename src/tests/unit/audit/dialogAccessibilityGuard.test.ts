import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join, extname } from "path";

const COMPONENTS_DIR = join(import.meta.dirname, "../../../../src/components");

function scanForRawDialog(dir: string, results: Array<{ file: string; line: number; text: string }>): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanForRawDialog(fullPath, results);
    } else if (extname(entry.name) === ".tsx" && !entry.name.endsWith(".test.tsx")) {
      const content = readFileSync(fullPath, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;
        // Flag <Dialog> usage that doesn't import from the Radix-based ui/dialog
        if (/<Dialog[\s>]/.test(line) && !line.includes("import")) {
          results.push({ file: fullPath, line: i + 1, text: trimmed });
        }
      });
    }
  }
}

describe("L4.6: Dialog accessibility — all dialogs use Radix-based Dialog primitive", () => {
  it("all <Dialog> usages import from the Radix-based ui/dialog component", () => {
    const results: Array<{ file: string; line: number; text: string }> = [];
    scanForRawDialog(COMPONENTS_DIR, results);

    // Filter out the ui/dialog.tsx itself (the primitive definition)
    const violations = results.filter(
      (r) => !r.file.endsWith("ui/dialog.tsx"),
    );

    // Check that each file with <Dialog> usage imports from "@/components/ui/dialog"
    const filesWithDialog = new Set(violations.map((v) => v.file));
    const missingImport: string[] = [];

    for (const file of filesWithDialog) {
      const content = readFileSync(file, "utf-8");
      if (!content.includes("@/components/ui/dialog") && !content.includes("./ui/dialog")) {
        missingImport.push(file);
      }
    }

    expect(
      missingImport,
      `Files using <Dialog> without importing from the Radix-based ui/dialog (missing focus trap):\n${missingImport.map((f) => `  ${f}`).join("\n")}`,
    ).toEqual([]);
  });
});
