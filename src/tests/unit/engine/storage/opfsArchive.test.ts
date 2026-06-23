import { describe, it, expect, beforeEach, vi } from "vitest";
import { opfsArchiveService, ArchiveConflictError } from "@/engine/storage/opfsArchive";
import { resetMockFileSystem, MockFileSystemDirectoryHandle } from "@/tests/setup";

describe("Stable Lords: OPFS Archival System", () => {
  beforeEach(() => {
    resetMockFileSystem();
    opfsArchiveService.clearCache();
    vi.restoreAllMocks();
  });

  describe("Suite 1: Initialization & Support Checking", () => {
    it("Test 1.1: isSupported() returns true in modern environments", () => {
      expect(opfsArchiveService.isSupported()).toBe(true);
    });

    it("Test 1.2: isSupported() returns false when API is missing", () => {
      const originalStorage = navigator.storage;
      Object.defineProperty(globalThis.navigator, "storage", {
        value: undefined,
        configurable: true,
      });

      expect(opfsArchiveService.isSupported()).toBe(false);

      // Restore
      Object.defineProperty(globalThis.navigator, "storage", {
        value: originalStorage,
        configurable: true,
      });
    });
  });

  describe("Suite 2: Archiving Play-by-Play (PBP) Logs (Append-Only)", () => {
    it("Test 2.1: archiveBoutLog() creates the correct directory structure", async () => {
      await opfsArchiveService.archiveBoutLog(1, "b-123", { action: "tachi-ai" });

      const root =
        (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
      const seasonDir = await root.getDirectoryHandle("season_1");
      const boutsDir = await seasonDir.getDirectoryHandle("bouts");
      const fileHandle = await boutsDir.getFileHandle("b-123.json");

      expect(fileHandle).toBeDefined();
    });

    it("Test 2.2: archiveBoutLog() successfully writes stringified JSON", async () => {
      const mockLog = [
        { tick: 1, text: "The bout begins." },
        { tick: 2, text: "Yorikiri." },
      ];
      await opfsArchiveService.archiveBoutLog(1, "b-500", mockLog);

      const root =
        (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
      const fileHandle = await root
        .getDirectoryHandle("season_1")
        .then((d) => d.getDirectoryHandle("bouts"))
        .then((d) => d.getFileHandle("b-500.json"));

      const file = await fileHandle.getFile();
      const content = await file.text();

      expect(content).toBe(JSON.stringify(mockLog));
    });

    it("Test 2.3: Overwrite Protection", async () => {
      const payload = { winner: "Rikishi A" };
      await opfsArchiveService.archiveBoutLog(1, "b-duplicate", payload);

      await expect(opfsArchiveService.archiveBoutLog(1, "b-duplicate", payload)).rejects.toThrow(
        ArchiveConflictError
      );
    });
  });

  describe("Suite 3: Retrieval & Hydration", () => {
    it("Test 3.1: retrieveBoutLog() returns parsed JSON", async () => {
      const originalLog = {
        boutId: "b-fetch-me",
        winner: "east",
        winnerRikishiId: "r-1",
        loserRikishiId: "r-2",
        kimarite: "yorikiri",
        kimariteName: "Yorikiri",
        stance: "hidari-yotsu",
        tachiaiWinner: "east",
        duration: 12,
        upset: false,
        narrative: ["They clash.", "East pushes out West."],
        pbpLines: [],
        pbp: [],
      };
      await opfsArchiveService.archiveBoutLog(2, "b-fetch-me", originalLog);

      const retrieved = await opfsArchiveService.retrieveBoutLog(2, "b-fetch-me");
      expect(retrieved).toEqual(originalLog);
    });

    it("Test 3.2: retrieveBoutLog() handles missing files gracefully", async () => {
      const retrieved = await opfsArchiveService.retrieveBoutLog(2, "b-ghost-log");
      expect(retrieved).toBeNull();
    });
  });

  describe("Suite 4: Seasonal Gazette Archiving", () => {
    it("Test 4.1: archiveGazette() saves text files natively without JSONification", async () => {
      const markdown = "# Weekly Recap\nGreat throws this week!";
      await opfsArchiveService.archiveGazette(1, 4, markdown);

      const root =
        (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
      const fileHandle = await root
        .getDirectoryHandle("season_1")
        .then((d) => d.getDirectoryHandle("gazettes"))
        .then((d) => d.getFileHandle("week_4.md"));

      const file = await fileHandle.getFile();
      const content = await file.text();

      expect(content).toBe(markdown); // Exact string, not '"# Weekly Recap\n..."'

      const retrieved = await opfsArchiveService.retrieveGazette(1, 4);
      expect(retrieved).toBe(markdown);
    });
  });

  describe("Suite 5: Fallback & Quota Management", () => {
    it("Test 5.1: Graceful degradation on QuotaExceededError", async () => {
      // Use Object.defineProperty to ensure window is defined
      const originalWindow = globalThis.window;
      Object.defineProperty(globalThis, "window", {
        value: {
          dispatchEvent: vi.fn(),
        },
        writable: true,
        configurable: true,
      });
      const dispatchSpy = vi.spyOn(window, "dispatchEvent");

      // Inject the QuotaExceededError by manually placing a mocked file handle
      const root =
        (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
      const seasonDir = await root.getDirectoryHandle("season_99", { create: true });
      const boutsDir = await seasonDir.getDirectoryHandle("bouts", { create: true });
      const mockFileHandle = await boutsDir
        .getFileHandle("b-heavy.json", { create: false })
        .catch(() => boutsDir.getFileHandle("b-heavy.json", { create: true }));

      vi.spyOn(mockFileHandle, "createWritable").mockImplementation(async () => {
        throw new DOMException("Hard drive full", "QuotaExceededError");
      });

      // We need to bypass the archive conflict check, so we don't throw an exception if the file exists.
      // We are just simulating saving. Wait, the test uses the service directly.
      // But the file already exists (we created it). So `archiveBoutLog` will throw ArchiveConflictError!
      // To test the quota exceeded error, we need `createWritable` to throw when creating a *new* file.
      // Or we can mock `getFileHandle` to return a mocked file that throws on `createWritable`.

      const originalGetFileHandle = boutsDir.getFileHandle.bind(boutsDir);
      vi.spyOn(boutsDir, "getFileHandle").mockImplementation(async (name, options) => {
        if (options?.create) {
          return mockFileHandle;
        }
        return originalGetFileHandle(name, options);
      });
      // The issue is overwtie protection. The file shouldn't exist.
      // Wait, we can just spy on the new file's createWritable.

      // Clear the mock file system so it's fresh
      resetMockFileSystem();
      const root2 =
        (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
      const seasonDir2 = await root2.getDirectoryHandle("season_99", { create: true });
      const boutsDir2 = await seasonDir2.getDirectoryHandle("bouts", { create: true });

      // Mock the getFileHandle for creation.
      vi.spyOn(boutsDir2, "getFileHandle").mockImplementation(async (name, options) => {
        if (options?.create) {
          const handle = await root2.getFileHandle("b-heavy.json", { create: true }); // Fake handle
          vi.spyOn(handle, "createWritable").mockImplementation(async () => {
            throw new DOMException("Hard drive full", "QuotaExceededError");
          });
          return handle;
        }
        throw { name: "NotFoundError" }; // mock file not found for initial check
      });

      // The call should not throw an unhandled exception
      await opfsArchiveService.archiveBoutLog(99, "b-heavy", { data: "massive" });

      // Ensure the error was caught and dispatched to the window for the Zustand UI boundary
      expect(dispatchSpy).toHaveBeenCalled();
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe("engine:storage:quota-exceeded");

      Object.defineProperty(globalThis, "window", {
        value: originalWindow,
        writable: true,
        configurable: true,
      });
    });
  });

  describe("Utility: getArchivedBoutIdsForSeason", () => {
    it("returns an array of bout IDs without the .json extension", async () => {
      await opfsArchiveService.archiveBoutLog(1, "b-001", {});
      await opfsArchiveService.archiveBoutLog(1, "b-002", {});

      const ids = await opfsArchiveService.getArchivedBoutIdsForSeason(1);
      expect(ids).toContain("b-001");
      expect(ids).toContain("b-002");
      expect(ids.length).toBe(2);
    });
  });
});
