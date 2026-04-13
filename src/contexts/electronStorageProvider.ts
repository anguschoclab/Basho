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
  private storage: any;
  private isElectron: boolean;
  private cachedKeys: string[] = [];

  constructor() {
    // Check if running in Electron with electronCustom API
    this.isElectron = typeof window !== "undefined" && (window as any).electronCustom?.storage;
    if (this.isElectron) {
      this.storage = (window as any).electronCustom.storage;
      // Preload keys synchronously for Electron
      this.loadKeys();
    } else {
      // Fallback to localStorage for web builds
      this.storage = {
        get: (key: string) => localStorage.getItem(key),
        set: (key: string, value: string) => localStorage.setItem(key, value),
        delete: (key: string) => localStorage.removeItem(key),
        clear: () => localStorage.clear(),
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
    return this.storage.get(key);
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
