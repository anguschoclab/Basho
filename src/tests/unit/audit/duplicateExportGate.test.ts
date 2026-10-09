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
import { describe, expect, it } from "vitest";
import {
  scanConstDuplicates,
  scanDuplicateExports,
} from "../../../../scripts/duplicateExports";

/**
 * Intentional same-name exports (layered APIs / deliberate domain synonyms).
 * Key: exported name. Value: justification — the architectural reason the
 * collision is legal. Every entry must cite a reason, not "boilerplate".
 */
const ALLOWED_DUPLICATES: Record<string, string> = {
  // contexts/gameActions.ts exports action creators returning GameAction
  // (dispatch layer); engine files export the implementations they dispatch
  // to. Same name, different layer + contract — not duplicates.
  startBasho: "action creator (contexts/gameActions) vs engine impl (world/BashoManager)",
  advanceDay: "action creator (contexts/gameActions) vs engine impl (world)",
  simulateBout: "action creator (contexts/gameActions) vs engine impl (boutResolver)",
  endBasho: "action creator (contexts/gameActions) vs engine impl (world)",
  // contexts/gameHelpers dispatches impacts onto GameState (UI projection);
  // engine/core/ImpactResolver resolves impacts onto WorldState (engine layer).
  // Same verb, different state domain + signature — intentional layering.
  applyImpact: "GameState helper (contexts/gameHelpers) vs WorldState resolver (engine/ImpactResolver)",
};

/**
 * Known collisions pending dedupe — each entry must reference a tracking
 * issue/TODO. This map is ratcheted: it may only shrink.
 */
const KNOWN_COLLISIONS: Record<string, string> = {};

describe("duplicate-export gate", () => {
  it("no exported name is defined in multiple production files without an allowlist entry", () => {
    const { collisions } = scanDuplicateExports();
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
    const { collisions } = scanDuplicateExports();
    const live = new Set(collisions.map((c) => c.name));
    const stale = [
      ...Object.keys(ALLOWED_DUPLICATES),
      ...Object.keys(KNOWN_COLLISIONS),
    ].filter((name) => !live.has(name));
    expect(
      stale,
      `stale entries: ${stale.join(", ")} — remove resolved collisions`
    ).toEqual([]);
  });

  it("constants/engine has no duplicate exported const names", () => {
    const dupes = scanConstDuplicates(process.cwd(), "src/constants/engine");
    const listing = [...dupes.entries()]
      .map(([name, files]) => `${name}: ${files.join(", ")}`)
      .join("\n");
    expect(dupes.size, listing).toBe(0);
  });
});
