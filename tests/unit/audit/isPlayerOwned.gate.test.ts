import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { findFiles, SRC as SRC_DIR } from "@tests/helpers/fsScan";

const NON_TEST_RE = /\.test\.tsx?$|\.d\.ts$/;

/**
 * V17-F01 follow-up gate — `Heya.isPlayerOwned` was a write-only field that
 * silently routed player crises into the NPC auto-resolve path. The field is
 * deleted; ownership derives solely from `world.playerHeyaId`. This gate
 * fails if the field (or a look-alike) ever creeps back into engine code.
 * Presenter DTOs legitimately expose a derived `isPlayerOwned` — the scan is
 * scoped to src/engine only.
 */
describe("V17-F01 gate — no isPlayerOwned in engine code", () => {
  it("src/engine never reads or writes isPlayerOwned", () => {
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
        if (/\bisPlayerOwned\b/.test(stripped)) {
          violations.push(`${file}:${i + 1}: ${line.trim()}`);
        }
      });
    }

    expect(
      violations,
      `isPlayerOwned references in engine code — derive ownership from world.playerHeyaId:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
