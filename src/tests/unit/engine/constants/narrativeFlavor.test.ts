/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import {
  DOHYO_IRI_DESCRIPTIONS,
  BASHO_SEASONAL_FLAVOR,
  RANK_HONORIFICS,
  KIMARITE_DESCRIPTIONS,
  getDohyoIriDescription,
  getBashoFlavor,
  getRankHonorific,
  getKimariteDescription,
} from "@/constants/engine/narrativeFlavor";

describe("Dohyo-iri descriptions", () => {
  it("has descriptions for both styles", () => {
    expect(DOHYO_IRI_DESCRIPTIONS.unryu).toBeDefined();
    expect(DOHYO_IRI_DESCRIPTIONS.shiranui).toBeDefined();
  });

  it("unryu description mentions cloud dragon", () => {
    expect(DOHYO_IRI_DESCRIPTIONS.unryu.toLowerCase()).toContain("cloud dragon");
  });

  it("shiranui description mentions fire", () => {
    expect(DOHYO_IRI_DESCRIPTIONS.shiranui.toLowerCase()).toContain("fire");
  });

  it("getDohyoIriDescription returns correct text", () => {
    expect(getDohyoIriDescription("unryu")).toBe(DOHYO_IRI_DESCRIPTIONS.unryu);
    expect(getDohyoIriDescription("shiranui")).toBe(DOHYO_IRI_DESCRIPTIONS.shiranui);
  });
});

describe("Basho seasonal flavor", () => {
  it("has flavor text for all six basho", () => {
    expect(BASHO_SEASONAL_FLAVOR.hatsu).toBeDefined();
    expect(BASHO_SEASONAL_FLAVOR.haru).toBeDefined();
    expect(BASHO_SEASONAL_FLAVOR.natsu).toBeDefined();
    expect(BASHO_SEASONAL_FLAVOR.nagoya).toBeDefined();
    expect(BASHO_SEASONAL_FLAVOR.aki).toBeDefined();
    expect(BASHO_SEASONAL_FLAVOR.kyushu).toBeDefined();
  });

  it("hatsu mentions New Year", () => {
    expect(BASHO_SEASONAL_FLAVOR.hatsu.toLowerCase()).toContain("new year");
  });

  it("getBashoFlavor returns correct text for known basho", () => {
    expect(getBashoFlavor("hatsu")).toBe(BASHO_SEASONAL_FLAVOR.hatsu);
  });

  it("getBashoFlavor returns generic text for unknown basho", () => {
    const result = getBashoFlavor("unknown");
    expect(result).toContain("unknown");
    expect(result).toContain("tournament");
  });
});

describe("Rank honorifics", () => {
  it("has honorifics for all major ranks", () => {
    expect(RANK_HONORIFICS.yokozuna).toBe("Grand Champion");
    expect(RANK_HONORIFICS.ozeki).toBe("Champion");
    expect(RANK_HONORIFICS.sekiwake).toBe("Junior Champion");
  });

  it("getRankHonorific returns correct honorific", () => {
    expect(getRankHonorific("yokozuna")).toBe("Grand Champion");
  });

  it("getRankHonorific returns rank name for unknown ranks", () => {
    expect(getRankHonorific("unknown")).toBe("unknown");
  });
});

describe("Kimarite descriptions", () => {
  it("has descriptions for common techniques", () => {
    expect(KIMARITE_DESCRIPTIONS.yorikiri).toBeDefined();
    expect(KIMARITE_DESCRIPTIONS.uwatenage).toBeDefined();
    expect(KIMARITE_DESCRIPTIONS.oshidashi).toBeDefined();
  });

  it("yorikiri description mentions force-out", () => {
    expect(KIMARITE_DESCRIPTIONS.yorikiri.toLowerCase()).toContain("force-out");
  });

  it("getKimariteDescription returns correct text for known technique", () => {
    expect(getKimariteDescription("yorikiri")).toBe(KIMARITE_DESCRIPTIONS.yorikiri);
  });

  it("getKimariteDescription returns generic text for unknown technique", () => {
    const result = getKimariteDescription("unknown_waza");
    expect(result).toContain("specialized winning technique");
  });
});
