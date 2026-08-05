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
  KESHO_MAWASHI_DESCRIPTION,
  MAWASHI_DESCRIPTION,
  FUNDOSHI_DESCRIPTION,
  YUKATA_DESCRIPTION,
  KATAHADA_DESCRIPTION,
  SHIMENAWA_DESCRIPTION,
  SHIDE_DESCRIPTION,
  DOHYO_MATSURI_DESCRIPTION,
  KOHAKU_MAKU_DESCRIPTION,
  CHIKARA_MIZU_DESCRIPTION,
  CHIKARA_GAMI_DESCRIPTION,
  YUMITORI_SHIKI_DESCRIPTION,
  KAGAMI_MOCHI_DESCRIPTION,
  TENRAN_ZUMO_DESCRIPTION,
  KAKEGOE_DESCRIPTION,
  FURE_DAIKO_DESCRIPTION,
  HYOSHIGI_DESCRIPTION,
  SUMO_JI_DESCRIPTION,
  EDOMOJI_DESCRIPTION,
  BINZUKE_DESCRIPTION,
  SOPPUGATA_DESCRIPTION,
  ANKOGATA_DESCRIPTION,
  GUNBAI_DESCRIPTION,
  getPreBoutRitualText,
  getClosingCeremonyText,
  getPreBashoCeremonyText,
  getBodyTypeDescription,
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

describe("Equipment & apparel descriptions", () => {
  it("KESHO_MAWASHI_DESCRIPTION mentions ceremonial apron", () => {
    expect(KESHO_MAWASHI_DESCRIPTION.toLowerCase()).toContain("ceremonial");
  });

  it("MAWASHI_DESCRIPTION mentions belt", () => {
    expect(MAWASHI_DESCRIPTION.toLowerCase()).toContain("belt");
  });

  it("FUNDOSHI_DESCRIPTION mentions undergarment", () => {
    expect(FUNDOSHI_DESCRIPTION.toLowerCase()).toContain("undergarment");
  });

  it("YUKATA_DESCRIPTION mentions kimono", () => {
    expect(YUKATA_DESCRIPTION.toLowerCase()).toContain("kimono");
  });

  it("KATAHADA_DESCRIPTION mentions bare shoulder", () => {
    expect(KATAHADA_DESCRIPTION.toLowerCase()).toContain("bare");
  });
});

describe("Dohyo & shrine element descriptions", () => {
  it("SHIMENAWA_DESCRIPTION mentions sacred rope", () => {
    expect(SHIMENAWA_DESCRIPTION.toLowerCase()).toContain("sacred");
  });

  it("SHIDE_DESCRIPTION mentions paper streamers", () => {
    expect(SHIDE_DESCRIPTION.toLowerCase()).toContain("paper");
  });

  it("DOHYO_MATSURI_DESCRIPTION mentions purification", () => {
    expect(DOHYO_MATSURI_DESCRIPTION.toLowerCase()).toContain("purification");
  });

  it("KOHAKU_MAKU_DESCRIPTION mentions curtain", () => {
    expect(KOHAKU_MAKU_DESCRIPTION.toLowerCase()).toContain("curtain");
  });
});

describe("Pre/post-bout ritual descriptions", () => {
  it("CHIKARA_MIZU_DESCRIPTION mentions water", () => {
    expect(CHIKARA_MIZU_DESCRIPTION.toLowerCase()).toContain("water");
  });

  it("CHIKARA_GAMI_DESCRIPTION mentions paper", () => {
    expect(CHIKARA_GAMI_DESCRIPTION.toLowerCase()).toContain("paper");
  });

  it("YUMITORI_SHIKI_DESCRIPTION mentions bow", () => {
    expect(YUMITORI_SHIKI_DESCRIPTION.toLowerCase()).toContain("bow");
  });
});

describe("Seasonal & special event descriptions", () => {
  it("KAGAMI_MOCHI_DESCRIPTION mentions New Year", () => {
    expect(KAGAMI_MOCHI_DESCRIPTION.toLowerCase()).toContain("new year");
  });

  it("TENRAN_ZUMO_DESCRIPTION mentions Emperor", () => {
    expect(TENRAN_ZUMO_DESCRIPTION.toLowerCase()).toContain("emperor");
  });
});

describe("Crowd atmosphere descriptions", () => {
  it("KAKEGOE_DESCRIPTION mentions shouts", () => {
    expect(KAKEGOE_DESCRIPTION.toLowerCase()).toContain("shouts");
  });

  it("FURE_DAIKO_DESCRIPTION mentions drum", () => {
    expect(FURE_DAIKO_DESCRIPTION.toLowerCase()).toContain("drum");
  });

  it("HYOSHIGI_DESCRIPTION mentions clappers", () => {
    expect(HYOSHIGI_DESCRIPTION.toLowerCase()).toContain("clappers");
  });
});

describe("Calligraphy & styling descriptions", () => {
  it("SUMO_JI_DESCRIPTION mentions calligraphy", () => {
    expect(SUMO_JI_DESCRIPTION.toLowerCase()).toContain("calligraphy");
  });

  it("EDOMOJI_DESCRIPTION mentions lettering", () => {
    expect(EDOMOJI_DESCRIPTION.toLowerCase()).toContain("lettering");
  });

  it("BINZUKE_DESCRIPTION mentions wax", () => {
    expect(BINZUKE_DESCRIPTION.toLowerCase()).toContain("wax");
  });
});

describe("Personality descriptors", () => {
  it("SOPPUGATA_DESCRIPTION mentions slender", () => {
    expect(SOPPUGATA_DESCRIPTION.toLowerCase()).toContain("slender");
  });

  it("ANKOGATA_DESCRIPTION mentions heavy", () => {
    expect(ANKOGATA_DESCRIPTION.toLowerCase()).toContain("heavy");
  });
});

describe("Gyoji prop", () => {
  it("GUNBAI_DESCRIPTION mentions war fan", () => {
    expect(GUNBAI_DESCRIPTION.toLowerCase()).toContain("war fan");
  });
});

describe("Helper functions", () => {
  it("getPreBoutRitualText combines chikara-mizu and chikara-gami", () => {
    const text = getPreBoutRitualText();
    expect(text).toContain("Chikara-mizu");
    expect(text).toContain("Chikara-gami");
  });

  it("getClosingCeremonyText returns yumitori-shiki", () => {
    expect(getClosingCeremonyText()).toBe(YUMITORI_SHIKI_DESCRIPTION);
  });

  it("getPreBashoCeremonyText combines dohyo-matsuri and shimenawa", () => {
    const text = getPreBashoCeremonyText();
    expect(text).toContain("dohyo-matsuri");
    expect(text).toContain("shimenawa");
  });

  it("getBodyTypeDescription returns soppugata for slender", () => {
    expect(getBodyTypeDescription("slender")).toBe(SOPPUGATA_DESCRIPTION);
  });

  it("getBodyTypeDescription returns ankogata for heavy", () => {
    expect(getBodyTypeDescription("heavy")).toBe(ANKOGATA_DESCRIPTION);
  });
});
