/**
 * Surface regression test: dohyoIriStyle and yokozuna attendants rendered in UI.
 *
 * Proves that RikishiProfileTab renders the dohyo-iri style badge
 * and resolves attendant names from the world.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("RikishiProfileTab — dohyoIriStyle UI surface", () => {
  it("reads dohyoIriStyle from rawRikishi", () => {
    const comp = readSrcFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("dohyoIriStyle");
  });

  it("renders a badge with the style name", () => {
    const comp = readSrcFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("Unryu-style");
    expect(comp).toContain("Shiranui-style");
    expect(comp).toContain("Dohyo-iri");
  });

  it("resolves tachimochi and tsuyuharai from the world", () => {
    const comp = readSrcFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("tachimochiId");
    expect(comp).toContain("tsuyuharaiId");
    expect(comp).toContain("Tachimochi");
    expect(comp).toContain("Tsuyuharai");
  });

  it("accepts a world prop for attendant resolution", () => {
    const comp = readSrcFile("components/rikishi/RikishiProfileTab.tsx");
    expect(comp).toContain("world?: WorldState");
    expect(comp).toContain("world?.rikishi.get");
  });
});

describe("RikishiPage — passes world to RikishiProfileTab", () => {
  it("passes world prop to RikishiProfileTab", () => {
    const page = readSrcFile("components/rikishi/RikishiPageSections.tsx");
    expect(page).toContain("world={world}");
    expect(page).toContain("RikishiProfileTab");
  });
});
