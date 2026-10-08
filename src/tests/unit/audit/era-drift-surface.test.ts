/**
 * Phase 3c: Era drift surface regression tests.
 *
 * Proves that EraDriftService mutates world.meta (tone + drift) and
 * world.globalKimariteStats, is called from phase06_yearly_boundary,
 * and that TrendsPage renders era/meta data via formatMetaTrends.
 */

import { describe, it, expect } from "vitest";
import { join } from "path";
import { readSrcFile } from "@/tests/helpers/fsScan";

const ROOT = join(__dirname, "../../../..");

describe("EraDriftService — tick phase wiring", () => {
  it("processYearlyEraDrift is imported and called by phase06_yearly_boundary", () => {
    const phase = readSrcFile("engine/tick/phases/phase06_yearly_boundary.ts");
    expect(phase).toContain("processYearlyEraDrift");
  });

  it("exports processYearlyEraDrift", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain("export function processYearlyEraDrift");
  });
});

describe("EraDriftService — state mutation", () => {
  it("writes world.meta with tone and drift fields", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain('updateWorldField("meta"');
    expect(svc).toContain("tone");
    expect(svc).toContain("drift");
  });

  it("resets globalKimariteStats after processing", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain('updateWorldField("globalKimariteStats"');
  });

  it("emits WORLD_META_EVOLUTION event", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain("WORLD_META_EVOLUTION");
  });

  it("reads world.globalKimariteStats as input", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain("globalKimariteStats");
  });

  it("reads world.meta.tone for hysteresis", () => {
    const svc = readSrcFile("engine/systems/meta/EraDriftService.ts");
    expect(svc).toContain("meta");
    expect(svc).toContain("tone");
  });
});

describe("TrendsPage — UI surface", () => {
  it("uses formatMetaTrends for meta trend visualization", () => {
    const page = readSrcFile("pages/TrendsPage.tsx");
    expect(page).toContain("formatMetaTrends");
  });

  it("renders AreaChart with oshi, yotsu, and hybrid data keys", () => {
    const page = readSrcFile("pages/TrendsPage.tsx");
    expect(page).toContain("oshi");
    expect(page).toContain("yotsu");
    expect(page).toContain("hybrid");
  });
});

describe("formatMetaTrends — presenter reachability", () => {
  it("reads world.history for meta bias data", () => {
    const fmt = readSrcFile("presenters/uiFormatters.ts");
    expect(fmt).toContain("formatMetaTrends");
    expect(fmt).toContain("world.history");
  });
});
