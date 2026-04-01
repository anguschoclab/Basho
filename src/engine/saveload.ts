import { stableTieBreak } from "./utils/sort";
import { destr } from "destr";
import { runArchivalPruning } from "./archival";
// saveload.ts
// Save/Load System — Persistence Canon Implementation
//
// DROP-IN for updated types.ts:
// - WorldState uses Maps at runtime.
// - SaveGame.world is JSON-safe SerializedWorldState.
// - Non-lossy migration fills missing fields (e.g., economics.cash) without deleting unknown fields.
// - Stable Map serialization (sorted keys).
// - Preserves createdAtISO when overwriting a slot.
//
// IMPORTANT:
// - This module does NOT import from index.ts (barrel). Leaf import only.
// - This keeps migrations "non-lossy": we never delete unknown keys; we only fill missing required ones.
// - Storage access is abstracted via IStorageProvider (see storageProvider.ts).

import type {
  WorldState,
  Heya,
  Rikishi,
  Oyakata,
  BashoState,
  SaveVersion,
  BashoName,
  Id,
  SaveGame,
  SerializedWorldState,
  SerializedBashoState,
  CyclePhase
} from "./types";
import { CURRENT_SAVE_VERSION } from "./types";
import { getStorageProvider, hasStorageProvider, type IStorageProvider } from "./storageProvider";

// === SAVE VERSION ===
/** c u r r e n t_ s a v e_ v e r s i o n_ l o c a l. */
const CURRENT_SAVE_VERSION_LOCAL: SaveVersion = CURRENT_SAVE_VERSION;

// Canon: project is Basho
const SAVE_KEY_PREFIX = "basho_save_";
const AUTOSAVE_SLOT_NAME = "autosave";
const AUTOSAVE_KEY = `${SAVE_KEY_PREFIX}${AUTOSAVE_SLOT_NAME}`;
const SAVE_SLOT_COUNT = 10;

/** Helper to get storage or null */
function getStorage(): IStorageProvider | null {
  return getStorageProvider();
}

// === SERIALIZATION HELPERS ===

/**
 * Map to object.
 *  * @param map - The Map.
 *  * @returns The result.
 */
function mapToObject<T>(map: Map<string, T> | Record<string, T>): Record<string, T> {
  if (!(map instanceof Map)) return map;
  const obj: Record<string, T> = {};
  const keys = Array.from(map.keys()).sort(stableTieBreak);
  for (const key of keys) obj[key] = map.get(key)!;
  return obj;
}

/**
 * Object to map.
 *  * @param obj - The Obj.
 *  * @returns The result.
 */
function objectToMap<T>(obj: Record<string, T>): Map<string, T> {
  const map = new Map<string, T>();
  // stable: keys in JS objects are not guaranteed sorted, so we sort
  for (const key of Object.keys(obj).sort(stableTieBreak)) map.set(key, obj[key]);
  return map;
}

// === BashoState serialization ===
/**
 * Serialize basho state.
 *  * @param basho - The Basho.
 *  * @returns The result.
 */
function serializeBashoState(basho: BashoState): SerializedBashoState {
  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    day: basho.day,
    matches: basho.matches,
    standings: mapToObject(basho.standings)
  };
}

/**
 * Deserialize basho state.
 *  * @param basho - The Basho.
 *  * @returns The result.
 */
function deserializeBashoState(basho: SerializedBashoState): BashoState {
  return {
    year: basho.year,
    bashoNumber: basho.bashoNumber,
    bashoName: basho.bashoName,
    day: basho.day,
    matches: basho.matches,
    standings: objectToMap(basho.standings),
    isActive: true
  };
}

// === SPONSOR POOL SERIALIZATION ===

/**
 * Serialize sponsor pool.
 */
function serializeSponsorPool(pool: any): any {
  if (!pool) return undefined;
  return {
    sponsors: pool.sponsors instanceof Map ? mapToObject(pool.sponsors) : (pool.sponsors || {}),
    koenkais: pool.koenkais instanceof Map ? mapToObject(pool.koenkais) : (pool.koenkais || {}),
  };
}

/**
 * Deserialize sponsor pool.
 */
