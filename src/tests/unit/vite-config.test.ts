import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const projectRoot = join(import.meta.dirname, "..", "..", "..");

describe("Vite config loads correctly (Vite 8)", () => {
  it("vite.config.ts exists and has correct structure", () => {
    const content = readFileSync(join(projectRoot, "vite.config.ts"), "utf-8");
    expect(content).toContain("defineConfig");
    expect(content).toContain("@vitejs/plugin-react");
    expect(content).toContain("reactCompilerPreset");
    expect(content).toContain("@tailwindcss/vite");
  });

  it("vitest.config.ts exists and has correct structure", () => {
    const content = readFileSync(join(projectRoot, "vitest.config.ts"), "utf-8");
    expect(content).toContain("defineConfig");
    expect(content).toContain("@vitejs/plugin-react");
  });

  it("vite.config.ts has @ alias", () => {
    const content = readFileSync(join(projectRoot, "vite.config.ts"), "utf-8");
    expect(content).toContain('"@"');
  });

  it("vite.config.ts has worker format es", () => {
    const content = readFileSync(join(projectRoot, "vite.config.ts"), "utf-8");
    expect(content).toContain('format: "es"');
  });

  it("electron.vite.config.ts exists and uses @vitejs/plugin-react", () => {
    const content = readFileSync(join(projectRoot, "electron.vite.config.ts"), "utf-8");
    expect(content).toContain("@vitejs/plugin-react");
    expect(content).toContain("@tailwindcss/vite");
  });
});
