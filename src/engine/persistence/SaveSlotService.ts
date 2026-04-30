import { getStorageProvider, type IStorageProvider } from "../storageProvider";
import { stableTieBreak } from "../utils/sort";
import { destr } from "destr";
import type { SaveGame, SaveVersion, BashoName } from "../types/index";

const SAVE_KEY_PREFIX = "basho_save_";
const AUTOSAVE_SLOT_NAME = "autosave";
const AUTOSAVE_KEY = `${SAVE_KEY_PREFIX}${AUTOSAVE_SLOT_NAME}`;
const SAVE_SLOT_COUNT = 10;

export interface SaveSlotInfo {
  key: string;
  slotName: string;
  year: number;
  bashoName?: BashoName;
  playerHeyaName?: string;
  savedAt: string;
  version: SaveVersion;
  isAutosave: boolean;
}

/**
 * SaveSlotService manages the file-system-like storage infrastructure.
 */
export const SaveSlotService = {
  getStorage(): IStorageProvider | null {
    return getStorageProvider();
  },

  toSlotKey(slotNameOrKey: string): string {
    return slotNameOrKey.startsWith(SAVE_KEY_PREFIX)
      ? slotNameOrKey
      : `${SAVE_KEY_PREFIX}${slotNameOrKey}`;
  },

  getSaveSlotKeys(): string[] {
    const storage = this.getStorage();
    if (!storage) return [];
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(SAVE_KEY_PREFIX)) keys.push(key);
    }
    return keys.sort(stableTieBreak);
  },

  getSaveSlotInfos(): SaveSlotInfo[] {
    const storage = this.getStorage();
    if (!storage) return [];

    const keys = this.getSaveSlotKeys();
    const infos: SaveSlotInfo[] = [];

    for (const key of keys) {
      try {
        const raw = storage.getItem(key);
        if (!raw) continue;
        const parsed = destr(raw);
        if (!this.isValidSave(parsed)) continue;

        const save = parsed as SaveGame;
        const slotName = save.saveSlotName || key.replace(SAVE_KEY_PREFIX, "");
        const playerHeya =
          save.world.playerHeyaId && save.world.heyas
            ? save.world.heyas[String(save.world.playerHeyaId)]
            : undefined;

        infos.push({
          key,
          slotName,
          year: save.world.year,
          bashoName: save.world.currentBashoName,
          playerHeyaName: playerHeya?.name,
          savedAt: save.lastSavedAtISO,
          version: save.version,
          isAutosave: slotName === AUTOSAVE_SLOT_NAME || key === AUTOSAVE_KEY,
        });
      } catch {
        continue;
      }
    }

    return infos.sort((a, b) => {
      if (a.isAutosave !== b.isAutosave) return a.isAutosave ? -1 : 1;
      const aIsSlot = /^slot_\d+$/.test(a.slotName);
      const bIsSlot = /^slot_\d+$/.test(b.slotName);
      if (aIsSlot && bIsSlot) {
        const an = Number(a.slotName.split("_")[1]);
        const bn = Number(b.slotName.split("_")[1]);
        return an - bn;
      }
      return stableTieBreak(b.savedAt, a.savedAt);
    });
  },

  isValidSave(x: any): x is SaveGame {
    return x && typeof x === "object" && !!x.version && !!x.world;
  },

  getAvailableSlotNames(): string[] {
    return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => `slot_${i + 1}`);
  },

  getAutosaveSlotName(): string {
    return AUTOSAVE_SLOT_NAME;
  },
  getAutosaveKey(): string {
    return AUTOSAVE_KEY;
  },
  getSlotCount(): number {
    return SAVE_SLOT_COUNT;
  },
};