function deserializeSponsorPool(data: any): any {
  if (!data) return undefined;
  return {
    sponsors: data.sponsors instanceof Map ? data.sponsors : objectToMap(data.sponsors || {}),
    koenkais: data.koenkais instanceof Map ? data.koenkais : objectToMap(data.koenkais || {}),
  };
}


// === WORLD SERIALIZATION ===

/**
 * Serialize world.
 */
export function serializeWorld(world: WorldState): SerializedWorldState {
  const s: SerializedWorldState = {
    seed: world.seed,
    year: world.year,
    week: world.week,
    cyclePhase: world.cyclePhase,
    currentBashoName: world.currentBashoName,
    heyas: mapToObject(world.heyas),
    closedHeyas: world.closedHeyas ? mapToObject(world.closedHeyas) : {},
    rikishi: mapToObject(world.rikishi),
    historicalRikishi: world.historicalRikishi ? mapToObject(world.historicalRikishi) : {},
    oyakata: mapToObject(world.oyakata),
    staff: world.staff ? mapToObject(world.staff) : {},
    currentBasho: world.currentBasho ? serializeBashoState(world.currentBasho) : undefined,
    history: world.history || [],
    historyIndex: world.historyIndex,
    lineage: world.lineage || [],
    records: world.records,
    hallOfFame: world.hallOfFame,
    events: world.events,
    rivalriesState: world.rivalriesState,
    myosekiMarket: world.myosekiMarket,
    ftue: world.ftue,
    playerHeyaId: world.playerHeyaId,
    currentBanzuke: world.currentBanzuke,
    dayIndexGlobal: world.dayIndexGlobal,
    almanacSnapshots: world.almanacSnapshots || [],
    calendar: world.calendar,
    sponsorPool: serializeSponsorPool((world as any).sponsorPool),
    ozekiKadoban: world.ozekiKadoban || {},
    mediaState: (world as any).mediaState,
    candidatePool: (world as any).candidatePool,
    trainingState: world.trainingState || {},
    settings: world.settings
  };
  return s;
}



/**
 * Non-lossy upgrade/sanitize for old rikishi objects.
 * Fills required economics fields if missing.
 */
function sanitizeRikishi(r: Rikishi): Rikishi {
  if (r.economics) {
    const e = r.economics;
    if (typeof e.cash !== "number") e.cash = 0;
    if (typeof e.retirementFund !== "number") e.retirementFund = 0;
    if (typeof e.careerKenshoWon !== "number") e.careerKenshoWon = 0;
    if (typeof e.kinboshiCount !== "number") e.kinboshiCount = 0;
    if (typeof e.totalEarnings !== "number") e.totalEarnings = 0;
    if (typeof e.currentBashoEarnings !== "number") e.currentBashoEarnings = 0;
    if (typeof e.popularity !== "number") e.popularity = 30;
  }

  // fatigue is optional; if present clamp it
  if (typeof r.fatigue === "number") {
    r.fatigue = Math.max(0, Math.min(100, r.fatigue));
  }

  // Derive talentSeed deterministically for legacy rikishi missing it
  if (typeof r.talentSeed !== "number") {
    // Simple deterministic hash from rikishi id
    let hash = 0;
    const idStr = String(r.id || "");
    for (let i = 0; i < idStr.length; i++) {
      hash = ((hash << 5) - hash + idStr.charCodeAt(i)) | 0;
    }
    // Map to 30-90 range (legacy rikishi get reasonable spread)
    r.talentSeed = 30 + Math.abs(hash % 61);
  }

  return r;
}


/**
 * Sanitize heya.
 *  * @param h - The H.
 *  * @returns The result.
 */
function sanitizeHeya(h: Heya): Heya {
  const anyH = h as any;
  if (typeof anyH.funds !== "number") anyH.funds = 0;
  return h;
}

/**
 * Deserialize world.
 *  * @param serialized - The Serialized.
 *  * @returns The result.
 */
