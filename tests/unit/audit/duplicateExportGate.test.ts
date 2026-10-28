/**
 * Duplicate-export gate (Phase 3).
 *
 * Every exported name defined in more than one production file must either be
 * deduplicated or carry an explicit allowlist entry explaining why the
 * collision is intentional (layered APIs, deliberate domain synonyms).
 *
 * A second check enforces constant-name uniqueness inside
 * `src/constants/engine/` — two files may not declare the same exported
 * const. Intentional splits must be renamed; identical values must be merged.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { scanConstDuplicates, scanDuplicateExports } from "../../../scripts/audit/duplicateExports";

/**
 * Intentional same-name exports (layered APIs / deliberate domain synonyms).
 * Key: exported name. Value: justification — the architectural reason the
 * collision is legal. Every entry must cite a reason, not "boilerplate".
 *
 * To resolve a collision flagged by this gate: pick the canonical
 * definition, then rename, re-export, merge, or delete the other side —
 * and remove the allowlist entry in the same commit. An entry may only be
 * added here when the same name genuinely denotes different contracts in
 * different layers.
 */
const ALLOWED_DUPLICATES: Record<string, string> = {};

/**
 * Known collisions pending dedupe — each entry must reference a tracking
 * issue/TODO. This map is ratcheted: it may only shrink. Resolve entries
 * the same way as ALLOWED_DUPLICATES violations (rename/re-export/merge/
 * delete the non-canonical side) and delete the entry in the same commit.
 */
const KNOWN_COLLISIONS: Record<string, string> = {};

describe("duplicate-export gate", () => {
  // Full-repo scan is ~5s — hoist so it runs once instead of per-assertion
  // (keeps the file under the 10s fast-suite budget).
  let collisions: ReturnType<typeof scanDuplicateExports>["collisions"];
  beforeAll(() => {
    collisions = scanDuplicateExports().collisions;
  });

  it("no exported name is defined in multiple production files without an allowlist entry", () => {
    const violations = collisions.filter(
      (c) => !(c.name in ALLOWED_DUPLICATES) && !(c.name in KNOWN_COLLISIONS)
    );
    const listing = violations
      .map(
        (c) =>
          `${c.name} [${c.hasValueDef ? "value" : "type-only"}]:\n` +
          c.definitions.map((d) => `    ${d.file}`).join("\n")
      )
      .join("\n");
    expect(violations, listing).toEqual([]);
  });

  it("no stale allowlist entries (resolved collisions must be removed)", () => {
    const live = new Set(collisions.map((c) => c.name));
    const stale = [...Object.keys(ALLOWED_DUPLICATES), ...Object.keys(KNOWN_COLLISIONS)].filter(
      (name) => !live.has(name)
    );
    expect(stale, `stale entries: ${stale.join(", ")} — remove resolved collisions`).toEqual([]);
  });

  it("constants/engine has no duplicate exported const names", () => {
    const dupes = scanConstDuplicates(process.cwd(), "src/constants/engine");
    const listing = [...dupes.entries()]
      .map(([name, files]) => `${name}: ${files.join(", ")}`)
      .join("\n");
    expect(dupes.size, listing).toBe(0);
  });
});
