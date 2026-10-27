import { describe, it, expect } from "vitest";

describe("Toolchain target versions", () => {
  it("vite is v8+", async () => {
    const pkg = await import("vite/package.json");
    const major = parseInt(pkg.version.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(8);
  });

  it("tailwindcss is v4+", async () => {
    const pkg = await import("tailwindcss/package.json");
    const major = parseInt(pkg.version.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(4);
  });

  it("vitest is v4+", async () => {
    const pkg = await import("vitest/package.json");
    const major = parseInt(pkg.version.split(".")[0], 10);
    expect(major).toBeGreaterThanOrEqual(4);
  });
});
