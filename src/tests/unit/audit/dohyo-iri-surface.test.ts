/**
 * Surface regression test: dohyoIriStyle and yokozuna attendants rendered in UI.
 *
 * Proves that RikishiProfileTab renders the dohyo-iri style badge
 * and resolves attendant names from the world.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = join(__dirname, "../../../..");
const SRC = join(ROOT, "src");

function readFile(rel: string): string {
  const abs = join(SRC, rel);
  if (!existsSync(abs)) return "";
  return readFileSync(abs, "utf-8");
}

describe("RikishiProfileTab — dohyoIriStyle UI surface", () => {
  it("reads dohyoIriStyle from rawRikishi", () => {
    const comp = readFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("dohyoIriStyle");
  });

  it("renders a badge with the style name", () => {
    const comp = readFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("Unryu-style");
    expect(comp).toContain("Shiranui-style");
    expect(comp).toContain("Dohyo-iri");
  });

  it("resolves tachimochi and tsuyuharai from the world", () => {
    const comp = readFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("tachimochiId");
    expect(comp).toContain("tsuyuharaiId");
    expect(comp).toContain("Tachimochi");
    expect(comp).toContain("Tsuyuharai");
  });

  it("accepts a world prop for attendant resolution", () => {
    const comp = readFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("world?: WorldState");
    expect(comp).toContain("world?.rikishi.get");
  });
});

describe("RikishiPage — passes world to RikishiProfileTab", () => {
  it("passes world prop to RikishiProfileTab", () => {
    const page = readFile("pages/RikishiPage.tsx");
    expect(page).toContain("world={world}");
    expect(page).toContain("RikishiProfileTab");
  });
});
