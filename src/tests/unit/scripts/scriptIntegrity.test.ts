import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : dirname(fileURLToPath(import.meta.url));

const root = resolve(__dirname, "../../../../");
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const scripts: Record<string, string> = pkg.scripts ?? {};

describe("package.json script integrity", () => {
  it("every script entry that points to a repo file resolves to an existing file", () => {
    const failures: string[] = [];

    for (const [name, raw] of Object.entries(scripts)) {
      if (typeof raw !== "string") continue;

      // Look for the first command in a && chain.
      const firstCommand = raw.split("&&")[0]?.trim() ?? raw.trim();
      const match = firstCommand.match(/^bun\s+(?:run\s+)?(\S+)/);
      if (!match) continue;

      const entry = match[1];
      if (!entry.startsWith("src/") && !entry.startsWith("scripts/")) continue;

      const full = resolve(root, entry);
      if (!existsSync(full)) {
        failures.push(`script "${name}" -> ${entry} not found`);
      }
    }

    expect(failures).toEqual([]);
  });
});
