import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function getManualChunks(): (id: string) => string | undefined {
  const source = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf-8");
  const match = source.match(/manualChunks\s*\(\s*id\s*\)\s*\{([\s\S]*?)\n\s{8}\}/);
  if (!match) throw new Error("Could not extract manualChunks function from vite.config.ts");
  const body = match[1];
  return new Function("id", body) as (id: string) => string | undefined;
}

describe("bout subchunks — manualChunks mapping", () => {
  const chunkNames = [
    "engine-bout-narrative",
    "engine-bout-physics",
    "engine-bout-core",
    "engine-bout-support",
  ];

  it("vite.config.ts exports a manualChunks function", () => {
    const manualChunks = getManualChunks();
    expect(typeof manualChunks).toBe("function");
  });

  it("maps boutNarrative.ts to engine-bout-narrative", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/bout/boutNarrative.ts");
    expect(result).toBe("engine-bout-narrative");
  });

  it("maps physics/ files to engine-bout-physics", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/bout/physics/tachiai.ts");
    expect(result).toBe("engine-bout-physics");
  });

  it("maps boutResolver.ts to engine-bout-core", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/bout/boutResolver.ts");
    expect(result).toBe("engine-bout-core");
  });

  it("maps boutPhysics.ts to engine-bout-core", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/bout/boutPhysics.ts");
    expect(result).toBe("engine-bout-core");
  });

  it("maps kimarite/ to engine-bout-support", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/bout/kimarite/index.ts");
    expect(result).toBe("engine-bout-support");
  });

  it("maps banzuke/ to engine-bout-support", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/engine/banzuke/banzukeBuilder.ts");
    expect(result).toBe("engine-bout-support");
  });

  it("maps presenters/ to presenters chunk", () => {
    const manualChunks = getManualChunks();
    const result = manualChunks("/project/src/presenters/uiDigest.ts");
    expect(result).toBe("presenters");
  });

  it("all expected chunk names are present in the function logic", () => {
    const manualChunks = getManualChunks();
    for (const name of chunkNames) {
      expect(manualChunks.toString()).toContain(name);
    }
  });
});
