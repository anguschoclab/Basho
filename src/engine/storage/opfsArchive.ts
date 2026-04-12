import { type BoutResult } from "../types/basho";
import { OPFSFileSystem } from "./OPFSFileSystem";
import { warn, error } from "../utils/Logger";

// Type guard to ensure parsed JSON matches the expected structure.
// This prevents injection of arbitrary primitive types or malicious objects.
function validateBoutLog(data: unknown): BoutResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  const requiredStringProps = [
    "boutId",
    "winner",
    "winnerRikishiId",
    "loserRikishiId",
    "kimarite",
    "kimariteName",
    "stance",
    "tachiaiWinner",
  ];
  for (const prop of requiredStringProps) {
    if (typeof obj[prop] !== "string") {
      warn(`Invalid BoutResult: missing or invalid string property '${prop}'`, "OPFS Validation");
      return null;
    }
  }

  if (typeof obj.duration !== "number") {
    warn("Invalid BoutResult: missing or invalid number property 'duration'", "OPFS Validation");
    return null;
  }

  if (typeof obj.upset !== "boolean") {
    warn("Invalid BoutResult: missing or invalid boolean property 'upset'", "OPFS Validation");
    return null;
  }

  // Arrays are optional but if present must be arrays
  if (obj.narrative !== undefined && !Array.isArray(obj.narrative)) {
    warn("Invalid BoutResult: narrative must be an array of strings", "OPFS Validation");
    return null;
  }

  if (obj.pbpLines !== undefined && !Array.isArray(obj.pbpLines)) {
    warn("Invalid BoutResult: pbpLines must be an array", "OPFS Validation");
    return null;
  }

  if (obj.pbp !== undefined && !Array.isArray(obj.pbp)) {
    warn("Invalid BoutResult: pbp must be an array", "OPFS Validation");
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
    this.name = "ArchiveConflictError";
  }
}

export interface ArchiveService {
  isSupported: () => boolean;
  archiveBoutLog: (season: number, boutId: string, logData: unknown) => Promise<void>;
  retrieveBoutLog: (season: number, boutId: string) => Promise<BoutResult | null>;
  archiveGazette: (season: number, week: number, markdown: string) => Promise<void>;
  retrieveGazette: (season: number, week: number) => Promise<string | null>;
  getArchivedBoutIdsForSeason: (season: number) => Promise<string[]>;
  archiveAwards: (season: number, awards: any[]) => Promise<void>;
  retrieveAwards: (season: number) => Promise<any[]>;
  archiveBanzuke: (season: number, bashoNumber: number, snapshot: any) => Promise<void>;
  retrieveBanzuke: (season: number, bashoNumber: number) => Promise<any | null>;
}

class OPFSArchiveService extends OPFSFileSystem implements ArchiveService {
  // --- BOUTS ---

  public async archiveBoutLog(season: number, boutId: string, logData: unknown): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, "bouts"]);
    if (!dir) return;

    const fileName = `${boutId}.json`;

    // Overwrite Protection (Append-Only Enforcement)
    try {
      await dir.getFileHandle(fileName, { create: false });
      // If the above line DOES NOT throw, the file exists.
      throw new ArchiveConflictError(
        `Bout log ${boutId} already exists in season ${season}. History is immutable.`
      );
    } catch (e: unknown) {
      if (e instanceof ArchiveConflictError) throw e;
      if ((e instanceof Error || e instanceof DOMException) && e.name !== "NotFoundError") throw e; // Bubble up unexpected errors
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
    const dir = await this.getDirectoryPath([`season_${season}`, "bouts"]);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`${boutId}.json`, {
        create: false,
      });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      const parsed = JSON.parse(contents);
      return validateBoutLog(parsed);
    } catch (e: unknown) {
      if ((e instanceof Error || e instanceof DOMException) && e.name === "NotFoundError")
        return null; // Graceful degradation for missing logs
      error(
        `Error reading bout log ${boutId}: ${e instanceof Error ? e.message : String(e)}`,
        "OPFS"
      );
      return null;
    }
  }

  public async getArchivedBoutIdsForSeason(season: number): Promise<string[]> {
    const dir = await this.getDirectoryPath([`season_${season}`, "bouts"]);
    if (!dir) return [];

    const ids: string[] = [];
    try {
      // Async iteration over directory handles with concurrent chunking for performance
      const iterator = (
        dir as unknown as Record<string, () => AsyncIterableIterator<FileSystemHandle>>
      ).values();
      const CHUNK_SIZE = 100;
      let isDone = false;

      while (!isDone) {
        const promises: Promise<IteratorResult<FileSystemHandle>>[] = [];
        for (let i = 0; i < CHUNK_SIZE; i++) {
          promises.push(iterator.next());
        }

        const results = await Promise.all(promises);
        for (const res of results) {
          if (res.done) {
            isDone = true;
            break;
          }
          const entry = res.value;
          if (entry.kind === "file" && entry.name.endsWith(".json")) {
            ids.push(entry.name.replace(".json", ""));
          }
        }
      }
    } catch (e) {
      error(
        `Error listing bouts for season ${season}: ${e instanceof Error ? e.message : String(e)}`,
        "OPFS"
      );
    }
    return ids;
  }

  // --- GAZETTES ---

  public async archiveGazette(season: number, week: number, markdown: string): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, "gazettes"]);
    if (!dir) return;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(markdown);
      await writable.close();
    } catch (e) {
      this.handleQuotaError(e);
    }
  }

  public async retrieveGazette(season: number, week: number): Promise<string | null> {
    const dir = await this.getDirectoryPath([`season_${season}`, "gazettes"]);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`week_${week}.md`, {
        create: false,
      });
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (e: unknown) {
      if ((e instanceof Error || e instanceof DOMException) && e.name === "NotFoundError")
        return null;
      error(
        `Error reading gazette S${season}W${week}: ${e instanceof Error ? e.message : String(e)}`,
        "OPFS"
      );
      return null;
    }
  }

  // --- AWARDS ---

  public async archiveAwards(season: number, awards: any[]): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`]);
    if (!dir) return;

    try {
      const fileHandle = await dir.getFileHandle("awards.json", {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(awards));
      await writable.close();
    } catch (e) {
      this.handleQuotaError(e);
    }
  }

  public async retrieveAwards(season: number): Promise<any[]> {
    const dir = await this.getDirectoryPath([`season_${season}`]);
    if (!dir) return [];

    try {
      const fileHandle = await dir.getFileHandle("awards.json", {
        create: false,
      });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      return JSON.parse(contents);
    } catch (_e) {
      return [];
    }
  }

  // --- BANZUKE ---

  public async archiveBanzuke(season: number, bashoNumber: number, snapshot: any): Promise<void> {
    const dir = await this.getDirectoryPath([`season_${season}`, "banzuke"]);
    if (!dir) return;

    try {
      const fileHandle = await dir.getFileHandle(`basho_${bashoNumber}.json`, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(snapshot));
      await writable.close();
    } catch (e) {
      this.handleQuotaError(e);
    }
  }

  public async retrieveBanzuke(season: number, bashoNumber: number): Promise<any | null> {
    const dir = await this.getDirectoryPath([`season_${season}`, "banzuke"]);
    if (!dir) return null;

    try {
      const fileHandle = await dir.getFileHandle(`basho_${bashoNumber}.json`, {
        create: false,
      });
      const file = await fileHandle.getFile();
      const contents = await file.text();
      return JSON.parse(contents);
    } catch (_e) {
      return null;
    }
  }
}

export const opfsArchiveService = new OPFSArchiveService();
