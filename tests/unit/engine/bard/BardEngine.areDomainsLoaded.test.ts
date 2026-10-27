import { describe, it, expect, beforeEach } from "vitest";
import { BardEngine } from "@/engine/bard/BardEngine";

describe("BardEngine.areDomainsLoaded", () => {
  beforeEach(() => {
    BardEngine.resetCache();
    BardEngine.resetDomains();
  });

  it("returns false before loadDomains() or ensureDomains() is called", () => {
    expect(BardEngine.areDomainsLoaded()).toBe(false);
  });

  it("returns true after loadDomains() resolves", async () => {
    await BardEngine.loadDomains();
    expect(BardEngine.areDomainsLoaded()).toBe(true);
  });

  it("stays false after only a partial ensureDomains(['combat'])", async () => {
    await BardEngine.ensureDomains(["combat"]);
    expect(BardEngine.areDomainsLoaded()).toBe(false);
  });

  it("returns false again after resetDomains()", async () => {
    await BardEngine.loadDomains();
    expect(BardEngine.areDomainsLoaded()).toBe(true);
    BardEngine.resetDomains();
    expect(BardEngine.areDomainsLoaded()).toBe(false);
  });
});
