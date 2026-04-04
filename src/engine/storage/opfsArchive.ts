
import { type BoutResult } from "../types/basho";

// Type guard to ensure parsed JSON matches the expected structure.
// This prevents injection of arbitrary primitive types or malicious objects.
function validateBoutLog(data: unknown): BoutResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const requiredStringProps = ["boutId", "winner", "winnerRikishiId", "loserRikishiId", "kimarite", "kimariteName", "stance", "tachiaiWinner"];
  for (const prop of requiredStringProps) {
    if (typeof data[prop] !== "string") {
      console.warn(`[OPFS Validation] Invalid BoutResult: missing or invalid string property '${prop}'`);
      return null;
    }
  }

  if (typeof data.duration !== "number") {
    console.warn("[OPFS Validation] Invalid BoutResult: missing or invalid number property 'duration'");
    return null;
  }

  if (typeof data.upset !== "boolean") {
    console.warn("[OPFS Validation] Invalid BoutResult: missing or invalid boolean property 'upset'");
    return null;
  }

  // Arrays are optional but if present must be arrays
  if (data.narrative !== undefined && !Array.isArray(data.narrative)) {
    console.warn("[OPFS Validation] Invalid BoutResult: narrative must be an array of strings");
    return null;
  }

  if (data.pbpLines !== undefined && !Array.isArray(data.pbpLines)) {
    console.warn("[OPFS Validation] Invalid BoutResult: pbpLines must be an array");
    return null;
  }

  if (data.pbp !== undefined && !Array.isArray(data.pbp)) {
    console.warn("[OPFS Validation] Invalid BoutResult: pbp must be an array");
    return null;
  }

  return data as BoutResult;
}

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
  archiveBoutLog: (season: number, boutId: string, logData: unknown) => Promise<void>;
  retrieveBoutLog: (season: number, boutId: string) => Promise<BoutResult | null>;
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
  private async getDirectoryPath(path: string[]): Promise<FileSystemDirectoryHandle | null> {
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

  public async archiveBoutLog(season: number, boutId: string, logData: unknown): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return;

    const fileName = `${boutId}.json`;

    // Overwrite Protection (Append-Only Enforcement)
    try {
      await dir.getFileHandle(fileName, { create: false });
      // If the above line DOES NOT throw, the file exists.
      throw new ArchiveConflictError(`Bout log ${boutId} already exists in season ${season}. History is immutable.`);
    } catch (e: unknown) {
      if (e instanceof ArchiveConflictError) throw e;
      if ((e instanceof Error || e instanceof DOMException) && e.name !== 'NotFoundError') throw e; // Bubble up unexpected errors
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

  public async retrieveBoutLog(season: number, boutId: string): Promise<BoutResult | null> {
    const dir = await this.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`${boutId}.json`, { create: false });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      return validateBoutLog(parsed);
    } catch (e: unknown) {
      if ((e instanceof Error || e instanceof DOMException) && e.name === 'NotFoundError') return null; // Graceful degradation for missing logs
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
      for await (const entry of ((dir as unknown) as Record<string, () => AsyncIterable<FileSystemHandle>>).values()) {
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
    } catch (e: unknown) {
      if ((e instanceof Error || e instanceof DOMException) && e.name === 'NotFoundError') return null;
      console.error(`[OPFS] Error reading gazette S${season}W${week}:`, e);
      return null;
    }
  }
}

export const opfsArchiveService = new OPFSArchiveService();