export function deserializeWorld(serialized: SerializedWorldState): WorldState {
  const s = serialized as any;
  const heyasObj: Record<string, Heya> = s.heyas || {};
  const closedHeyasObj: Record<string, any> = s.closedHeyas || {};
  const rikishiObj: Record<string, Rikishi> = s.rikishi || {};
  const historicalRikishiObj: Record<string, Rikishi> = s.historicalRikishi || {};
  const oyakataObj: Record<string, Oyakata> = s.oyakata || {};
  const staffObj: Record<string, import("./types/staff").Staff> = s.staff || {};

  for (const k of Object.keys(heyasObj)) sanitizeHeya(heyasObj[k]);
  for (const k of Object.keys(rikishiObj)) sanitizeRikishi(rikishiObj[k]);

  const savedCalendar = s.calendar;

  return {
    id: `world_${serialized.seed}`,
    seed: serialized.seed,
    year: serialized.year,
    week: serialized.week,
    dayIndexGlobal: serialized.dayIndexGlobal ?? 0,
    cyclePhase: serialized.cyclePhase || "interim",
    currentBashoName: serialized.currentBashoName,

    heyas: objectToMap(heyasObj),
    closedHeyas: objectToMap(closedHeyasObj),
    rikishi: objectToMap(rikishiObj),
    historicalRikishi: objectToMap(historicalRikishiObj),
    oyakata: objectToMap(oyakataObj),
    staff: objectToMap(staffObj),

    currentBasho: serialized.currentBasho ? deserializeBashoState(serialized.currentBasho) : undefined,
    history: serialized.history || [],
    historyIndex: s.historyIndex,
    lineage: s.lineage || [],
    records: s.records || { 
      allTime: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] },
      active: { careerWins: [], makuuchiWins: [], yusho: [], consecutiveYusho: [], kinboshi: [] }
    },
    hallOfFame: s.hallOfFame,
    events: s.events || { version: "1.0.0", log: [], dedupe: {} },
    rivalriesState: s.rivalriesState,
    myosekiMarket: s.myosekiMarket,

    ftue: serialized.ftue,
    playerHeyaId: serialized.playerHeyaId,
    currentBanzuke: serialized.currentBanzuke,
    talentPool: s.talentPool,
    almanacSnapshots: s.almanacSnapshots || [],
    sponsorPool: deserializeSponsorPool(s.sponsorPool),
    ozekiKadoban: s.ozekiKadoban ?? {},
    mediaState: s.mediaState,
    trainingState: s.trainingState || {},
    settings: s.settings || { archiveMode: "standard" },
    calendar: savedCalendar || {
      year: serialized.year,
      month: 1,
      currentWeek: serialized.week || 1,
      currentDay: 1
    }
  };
}

// === VALIDATION ===

/**
 * Is serialized save game.
 *  * @param x - The X.
 *  * @returns The result.
 */
function isSerializedSaveGame(x: any): x is SaveGame {
  return (
    x &&
    typeof x === "object" &&
    typeof x.version === "string" &&
    typeof x.createdAtISO === "string" &&
    typeof x.lastSavedAtISO === "string" &&
    x.ruleset &&
    typeof x.ruleset.banzukeAlgorithm === "string" &&
    typeof x.ruleset.kimariteRegistryVersion === "string" &&
    x.world &&
    typeof x.world.seed === "string" &&
    typeof x.world.year === "number" &&
    typeof x.world.week === "number" &&
    x.world.heyas &&
    x.world.rikishi
  );
}

// === MIGRATIONS (non-lossy scaffold) ===
/** Type representing migration fn. */
type MigrationFn = (save: SaveGame) => SaveGame;

const MIGRATIONS: Record<string, MigrationFn> = {
  // Example of a non-lossy minimal bump migration
  "1.0.0->1.0.1": (save) => {
    console.log("Migrating save from 1.0.0 to 1.0.1 (Identity migration)");
    return { ...save, version: "1.0.1" as SaveVersion };
  },
  // Add future migrations here:
  // "1.0.1->1.1.0": (save) => migrateTo110(save),
};

/**
 * Migrate to current.
 *  * @param save - The Save.
 *  * @returns The result.
 */
