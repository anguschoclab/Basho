/**
 * MigrationService — handles save-version upgrades.
 *
 * Each migration step transforms a SaveGame from one version to the next.
 * Steps are chained in ascending version order. Every step is wrapped in
 * try/catch so a single corrupt field does not abort the entire migration.
 */

import type { SaveGame, SaveVersion } from "../types/save";
import { CURRENT_SAVE_VERSION, KNOWN_SAVE_VERSIONS } from "../types/save";
import { warn } from "../utils/Logger";

export interface MigrationContext {
  fromVersion: SaveVersion;
  toVersion: SaveVersion;
  logs: string[];
}

export interface MigrationResult {
  save: SaveGame;
  context: MigrationContext;
}

type MigrationStep = (save: SaveGame, ctx: MigrationContext) => SaveGame;

const VERSION_ORDER: readonly SaveVersion[] = KNOWN_SAVE_VERSIONS;

function versionIndex(v: SaveVersion): number {
  const idx = VERSION_ORDER.indexOf(v);
  if (idx === -1) throw new Error(`Unknown save version: ${v}`);
  return idx;
}

// ── Migration steps ────────────────────────────────────────────────────────

/**
 * Migration 1.0.0 → 1.1.0
 *
 * Performs structural transformations that SerializationService.deserializeWorld
 * cannot safely infer at load time:
 * - Top-level save metadata defaults (createdAtISO, ruleset, playTimeMinutes)
 * - Sponsor pool shape normalization (legacy Rikishi-typed sponsors → valid Sponsor)
 * - Events version stamping
 */
const migrateToV1_1_0: MigrationStep = (save, ctx) => {
  const next = { ...save };

  // 1. Top-level save metadata
  try {
    if (!next.createdAtISO) {
      next.createdAtISO = next.lastSavedAtISO || new Date().toISOString();
      ctx.logs.push("migrateToV1_1_0: defaulted createdAtISO");
    }
  } catch (e) {
    warn(`Migration: failed to default createdAtISO: ${e}`, "MigrationService");
    ctx.logs.push("migrateToV1_1_0: WARN createdAtISO default failed");
  }

  try {
    if (!next.ruleset) {
      next.ruleset = {
        banzukeAlgorithm: "slot_fill_v1",
        kimariteRegistryVersion: "82_official_v1",
      };
      ctx.logs.push("migrateToV1_1_0: defaulted ruleset");
    }
  } catch (e) {
    warn(`Migration: failed to default ruleset: ${e}`, "MigrationService");
    ctx.logs.push("migrateToV1_1_0: WARN ruleset default failed");
  }

  try {
    if (typeof next.playTimeMinutes !== "number") {
      next.playTimeMinutes = 0;
      ctx.logs.push("migrateToV1_1_0: defaulted playTimeMinutes");
    }
  } catch (e) {
    warn(`Migration: failed to default playTimeMinutes: ${e}`, "MigrationService");
    ctx.logs.push("migrateToV1_1_0: WARN playTimeMinutes default failed");
  }

  // 2. Structural world fixes
  let world = next.world as unknown as Record<string, unknown>;
  if (world) {
    // 2a. Events version stamping
    try {
      const events = world.events;
      if (events && typeof events === "object" && !("version" in events)) {
        (events as Record<string, unknown>).version = "1.0.0";
        ctx.logs.push("migrateToV1_1_0: stamped events.version");
      } else if (events !== undefined && events !== null && typeof events !== "object") {
        warn(
          "Migration: events field is corrupt (not an object), resetting to empty",
          "MigrationService"
        );
        world = { ...world, events: { version: "1.0.0", log: [], dedupe: {} } };
        next.world = world as unknown as typeof next.world;
        ctx.logs.push("migrateToV1_1_0: WARN reset corrupt events");
      }
    } catch (e) {
      warn(`Migration: failed to fix events.version: ${e}`, "MigrationService");
      ctx.logs.push("migrateToV1_1_0: WARN events.version fix failed");
    }

    // 2b. Sponsor pool normalization
    try {
      const pool = world.sponsorPool;
      if (pool && typeof pool === "object") {
        const poolObj = pool as Record<string, unknown>;
        const sponsors = poolObj.sponsors;
        if (sponsors && typeof sponsors === "object") {
          const sponsorsRecord = sponsors as Record<string, Record<string, unknown>>;
          const cleaned: Record<string, Record<string, unknown>> = {};
          let dropped = 0;
          for (const [key, entry] of Object.entries(sponsorsRecord)) {
            if (entry && typeof entry === "object" && isValidSponsor(entry)) {
              cleaned[key] = entry;
            } else {
              dropped++;
            }
          }
          poolObj.sponsors = cleaned;
          if (dropped > 0) {
            warn(
              `Migration: dropped ${dropped} invalid sponsor entries during normalization`,
              "MigrationService"
            );
            ctx.logs.push(`migrateToV1_1_0: dropped ${dropped} invalid sponsor entries`);
          }
        }
      } else if (pool !== undefined && pool !== null) {
        // Corrupt sponsorPool — reset to empty
        world = { ...world, sponsorPool: { sponsors: {}, koenkais: {} } };
        next.world = world as unknown as typeof next.world;
        warn("Migration: reset corrupt sponsorPool to empty", "MigrationService");
        ctx.logs.push("migrateToV1_1_0: WARN reset corrupt sponsorPool");
      }
    } catch (e) {
      warn(`Migration: sponsorPool normalization failed: ${e}`, "MigrationService");
      ctx.logs.push("migrateToV1_1_0: WARN sponsorPool normalization failed");
    }
  }

  next.version = "1.1.0";
  ctx.logs.push("migrateToV1_1_0: version bump to 1.1.0");
  return next;
};

