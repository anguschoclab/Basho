// storageProvider.ts
// =======================================================
// Abstract Storage Provider — Environment-agnostic persistence
//
// The engine uses this interface to read/write saves without
// depending on window.localStorage or any browser API.
// =======================================================

/**
 * IStorageProvider — environment-agnostic key-value storage interface.
 * Mirrors the subset of the Web Storage API used by the save/load system.
 */
export interface IStorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

// === Module-level singleton ===
let _storageProvider: IStorageProvider | null = null;

/**
 * Register a storage provider for the engine to use.
 * Must be called once at app startup (e.g., in GameContext.tsx).
 */
export function setStorageProvider(provider: IStorageProvider): void {
  _storageProvider = provider;
}

/**
 * Get the current storage provider, or null if none registered.
 */
export function getStorageProvider(): IStorageProvider | null {
  return _storageProvider;
}

/**
 * Check if a storage provider has been registered.
 */
export function hasStorageProvider(): boolean {
  return _storageProvider !== null;
}
