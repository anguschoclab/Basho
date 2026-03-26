import { vi } from 'vitest';

/**
 * OPFS (Origin Private File System) In-Memory Mock for Vitest
 * Simulates directory handles, file handles, and writable streams
 * required for testing navigator.storage.getDirectory() in a Node environment.
 */

class MockFile {
  constructor(private _content: string) {}
  async text() {
    return this._content;
  }
}

class MockFileSystemWritableFileStream {
  constructor(private fileHandle: MockFileSystemFileHandle) {}
  async write(data: string) {
    this.fileHandle._content = data;
  }
  async close() {}
}

export class MockFileSystemFileHandle {
  public kind = 'file' as const;
  public _content: string = '';

  constructor(public name: string) {}

  async getFile() {
    return new MockFile(this._content);
  }

  async createWritable() {
    return new MockFileSystemWritableFileStream(this);
  }
}

export class MockFileSystemDirectoryHandle {
  public kind = 'directory' as const;
  public children = new Map<string, MockFileSystemDirectoryHandle | MockFileSystemFileHandle>();

  constructor(public name: string) {}

  async getDirectoryHandle(name: string, options?: { create?: boolean }) {
    if (!this.children.has(name)) {
      if (options?.create) {
        this.children.set(name, new MockFileSystemDirectoryHandle(name));
      } else {
        const err = new Error(`Directory ${name} not found`);
        err.name = 'NotFoundError';
        throw err;
      }
    }
    const child = this.children.get(name);
    if (child?.kind !== 'directory') throw new Error('Type mismatch');
    return child as MockFileSystemDirectoryHandle;
  }

  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.children.has(name)) {
      if (options?.create) {
        this.children.set(name, new MockFileSystemFileHandle(name));
      } else {
        const err = new Error(`File ${name} not found`);
        err.name = 'NotFoundError';
        throw err;
      }
    }
    const child = this.children.get(name);
    if (child?.kind !== 'file') throw new Error('Type mismatch');
    return child as MockFileSystemFileHandle;
  }

  // Async iterator for directory entries
  async *values() {
    for (const child of this.children.values()) {
      yield child;
    }
  }
}

// Global setup injection
const rootDir = new MockFileSystemDirectoryHandle('root');

Object.defineProperty(global, 'navigator', {
  value: {
    storage: {
      getDirectory: async () => rootDir,
    }
  },
  writable: true,
  configurable: true
});

// Reset the file system before each test to prevent state leakage
export const resetMockFileSystem = () => {
  rootDir.children.clear();
};
