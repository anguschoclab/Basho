import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("BardEngine deferred import in bootstrap.tsx", () => {
  const source = readFileSync(resolve(process.cwd(), "src/bootstrap.tsx"), "utf-8");

  it("does not use a static import for BardEngine", () => {
    expect(source).not.toMatch(/import\s+\{[^}]*BardEngine[^}]*\}\s+from/);
  });

  it("uses a dynamic import for BardEngine", () => {
    expect(source).toMatch(/import\s*\(\s*["'][^"']*BardEngine["']\s*\)/);
  });
});
