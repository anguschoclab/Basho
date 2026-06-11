/**
 * electronArchive.test.ts
 *
 * Tests for ElectronArchiveService.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ElectronArchiveService } from "../../../engine/storage/electronArchive";
import { mockElectronAPI, clearElectronMock } from "@/test/utils/electronMocks";
import type { BoutResult, BashoResult } from "../../../engine/types/basho";
import type { AlmanacSnapshot } from "../../../engine/almanac";

describe("ElectronArchiveService", () => {
  let service: ElectronArchiveService;
  let mocks: ReturnType<typeof mockElectronAPI>;

  const mockBoutResult: BoutResult = {
    boutId: "bout-1",
    winner: "east",
    winnerRikishiId: "r1",
    loserRikishiId: "r2",
    kimarite: "yorikiri",
    kimariteName: "Yorikiri",
    stance: "migi-yotsu",
    tachiaiWinner: "east",
    duration: 12.5,
    upset: false,
    kenshoEnvelopes: 0,
    log: [],
  };

  const mockAwards: BashoResult[] = [
    {
      id: "award-1",
      year: 2024,
      bashoNumber: 1,
      bashoName: "hatsu",
      yusho: "r1",
      junYusho: ["r2"],
      prizes: {
        yushoAmount: 1000000,
        junYushoAmount: 500000,
        specialPrizes: 200000,
      },
    },
  ];

  const mockSnapshot: AlmanacSnapshot = {
    year: 2024,
    bashoNumber: 1,
    bashoName: "hatsu",
    makuuchiSummary: {
      totalBouts: 120,
      avgWins: 7.5,
      injuryCount: 2,
    },
    promotions: [],
    demotions: [],
    retirements: [],
  };

  beforeEach(() => {
    mocks = mockElectronAPI();
    service = new ElectronArchiveService();
  });

  afterEach(() => {
    clearElectronMock();
    vi.restoreAllMocks();
  });

  describe("constructor / initBaseDir", () => {
    it("should call appPath.getPath and fs.mkdir in Electron", async () => {
      // Flush microtasks so initBaseDir completes
      await Promise.resolve();

      expect(mocks.appPath.getPath).toHaveBeenCalledTimes(1);
      expect(mocks.appPath.getPath).toHaveBeenCalledWith("userData");
      expect(mocks.fs.mkdir).toHaveBeenCalledWith("/fake/userData/archives", true);
    });

    it("should not call fs or appPath in web build", () => {
      clearElectronMock();
      // No window.__ELECTRON__ set
      const freshMocks = mockElectronAPI();
      // Override __ELECTRON__ to false
      Object.defineProperty(global, "window", {
        value: { __ELECTRON__: false, electronCustom: freshMocks.electronCustom },
        writable: true,
        configurable: true,
      });

      service = new ElectronArchiveService();

      expect(freshMocks.appPath.getPath).not.toHaveBeenCalled();
      expect(freshMocks.fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe("isSupported", () => {
    it("returns true in Electron", () => {
      expect(service.isSupported()).toBe(true);
    });

    it("returns false in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      expect(service.isSupported()).toBe(false);
    });
  });

  describe("archiveBoutLog", () => {
    it("creates directory and writes JSON in Electron", async () => {
      await service.archiveBoutLog(2024, "bout-1", mockBoutResult);

      expect(mocks.fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/bouts"),
        true
      );
      expect(mocks.fs.writeFile).toHaveBeenCalledTimes(1);
      const [filePath, content] = mocks.fs.writeFile.mock.calls[0];
      expect(filePath).toContain("season_2024/bouts/bout-1.json");
      expect(content).toBe(JSON.stringify(mockBoutResult, null, 2));
    });

    it("logs warning and returns early in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      service.archiveBoutLog(2024, "bout-1", mockBoutResult);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(mocks.fs.writeFile).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it("logs error when ensureDir fails", async () => {
      mocks.fs.mkdir.mockRejectedValue(new Error("EACCES: permission denied"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveBoutLog(2024, "bout-1", mockBoutResult);

      expect(errorSpy).toHaveBeenCalled();
      expect(mocks.fs.writeFile).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs error when writeFile fails", async () => {
      mocks.fs.writeFile.mockRejectedValue(new Error("ENOSPC: no space left"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveBoutLog(2024, "bout-1", mockBoutResult);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("retrieveBoutLog", () => {
    it("reads and parses BoutResult in Electron", async () => {
      mocks.fs.readFile.mockResolvedValue(JSON.stringify(mockBoutResult));

      const result = await service.retrieveBoutLog(2024, "bout-1");

      expect(mocks.fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/bouts/bout-1.json")
      );
      expect(result).toEqual(mockBoutResult);
    });

    it("returns null when file not found", async () => {
      mocks.fs.readFile.mockResolvedValue(null);

      const result = await service.retrieveBoutLog(2024, "bout-1");

      expect(result).toBeNull();
    });

    it("logs warning and returns null in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = service.retrieveBoutLog(2024, "bout-1");

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(result).resolves.toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe("archiveGazette", () => {
    it("creates directory and writes markdown in Electron", async () => {
      const markdown = "# Gazette Week 1\n\nTest content.";
      await service.archiveGazette(2024, 1, markdown);

      expect(mocks.fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/gazettes"),
        true
      );
      expect(mocks.fs.writeFile).toHaveBeenCalledTimes(1);
      const [filePath, content] = mocks.fs.writeFile.mock.calls[0];
      expect(filePath).toContain("season_2024/gazettes/1.md");
      expect(content).toBe(markdown);
    });

    it("logs warning and returns early in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      service.archiveGazette(2024, 1, "# Test");

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      warnSpy.mockRestore();
    });

    it("logs error when ensureDir fails", async () => {
      mocks.fs.mkdir.mockRejectedValue(new Error("EACCES: permission denied"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveGazette(2024, 1, "# Test");

      expect(errorSpy).toHaveBeenCalled();
      expect(mocks.fs.writeFile).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs error when writeFile fails", async () => {
      mocks.fs.writeFile.mockRejectedValue(new Error("ENOSPC: no space left"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveGazette(2024, 1, "# Test");

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("retrieveGazette", () => {
    it("reads and returns markdown in Electron", async () => {
      const markdown = "# Gazette\n\nContent";
      mocks.fs.readFile.mockResolvedValue(markdown);

      const result = await service.retrieveGazette(2024, 1);

      expect(mocks.fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/gazettes/1.md")
      );
      expect(result).toBe(markdown);
    });

    it("logs warning and returns null in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = service.retrieveGazette(2024, 1);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(result).resolves.toBeNull();
      warnSpy.mockRestore();
    });
  });

  describe("getArchivedBoutIdsForSeason", () => {
    it("returns bout IDs with .json stripped in Electron", async () => {
      mocks.fs.readDir.mockResolvedValue(["bout-1.json", "bout-2.json"]);

      const result = await service.getArchivedBoutIdsForSeason(2024);

      expect(mocks.fs.readDir).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/bouts")
      );
      expect(result).toEqual(["bout-1", "bout-2"]);
    });

    it("returns empty array when readDir fails", async () => {
      mocks.fs.readDir.mockRejectedValue(new Error("ENOENT"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await service.getArchivedBoutIdsForSeason(2024);

      expect(result).toEqual([]);
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs warning and returns empty array in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = service.getArchivedBoutIdsForSeason(2024);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(result).resolves.toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe("archiveAwards", () => {
    it("creates directory and writes awards JSON in Electron", async () => {
      await service.archiveAwards(2024, mockAwards);

      expect(mocks.fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/awards"),
        true
      );
      expect(mocks.fs.writeFile).toHaveBeenCalledTimes(1);
      const [filePath, content] = mocks.fs.writeFile.mock.calls[0];
      expect(filePath).toContain("season_2024/awards/awards.json");
      expect(content).toBe(JSON.stringify(mockAwards, null, 2));
    });

    it("logs warning and returns early in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      service.archiveAwards(2024, mockAwards);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      warnSpy.mockRestore();
    });

    it("logs error when ensureDir fails", async () => {
      mocks.fs.mkdir.mockRejectedValue(new Error("EACCES: permission denied"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveAwards(2024, mockAwards);

      expect(errorSpy).toHaveBeenCalled();
      expect(mocks.fs.writeFile).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs error when writeFile fails", async () => {
      mocks.fs.writeFile.mockRejectedValue(new Error("ENOSPC: no space left"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveAwards(2024, mockAwards);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("retrieveAwards", () => {
    it("reads and parses awards in Electron", async () => {
      mocks.fs.readFile.mockResolvedValue(JSON.stringify(mockAwards));

      const result = await service.retrieveAwards(2024);

      expect(mocks.fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/awards/awards.json")
      );
      expect(result).toEqual(mockAwards);
    });

    it("returns empty array when file not found", async () => {
      mocks.fs.readFile.mockResolvedValue(null);

      const result = await service.retrieveAwards(2024);

      expect(result).toEqual([]);
    });

    it("logs warning and returns empty array in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = service.retrieveAwards(2024);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(result).resolves.toEqual([]);
      warnSpy.mockRestore();
    });
  });

  describe("archiveBanzuke", () => {
    it("creates directory and writes snapshot JSON in Electron", async () => {
      await service.archiveBanzuke(2024, 1, mockSnapshot);

      expect(mocks.fs.mkdir).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/banzuke"),
        true
      );
      expect(mocks.fs.writeFile).toHaveBeenCalledTimes(1);
      const [filePath, content] = mocks.fs.writeFile.mock.calls[0];
      expect(filePath).toContain("season_2024/banzuke/1.json");
      expect(content).toBe(JSON.stringify(mockSnapshot, null, 2));
    });

    it("logs warning and returns early in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      service.archiveBanzuke(2024, 1, mockSnapshot);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      warnSpy.mockRestore();
    });

    it("logs error when ensureDir fails", async () => {
      mocks.fs.mkdir.mockRejectedValue(new Error("EACCES: permission denied"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveBanzuke(2024, 1, mockSnapshot);

      expect(errorSpy).toHaveBeenCalled();
      expect(mocks.fs.writeFile).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it("logs error when writeFile fails", async () => {
      mocks.fs.writeFile.mockRejectedValue(new Error("ENOSPC: no space left"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await service.archiveBanzuke(2024, 1, mockSnapshot);

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe("retrieveBanzuke", () => {
    it("reads and parses AlmanacSnapshot in Electron", async () => {
      mocks.fs.readFile.mockResolvedValue(JSON.stringify(mockSnapshot));

      const result = await service.retrieveBanzuke(2024, 1);

      expect(mocks.fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining("season_2024/banzuke/1.json")
      );
      expect(result).toEqual(mockSnapshot);
    });

    it("returns null when file not found", async () => {
      mocks.fs.readFile.mockResolvedValue(null);

      const result = await service.retrieveBanzuke(2024, 1);

      expect(result).toBeNull();
    });

    it("logs warning and returns null in web build", () => {
      clearElectronMock();
      service = new ElectronArchiveService();
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = service.retrieveBanzuke(2024, 1);

      expect(warnSpy).toHaveBeenCalledWith("ElectronArchiveService not available in web build");
      expect(result).resolves.toBeNull();
      warnSpy.mockRestore();
    });
  });
});
