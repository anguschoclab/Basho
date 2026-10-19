/**
 * pageHeaderConsistency.test.ts
 * =============================
 * Static contract: every page that renders a <PageHeader> eyebrow must use
 * one of the canonical section labels, and no eyebrow may carry decorative
 * "── X ──" brackets.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readdirSync, readFileSync } from "fs";

const PAGES_DIR = join(__dirname, "../../../pages");

const CANONICAL_EYEBROWS = new Set([
  "DASHBOARD",
  "MY STABLE",
  "TOURNAMENT",
  "OFFICE",
  "ASSOCIATION",
  "RECORDS",
  "POST-BASHO",
  "REFERENCE",
  "SETTINGS",
  "SYSTEM",
  "RIKISHI",
  "WEEKLY DIGEST",
]);

function collectEyebrows(): { file: string; eyebrow: string }[] {
  const out: { file: string; eyebrow: string }[] = [];
  for (const file of readdirSync(PAGES_DIR)) {
    if (!file.endsWith(".tsx")) continue;
    const src = readFileSync(join(PAGES_DIR, file), "utf8");
    for (const m of src.matchAll(/eyebrow="([^"]+)"/g)) {
      out.push({ file, eyebrow: m[1] });
    }
  }
  return out;
}

describe("PageHeader eyebrow consistency", () => {
  const eyebrows = collectEyebrows();

  it("finds eyebrow usages to audit", () => {
    expect(eyebrows.length).toBeGreaterThan(10);
  });

  it("no eyebrow uses decorative ── brackets", () => {
    const offenders = eyebrows.filter((e) => e.eyebrow.includes("──"));
    expect(offenders).toEqual([]);
  });

  it("every eyebrow is a canonical section label", () => {
    const offenders = eyebrows.filter((e) => !CANONICAL_EYEBROWS.has(e.eyebrow));
    expect(offenders).toEqual([]);
  });
});
