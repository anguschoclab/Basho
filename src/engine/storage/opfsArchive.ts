/**
 * OPFS Archival System
 * * Handles the "Cold Storage" of the engine. Huge payloads like Play-By-Play arrays
 * and Markdown blobs are saved directly to the browser's local sandbox filesystem.
 * This keeps IndexedDB and our Zustand active state highly performant.
 */

export class ArchiveConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArchiveConflictError';
  }
}

export interface ArchiveService {
  isSupported: () => boolean;
  archiveBoutLog: (season: number, boutId: string, logData: any) => Promise<void>;
  retrieveBoutLog: (season: number, boutId: string) => Promise<any | null>;
  archiveGazette: (season: number, week: number, markdown: string) => Promise<void>;
  retrieveGazette: (season: number, week: number) => Promise<string | null>;
  getArchivedBoutIdsForSeason: (season: number) => Promise<string[]>;
}

class OPFSArchiveService implements ArchiveService {

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' &&
           typeof navigator.storage !== 'undefined' &&
           typeof navigator.storage.getDirectory === 'function';
  }

  /**
   * Navigates or creates a nested directory structure.
   */
  private async getDirectoryPath(path: string[]): Promise<any | null> {
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

  private handleQuotaError(e: unknown) {
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

  // --- BOUTS ---

  public async archiveBoutLog(season: number, boutId: string, logData: any): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return;

    const fileName = `${boutId}.json`;

    // Overwrite Protection (Append-Only Enforcement)
    try {
      await dir.getFileHandle(fileName, { create: false });
      // If the above line DOES NOT throw, the file exists.
      throw new ArchiveConflictError(`Bout log ${boutId} already exists in season ${season}. History is immutable.`);
    } catch (e: any) {
      if (e instanceof ArchiveConflictError) throw e;
      if (e.name !== 'NotFoundError') throw e; // Bubble up unexpected errors
    }

    // File does not exist, safe to write.
    try {
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(logData));
      await writable.close();
    } catch (e) {
      this.handleQuotaError(e);
    }
  }

  public async retrieveBoutLog(season: number, boutId: string): Promise<any | null> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`${boutId}.json`, { create: false });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      return JSON.parse(contents);
    } catch (e: any) {
      if (e.name === 'NotFoundError') return null; // Graceful degradation for missing logs
      console.error(`[OPFS] Error reading bout log ${boutId}:`, e);
      return null;
    }
  }

  public async getArchivedBoutIdsForSeason(season: number): Promise<string[]> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return [];

    const ids: string[] = [];
    try {
      // Async iteration over directory handles
      for await (const entry of (dir as any).values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          ids.push(entry.name.replace('.json', ''));
        }
      }
    } catch (e) {
      console.error(`[OPFS] Error listing bouts for season ${season}:`, e);
    }
    return ids;
  }

  // --- GAZETTES ---

  public async archiveGazette(season: number, week: number, markdown: string): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'gazettes']);
    if (!dir) return;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(markdown);
      await writable.close();
    } catch (e) {
      this.handleQuotaError(e);
    }
  }

  public async retrieveGazette(season: number, week: number): Promise<string | null> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'gazettes']);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, { create: false });
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e: any) {
      if (e.name === 'NotFoundError') return null;
      console.error(`[OPFS] Error reading gazette S${season}W${week}:`, e);
      return null;
    }
  }
}

export const opfsArchiveService = new OPFSArchiveService();
