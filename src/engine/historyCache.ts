/**
 * historyCache.ts
 * ===============
 * LRU Cache for Archived Historical Data.
 * Prevents OOM by limiting the number of historical years held in RAM.
 */

import { opfsArchiveService } from "./storage/opfsArchive";

export interface ArchivedYear {
  year: number;
  bouts: any[];
  awards: any[];
  banzukeSnapshots: any[];
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
    console.log(`[HistoryCache] Cache miss for year ${year}, attempting OPFS load...`);
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
   * Mock / Placeholder for actually loading a full year from OPFS.
   * In a real implementation, this would aggregate bouts and snapshots.
   */
  private async loadFromOPFS(year: number): Promise<ArchivedYear | null> {
    if (!opfsArchiveService.isSupported()) return null;

    try {
      // This is a simplified fetch — in reality, we'd have a Year-level archive file
      // or we'd aggregate individual bout logs.
      const boutIds = await opfsArchiveService.getArchivedBoutIdsForSeason(year);
      if (boutIds.length === 0) return null;

      const bouts = await Promise.all(
        boutIds.map(id => opfsArchiveService.retrieveBoutLog(year, id))
      );

      return {
        year,
        bouts: bouts.filter(Boolean),
        awards: [],
        banzukeSnapshots: []
      };
    } catch (err) {
      console.error(`[HistoryCache] Failed to load year ${year} from OPFS:`, err);
      return null;
    }
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const historyCache = new HistoryLRUCache(3);
