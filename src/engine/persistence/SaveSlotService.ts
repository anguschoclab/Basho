import { getStorageProvider, type IStorageProvider } from "@/engine/persistence/storageProvider";
import { stableTieBreak } from "@/engine/utils/sort";
import { parseSave } from "@/engine/persistence/collectionCodec";
import type { SaveGame, SaveVersion, BashoName } from "@/engine/types/index";
import { KNOWN_SAVE_VERSIONS } from "@/engine/types/index";

const SAVE_KEY_PREFIX = "basho_save_";
const AUTOSAVE_SLOT_NAME = "autosave";
const AUTOSAVE_KEY = `${SAVE_KEY_PREFIX}${AUTOSAVE_SLOT_NAME}`;
/** Rotated autosave backups — autosave_1 is the previous save, autosave_2 the one before. */
const AUTOSAVE_BACKUP_COUNT = 2;
const AUTOSAVE_NAME_RE = /^autosave(_\d+)?$/;
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
        const parsed = parseSave(raw);
        if (!this.isValidSave(parsed)) continue;

        const save = parsed as SaveGame;
        // Slot identity comes from the storage key, not the embedded
        // saveSlotName — rotated autosave backups are byte-copies of the
        // primary and still carry `saveSlotName: "autosave"`; loading by the
        // embedded name would open the wrong snapshot.
        const slotName = key.replace(SAVE_KEY_PREFIX, "") || save.saveSlotName || key;
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
          isAutosave: AUTOSAVE_NAME_RE.test(slotName),
        });
      } catch {
        continue;
      }
    }

    return infos.sort((a, b) => {
      if (a.isAutosave !== b.isAutosave) return a.isAutosave ? -1 : 1;
      // Autosaves order primary → newest backup → oldest backup.
      if (a.isAutosave && b.isAutosave) {
        const idx = (name: string) => (name === AUTOSAVE_SLOT_NAME ? 0 : Number(name.split("_")[1]));
        return idx(a.slotName) - idx(b.slotName);
      }
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

  isValidSave(x: unknown): x is SaveGame {
    if (!x || typeof x !== "object") return false;
    const obj = x as Record<string, unknown>;
    if (!obj.version || !obj.world) return false;
    if (!(KNOWN_SAVE_VERSIONS as readonly string[]).includes(obj.version as string)) {
      return false;
    }
    // Reject hollow saves — a matching version number on a world lacking the
    // serialized core shape (WS5-07). A corrupt save that parses but holds
    // no world data must fail here, not mid-game.
    const world = obj.world as Record<string, unknown>;
    if (typeof world !== "object" || world === null) return false;
    if (typeof world.seed !== "string" || world.seed.length === 0) return false;
    if (typeof world.rikishi !== "object" || world.rikishi === null) return false;
    if (typeof world.heyas !== "object" || world.heyas === null) return false;
    return true;
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
  /** Backup slot names oldest-position-last: autosave_1 .. autosave_N. */
  getAutosaveBackupCount(): number {
    return AUTOSAVE_BACKUP_COUNT;
  },
  /** Autosave slot names in recency order: autosave, autosave_1, ... */
  getAutosaveSlotNames(): string[] {
    return [
      AUTOSAVE_SLOT_NAME,
      ...Array.from({ length: AUTOSAVE_BACKUP_COUNT }, (_, i) => `${AUTOSAVE_SLOT_NAME}_${i + 1}`),
    ];
  },
  getSlotCount(): number {
    return SAVE_SLOT_COUNT;
  },
};
