import { warn, error } from "../utils/Logger";

export class OPFSFileSystem {
  private dirCache = new Map<string, FileSystemDirectoryHandle>();
  private inFlight = new Map<string, Promise<FileSystemDirectoryHandle | null>>();

  public isSupported(): boolean {
    return (
      typeof navigator !== "undefined" &&
      typeof navigator.storage !== "undefined" &&
      typeof navigator.storage.getDirectory === "function"
    );
  }

  /**
   * Navigates or creates a nested directory structure.
   * Uses a handle cache and in-flight deduplication to avoid redundant traversals.
   */
  public async getDirectoryPath(
    path: string[],
    options?: { throwOnError?: boolean }
  ): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;

    const key = path.join("/");

    const cached = this.dirCache.get(key);
    if (cached) return cached;

    const inflight = this.inFlight.get(key);
    if (inflight) return inflight;

    const promise = this.traversePath(path, options);
    this.inFlight.set(key, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Clears the directory handle cache and any in-flight traversals.
   */
  public clearCache(): void {
    this.dirCache.clear();
    this.inFlight.clear();
  }

  private async traversePath(
    path: string[],
    options?: { throwOnError?: boolean }
  ): Promise<FileSystemDirectoryHandle | null> {
    try {
      let currentDir: FileSystemDirectoryHandle | null = null;
      let startIndex = 0;

      for (let i = path.length; i >= 0; i--) {
        const prefixKey = path.slice(0, i).join("/");
        const cached = this.dirCache.get(prefixKey);
        if (cached) {
          currentDir = cached;
          startIndex = i;
          break;
        }
      }

      if (!currentDir) {
        currentDir = await navigator.storage.getDirectory();
        this.dirCache.set("", currentDir);
      }

      for (let i = startIndex; i < path.length; i++) {
        currentDir = await currentDir.getDirectoryHandle(path[i], { create: true });
        this.dirCache.set(path.slice(0, i + 1).join("/"), currentDir);
      }

      return currentDir;
    } catch (e) {
      warn(`Failed to access directory path: ${path.join("/")}`, "OPFS", e);
      return null;
    }
  }

  public handleQuotaError(e: unknown) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      warn("Storage quota exceeded. Archiving skipped.", "OPFS");
      // Dispatch boundary event to UI layer (Zustand store will listen for this to show a Toast)
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("engine:storage:quota-exceeded", {
            detail: { message: "Local storage full. Older archives may need to be cleared." },
          })
        );
      }
    } else {
      error("Unexpected storage error", "OPFS", e);
    }
  }
}
