// electronStorageProvider.ts
// =======================================================
// Electron storage implementation of IStorageProvider
//
// This is the Electron-bound implementation. Import and register
// it at app startup so the engine can persist saves using electron-store.
// =======================================================

import { type IStorageProvider, setStorageProvider } from "@/engine/storageProvider";
import { error } from "@/engine/utils/Logger";
import { isValidStorageKey } from "@/utils/storageKeyValidation";
import LZString from "lz-string";

/**
 * Marker prefix for LZ-compressed values in the localStorage fallback.
 * A serialized save world can exceed Chromium's ~5MB localStorage quota
 * (observed: ~5.4MB after a basho day tick — bout pbp/narrative data).
 * Electron's electron-store has no quota and stores raw JSON; the web
 * fallback transparently compresses on write and decompresses on read.
 * Values without the prefix are returned as-is (legacy uncompressed saves).
 */
const LZ_PREFIX = "lz16:";

function encodeStored(value: string): string {
  return LZ_PREFIX + LZString.compressToUTF16(value);
}

function decodeStored(value: string): string {
  if (!value.startsWith(LZ_PREFIX)) return value;
  return LZString.decompressFromUTF16(value.slice(LZ_PREFIX.length)) ?? value;
}

/** IndexedDB database/store used for the web fallback. */
const IDB_NAME = "basho-saves";
const IDB_STORE = "kv";

/**
 * ElectronStorageProvider — wraps electron-store behind IStorageProvider.
 *
 * Web builds use an IndexedDB-backed store with a synchronous read-through
 * cache: localStorage's ~5MB origin quota cannot hold a mid-career save
 * (~30MB JSON / ~7MB compressed after one year), and the serialized world
 * only grows with history. IStorageProvider is synchronous, so the provider
 * hydrates an in-memory cache during app boot (see storageReady()); until
 * hydration completes it falls back to localStorage, and legacy
 * `basho_save_*` localStorage keys are migrated into IDB on first hydrate.
 */
export class ElectronStorageProvider implements IStorageProvider {
  private storage!: {
    /** Electron: Promise via ipcRenderer.invoke. Web: synchronous string|null. */
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
    clear: () => void;
    keys: () => Promise<Record<string, unknown>>;
  };
  private isElectron: boolean;

  /**
   * Electron read-through cache. Every preload `storage.get` resolves via
   * `ipcRenderer.invoke` — a Promise — but IStorageProvider is synchronous.
   * We hydrate this cache from `storage.keys()` (which returns the whole
   * key→value record) at startup and write through on every mutation, so
   * getItem never touches the async bridge directly.
   */
  private electronCache = new Map<string, string>();

  /** Web-fallback state. */
  private idb: IDBDatabase | null = null;
  private idbCache = new Map<string, string>();
  private hydrated = false;
  readonly ready: Promise<void>;

