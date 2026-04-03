export class OPFSFileSystem {
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' &&
           typeof navigator.storage !== 'undefined' &&
           typeof navigator.storage.getDirectory === 'function';
  }

  /**
   * Navigates or creates a nested directory structure.
   */
  public async getDirectoryPath(path: string[]): Promise<any | null> {
    if (!this.isSupported()) return null;

    try {
      let currentDir = await navigator.storage.getDirectory();
      for (const folder of path) {
        currentDir = await currentDir.getDirectoryHandle(folder, { create: true });
      }
      return currentDir;
    } catch (e) {
      console.warn(`[OPFS] Failed to access directory path: ${path.join('/')}`, e);
      return null;
    }
  }

  public handleQuotaError(e: unknown) {
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('[OPFS] Storage quota exceeded. Archiving skipped.');
      // Dispatch boundary event to UI layer (Zustand store will listen for this to show a Toast)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('engine:storage:quota-exceeded', {
          detail: { message: 'Local storage full. Older archives may need to be cleared.' }
        }));
      }
    } else {
      console.error('[OPFS] Unexpected storage error:', e);
    }
  }
}
