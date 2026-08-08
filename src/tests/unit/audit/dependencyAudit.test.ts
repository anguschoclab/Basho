import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const PROJECT_ROOT = join(import.meta.dirname, "../../../..");
const PKG = JSON.parse(readFileSync(join(PROJECT_ROOT, "package.json"), "utf-8"));

const RUNTIME_DEPS = Object.keys(PKG.dependencies || {});
const DEV_DEPS = Object.keys(PKG.devDependencies || {});

describe("L1.3: dependency duplicates & bloat", () => {
  it("no @typescript-eslint packages in runtime dependencies (should be devDeps)", () => {
    const eslintInRuntime = RUNTIME_DEPS.filter((d: string) =>
      d.startsWith("@typescript-eslint/")
    );
    expect(eslintInRuntime, `ESLint packages in runtime deps: ${eslintInRuntime.join(", ")}`).toEqual([]);
  });

  it("no dependency appears in both dependencies and devDependencies", () => {
    const runtimeSet = new Set(RUNTIME_DEPS);
    const duplicates = DEV_DEPS.filter((d: string) => runtimeSet.has(d));
    expect(duplicates, `Deps in both sections: ${duplicates.join(", ")}`).toEqual([]);
  });
});