  constructor() {
    // Check if running in Electron with electronCustom API
    this.isElectron = typeof window !== "undefined" && !!window.electronCustom?.storage;
    this.ready = Promise.resolve();
    if (this.isElectron) {
      this.storage = window.electronCustom?.storage ?? this.storage;
      this.ready = this.hydrateElectronStore();
    } else if (typeof indexedDB !== "undefined") {
      this.storage = {
        get: (key: string) => this.webGet(key),
        set: (key: string, value: unknown) => this.webSet(key, value as string),
        delete: (key: string) => this.webDelete(key),
        clear: () => this.webClear(),
        keys: () => Promise.resolve(this.webKeysRecord()),
      };
      this.ready = this.hydrateWebStore();
    } else {
      // No IndexedDB (tests, exotic environments) — plain localStorage.
      this.hydrated = true;
      this.storage = {
        get: (key: string) => {
          const raw = localStorage.getItem(key);
          return raw === null ? null : decodeStored(raw);
        },
        set: (key: string, value: unknown) =>
          localStorage.setItem(key, encodeStored(value as string)),
        delete: (key: string) => localStorage.removeItem(key),
        clear: () => localStorage.clear(),
        keys: () => {
          const keys: Record<string, unknown> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys[key] = localStorage.getItem(key);
          }
          return Promise.resolve(keys);
        },
      };
    }
  }

  // ── Web fallback (IndexedDB + read-through cache) ──────────────────────

  private webGet(key: string): string | null {
    const cached = this.idbCache.get(key);
    if (cached !== undefined) return cached;
    // Pre-hydration and legacy values: localStorage may still hold the key.
    const raw = localStorage.getItem(key);
    return raw === null ? null : decodeStored(raw);
  }

  private webSet(key: string, value: string): void {
    this.idbCache.set(key, value);
    if (this.hydrated && this.idb) {
      void this.idbPut(key, value).catch((e) => {
        error(
          `IndexedDB write failed (${e instanceof DOMException ? `${e.name}: ${e.message}` : String(e)})`,
          "ElectronStorage"
        );
        this.fallbackPersist(key, value);
      });
    } else {
      // Pre-hydration gap: keep writing localStorage so nothing is lost;
      // the hydrate sweep migrates it into IDB.
      try {
        localStorage.setItem(key, encodeStored(value));
      } catch {
        // Quota — the in-memory cache still holds the value.
      }
    }
  }

  /**
   * Last-resort persistence when an IDB write fails (quota, abort, dead
   * connection). The compressed copy may fit localStorage's ~5MB quota where
   * the raw IDB payload did not; if it doesn't, the in-memory cache still
   * serves reads for the session. On next boot the hydrate sweep migrates
   * any surviving localStorage keys back into IDB.
   */
  private fallbackPersist(key: string, value: string): void {
    try {
      localStorage.setItem(key, encodeStored(value));
    } catch {
      // localStorage quota exceeded too — nothing more we can persist.
    }
  }

  private webDelete(key: string): void {
    this.idbCache.delete(key);
    localStorage.removeItem(key);
    if (this.idb) void this.idbDelete(key).catch(() => {});
  }

  private webClear(): void {
    this.idbCache.clear();
    localStorage.clear();
    if (this.idb) void this.idbClear().catch(() => {});
  }

  /** Union of cached (IDB-backed) and any residual localStorage keys. */
  private webKeyList(): string[] {
    const merged = new Set<string>(this.idbCache.keys());
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) merged.add(k);
    }
    return [...merged];
  }

  private webKeysRecord(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const k of this.webKeyList()) out[k] = this.webGet(k);
    return out;
  }

  private async hydrateWebStore(): Promise<void> {
    try {
      this.idb = await this.openIdb();
      // Load existing IDB entries — but never clobber a fresher value
      // written to the cache during the hydration gap.
      for (const [k, v] of await this.idbGetAll()) {
        if (!this.idbCache.has(k)) this.idbCache.set(k, v);
      }
      // Migrate legacy localStorage saves into IDB, then free the quota.
      for (const key of this.localSaveKeys()) {
        const raw = localStorage.getItem(key);
        if (raw == null) continue;
        const decoded = decodeStored(raw);
        try {
          if (this.idbCache.get(key) !== decoded) await this.idbPut(key, decoded);
          this.idbCache.set(key, decoded);
          localStorage.removeItem(key);
        } catch {
          // Keep the localStorage copy if the IDB write failed — reads
          // still resolve through webGet's fallback.
        }
      }
    } catch (e) {
      error("IndexedDB unavailable — falling back to localStorage", "ElectronStorage", e);
      this.idb = null;
    } finally {
      this.hydrated = true;
    }
  }

  private localSaveKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("basho_save_")) keys.push(k);
    }
    return keys;
  }

  private openIdb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private idbTx(mode: IDBTransactionMode): { store: IDBObjectStore; done: Promise<void> } {
    const db = this.idb;
    if (!db) throw new Error("IndexedDB not initialized");
    const tx = db.transaction(IDB_STORE, mode);
    return {
      store: tx.objectStore(IDB_STORE),
      done: new Promise((res, rej) => {
        tx.oncomplete = () => res();
        tx.onerror = () => rej(tx.error);
        tx.onabort = () => rej(tx.error);
      }),
    };
  }

  private async idbGetAll(): Promise<[string, string][]> {
    const { store, done } = this.idbTx("readonly");
    const keysReq = store.getAllKeys();
    const valsReq = store.getAll();
    await done;
    const keys = keysReq.result as string[];
    const vals = valsReq.result as string[];
    return keys.map((k, i) => [k, vals[i]] as [string, string]);
  }

  private idbPut(key: string, value: string): Promise<void> {
    const { store, done } = this.idbTx("readwrite");
    store.put(value, key);
    return done;
  }

  private idbDelete(key: string): Promise<void> {
    const { store, done } = this.idbTx("readwrite");
    store.delete(key);
    return done;
  }

  private idbClear(): Promise<void> {
    const { store, done } = this.idbTx("readwrite");
    store.clear();
    return done;
  }

  /**
   * Hydrates the Electron value cache from `storage.keys()`, which returns
   * the full key→value record from electron-store. Mirrors the web fallback:
   * never clobber a fresher value written during the hydration gap.
   */
  private async hydrateElectronStore(): Promise<void> {
    try {
      const record = await this.storage.keys();
      for (const [k, v] of Object.entries(record)) {
        if (typeof v === "string" && !this.electronCache.has(k)) {
          this.electronCache.set(k, v);
        }
      }
    } catch (e) {
      error("Failed to hydrate electron-store cache", "ElectronStorage", e);
    } finally {
      this.hydrated = true;
    }
  }

  getItem(key: string): string | null {
    if (!isValidStorageKey(key)) return null;
    if (this.isElectron) {
      // Synchronous read-through cache — the IPC get returns a Promise and
      // cannot be awaited here. Pre-hydration reads return null; bootstrap
      // awaits storageReady() before the save list is shown.
      return this.electronCache.get(key) ?? null;
    }
    const value = this.storage.get(key);
    if (value == null) return null;
    return value as string;
  }

  setItem(key: string, value: string): void {
    if (!isValidStorageKey(key)) return;
    if (this.isElectron) {
      this.electronCache.set(key, value);
      this.storage.set(key, value);
      return;
    }
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    if (!isValidStorageKey(key)) return;
    if (this.isElectron) {
      this.electronCache.delete(key);
      this.storage.delete(key);
      return;
    }
    this.storage.delete(key);
  }

  private electronKeyList(): string[] {
    return [...this.electronCache.keys()];
  }

  key(index: number): string | null {
    if (!this.isElectron) {
      // Merged view: IDB-backed cache keys plus any residual localStorage keys.
      return this.webKeyList()[index] ?? null;
    }

    return this.electronKeyList()[index] ?? null;
  }

  get length(): number {
    if (!this.isElectron) {
      return this.webKeyList().length;
    }

    return this.electronCache.size;
  }
}

let _storageReady: Promise<void> = Promise.resolve();

/**
 * Call once at app startup to register electron-store as the engine's storage backend.
 * Automatically detects if running in Electron and uses electron-store, otherwise falls back to localStorage.
 */
export function registerElectronStorage(): void {
  if (typeof window !== "undefined") {
    const provider = new ElectronStorageProvider();
    _storageReady = provider.ready;
    setStorageProvider(provider);
  }
}

/**
 * Resolves once the web storage fallback has hydrated its cache from
 * IndexedDB (immediately on Electron / non-IDB environments). Bootstrap
 * awaits this behind the splash screen so the save list never flashes
 * empty while IDB loads.
 */
export function storageReady(): Promise<void> {
  return _storageReady;
}
