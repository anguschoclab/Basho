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

// === SAVE VERSION ===
export const CURRENT_SAVE_VERSION_LOCAL: SaveVersion = CURRENT_SAVE_VERSION;

// Canon: project is Basho
const SAVE_KEY_PREFIX = "basho_save_";
const AUTOSAVE_SLOT_NAME = "autosave";
const AUTOSAVE_KEY = `${SAVE_KEY_PREFIX}${AUTOSAVE_SLOT_NAME}`;
const SAVE_SLOT_COUNT = 5;

// === STORAGE GUARDS ===
function hasLocalStorage(): boolean {
  try {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

// === SERIALIZATION HELPERS ===

function mapToObject<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {};
  const keys = Array.from(map.keys()).sort();
  for (const key of keys) obj[key] = map.get(key)!;
  return obj;
}

function objectToMap<T>(obj: Record<string, T>): Map<string, T> {
  const map = new Map<string, T>();
  // stable: keys in JS objects are not guaranteed sorted, so we sort
  for (const key of Object.keys(obj).sort()) map.set(key, obj[key]);
  return map;
}

// === BashoState serialization ===
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

// === WORLD SERIALIZATION ===

export function serializeWorld(world: WorldState): SerializedWorldState {
  return {
    seed: world.seed,
    year: world.year,
    week: world.week,
    cyclePhase: world.cyclePhase,
    currentBashoName: world.currentBashoName,
    heyas: mapToObject(world.heyas),
    rikishi: mapToObject(world.rikishi),
    oyakata: mapToObject(world.oyakata),
    currentBasho: world.currentBasho ? serializeBashoState(world.currentBasho) : undefined,
    history: world.history,
    events: world.events,
    ftue: world.ftue,
    playerHeyaId: world.playerHeyaId,
    currentBanzuke: world.currentBanzuke,
    talentPool: (world as any).talentPool
  };
}

/**
 * Non-lossy upgrade/sanitize for old rikishi objects.
 * Fills required economics fields if missing.
 */
function sanitizeRikishi(r: Rikishi): Rikishi {
  const anyR = r as any;

  if (anyR.economics) {
    if (typeof anyR.economics.cash !== "number") anyR.economics.cash = 0;
    if (typeof anyR.economics.retirementFund !== "number") anyR.economics.retirementFund = 0;
    if (typeof anyR.economics.careerKenshoWon !== "number") anyR.economics.careerKenshoWon = 0;
    if (typeof anyR.economics.kinboshiCount !== "number") anyR.economics.kinboshiCount = 0;
    if (typeof anyR.economics.totalEarnings !== "number") anyR.economics.totalEarnings = 0;
    if (typeof anyR.economics.currentBashoEarnings !== "number") anyR.economics.currentBashoEarnings = 0;
    if (typeof anyR.economics.popularity !== "number") anyR.economics.popularity = 30;
  }

  // fatigue is optional; if present clamp it
  if (typeof anyR.fatigue === "number") {
    anyR.fatigue = Math.max(0, Math.min(100, anyR.fatigue));
  }

  return r;
}

function sanitizeHeya(h: Heya): Heya {
  const anyH = h as any;
  if (typeof anyH.funds !== "number") anyH.funds = 0;
  return h;
}

export function deserializeWorld(serialized: SerializedWorldState): WorldState {
  // Sanitize objects as we materialize them into Maps (non-lossy)
  const heyasObj: Record<string, Heya> = (serialized as any).heyas || {};
  const rikishiObj: Record<string, Rikishi> = (serialized as any).rikishi || {};
  const oyakataObj: Record<string, Oyakata> = (serialized as any).oyakata || {};

  for (const k of Object.keys(heyasObj)) sanitizeHeya(heyasObj[k]);
  for (const k of Object.keys(rikishiObj)) sanitizeRikishi(rikishiObj[k]);

  return {
    id: crypto.randomUUID(),
    seed: serialized.seed,
    year: serialized.year,
    week: serialized.week,
    cyclePhase: serialized.cyclePhase || "interim",
    currentBashoName: serialized.currentBashoName,
    heyas: objectToMap(heyasObj),
    rikishi: objectToMap(rikishiObj),
    oyakata: objectToMap(oyakataObj),
    currentBasho: serialized.currentBasho ? deserializeBashoState(serialized.currentBasho) : undefined,
    history: serialized.history,
    events: (serialized as any).events || { version: "1.0.0", log: [], dedupe: {} },
    ftue: serialized.ftue,
    playerHeyaId: serialized.playerHeyaId,
    currentBanzuke: serialized.currentBanzuke,
    talentPool: (serialized as any).talentPool,
    calendar: {
      year: serialized.year,
      month: 1,
      currentWeek: serialized.week || 1,
      currentDay: 1
    }
  };
}

// === VALIDATION ===

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
type MigrationFn = (save: SaveGame) => SaveGame;

const MIGRATIONS: Record<string, MigrationFn> = {
  // Add as needed:
  // "0.9.0->1.0.0": (save) => ({ ...save, version: "1.0.0" as SaveVersion })
};

function migrateToCurrent(save: SaveGame): SaveGame {
  if (save.version === CURRENT_SAVE_VERSION_LOCAL) return save;

  const directKey = `${save.version}->${CURRENT_SAVE_VERSION_LOCAL}`;
  const fn = MIGRATIONS[directKey];
  if (fn) return fn(save);

  // Non-lossy minimal bump: keep all fields, just update version.
  return { ...save, version: CURRENT_SAVE_VERSION_LOCAL };
}

// === SAVE GAME CREATION ===

export function createSaveGame(world: WorldState, slotName?: string, existing?: SaveGame): SaveGame {
  const now = new Date().toISOString();
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

function toSlotKey(slotNameOrKey: string): string {
  return slotNameOrKey.startsWith(SAVE_KEY_PREFIX) ? slotNameOrKey : `${SAVE_KEY_PREFIX}${slotNameOrKey}`;
}

export function getSaveSlotKeys(): string[] {
  if (!hasLocalStorage()) return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(SAVE_KEY_PREFIX)) keys.push(key);
  }
  return keys.sort();
}

