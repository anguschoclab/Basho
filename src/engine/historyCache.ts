/**
 * historyCache.ts
 * ===============
 * LRU Cache for Archived Historical Data.
 * Prevents OOM by limiting the number of historical years held in RAM.
 */

import { opfsArchiveService } from "./storage/opfsArchive";
import { electronArchiveService } from "./storage/electronArchive";
import { info } from "./utils/Logger";
import type { BoutResult } from "./types/basho";
import type { RecordEntry } from "./types/records";
import type { BanzukeSnapshot } from "./types/banzuke";

export interface ArchivedYear {
  year: number;
  bouts: BoutResult[];
  awards: RecordEntry[];
  banzukeSnapshots: BanzukeSnapshot[];
}

class HistoryLRUCache {
  private cache: Map<number, ArchivedYear> = new Map();
  private readonly maxCapacity: number;

  constructor(maxCapacity: number = 3) {
    this.maxCapacity = maxCapacity;
  }

  /**
   * Get a year from cache or OPFS.
   *  * @param year - The Year.
   *  * @returns The result.
   */
  public async getYear(year: number): Promise<ArchivedYear | null> {
    if (this.cache.has(year)) {
      // Move to front (refresh LRU)
      const data = this.cache.get(year)!;
      this.cache.delete(year);
      this.cache.set(year, data);
      return data;
    }

    // Cache miss — try to load from OPFS
    info(`Cache miss for year ${year}, attempting OPFS load...`, "HistoryCache");
    const data = await this.loadFromOPFS(year);
    if (data) {
      this.putYear(year, data);
      return data;
    }

    return null;
  }

  /**
   * Put a year into the cache.
   *  * @param year - The Year.
   *  * @param data - The Data.
   */
  public putYear(year: number, data: ArchivedYear): void {
    if (this.cache.has(year)) {
      this.cache.delete(year);
    } else if (this.cache.size >= this.maxCapacity) {
      // Evict oldest (first key in Map iterator)
      const oldestYear = this.cache.keys().next().value;
      if (oldestYear !== undefined) {
        console.log(`[HistoryCache] Evicting year ${oldestYear} from RAM.`);
        this.cache.delete(oldestYear);
      }
    }
    this.cache.set(year, data);
  }

  /**
   * Loads a full year of historical data from OPFS/Electron FS by aggregating bouts and snapshots.
   */
  private async loadFromOPFS(year: number): Promise<ArchivedYear | null> {
    // Use electronArchiveService in Electron builds, opfsArchiveService in web builds
    const archiveService =
      typeof window !== "undefined" && window.__ELECTRON__ === true
        ? electronArchiveService
        : opfsArchiveService;

    if (!archiveService.isSupported()) return null;

    try {
      // 1. Load Bouts
      const boutIds = await archiveService.getArchivedBoutIdsForSeason(year);
      if (boutIds.length === 0) return null;

      const bouts = await Promise.all(
        boutIds.map((id) => archiveService.retrieveBoutLog(year, id))
      );

      // 2. Load Awards
      const awards = await archiveService.retrieveAwards(year);

      // 3. Load Banzuke Snapshots (Standard 6 Bashos)
      const snapshots = await Promise.all(
        [1, 3, 5, 7, 9, 11].map((m) => archiveService.retrieveBanzuke(year, m))
      );

      return {
        year,
        bouts: bouts.filter((b): b is BoutResult => b !== null),
        awards,
        banzukeSnapshots: snapshots.filter((s): s is BanzukeSnapshot => s !== null),
      };
    } catch (err) {
      console.error(`[HistoryCache] Failed to load year ${year} from archive service:`, err);
      return null;
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const historyCache = new HistoryLRUCache(3);
