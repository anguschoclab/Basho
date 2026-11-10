/**
 * MigrationService — save-version gate.
 *
 * v19 architecture decision: zero backwards compatibility. A save is either
 * CURRENT_SAVE_VERSION or it is rejected outright — there are no migration
 * steps to run and no partial upgrades to get wrong. Known prior versions get
 * an explicit "no longer supported" error; unrecognized versions get an
 * "unknown version" error. The load path in saveload.ts wraps this in a
 * try/catch, so a rejected save surfaces as a failed load rather than a
 * silently mutated world.
 */

import type { SaveGame, SaveVersion } from "@/engine/types/save";
import { CURRENT_SAVE_VERSION, KNOWN_SAVE_VERSIONS } from "@/engine/types/save";

export interface MigrationContext {
  fromVersion: SaveVersion;
  toVersion: SaveVersion;
  logs: string[];
}

export interface MigrationResult {
  save: SaveGame;
  context: MigrationContext;
}

export const MigrationService = {
  /**
   * Returns the save unchanged when it is CURRENT_SAVE_VERSION.
   * Throws for every other version — prior versions are unsupported, not
   * migrated (v19: zero back-compat contract).
   */
  migrateSave(save: SaveGame): MigrationResult {
    const fromVersion = save.version;
    const ctx: MigrationContext = {
      fromVersion,
      toVersion: CURRENT_SAVE_VERSION,
      logs: [],
    };

    if (fromVersion === CURRENT_SAVE_VERSION) {
      return { save, context: ctx };
    }

    if (KNOWN_SAVE_VERSIONS.includes(fromVersion)) {
      throw new Error(
        `Save version ${fromVersion} is no longer supported — start a new game (current: ${CURRENT_SAVE_VERSION}).`
      );
    }

    throw new Error(`Unknown save version: ${fromVersion}`);
  },
};
