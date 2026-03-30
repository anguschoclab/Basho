import { describe, it, expect, vi, beforeEach } from 'vitest';
import { historyCache } from '../historyCache';
import { opfsArchiveService } from '../storage/opfsArchive';

describe('HistoryLRUCache', () => {
  beforeEach(() => {
    historyCache.clear();
    vi.restoreAllMocks();
  });

  it('should initially be empty and miss cache', async () => {
    // Mock OPFS to return null (not found)
    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(true);
    vi.spyOn(opfsArchiveService, 'getArchivedBoutIdsForSeason').mockResolvedValue([]);

    const yearData = await historyCache.getYear(2000);
    expect(yearData).toBeNull();
  });

  it('should store and retrieve a year from RAM cache', async () => {
    const mockData = { year: 2000, bouts: [], awards: [], banzukeSnapshots: [] };

    // Put data directly
    historyCache.putYear(2000, mockData);

    // Get data - should hit cache
    const yearData = await historyCache.getYear(2000);
    expect(yearData).toBe(mockData);
  });

  it('should attempt OPFS load on cache miss', async () => {
    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(true);
    vi.spyOn(opfsArchiveService, 'getArchivedBoutIdsForSeason').mockResolvedValue(['bout1']);
    vi.spyOn(opfsArchiveService, 'retrieveBoutLog').mockResolvedValue({ id: 'bout1' });

    const yearData = await historyCache.getYear(2000);

    expect(yearData).toEqual({
      year: 2000,
      bouts: [{ id: 'bout1' }],
      awards: [],
      banzukeSnapshots: []
    });

    // Should now be cached
    const cachedData = await historyCache.getYear(2000);
    expect(cachedData).toBe(yearData); // Strict equality means it came from cache
  });

  it('should not throw or cache when OPFS throws error', async () => {
    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(true);
    vi.spyOn(opfsArchiveService, 'getArchivedBoutIdsForSeason').mockRejectedValue(new Error('OPFS error'));

    const yearData = await historyCache.getYear(2000);
    expect(yearData).toBeNull();
  });

  it('should evict oldest entry when capacity is reached', async () => {
    // Fill the cache (default capacity is 3)
    historyCache.putYear(2001, { year: 2001, bouts: [], awards: [], banzukeSnapshots: [] });
    historyCache.putYear(2002, { year: 2002, bouts: [], awards: [], banzukeSnapshots: [] });
    historyCache.putYear(2003, { year: 2003, bouts: [], awards: [], banzukeSnapshots: [] });

    // Add 4th, should evict 2001 (the oldest inserted)
    historyCache.putYear(2004, { year: 2004, bouts: [], awards: [], banzukeSnapshots: [] });

    // Mock OPFS to return null so we can tell if it's a cache miss
    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(false);

    expect(await historyCache.getYear(2001)).toBeNull(); // Evicted
    expect(await historyCache.getYear(2002)).not.toBeNull();
    expect(await historyCache.getYear(2003)).not.toBeNull();
    expect(await historyCache.getYear(2004)).not.toBeNull();
  });

  it('should update LRU order when getting an existing year', async () => {
    historyCache.putYear(2001, { year: 2001, bouts: [], awards: [], banzukeSnapshots: [] });
    historyCache.putYear(2002, { year: 2002, bouts: [], awards: [], banzukeSnapshots: [] });
    historyCache.putYear(2003, { year: 2003, bouts: [], awards: [], banzukeSnapshots: [] });

    // Get 2001, moving it to newest
    await historyCache.getYear(2001);

    // Add 2004, should evict 2002 (since it is now the oldest)
    historyCache.putYear(2004, { year: 2004, bouts: [], awards: [], banzukeSnapshots: [] });

    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(false);

    expect(await historyCache.getYear(2002)).toBeNull(); // Evicted
    expect(await historyCache.getYear(2001)).not.toBeNull();
    expect(await historyCache.getYear(2003)).not.toBeNull();
    expect(await historyCache.getYear(2004)).not.toBeNull();
  });

  it('should overwrite existing entry when putting same year', async () => {
    const data1 = { year: 2000, bouts: [{id: 1}], awards: [], banzukeSnapshots: [] };
    const data2 = { year: 2000, bouts: [{id: 2}], awards: [], banzukeSnapshots: [] };

    historyCache.putYear(2000, data1);
    historyCache.putYear(2000, data2);

    const retrieved = await historyCache.getYear(2000);
    expect(retrieved).toBe(data2);
    expect(retrieved?.bouts[0].id).toBe(2);
  });

  it('should handle OPFS disabled/unsupported', async () => {
    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(false);

    const yearData = await historyCache.getYear(2000);
    expect(yearData).toBeNull();
  });

  it('should clear the cache', async () => {
    historyCache.putYear(2001, { year: 2001, bouts: [], awards: [], banzukeSnapshots: [] });
    historyCache.clear();

    vi.spyOn(opfsArchiveService, 'isSupported').mockReturnValue(false);
    expect(await historyCache.getYear(2001)).toBeNull();
  });
});
