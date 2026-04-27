// localStorageProvider.ts
// =======================================================
// Browser localStorage implementation of IStorageProvider
//
// This is the React-boundary implementation. Import and register
// it at app startup so the engine can persist saves.
// =======================================================

import { type IStorageProvider, setStorageProvider } from "@/engine/storageProvider";

/**
 * LocalStorageProvider — wraps window.localStorage behind IStorageProvider.
 */
export class LocalStorageProvider implements IStorageProvider {
  getItem(key: string): string | null {
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    localStorage.removeItem(key);
  }
  key(index: number): string | null {
    return localStorage.key(index);
  }
  get length(): number {
    return localStorage.length;
  }
}

/**
 * Call once at app startup to register localStorage as the engine's storage backend.
 */
export function registerLocalStorage(): void {
  if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
    setStorageProvider(new LocalStorageProvider());
  }
}
