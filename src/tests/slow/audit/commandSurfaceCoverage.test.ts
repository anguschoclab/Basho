/**
 * commandSurfaceCoverage.test.ts
 *
 * Audit gate (WS9): every member of the `EngineCommand` union must be
 * reachable — i.e. dispatched somewhere in src/ outside the worker handler
 * layer — or explicitly listed in ALLOWED_INTERNAL with a reason. A command
 * with a handler but no dispatch site is dead surface area that either hides
 * an unwired feature or should be deleted.
 *
 * Dispatch site = a file that both contains the command's `"TYPE"` literal
 * and calls `sendCommand(` or `postMessage(`. Worker-side files are excluded
 * because a case label is a handler, not a dispatch.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { SRC, findFiles, readSrcFile } from "@/tests/helpers/fsScan";

const RESPONSE_TYPES = new Set([
  "READY",
  "TICK_COMPLETED",
  "DIGEST_UPDATED",
  "WORLD_UPDATED",
  "ERROR",
  "PROGRESS",
  "PERF_TRACE",
]);

/** Commands intentionally without a UI dispatch site — each needs a reason. */
const ALLOWED_INTERNAL = new Map<string, string>([
  // e.g. ["FOO_BAR", "dispatched only by the worker self-loop"],
]);

function commandTypes(): string[] {
  const src = readSrcFile("engine/worker/types.ts");
  const all = [...src.matchAll(/type:\s*"([A-Z_]+)"/g)].map((m) => m[1]);
  return [...new Set(all)].filter((t) => !RESPONSE_TYPES.has(t)).sort();
}

function dispatchSites(type: string): string[] {
  const sites: string[] = [];
  for (const file of findFiles(SRC, { exclude: /\.test\.tsx?$/ })) {
    const rel = file.slice(SRC.length + 1);
    if (rel.startsWith("engine/worker/")) continue;
    if (rel === "engine/worker/types.ts") continue;
    const src = readFileSync(file, "utf8");
    if (!src.includes(`"${type}"`)) continue;
    if (src.includes("sendCommand(") || src.includes("postMessage(")) sites.push(rel);
  }
  return sites;
}

describe("command surface coverage", () => {
  it("every EngineCommand has a dispatch site or an explicit exemption", () => {
    const orphans = commandTypes().filter(
      (t) => dispatchSites(t).length === 0 && !ALLOWED_INTERNAL.has(t)
    );
    expect(orphans, `Commands with handlers but no dispatch site: ${orphans.join(", ")}`).toEqual(
      []
    );
  });

  it("ALLOWED_INTERNAL entries still name real commands", () => {
    const cmds = new Set(commandTypes());
    for (const [t, reason] of ALLOWED_INTERNAL) {
      expect(cmds.has(t), `${t} is exempted but no longer an EngineCommand`).toBe(true);
      expect(reason.length, `${t} exemption needs a reason`).toBeGreaterThan(10);
    }
  });
});