// === METADATA LISTING ===

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

export function getSaveSlotInfos(): SaveSlotInfo[] {
  if (!hasLocalStorage()) return [];

  const keys = getSaveSlotKeys();
  const infos: SaveSlotInfo[] = [];

  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
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
    return b.savedAt.localeCompare(a.savedAt);
  });

  return infos;
}

// === SAVE / LOAD ===

export function saveGame(world: WorldState, slotName: string): boolean {
  if (!hasLocalStorage()) return false;

  try {
    const key = toSlotKey(slotName);

    const existingRaw = localStorage.getItem(key);
    const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
    const existing = isSerializedSaveGame(existingParsed) ? (existingParsed as SaveGame) : undefined;

    const save = createSaveGame(world, slotName, existing);
    localStorage.setItem(key, JSON.stringify(save));
    return true;
  } catch (e) {
    console.error("Failed to save game:", e);
    return false;
  }
}

export function autosave(world: WorldState): boolean {
  return saveGame(world, AUTOSAVE_SLOT_NAME);
}

export function loadGame(slotNameOrKey: string): WorldState | null {
  if (!hasLocalStorage()) return null;

  try {
    const key = toSlotKey(slotNameOrKey);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
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

export function loadAutosave(): WorldState | null {
  return loadGame(AUTOSAVE_SLOT_NAME);
}

export function hasAutosave(): boolean {
  if (!hasLocalStorage()) return false;
  return localStorage.getItem(AUTOSAVE_KEY) !== null;
}

export function deleteSave(slotNameOrKey: string): boolean {
  if (!hasLocalStorage()) return false;

  try {
    const key = toSlotKey(slotNameOrKey);
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error("Failed to delete save:", e);
    return false;
  }
}

// === EXPORT / IMPORT ===

export function exportSave(world: WorldState, filename?: string): void {
  const save = createSaveGame(world);
  const json = JSON.stringify(save, null, 2);

  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `basho_${world.year}_${world.currentBashoName || "save"}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

export async function importSave(file: File): Promise<WorldState | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

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

export function getAvailableSlotNames(): string[] {
  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => `slot_${i + 1}`);
}

/**
 * Quick save:
 * - uses first empty numbered slot
 * - else overwrites oldest numbered slot (not autosave)
 */
export function quickSave(world: WorldState): boolean {
  const infos = getSaveSlotInfos().filter((s) => /^slot_\d+$/.test(s.slotName));
  const existing = new Set(infos.map((s) => s.slotName));

  for (let i = 1; i <= SAVE_SLOT_COUNT; i++) {
    const slot = `slot_${i}`;
    if (!existing.has(slot)) return saveGame(world, slot);
  }

  const oldest = infos.slice().sort((a, b) => a.savedAt.localeCompare(b.savedAt))[0];
  return saveGame(world, oldest?.slotName || "slot_1");
}
