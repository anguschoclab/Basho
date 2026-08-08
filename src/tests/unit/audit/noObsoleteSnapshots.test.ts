import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "fs";
import { join } from "path";

const SNAPSHOTS_DIR = join(import.meta.dirname, "../../..", "__snapshots__");

function findSnapshotFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSnapshotFiles(fullPath));
    } else if (entry.name.endsWith(".snap")) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("no obsolete snapshots", () => {
  it("all .snap files reference existing test files", () => {
    const snapFiles = findSnapshotFiles(SNAPSHOTS_DIR);
    const srcSnapDir = join(import.meta.dirname, "../../..", "src", "__snapshots__");
    const allSnaps = [...snapFiles];
    if (existsSync(srcSnapDir)) {
      allSnaps.push(...findSnapshotFiles(srcSnapDir));
    }

    const orphans: string[] = [];

    for (const snapFile of allSnaps) {
      const expectedTestFile = snapFile.replace(/\.snap$/, "");
      if (!existsSync(expectedTestFile)) {
        orphans.push(snapFile);
      }
    }

    expect(orphans, `Obsolete snapshot files with no corresponding test: ${orphans.join(", ")}`).toEqual([]);
  });
});
