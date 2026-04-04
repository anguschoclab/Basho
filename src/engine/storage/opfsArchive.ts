
import { type BoutResult } from "../types/basho";
import { OPFSFileSystem } from "./OPFSFileSystem";

// Type guard to ensure parsed JSON matches the expected structure.
// This prevents injection of arbitrary primitive types or malicious objects.
function validateBoutLog(data: any): BoutResult | null {
  const result = boutResultSchema.safeParse(data);
  if (!result.success) {
    console.warn(`[OPFS Validation] Invalid BoutResult: ${result.error.message}`);
    return null;
  }
  return result.data as BoutResult;
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
  archiveBoutLog: (season: number, boutId: string, logData: any) => Promise<void>;
  retrieveBoutLog: (season: number, boutId: string) => Promise<any | null>;
  archiveGazette: (season: number, week: number, markdown: string) => Promise<void>;
  retrieveGazette: (season: number, week: number) => Promise<string | null>;
  getArchivedBoutIdsForSeason: (season: number) => Promise<string[]>;
}

class OPFSArchiveService implements ArchiveService {
  private fs = new OPFSFileSystem();

  public isSupported(): boolean {
    return this.fs.isSupported();
  }



  // --- BOUTS ---

  public async archiveBoutLog(season: number, boutId: string, logData: any): Promise<void> {
    const dir = await this.fs.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return;

    const fileName = `${boutId}.json`;

    // Overwrite Protection (Append-Only Enforcement)
    try {
      await dir.getFileHandle(fileName, { create: false });
      // If the above line DOES NOT throw, the file exists.
      throw new ArchiveConflictError(`Bout log ${boutId} already exists in season ${season}. History is immutable.`);
    } catch (e: unknown) {
      if (e instanceof ArchiveConflictError) throw e;
      const isNotFoundError = (e instanceof Error || e instanceof DOMException) && e.name === 'NotFoundError';
      if (!isNotFoundError) throw e; // Bubble up unexpected errors
    }

    // File does not exist, safe to write.
    try {
      const fileHandle = await dir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(logData));
      await writable.close();
    } catch (e) {
      this.fs.handleQuotaError(e);
    }
  }

  public async retrieveBoutLog(season: number, boutId: string): Promise<any | null> {
    const dir = await this.fs.getDirectoryPath([`season_${season}`, 'bouts']);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`${boutId}.json`, { create: false });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      return validateBoutLog(parsed);
    } catch (e: unknown) {
      const isNotFoundError = (e instanceof Error || e instanceof DOMException) && e.name === 'NotFoundError';
      if (isNotFoundError) return null; // Graceful degradation for missing logs
      console.error(`[OPFS] Error reading bout log ${boutId}:`, e);
      return null;
    }
  }

  public async getArchivedBoutIdsForSeason(season: number): Promise<string[]> {
    const dir = await this.fs.getDirectoryPath([`season_${season}`, 'bouts']);
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
    const dir = await this.fs.getDirectoryPath([`season_${season}`, 'gazettes']);
    if (!dir) return;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(markdown);
      await writable.close();
    } catch (e) {
      this.fs.handleQuotaError(e);
    }
  }

  public async retrieveGazette(season: number, week: number): Promise<string | null> {
    const dir = await this.fs.getDirectoryPath([`season_${season}`, 'gazettes']);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, { create: false });
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e: unknown) {
      const isNotFoundError = (e instanceof Error || e instanceof DOMException) && e.name === 'NotFoundError';
      if (isNotFoundError) return null;
      console.error(`[OPFS] Error reading gazette S${season}W${week}:`, e);
      return null;
    }
  }
}

export const opfsArchiveService = new OPFSArchiveService();