function migrateToCurrent(save: SaveGame): SaveGame {
  if (save.version === CURRENT_SAVE_VERSION_LOCAL) return save;

  const directKey = `${save.version}->${CURRENT_SAVE_VERSION_LOCAL}`;
  const fn = MIGRATIONS[directKey];
  if (fn) return fn(save);

  // Non-lossy minimal bump: keep all fields, just update version.
  return { ...save, version: CURRENT_SAVE_VERSION_LOCAL };
}

// === SAVE GAME CREATION ===

/**
 * Create save game.
 *  * @param world - The World.
 *  * @param slotName - The Slot name.
 *  * @param existing - The Existing.
 *  * @returns The result.
 */
function createSaveGame(world: WorldState, slotName?: string, existing?: SaveGame, timestampISO?: string): SaveGame {
  const now = timestampISO ?? existing?.lastSavedAtISO ?? (new (globalThis as any).Date()).toISOString();
  return {
    version: CURRENT_SAVE_VERSION_LOCAL,
    createdAtISO: existing?.createdAtISO ?? now,
    lastSavedAtISO: now,
    ruleset: {
      banzukeAlgorithm: "slot_fill_v1",
      kimariteRegistryVersion: "82_official_v1"
    },
    world: serializeWorld(world),
    saveSlotName: slotName,
    playTimeMinutes: existing?.playTimeMinutes
  };
}

// === STORAGE KEYS ===

/**
 * To slot key.
 *  * @param slotNameOrKey - The Slot name or key.
 *  * @returns The result.
 */
function toSlotKey(slotNameOrKey: string): string {
  return slotNameOrKey.startsWith(SAVE_KEY_PREFIX) ? slotNameOrKey : `${SAVE_KEY_PREFIX}${slotNameOrKey}`;
}

/**
 * Get save slot keys.
 *  * @returns The result.
 */
function getSaveSlotKeys(): string[] {
  const storage = getStorage();
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(SAVE_KEY_PREFIX)) keys.push(key);
  }
  return keys.sort(stableTieBreak);
}

// === METADATA LISTING ===

/** Defines the structure for save slot info. */
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
 * Get save slot infos.
 *  * @returns The result.
 */
export function getSaveSlotInfos(): SaveSlotInfo[] {
  const storage = getStorage();
  if (!storage) return [];

  const keys = getSaveSlotKeys();
  const infos: SaveSlotInfo[] = [];

  for (const key of keys) {
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;

      const parsed = destr(raw);
      if (!isSerializedSaveGame(parsed)) continue;

      const save = parsed as SaveGame;
      const slotName = save.saveSlotName || key.replace(SAVE_KEY_PREFIX, "");

      const playerHeya =
        save.world.playerHeyaId && save.world.heyas ? save.world.heyas[String(save.world.playerHeyaId)] : undefined;

      infos.push({
        key,
        slotName,
        year: save.world.year,
        bashoName: save.world.currentBashoName,
        playerHeyaName: playerHeya?.name,
        savedAt: save.lastSavedAtISO,
        version: save.version,
        isAutosave: slotName === AUTOSAVE_SLOT_NAME || key === AUTOSAVE_KEY
      });
    } catch {
      continue;
    }
  }

  infos.sort((a, b) => {
    if (a.isAutosave !== b.isAutosave) return a.isAutosave ? -1 : 1;
    const aIsSlot = /^slot_\d+$/.test(a.slotName);
    const bIsSlot = /^slot_\d+$/.test(b.slotName);
    if (aIsSlot && bIsSlot) {
      const an = Number(a.slotName.split("_")[1]);
      const bn = Number(b.slotName.split("_")[1]);
      return an - bn;
    }
    if (aIsSlot !== bIsSlot) return aIsSlot ? -1 : 1;
    return stableTieBreak(b.savedAt, a.savedAt);
  });

  return infos;
}

// === SAVE / LOAD ===

/**
 * Save game.
 *  * @param world - The World.
 *  * @param slotName - The Slot name.
 *  * @returns The result.
 */
