import { describe, it, expect, vi, beforeEach } from "vitest";
import { opfsArchiveService } from "@/engine/storage/opfsArchive";

describe("OPFS Archive Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator and storage to support isSupported()
    Object.defineProperty(globalThis, "navigator", {
      value: { storage: { getDirectory: vi.fn() } },
      writable: true,
      configurable: true,
    });
  });

  describe("retrieveAwards validation", () => {
    it("returns empty array and warns if retrieved data is not an array", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{"not":"an array"}'),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveAwards(2024);

      expect(result).toEqual([]);
      // We check for the warning from our validator
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid Awards: data is not an array")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns empty array and warns if array contains invalid objects", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('[{"invalid":"object"}]'),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveAwards(2024);

      expect(result).toEqual([]);
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid Awards: array contains invalid BashoResult objects")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns valid data if structure is correct", async () => {
      const validAwards = [
        {
          id: "basho-1",
          year: 2024,
          bashoNumber: 1,
          bashoName: "hatsu",
          yusho: "rikishi-1",
          prizes: { yushoAmount: 100, junYushoAmount: 50, specialPrizes: 20 },
        },
      ];
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(validAwards)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);

      const result = await opfsArchiveService.retrieveAwards(2024);

      expect(result).toEqual(validAwards);
    });
  });

  describe("retrieveBanzuke validation", () => {
    it("returns null and warns if core properties are missing", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{"year":2024}'), // missing bashoNumber, name, summary
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveBanzuke(2024, 1);

      expect(result).toBeNull();
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid AlmanacSnapshot: missing or invalid core properties")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns valid snapshot if structure is correct", async () => {
      const validSnapshot = {
        year: 2024,
        bashoNumber: 1,
        bashoName: "hatsu",
        makuuchiSummary: { totalBouts: 100, avgWins: 8, injuryCount: 2 },
        promotions: [],
        demotions: [],
        retirements: [],
      };
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(validSnapshot)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);

      const result = await opfsArchiveService.retrieveBanzuke(2024, 1);

      expect(result).toEqual(validSnapshot);
    });
  });

  describe("retrieveBoutLog validation", () => {
    it("returns null if retrieved data is not an object", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('"not an object"'),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");
      expect(result).toBeNull();
    });

    it("returns null and warns if a required string property is missing or invalid", async () => {
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue('{"boutId": 123}'), // boutId should be string
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");

      expect(result).toBeNull();
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid BoutResult: missing or invalid string property 'boutId'")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns null and warns if duration property is missing or invalid", async () => {
      const invalidBout = {
        boutId: "bout-1",
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        upset: false,
        duration: "long", // should be number
      };
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(invalidBout)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");

      expect(result).toBeNull();
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid BoutResult: missing or invalid number property 'duration'")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns null and warns if upset property is missing or invalid", async () => {
      const invalidBout = {
        boutId: "bout-1",
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 10,
        // upset is missing
      };
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(invalidBout)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");

      expect(result).toBeNull();
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid BoutResult: missing or invalid boolean property 'upset'")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns null and warns if optional array properties are invalid", async () => {
      const invalidBout = {
        boutId: "bout-1",
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 10,
        upset: false,
        pbpLines: "not an array", // invalid
      };
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(invalidBout)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");

      expect(result).toBeNull();
      const warnCall = warnSpy.mock.calls.find((call) =>
        call[0].includes("Invalid BoutResult: pbpLines must be an array")
      );
      expect(warnCall).toBeDefined();
    });

    it("returns valid BoutResult data if the structure is correct", async () => {
      const validBout = {
        boutId: "bout-1",
        winner: "east",
        winnerRikishiId: "r1",
        loserRikishiId: "r2",
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "migi-yotsu",
        tachiaiWinner: "east",
        duration: 10,
        upset: false,
        pbpLines: [{ text: "line 1", id: "1", phase: "opening" }],
      };
      const mockFile = {
        getFile: vi.fn().mockResolvedValue({
          text: vi.fn().mockResolvedValue(JSON.stringify(validBout)),
        }),
      };
      const mockDir = {
        getFileHandle: vi.fn().mockResolvedValue(mockFile),
      };

      vi.spyOn(opfsArchiveService as any, "getDirectoryPath").mockResolvedValue(mockDir);

      const result = await opfsArchiveService.retrieveBoutLog(2024, "bout-1");

      expect(result).toEqual(validBout);
    });
  });
});