// ── Helpers ────────────────────────────────────────────────────────────────

const REQUIRED_SPONSOR_FIELDS = [
  "displayName",
  "category",
  "tier",
  "originRegionId",
  "industryTag",
  "toneTag",
  "prestigeAffinity",
  "loyalty",
  "scandalTolerance",
  "riskAppetite",
  "visibilityPreference",
  "active",
  "satisfaction",
  "createdAtTick",
  "lastSeenTick",
] as const;

/**
 * Returns true if the entry has all required Sponsor fields and does not
 * look like a Rikishi object (no `rikishiId` / `shikona` / `heyaId` combo).
 */
function isValidSponsor(entry: Record<string, unknown>): boolean {
  // Reject Rikishi-shaped objects
  if ("rikishiId" in entry || ("shikona" in entry && "heyaId" in entry)) {
    return false;
  }
  // Check required Sponsor fields
  for (const field of REQUIRED_SPONSOR_FIELDS) {
    if (!(field in entry)) return false;
  }
  return true;
}

// ── Migration registry ─────────────────────────────────────────────────────

/**
 * Maps a source version to the step that upgrades it to the next version.
 * E.g. "1.0.0" → step that produces "1.1.0".
 */
const migrations: Partial<Record<SaveVersion, MigrationStep>> = {
  "1.0.0": migrateToV1_1_0,
};

// ── Public API ─────────────────────────────────────────────────────────────

export const MigrationService = {
  migrations,

  /**
   * Returns the ordered list of migration steps needed to go from `from` to `to`.
   */
  getMigrationPath(from: SaveVersion, to: SaveVersion): MigrationStep[] {
    const fromIdx = versionIndex(from);
    const toIdx = versionIndex(to);
    if (fromIdx > toIdx) {
      throw new Error(`Cannot downgrade save from ${from} to ${to}`);
    }
    const steps: MigrationStep[] = [];
    for (let i = fromIdx; i < toIdx; i++) {
      const stepVersion = VERSION_ORDER[i];
      const step = migrations[stepVersion];
      if (!step) {
        throw new Error(`No migration step registered for version ${stepVersion}`);
      }
      steps.push(step);
    }
    return steps;
  },

  /**
   * Migrates a save to CURRENT_SAVE_VERSION.
   * Deep-copies the input save so the original is not mutated.
   * Throws if the save version is not recognized.
   */
  migrateSave(save: SaveGame): MigrationResult {
    const fromVersion = save.version;
    if (!KNOWN_SAVE_VERSIONS.includes(fromVersion)) {
      throw new Error(`Unknown save version: ${fromVersion}`);
    }

    const toVersion = CURRENT_SAVE_VERSION;
    const ctx: MigrationContext = { fromVersion, toVersion, logs: [] };

    if (fromVersion === toVersion) {
      return { save, context: ctx };
    }

    const steps = this.getMigrationPath(fromVersion, toVersion);
    let current: SaveGame = JSON.parse(JSON.stringify(save)); // deep copy

    for (const step of steps) {
      current = step(current, ctx);
    }

    return { save: current, context: ctx };
  },
};