export function saveGame(world: WorldState, slotName: string, timestampISO?: string): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const key = toSlotKey(slotName);
    
    // Prune before serialization
    runArchivalPruning(world);

    const existingRaw = storage.getItem(key);
    const existingParsed = existingRaw ? destr(existingRaw) : null;
    const existing = isSerializedSaveGame(existingParsed) ? (existingParsed as SaveGame) : undefined;

    const save = createSaveGame(world, slotName, existing, timestampISO);
    storage.setItem(key, JSON.stringify(save));
    return true;
  } catch (e) {
    console.error("Failed to save game:", e);
    return false;
  }
}

/**
 * Autosave.
 *  * @param world - The World.
 *  * @returns The result.
 */
export function autosave(world: WorldState, timestampISO?: string): boolean {
  return saveGame(world, AUTOSAVE_SLOT_NAME, timestampISO);
}

/**
 * Load game.
 *  * @param slotNameOrKey - The Slot name or key.
 *  * @returns The result.
 */
export function loadGame(slotNameOrKey: string): WorldState | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const key = toSlotKey(slotNameOrKey);
    const raw = storage.getItem(key);
    if (!raw) return null;

    const parsed = destr(raw);
    if (!isSerializedSaveGame(parsed)) return null;

    let save = parsed as SaveGame;
    if (save.version !== CURRENT_SAVE_VERSION_LOCAL) {
      save = migrateToCurrent(save);
    }

    return deserializeWorld(save.world);
  } catch (e) {
    console.error("Failed to load game:", e);
    return null;
  }
}

/**
 * Load autosave.
 *  * @returns The result.
 */
export function loadAutosave(): WorldState | null {
  return loadGame(AUTOSAVE_SLOT_NAME);
}

/**
 * Has autosave.
 *  * @returns The result.
 */
export function hasAutosave(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  return storage.getItem(AUTOSAVE_KEY) !== null;
}

/**
 * Delete save.
 *  * @param slotNameOrKey - The Slot name or key.
 *  * @returns The result.
 */
export function deleteSave(slotNameOrKey: string): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const key = toSlotKey(slotNameOrKey);
    storage.removeItem(key);
    return true;
  } catch (e) {
    console.error("Failed to delete save:", e);
    return false;
  }
}

// === EXPORT / IMPORT ===

/**
 * Export save.
 *  * @param world - The World.
 *  * @param filename - The Filename.
 */
/**
 * Export save — returns the JSON string and suggested filename.
 * The caller (UI layer) is responsible for triggering the download.
 */
export function exportSave(world: WorldState, filename?: string, timestampISO?: string): { json: string; filename: string } {
  const save = createSaveGame(world, undefined, undefined, timestampISO);
  const json = JSON.stringify(save, null, 2);
  const defaultFilename = filename || `basho_${world.year}_${world.currentBashoName || "save"}.json`;
  return { json, filename: defaultFilename };
}

/**
 * Import save.
 *  * @param file - The File.
 *  * @returns The result.
 */
export async function importSave(file: File): Promise<WorldState | null> {
  try {
    const text = await file.text();
    const parsed = destr(text);

    if (!isSerializedSaveGame(parsed)) {
      throw new Error("Invalid save file structure");
    }

    let save = parsed as SaveGame;
    if (save.version !== CURRENT_SAVE_VERSION_LOCAL) save = migrateToCurrent(save);

    return deserializeWorld(save.world);
  } catch (e) {
    console.error("Failed to import save:", e);
    return null;
  }
}

// === SLOT HELPERS ===

/**
 * Get available slot names.
 *  * @returns The result.
 */
function getAvailableSlotNames(): string[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => `slot_${i + 1}`);
}

/**
 * Quick save:
 * - uses first empty numbered slot
 * - else overwrites oldest numbered slot (not autosave)
 */
export function quickSave(world: WorldState, timestampISO?: string): boolean {
  const infos = getSaveSlotInfos().filter((s) => /^slot_\d+$/.test(s.slotName));
  const existing = new Set(infos.map((s) => s.slotName));

  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const slot = `slot_${i}`;
    if (!existing.has(slot)) return saveGame(world, slot);
  }

  const oldest = infos.slice().sort((a, b) => stableTieBreak(a.savedAt, b.savedAt))[0];
  return saveGame(world, oldest?.slotName || "slot_1");
}
