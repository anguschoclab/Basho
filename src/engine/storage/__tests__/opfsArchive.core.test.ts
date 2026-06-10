import { describe, it, expect, vi, beforeEach } from "vitest";
import { ArchiveConflictError, OPFSArchiveService } from "../opfsArchive";

describe("OPFSArchiveService core functionality", () => {
  let service: OPFSArchiveService;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    service = new OPFSArchiveService();
    Object.defineProperty(globalThis, "navigator", {
      value: { storage: { getDirectory: vi.fn() } },
      writable: true,
      configurable: true,
    });
  });

  describe("archiveBoutLog", () => {
    it("writes JSON to season_{N}/bouts/{boutId}.json", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            const err = new Error("NotFoundError") as Error & { name: string };
            err.name = "NotFoundError";
            throw err;
          }
          return { createWritable: vi.fn().mockResolvedValue(writable) };
        }),
      };
      const getDirSpy = vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const boutData = { boutId: "b1", winner: "east", winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "yorikiri", kimariteName: "Yorikiri", stance: "migi", tachiaiWinner: "east", duration: 10, upset: false, kenshoEnvelopes: 0, log: [] };
      await service.archiveBoutLog(2024, "b1", boutData);

      expect(getDirSpy).toHaveBeenCalledWith(["season_2024", "bouts"]);
      expect(mockDir.getFileHandle).toHaveBeenCalledWith("b1.json", { create: false });
      expect(mockDir.getFileHandle).toHaveBeenCalledWith("b1.json", { create: true });
      expect(writable.write).toHaveBeenCalledWith(JSON.stringify(boutData));
      expect(writable.close).toHaveBeenCalled();
    });

    it("throws ArchiveConflictError if file already exists", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ name: "existing" }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      await expect(service.archiveBoutLog(2024, "b1", {})).rejects.toBeInstanceOf(ArchiveConflictError);
    });

    it("bubbles up unexpected errors from file existence check", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            const err = new Error("UnknownError") as Error & { name: string };
            err.name = "UnknownError";
            throw err;
          }
          return { createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) };
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      await expect(service.archiveBoutLog(2024, "b1", {})).rejects.toThrow("UnknownError");
    });

    it("bubbles up DOMException errors from file existence check", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            throw new DOMException("Security error", "SecurityError");
          }
          return { createWritable: vi.fn().mockResolvedValue({ write: vi.fn(), close: vi.fn() }) };
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      await expect(service.archiveBoutLog(2024, "b1", {})).rejects.toThrow(DOMException);
    });

    it("ignores non-Error/non-DOMException throws from file existence check (fallback behavior)", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            throw "Some arbitrary primitive error string";
          }
          return { createWritable: vi.fn().mockResolvedValue(writable) };
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      // Should fall through the catch block and write the file
      await service.archiveBoutLog(2024, "b1", {});
      expect(writable.write).toHaveBeenCalled();
    });

    it("handles quota errors gracefully via handleQuotaError", async () => {
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            const err = new Error("NotFoundError") as Error & { name: string };
            err.name = "NotFoundError";
            throw err;
          }
          return { createWritable: vi.fn().mockRejectedValue(quotaError) };
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const handleQuotaSpy = vi.spyOn(service, "handleQuotaError").mockImplementation(() => {});

      await service.archiveBoutLog(2024, "b1", {});
      expect(handleQuotaSpy).toHaveBeenCalledWith(quotaError);
    });

    it("returns early when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      await service.archiveBoutLog(2024, "b1", {});

      // Should complete without error and not attempt any file operations
      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "bouts"]);
    });
  });

  describe("retrieveBoutLog", () => {
    it("returns parsed BoutResult for valid data", async () => {
      const validBout = {
        boutId: "b1", winner: "east", winnerRikishiId: "r1", loserRikishiId: "r2",
        kimarite: "yorikiri", kimariteName: "Yorikiri", stance: "migi", tachiaiWinner: "east",
        duration: 10, upset: false, kenshoEnvelopes: 0, log: [],
      };
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(validBout)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveBoutLog(2024, "b1");
      expect(result).toEqual(validBout);
    });

    it("returns null for missing files", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async () => {
          const err = new Error("NotFoundError") as Error & { name: string };
          err.name = "NotFoundError";
          throw err;
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveBoutLog(2024, "missing");
      expect(result).toBeNull();
    });

    it("returns null and logs error on unexpected read failures", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockRejectedValue(new Error("Disk read error")),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await service.retrieveBoutLog(2024, "b1");
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("returns null when validation fails (malformed bout data)", async () => {
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{"invalid":"data"}'),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveBoutLog(2024, "b1");
      expect(result).toBeNull();
    });

    it("returns null when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      const result = await service.retrieveBoutLog(2024, "b1");
      expect(result).toBeNull();
      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "bouts"]);
    });
  });

  describe("getArchivedBoutIdsForSeason", () => {
    it("returns all .json filenames stripped of extension", async () => {
      async function* values() {
        yield { kind: "file", name: "b1.json" } as FileSystemHandle;
        yield { kind: "file", name: "b2.json" } as FileSystemHandle;
        yield { kind: "directory", name: "subfolder" } as FileSystemHandle;
        yield { kind: "file", name: "not-json.txt" } as FileSystemHandle;
      }
      const mockDir = {
        values: vi.fn().mockReturnValue(values()),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.getArchivedBoutIdsForSeason(2024);
      expect(result).toEqual(["b1", "b2"]);
    });

    it("returns empty array when directory is missing", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      const result = await service.getArchivedBoutIdsForSeason(2024);
      expect(result).toEqual([]);
    });

    it("handles async iterator errors gracefully", async () => {
      async function values() {
        throw new Error("Iterator broken");
      }
      const mockDir = {
        values: vi.fn().mockReturnValue(values()),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await service.getArchivedBoutIdsForSeason(2024);
      expect(result).toEqual([]);
      consoleErrorSpy.mockRestore();
    });
  });

  describe("archiveGazette", () => {
    it("writes markdown to season_{N}/gazettes/week_{W}.md", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue(writable) }),
      };
      const getDirSpy = vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      await service.archiveGazette(2024, 3, "# Week 3 Gazette");

      expect(getDirSpy).toHaveBeenCalledWith(["season_2024", "gazettes"]);
      expect(mockDir.getFileHandle).toHaveBeenCalledWith("week_3.md", { create: true });
      expect(writable.write).toHaveBeenCalledWith("# Week 3 Gazette");
      expect(writable.close).toHaveBeenCalled();
    });

    it("handles quota errors gracefully", async () => {
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockRejectedValue(quotaError) }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const handleQuotaSpy = vi.spyOn(service, "handleQuotaError").mockImplementation(() => {});

      await service.archiveGazette(2024, 1, "test");
      expect(handleQuotaSpy).toHaveBeenCalledWith(quotaError);
    });

    it("returns early when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      await service.archiveGazette(2024, 1, "# Test");

      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "gazettes"]);
    });
  });

  describe("retrieveGazette", () => {
    it("returns markdown string for existing file", async () => {
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue("# Gazette Content"),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveGazette(2024, 3);
      expect(result).toBe("# Gazette Content");
    });

    it("returns null for missing files", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async () => {
          const err = new Error("NotFoundError") as Error & { name: string };
          err.name = "NotFoundError";
          throw err;
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveGazette(2024, 99);
      expect(result).toBeNull();
    });

    it("returns null and logs error on unexpected read failures", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockRejectedValue(new Error("Disk read error")),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await service.retrieveGazette(2024, 1);
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("returns null when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      const result = await service.retrieveGazette(2024, 1);
      expect(result).toBeNull();
      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "gazettes"]);
    });
  });

  describe("archiveAwards", () => {
    it("writes JSON to season_{N}/awards.json", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue(writable) }),
      };
      const getDirSpy = vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const awards = [{ id: "a1", year: 2024, bashoNumber: 1 as const, bashoName: "hatsu" as const, yusho: "r1", junYusho: [], prizes: { yushoAmount: 100, junYushoAmount: 50, specialPrizes: 20 } }];
      await service.archiveAwards(2024, awards);

      expect(getDirSpy).toHaveBeenCalledWith(["season_2024"]);
      expect(mockDir.getFileHandle).toHaveBeenCalledWith("awards.json", { create: true });
      expect(writable.write).toHaveBeenCalledWith(JSON.stringify(awards));
      expect(writable.close).toHaveBeenCalled();
    });

    it("handles quota errors gracefully", async () => {
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockRejectedValue(quotaError) }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const handleQuotaSpy = vi.spyOn(service, "handleQuotaError").mockImplementation(() => {});

      await service.archiveAwards(2024, []);
      expect(handleQuotaSpy).toHaveBeenCalledWith(quotaError);
    });

    it("returns early when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      await service.archiveAwards(2024, []);

      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024"]);
    });
  });

  describe("retrieveAwards", () => {
    it("returns parsed BashoResult[] for valid data", async () => {
      const awards = [{ id: "a1", year: 2024, bashoNumber: 1 as const, bashoName: "hatsu" as const, yusho: "r1", junYusho: [], prizes: { yushoAmount: 100, junYushoAmount: 50, specialPrizes: 20 } }];
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(awards)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveAwards(2024);
      expect(result).toEqual(awards);
    });

    it("returns empty array for missing files", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async () => {
          const err = new Error("NotFoundError") as Error & { name: string };
          err.name = "NotFoundError";
          throw err;
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveAwards(2024);
      expect(result).toEqual([]);
    });

    it("returns empty array when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      const result = await service.retrieveAwards(2024);
      expect(result).toEqual([]);
      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024"]);
    });
  });

  describe("archiveBanzuke", () => {
    it("writes JSON to season_{N}/banzuke/basho_{N}.json", async () => {
      const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue(writable) }),
      };
      const getDirSpy = vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const snapshot = { year: 2024, bashoNumber: 1 as const, bashoName: "hatsu" as const, makuuchiSummary: { totalBouts: 100, avgWins: 8, injuryCount: 2 }, promotions: [], demotions: [], retirements: [] };
      await service.archiveBanzuke(2024, 1, snapshot);

      expect(getDirSpy).toHaveBeenCalledWith(["season_2024", "banzuke"]);
      expect(mockDir.getFileHandle).toHaveBeenCalledWith("basho_1.json", { create: true });
      expect(writable.write).toHaveBeenCalledWith(JSON.stringify(snapshot));
      expect(writable.close).toHaveBeenCalled();
    });

    it("handles quota errors gracefully", async () => {
      const quotaError = new DOMException("Quota exceeded", "QuotaExceededError");
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue({ createWritable: vi.fn().mockRejectedValue(quotaError) }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);
      const handleQuotaSpy = vi.spyOn(service, "handleQuotaError").mockImplementation(() => {});

      await service.archiveBanzuke(2024, 1, { year: 2024, bashoNumber: 1, bashoName: "hatsu", makuuchiSummary: { totalBouts: 0, avgWins: 0, injuryCount: 0 }, promotions: [], demotions: [], retirements: [] });
      expect(handleQuotaSpy).toHaveBeenCalledWith(quotaError);
    });

    it("returns early when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      await service.archiveBanzuke(2024, 1, { year: 2024, bashoNumber: 1, bashoName: "hatsu", makuuchiSummary: { totalBouts: 0, avgWins: 0, injuryCount: 0 }, promotions: [], demotions: [], retirements: [] });

      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "banzuke"]);
    });
  });

  describe("retrieveBanzuke", () => {
    it("returns parsed AlmanacSnapshot for valid data", async () => {
      const snapshot = { year: 2024, bashoNumber: 1 as const, bashoName: "hatsu" as const, makuuchiSummary: { totalBouts: 100, avgWins: 8, injuryCount: 2 }, promotions: [], demotions: [], retirements: [] };
      const mockFileHandle = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(snapshot)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFileHandle),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveBanzuke(2024, 1);
      expect(result).toEqual(snapshot);
    });

    it("returns null for missing files", async () => {
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async () => {
          const err = new Error("NotFoundError") as Error & { name: string };
          err.name = "NotFoundError";
          throw err;
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const result = await service.retrieveBanzuke(2024, 99);
      expect(result).toBeNull();
    });

    it("returns null when getDirectoryPath returns null", async () => {
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(null);

      const result = await service.retrieveBanzuke(2024, 1);
      expect(result).toBeNull();
      expect(service.getDirectoryPath).toHaveBeenCalledWith(["season_2024", "banzuke"]);
    });
  });

  describe("write queue / concurrency", () => {
    it("serializes concurrent archiveBoutLog calls for the same bout", async () => {
      const writes: string[] = [];
      let fileExists = false;
      const writable = {
        write: vi.fn().mockImplementation(async (data: string) => { writes.push(data); fileExists = true; }),
        close: vi.fn().mockResolvedValue(undefined),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockImplementation(async (_name: string, opts?: { create?: boolean }) => {
          if (opts?.create === false) {
            if (fileExists) {
              return { createWritable: vi.fn().mockResolvedValue(writable) };
            }
            const err = new Error("NotFoundError") as Error & { name: string };
            err.name = "NotFoundError";
            throw err;
          }
          return { createWritable: vi.fn().mockResolvedValue(writable) };
        }),
      };
      vi.spyOn(service, "getDirectoryPath").mockResolvedValue(mockDir as unknown as FileSystemDirectoryHandle);

      const data1 = { boutId: "b1", seq: 1, winner: "east", winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "yorikiri", kimariteName: "Yorikiri", stance: "migi", tachiaiWinner: "east", duration: 10, upset: false, kenshoEnvelopes: 0, log: [] };
      const data2 = { boutId: "b1", seq: 2, winner: "east", winnerRikishiId: "r1", loserRikishiId: "r2", kimarite: "yorikiri", kimariteName: "Yorikiri", stance: "migi", tachiaiWinner: "east", duration: 10, upset: false, kenshoEnvelopes: 0, log: [] };

      let firstError: unknown = null;
      let secondError: unknown = null;

      await Promise.all([
        service.archiveBoutLog(2024, "b1", data1).catch((e) => { firstError = e; }),
        service.archiveBoutLog(2024, "b1", data2).catch((e) => { secondError = e; }),
      ]);

      // One should succeed (write the file), the other should hit a conflict.
      expect(writes.length).toBe(1);
      const oneSucceeded = firstError === null || secondError === null;
      const oneConflicted = (firstError instanceof ArchiveConflictError) || (secondError instanceof ArchiveConflictError);
      expect(oneSucceeded).toBe(true);
      expect(oneConflicted).toBe(true);
    });
  });

  describe("isSupported", () => {
    it("delegates to OPFSFileSystem.isSupported", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(service.isSupported()).toBe(false);
    });
  });
});
