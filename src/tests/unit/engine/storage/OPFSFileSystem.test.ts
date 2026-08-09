// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { OPFSFileSystem } from "@/engine/storage/OPFSFileSystem";
import { logger } from "@/engine/utils/Logger";

describe("OPFSFileSystem", () => {
  let fs: OPFSFileSystem;

  beforeEach(() => {
    fs = new OPFSFileSystem();
  });

  describe("isSupported", () => {
    it("returns false when navigator is undefined", () => {
      Object.defineProperty(globalThis, "navigator", { value: undefined, writable: true });
      expect(fs.isSupported()).toBe(false);
    });

    it("returns false when navigator.storage is undefined", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: undefined },
        writable: true,
      });
      expect(fs.isSupported()).toBe(false);
    });

    it("returns false when getDirectory is not a function", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: "not-a-function" } },
        writable: true,
      });
      expect(fs.isSupported()).toBe(false);
    });

    it("returns true when navigator.storage.getDirectory is supported", () => {
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn() } },
        writable: true,
      });
      expect(fs.isSupported()).toBe(true);
    });
  });

  describe("getDirectoryPath", () => {
    it("returns null if not supported", async () => {
      Object.defineProperty(globalThis, "navigator", { value: undefined, writable: true });
      const result = await fs.getDirectoryPath(["a", "b"]);
      expect(result).toBeNull();
    });

    it("creates and returns nested directory structure", async () => {
      const mockDir2 = { getDirectoryHandle: vi.fn() };
      const mockDir1 = { getDirectoryHandle: vi.fn().mockResolvedValue(mockDir2) };
      const mockRoot = { getDirectoryHandle: vi.fn().mockResolvedValue(mockDir1) };

      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockResolvedValue(mockRoot) } },
        writable: true,
      });

      const result = await fs.getDirectoryPath(["folder1", "folder2"]);

      expect(navigator.storage.getDirectory).toHaveBeenCalled();
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("folder1", { create: true });
      expect(mockDir1.getDirectoryHandle).toHaveBeenCalledWith("folder2", { create: true });
      expect(result).toBe(mockDir2);
    });

    it("returns null and warns on error", async () => {
      const consoleWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const error = new Error("Test Error");
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockRejectedValue(error) } },
        writable: true,
      });

      const result = await fs.getDirectoryPath(["folder1"]);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to access directory path: folder1",
        "OPFS",
        error
      );
      consoleWarnSpy.mockRestore();
    });

    it("throwOnError: true rejects with the original error when getDirectory fails", async () => {
      const traversalError = new Error("getDirectory failed");
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockRejectedValue(traversalError) } },
        writable: true,
      });

      await expect(fs.getDirectoryPath(["folder1"], { throwOnError: true })).rejects.toBe(
        traversalError
      );
    });

    it("throwOnError: true rejects when an intermediate getDirectoryHandle fails", async () => {
      const intermediateError = new Error("getDirectoryHandle failed");
      const mockRoot = {
        getDirectoryHandle: vi.fn().mockRejectedValue(intermediateError),
      };
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockResolvedValue(mockRoot) } },
        writable: true,
      });

      await expect(
        fs.getDirectoryPath(["folder1", "folder2"], { throwOnError: true })
      ).rejects.toBe(intermediateError);
    });

    it("throwOnError: true does not cache a failed traversal and cleans up inFlight", async () => {
      const mockRoot = { getDirectoryHandle: vi.fn() };
      const getDirectorySpy = vi.fn().mockResolvedValue(mockRoot);
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: getDirectorySpy } },
        writable: true,
      });

      const failError = new Error("fail");
      mockRoot.getDirectoryHandle.mockRejectedValueOnce(failError);

      await expect(fs.getDirectoryPath(["a"], { throwOnError: true })).rejects.toBe(failError);

      // Clear cache so root handle is re-fetched
      fs.clearCache();

      // Second call should re-traverse, not return cached null
      const mockDirA2 = { getDirectoryHandle: vi.fn() };
      mockRoot.getDirectoryHandle.mockResolvedValueOnce(mockDirA2);

      const result = await fs.getDirectoryPath(["a"], { throwOnError: true });
      expect(result).toBe(mockDirA2);
      expect(getDirectorySpy).toHaveBeenCalledTimes(2);
    });

    it("throwOnError: false (default) still returns null and warns", async () => {
      const consoleWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const traversalError = new Error("getDirectory failed");
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockRejectedValue(traversalError) } },
        writable: true,
      });

      const result = await fs.getDirectoryPath(["folder1"], { throwOnError: false });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to access directory path: folder1",
        "OPFS",
        traversalError
      );
      consoleWarnSpy.mockRestore();
    });

    it("unsupported API still returns null even with throwOnError: true", async () => {
      Object.defineProperty(globalThis, "navigator", { value: undefined, writable: true });

      const result = await fs.getDirectoryPath(["a"], { throwOnError: true });
      expect(result).toBeNull();
    });
  });

  describe("getDirectoryPath caching", () => {
    function setupMockFS() {
      const mockDirB = { getDirectoryHandle: vi.fn() };
      const mockDirA = { getDirectoryHandle: vi.fn().mockResolvedValue(mockDirB) };
      const mockRoot = { getDirectoryHandle: vi.fn().mockResolvedValue(mockDirA) };
      const getDirectorySpy = vi.fn().mockResolvedValue(mockRoot);
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: getDirectorySpy } },
        writable: true,
      });
      return { mockRoot, mockDirA, mockDirB, getDirectorySpy };
    }

    it("full cache hit on repeat call — second call hits cache only", async () => {
      const { mockRoot, mockDirA, mockDirB, getDirectorySpy } = setupMockFS();

      await fs.getDirectoryPath(["a", "b"]);
      await fs.getDirectoryPath(["a", "b"]);

      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", { create: true });
      expect(mockDirA.getDirectoryHandle).toHaveBeenCalledTimes(1);
      expect(mockDirA.getDirectoryHandle).toHaveBeenCalledWith("b", { create: true });
      expect(mockDirB.getDirectoryHandle).not.toHaveBeenCalled();
    });

    it("intermediate prefix reuse — second call starts from cached prefix", async () => {
      const { mockRoot, mockDirA, mockDirB } = setupMockFS();
      const mockDirC = { getDirectoryHandle: vi.fn() };
      mockDirA.getDirectoryHandle.mockImplementation(async (name: string) => {
        if (name === "b") return mockDirB;
        if (name === "c") return mockDirC;
        throw new Error(`Unexpected: ${name}`);
      });

      await fs.getDirectoryPath(["a", "b"]);
      await fs.getDirectoryPath(["a", "c"]);

      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", { create: true });
      expect(mockDirA.getDirectoryHandle).toHaveBeenCalledWith("c", { create: true });
    });

    it("root handle cached — navigator.storage.getDirectory called once across calls", async () => {
      const { mockRoot, getDirectorySpy } = setupMockFS();
      const mockDirX = { getDirectoryHandle: vi.fn() };
      mockRoot.getDirectoryHandle.mockResolvedValue(mockDirX);

      await fs.getDirectoryPath(["a"]);
      await fs.getDirectoryPath(["b"]);

      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", { create: true });
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("b", { create: true });
    });

    it("no cache pollution on error — failed traversal does not cache null", async () => {
      const { mockRoot } = setupMockFS();
      const consoleWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});

      mockRoot.getDirectoryHandle.mockRejectedValue(new Error("fail"));
      const first = await fs.getDirectoryPath(["a", "b"]);
      expect(first).toBeNull();

      const mockDirA2 = { getDirectoryHandle: vi.fn() };
      const mockDirB2 = { getDirectoryHandle: vi.fn() };
      mockRoot.getDirectoryHandle.mockResolvedValue(mockDirA2);
      mockDirA2.getDirectoryHandle.mockResolvedValue(mockDirB2);

      const second = await fs.getDirectoryPath(["a", "b"]);
      expect(second).toBe(mockDirB2);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledWith("a", { create: true });

      consoleWarnSpy.mockRestore();
    });

    it("in-flight deduplication — concurrent calls share a single traversal", async () => {
      const { mockRoot, mockDirA, mockDirB, getDirectorySpy } = setupMockFS();

      const results = await Promise.all([
        fs.getDirectoryPath(["a", "b"]),
        fs.getDirectoryPath(["a", "b"]),
        fs.getDirectoryPath(["a", "b"]),
        fs.getDirectoryPath(["a", "b"]),
        fs.getDirectoryPath(["a", "b"]),
      ]);

      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledTimes(1);
      expect(mockDirA.getDirectoryHandle).toHaveBeenCalledTimes(1);
      for (const r of results) {
        expect(r).toBe(mockDirB);
      }
    });

    it("clearCache resets the cache — subsequent call re-traverses", async () => {
      const { mockRoot, getDirectorySpy } = setupMockFS();
      const mockDirA = { getDirectoryHandle: vi.fn() };
      mockRoot.getDirectoryHandle.mockResolvedValue(mockDirA);

      await fs.getDirectoryPath(["a"]);
      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledTimes(1);

      fs.clearCache();

      await fs.getDirectoryPath(["a"]);
      expect(getDirectorySpy).toHaveBeenCalledTimes(2);
      expect(mockRoot.getDirectoryHandle).toHaveBeenCalledTimes(2);
    });

    it("empty path returns root directory handle", async () => {
      const { getDirectorySpy } = setupMockFS();

      const result = await fs.getDirectoryPath([]);
      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();

      await fs.getDirectoryPath([]);
      expect(getDirectorySpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleQuotaError", () => {
    it("dispatches custom event on QuotaExceededError and logs warning", () => {
      const consoleWarnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
      const dispatchEventSpy = vi.fn();
      Object.defineProperty(globalThis, "window", {
        value: { dispatchEvent: dispatchEventSpy },
        writable: true,
      });

      // Create a mock DOMException
      class MockDOMException extends Error {
        name = "QuotaExceededError";
        constructor() {
          super("Quota exceeded");
        }
      }

      // Need to make it pass instanceof DOMException if possible, or we mock global DOMException
      Object.defineProperty(globalThis, "DOMException", {
        value: MockDOMException,
        writable: true,
      });

      const error = new MockDOMException();

      fs.handleQuotaError(error);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Storage quota exceeded. Archiving skipped.",
        "OPFS",
        undefined
      );
      expect(dispatchEventSpy).toHaveBeenCalled();
      const eventCall = dispatchEventSpy.mock.calls[0][0];
      expect(eventCall.type).toBe("engine:storage:quota-exceeded");
      expect(eventCall.detail.message).toBe(
        "Local storage full. Older archives may need to be cleared."
      );

      consoleWarnSpy.mockRestore();
    });

    it("logs error for other exceptions", () => {
      const consoleErrorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});
      const error = new Error("Some other error");

      fs.handleQuotaError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("Unexpected storage error", "OPFS", error);
      consoleErrorSpy.mockRestore();
    });
  });
});
