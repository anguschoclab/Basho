import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("chunk config — manualChunks sub-chunk names", () => {
  const viteSource = readFileSync(resolve(process.cwd(), "vite.config.ts"), "utf-8");
  const electronSource = readFileSync(
    resolve(process.cwd(), "electron.vite.config.ts"),
    "utf-8"
  );

  it("vite.config.ts defines engine-bout-narrative chunk", () => {
    expect(viteSource).toContain("engine-bout-narrative");
  });

  it("vite.config.ts defines engine-bout-physics chunk", () => {
    expect(viteSource).toContain("engine-bout-physics");
  });

  it("vite.config.ts defines engine-bout-core chunk", () => {
    expect(viteSource).toContain("engine-bout-core");
  });

  it("vite.config.ts defines engine-bout-support chunk", () => {
    expect(viteSource).toContain("engine-bout-support");
  });

  it("vite.config.ts defines presenters chunk", () => {
    expect(viteSource).toContain('"presenters"');
  });

  it("electron.vite.config.ts defines manualChunks", () => {
    expect(electronSource).toContain("manualChunks");
  });

  it("electron.vite.config.ts defines engine-bout-narrative chunk", () => {
    expect(electronSource).toContain("engine-bout-narrative");
  });

  it("electron.vite.config.ts defines presenters chunk", () => {
    expect(electronSource).toContain('"presenters"');
  });
});
