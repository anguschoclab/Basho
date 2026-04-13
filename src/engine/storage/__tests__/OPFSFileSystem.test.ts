import { describe, it, expect, vi, beforeEach } from "vitest";
import { OPFSFileSystem } from "../OPFSFileSystem";

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
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const error = new Error("Test Error");
      Object.defineProperty(globalThis, "navigator", {
        value: { storage: { getDirectory: vi.fn().mockRejectedValue(error) } },
        writable: true,
      });

      const result = await fs.getDirectoryPath(["folder1"]);

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[OPFS] Failed to access directory path: folder1",
        error
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe("handleQuotaError", () => {
    it("dispatches custom event on QuotaExceededError and logs warning", () => {
      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
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
        "[OPFS] Storage quota exceeded. Archiving skipped."
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
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const error = new Error("Some other error");

      fs.handleQuotaError(error);

      expect(consoleErrorSpy).toHaveBeenCalledWith("[OPFS] Unexpected storage error:", error);
      consoleErrorSpy.mockRestore();
    });
  });
});
