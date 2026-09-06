import { SerializationService } from "./persistence/SerializationService";
import { SaveSlotService, type SaveSlotInfo } from "./persistence/SaveSlotService";
import { MigrationService } from "./persistence/MigrationService";
import { destr } from "destr";
import { error } from "./utils/Logger";
import type { WorldState, SaveGame } from "./types/index";
import { CURRENT_SAVE_VERSION } from "./types/index";

export type { SaveSlotInfo };

/**
 * Save game.
 */
export function saveGame(world: WorldState, slotName: string, _timestampISO?: string): boolean {
  const storage = SaveSlotService.getStorage();
  if (!storage) return false;

  try {
    const key = SaveSlotService.toSlotKey(slotName);
    // Note: retired-rikishi summarization now happens at year-end in
    // SimulationRunner (runRetiredRikishiSummarization), not at save time.
    // The old runArchivalPruning call was removed because it mutated world
    // in place and wrote to the wrong map (world.rikishi instead of
    // world.historicalRikishi).

    const existingRaw = storage.getItem(key);
    const existingParsed = existingRaw ? destr(existingRaw) : null;
    const existing = SaveSlotService.isValidSave(existingParsed)
      ? (existingParsed as SaveGame)
      : undefined;

    const save = createSaveGame(world, slotName, existing, _timestampISO);
    storage.setItem(key, JSON.stringify(save));
    return true;
  } catch (e) {
    error(`Failed to save game: ${e instanceof Error ? e.message : String(e)}`, "SaveLoad");
    return false;
  }
}

/**
 * Load game.
 */
export function loadGame(slotNameOrKey: string): WorldState | null {
  const storage = SaveSlotService.getStorage();
  if (!storage) return null;

  try {
    const key = SaveSlotService.toSlotKey(slotNameOrKey);
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = destr(raw);
    if (!SaveSlotService.isValidSave(parsed)) return null;

    const originalSave = parsed as SaveGame;
    const { save: migratedSave } = MigrationService.migrateSave(originalSave);

    // Persist the migrated save back to storage so future loads skip migration
    if (migratedSave.version !== originalSave.version) {
      try {
        storage.setItem(key, JSON.stringify(migratedSave));
      } catch (e) {
        error("Failed to persist migrated save back to storage", "SaveLoad", e);
      }
    }

    return SerializationService.deserializeWorld(migratedSave.world);
  } catch (e) {
    error("Failed to load game", "SaveLoad", e);
    return null;
  }
}

/**
 * Create save game object.
 */
function createSaveGame(
  world: WorldState,
  slotName?: string,
  existing?: SaveGame,
  timestampISO?: string
): SaveGame {
  const now = timestampISO ?? existing?.lastSavedAtISO ?? "1970-01-01T00:00:00Z";
  return {
    version: CURRENT_SAVE_VERSION,
    createdAtISO: existing?.createdAtISO ?? now,
    lastSavedAtISO: now,
    ruleset: {
      banzukeAlgorithm: "slot_fill_v1",
      kimariteRegistryVersion: "82_official_v1",
    },
    world: SerializationService.serializeWorld(world),
    saveSlotName: slotName,
    playTimeMinutes: existing?.playTimeMinutes,
  };
}

export function autosave(world: WorldState, timestampISO?: string): boolean {
  return saveGame(world, SaveSlotService.getAutosaveSlotName(), timestampISO);
}

export function loadAutosave(): WorldState | null {
  return loadGame(SaveSlotService.getAutosaveSlotName());
}

export function hasAutosave(): boolean {
  const storage = SaveSlotService.getStorage();
  if (!storage) return false;
  return storage.getItem(SaveSlotService.getAutosaveKey()) !== null;
}

export function deleteSave(slotNameOrKey: string): boolean {
  const storage = SaveSlotService.getStorage();
  if (!storage) return false;
  storage.removeItem(SaveSlotService.toSlotKey(slotNameOrKey));
  return true;
}

export function getSaveSlotInfos(): SaveSlotInfo[] {
  return SaveSlotService.getSaveSlotInfos();
}

export function quickSave(world: WorldState, _timestampISO?: string): boolean {
  const infos = getSaveSlotInfos().filter((s) => /^slot_\d+$/.test(s.slotName));
  const existing = new Set(infos.map((s) => s.slotName));

  for (let i = 1; i <= SaveSlotService.getSlotCount(); i++) {
    const slot = `slot_${i}`;
    if (!existing.has(slot)) return saveGame(world, slot);
  }

  // Sort and overwrite oldest
  const oldest = infos.slice().sort((a, b) => a.savedAt.localeCompare(b.savedAt))[0];
  return saveGame(world, oldest?.slotName || "slot_1");
}

export function exportSave(
  world: WorldState,
  filename?: string,
  timestampISO?: string
): { json: string; filename: string } {
  const save = createSaveGame(world, undefined, undefined, timestampISO);
  const json = JSON.stringify(save, null, 2);
  const defaultFilename =
    filename || `basho_${world.year}_${world.currentBashoName || "save"}.json`;
  return { json, filename: defaultFilename };
}

export async function importSave(file: File): Promise<WorldState | null> {
  try {
    const text = await file.text();
    const parsed = destr(text);
    if (!SaveSlotService.isValidSave(parsed)) throw new Error("Invalid save file structure");
    const { save: migratedSave } = MigrationService.migrateSave(parsed as SaveGame);
    return SerializationService.deserializeWorld(migratedSave.world);
  } catch (e) {
    error("Failed to import save", "SaveLoad", e);
    return null;
  }
}
