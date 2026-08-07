/**
 * Phase 2b: Media surface regression tests.
 *
 * Proves that PostBashoPressService is invoked from CompetitionService
 * and that MediaPage uses projectMediaUIDigest to surface media state.
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

describe("PostBashoPressService — call site wiring", () => {
  it("is imported by CompetitionService", () => {
    const svc = readFile("engine/lifecycle/CompetitionService.ts");
    expect(svc).toContain("PostBashoPressService");
  });

  it("generatePressConference is called by CompetitionService", () => {
    const svc = readFile("engine/lifecycle/CompetitionService.ts");
    expect(svc).toMatch(/PostBashoPressService\.generatePressConference/);
  });

  it("exports generatePressConference", () => {
    const svc = readFile("engine/systems/narrative/PostBashoPressService.ts");
    expect(svc).toContain("generatePressConference");
  });
});

describe("MediaPage — UI surface", () => {
  it("uses projectMediaUIDigest for state projection", () => {
    const page = readFile("pages/MediaPage.tsx");
    expect(page).toContain("projectMediaUIDigest");
  });

  it("renders media headlines and beats", () => {
    const page = readFile("pages/MediaPage.tsx");
    expect(page).toContain("MediaHeadline");
    expect(page).toContain("MediaBeat");
  });

  it("renders media heat label and tone color from PerceptionPresenter", () => {
    const page = readFile("pages/MediaPage.tsx");
    expect(page).toContain("getMediaHeatLabel");
    expect(page).toContain("getMediaToneColor");
  });

  it("renders EventFeed for event log continuity", () => {
    const page = readFile("pages/MediaPage.tsx");
    expect(page).toContain("EventFeed");
  });
});

describe("MediaService — governance headline generation", () => {
  it("generateGovernanceHeadline is imported by phase01_week_governance", () => {
    const phase = readFile("engine/tick/phases/phase01_week_governance.ts");
    expect(phase).toContain("generateGovernanceHeadline");
  });
});
