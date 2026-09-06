// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { opfsArchiveService } from "@/engine/storage/opfsArchive";
import { resetMockFileSystem, MockFileSystemDirectoryHandle } from "@/tests/setup";
import { mockRikishi } from "../utils";
import type { Rikishi } from "@/engine/types/rikishi";

describe("Cold-storage archive: archiveFullRikishiRecord / retrieveFullRikishiRecord (OPFS)", () => {
  beforeEach(() => {
    resetMockFileSystem();
    opfsArchiveService.clearCache();
    vi.restoreAllMocks();
  });

  it("archiveFullRikishiRecord writes to OPFS and retrieveFullRikishiRecord reads back", async () => {
    const rikishi = mockRikishi("r-archive-1", {
      shikona: "Legendary Yokozuna",
      careerWins: 500,
      careerLosses: 200,
    });

    await opfsArchiveService.archiveFullRikishiRecord("r-archive-1", rikishi);
    const retrieved = await opfsArchiveService.retrieveFullRikishiRecord("r-archive-1");

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe("r-archive-1");
    expect(retrieved!.shikona).toBe("Legendary Yokozuna");
    expect(retrieved!.careerWins).toBe(500);
    expect(retrieved!.careerLosses).toBe(200);
  });

  it("retrieveFullRikishiRecord returns null for unknown id", async () => {
    const retrieved = await opfsArchiveService.retrieveFullRikishiRecord("r-ghost");
    expect(retrieved).toBeNull();
  });

  it("archiveFullRikishiRecord validates input is an object with id and shikona", async () => {
    // Invalid: not an object
    await opfsArchiveService.archiveFullRikishiRecord("r-bad", "not-an-object" as unknown as Rikishi);
    const retrieved = await opfsArchiveService.retrieveFullRikishiRecord("r-bad");
    expect(retrieved).toBeNull();

    // Invalid: missing shikona
    await opfsArchiveService.archiveFullRikishiRecord("r-noshikona", { id: "r-noshikona" } as unknown as Rikishi);
    const retrieved2 = await opfsArchiveService.retrieveFullRikishiRecord("r-noshikona");
    expect(retrieved2).toBeNull();
  });

  it("retrieveFullRikishiRecord validates returned data has id and shikona", async () => {
    // Write corrupted data directly to mock filesystem
    const root = (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
    const rikishiDir = await root.getDirectoryHandle("rikishi", { create: true });
    const specificDir = await rikishiDir.getDirectoryHandle("r-corrupt", { create: true });
    const fileHandle = await specificDir.getFileHandle("full_record.json", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify({ foo: "bar" })); // Missing id and shikona
    await writable.close();

    const retrieved = await opfsArchiveService.retrieveFullRikishiRecord("r-corrupt");
    expect(retrieved).toBeNull();
  });

  it("writes to the correct OPFS path: rikishi/{id}/full_record.json", async () => {
    const rikishi = mockRikishi("r-path-test");
    await opfsArchiveService.archiveFullRikishiRecord("r-path-test", rikishi);

    const root = (await navigator.storage.getDirectory()) as unknown as MockFileSystemDirectoryHandle;
    const rikishiDir = await root.getDirectoryHandle("rikishi");
    const specificDir = await rikishiDir.getDirectoryHandle("r-path-test");
    const fileHandle = await specificDir.getFileHandle("full_record.json");

    expect(fileHandle).toBeDefined();
    const file = await fileHandle.getFile();
    const content = await file.text();
    const parsed = JSON.parse(content);
    expect(parsed.id).toBe("r-path-test");
  });
});
