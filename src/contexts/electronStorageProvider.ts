// electronStorageProvider.ts
// =======================================================
// Electron storage implementation of IStorageProvider
//
// This is the Electron-bound implementation. Import and register
// it at app startup so the engine can persist saves using electron-store.
// =======================================================

import { type IStorageProvider, setStorageProvider } from "@/engine/storageProvider";

/**
 * ElectronStorageProvider — wraps electron-store behind IStorageProvider.
 * Falls back to localStorage if electron-store is not available (for web builds).
 */
export class ElectronStorageProvider implements IStorageProvider {
  private storage: {
    get: (key: string) => unknown;
    set: (key: string, value: unknown) => void;
    delete: (key: string) => void;
    clear: () => void;
    keys: () => Record<string, unknown>;
  };
  private isElectron: boolean;
  private cachedKeys: string[] = [];

  constructor() {
    // Check if running in Electron with electronCustom API
    this.isElectron = typeof window !== "undefined" && !!window.electronCustom?.storage;
    if (this.isElectron) {
      this.storage = window.electronCustom!.storage;
      // Load keys asynchronously
      this.loadKeys().catch((e) => console.error("Failed to load keys from electron-store:", e));
    } else {
      // Fallback to localStorage for web builds
      this.storage = {
        get: (key: string) => localStorage.getItem(key),
        set: (key: string, value: unknown) => localStorage.setItem(key, value as string),
        delete: (key: string) => localStorage.removeItem(key),
        clear: () => localStorage.clear(),
        keys: () => {
          const keys: Record<string, unknown> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys[key] = localStorage.getItem(key);
          }
          return keys;
        },
      };
    }
  }

  private async loadKeys(): Promise<void> {
    if (this.isElectron) {
      try {
        const keysObj = await this.storage.keys();
        this.cachedKeys = Object.keys(keysObj);
      } catch (e) {
        console.error("Failed to load keys from electron-store:", e);
        this.cachedKeys = [];
      }
    }
  }

  getItem(key: string): string | null {
    const value = this.storage.get(key);
    return value as string | null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
    // Reload keys after setting a new item
    if (this.isElectron) {
      this.loadKeys();
    }
  }

  removeItem(key: string): void {
    this.storage.delete(key);
    // Reload keys after removing an item
    if (this.isElectron) {
      this.loadKeys();
    }
  }

  key(index: number): string | null {
    if (!this.isElectron) {
      return localStorage.key(index);
    }

    // For Electron, use cached keys
    return this.cachedKeys[index] || null;
  }

  get length(): number {
    if (!this.isElectron) {
      return localStorage.length;
    }

    // For Electron, use cached keys length
    return this.cachedKeys.length;
  }
}

/**
 * Call once at app startup to register electron-store as the engine's storage backend.
 * Automatically detects if running in Electron and uses electron-store, otherwise falls back to localStorage.
 */
export function registerElectronStorage(): void {
  if (typeof window !== "undefined") {
    setStorageProvider(new ElectronStorageProvider());
  }
}
