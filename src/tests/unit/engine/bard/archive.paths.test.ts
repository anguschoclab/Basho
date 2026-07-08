import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";
import { SeededRNG } from "@/engine/rng";

describe("archive.json template path coverage", () => {
  beforeEach(() => {
    BardEngine.resetCache();
  });

  const rng = new SeededRNG("test-archive-paths");

  function expectResolves(path: string): void {
    const result = BardEngine.resolve(rng, path);
    expect(result.text.length, `path "${path}" should resolve to non-empty text`).toBeGreaterThan(
      0
    );
  }

  // A1: Award template paths
  it("resolves combat.phases.finish.kinboshi to non-empty text", () => {
    expectResolves("combat.phases.finish.kinboshi");
  });

  it("resolves combat.phases.finish.ginboshi to non-empty text", () => {
    expectResolves("combat.phases.finish.ginboshi");
  });

  // B2: Governance templates
  it("resolves institutional.governance.scandal to non-empty text", () => {
    expectResolves("institutional.governance.scandal");
  });

  it("resolves institutional.governance.status_escalation to non-empty text", () => {
    expectResolves("institutional.governance.status_escalation");
  });

  it("resolves institutional.governance.low_roster_headline to non-empty text", () => {
    expectResolves("institutional.governance.low_roster_headline");
  });

  it("resolves institutional.governance.welfare_headline to non-empty text", () => {
    expectResolves("institutional.governance.welfare_headline");
  });

  it("resolves institutional.governance.sanction to non-empty text", () => {
    expectResolves("institutional.governance.sanction");
  });

  it("resolves institutional.governance.probation to non-empty text", () => {
    expectResolves("institutional.governance.probation");
  });

  it("resolves institutional.governance.naturalization_headline to non-empty text", () => {
    expectResolves("institutional.governance.naturalization_headline");
  });

  it("resolves institutional.governance.emergency_loan to non-empty text", () => {
    expectResolves("institutional.governance.emergency_loan");
  });

  // B2 addition: Merger template
  it("resolves institutional.merger.approved to non-empty text", () => {
    expectResolves("institutional.merger.approved");
  });

  // B3: Venue templates
  it("resolves world.venues.Osaka.entrance to non-empty text", () => {
    expectResolves("world.venues.Osaka.entrance");
  });

  it("resolves world.venues.Nagoya.entrance to non-empty text", () => {
    expectResolves("world.venues.Nagoya.entrance");
  });

  it("resolves world.venues.Fukuoka.entrance to non-empty text", () => {
    expectResolves("world.venues.Fukuoka.entrance");
  });

  // B4: Kensho sponsors
  it("resolves institutional.kensho_sponsors to non-empty text", () => {
    expectResolves("institutional.kensho_sponsors");
  });

  // B5: Missing kimarite templates — test that BardEngine.has returns true
  const missingKimarite = [
    "uwatenage",
    "sukuinage",
    "shitatenage",
    "kotenage",
    "shitatedashinage",
    "kimedashi",
    "kimetaoshi",
    "uwatehineri",
    "kotehineri",
    "amiuchi",
    "kainahineri",
    "zubuneri",
    "sakatottari",
    "kubiotoshi",
    "gasshohineri",
    "harimanage",
    "osakate",
    "sabaori",
    "tokkurinage",
    "makiotoshi",
    "uchimuso",
    "sotomuso",
    "ashitori",
    "sotogake",
    "uchigake",
    "ketaguri",
    "isamiashi",
    "koshikudake",
    "tsukite",
  ];

  describe.each(missingKimarite)("kimarite %s has a template", (tech) => {
    it(`BardEngine.has('combat.kimarite.${tech}') is true`, () => {
      expect(BardEngine.has(`combat.kimarite.${tech}`)).toBe(true);
    });
  });
});
