import { describe, it, expect } from "vitest";
import { BASHO_NAMES, PHASE_LABELS } from "@/constants/ui/calendar";
import { FINANCES_RUNWAY_CONFIG } from "@/constants/ui/finances";
import {
  INTENSITY_OPTIONS,
  FOCUS_OPTIONS,
  RECOVERY_OPTIONS,
  INTENSITY_ICONS,
  FOCUS_LABELS,
  RECOVERY_LABELS,
  CAP_TO_INTENSITY,
} from "@/constants/ui/trainingWidget";
import {
  COMPLIANCE_DISPLAY,
  WELFARE_RISK_DISPLAY,
  MORALE_DISPLAY,
  DIET_DISPLAY,
  ROSTER_DISPLAY,
} from "@/constants/ui/welfare";
import { RANK_TIERS } from "@/constants/ui/promotion";

describe("constants extraction — calendar.ts", () => {
  it("BASHO_NAMES maps all 6 basho keys to month names", () => {
    expect(BASHO_NAMES.hatsu).toBe("January");
    expect(BASHO_NAMES.haru).toBe("March");
    expect(BASHO_NAMES.natsu).toBe("May");
    expect(BASHO_NAMES.nagoya).toBe("July");
    expect(BASHO_NAMES.aki).toBe("September");
    expect(BASHO_NAMES.kyushu).toBe("November");
  });

  it("PHASE_LABELS has 5 phases with label and dotClass", () => {
    expect(PHASE_LABELS.interim.label).toBe("Off-Season");
    expect(PHASE_LABELS.pre_basho.label).toBe("Pre-Basho");
    expect(PHASE_LABELS.active_basho.label).toBe("Tournament");
    expect(PHASE_LABELS.post_basho.label).toBe("Post-Basho");
    expect(PHASE_LABELS.basho_recap.label).toBe("Recap");
    expect(PHASE_LABELS.interim.dotClass).toBeDefined();
  });
});

describe("constants extraction — finances.ts", () => {
  it("FINANCES_RUNWAY_CONFIG has 5 bands with label, color, icon, bgAccent", () => {
    const keys = ["secure", "comfortable", "tight", "critical", "desperate"];
    for (const key of keys) {
      const entry = FINANCES_RUNWAY_CONFIG[key];
      expect(entry).toBeDefined();
      expect(typeof entry.label).toBe("string");
      expect(entry.color).toBeDefined();
      expect(entry.icon).toBeDefined();
      expect(entry.bgAccent).toBeDefined();
    }
  });
});

describe("constants extraction — trainingWidget.ts", () => {
  it("INTENSITY_OPTIONS has 4 values in correct order", () => {
    expect(INTENSITY_OPTIONS).toEqual(["conservative", "balanced", "intensive", "punishing"]);
  });

  it("FOCUS_OPTIONS has 5 values", () => {
    expect(FOCUS_OPTIONS).toEqual(["neutral", "power", "speed", "technique", "balance"]);
  });

  it("RECOVERY_OPTIONS has 3 values", () => {
    expect(RECOVERY_OPTIONS).toEqual(["low", "normal", "high"]);
  });

  it("INTENSITY_ICONS maps each intensity to an emoji", () => {
    expect(INTENSITY_ICONS.conservative).toBe("🛡️");
    expect(INTENSITY_ICONS.balanced).toBe("⚖️");
    expect(INTENSITY_ICONS.intensive).toBe("🔥");
    expect(INTENSITY_ICONS.punishing).toBe("💀");
  });

  it("FOCUS_LABELS maps each focus to a display label", () => {
    expect(FOCUS_LABELS.neutral).toBe("Neutral");
    expect(FOCUS_LABELS.power).toBe("Power");
    expect(FOCUS_LABELS.speed).toBe("Speed");
    expect(FOCUS_LABELS.technique).toBe("Technique");
    expect(FOCUS_LABELS.balance).toBe("Balance");
  });

  it("RECOVERY_LABELS maps each recovery to a display label", () => {
    expect(RECOVERY_LABELS.low).toBe("Low");
    expect(RECOVERY_LABELS.normal).toBe("Normal");
    expect(RECOVERY_LABELS.high).toBe("High");
  });

  it("CAP_TO_INTENSITY maps sanction caps to intensity levels", () => {
    expect(CAP_TO_INTENSITY.low).toBe("conservative");
    expect(CAP_TO_INTENSITY.medium).toBe("balanced");
    expect(CAP_TO_INTENSITY.high).toBe("intensive");
  });
});

describe("constants extraction — welfare.ts", () => {
  it("COMPLIANCE_DISPLAY has 4 states with label, color, description, icon", () => {
    const keys = ["compliant", "watch", "investigation", "sanctioned"];
    for (const key of keys) {
      const entry = COMPLIANCE_DISPLAY[key];
      expect(entry).toBeDefined();
      expect(entry.label).toBeDefined();
      expect(entry.color).toBeDefined();
      expect(entry.description).toBeDefined();
      expect(entry.icon).toBeDefined();
    }
  });

  it("WELFARE_RISK_DISPLAY has 4 bands", () => {
    expect(WELFARE_RISK_DISPLAY.safe.label).toBe("Safe");
    expect(WELFARE_RISK_DISPLAY.cautious.label).toBe("Cautious");
    expect(WELFARE_RISK_DISPLAY.elevated.label).toBe("Elevated");
    expect(WELFARE_RISK_DISPLAY.critical.label).toBe("Critical");
  });

  it("MORALE_DISPLAY has 5 bands", () => {
    expect(MORALE_DISPLAY.inspired.label).toBe("Inspired");
    expect(MORALE_DISPLAY.content.label).toBe("Content");
    expect(MORALE_DISPLAY.neutral.label).toBe("Neutral");
    expect(MORALE_DISPLAY.disgruntled.label).toBe("Disgruntled");
    expect(MORALE_DISPLAY.mutinous.label).toBe("Mutinous");
  });

  it("DIET_DISPLAY has 4 regimens with label, cost, desc", () => {
    const keys = ["austerity", "maintenance", "heavy_bulk", "premium"];
    for (const key of keys) {
      const entry = DIET_DISPLAY[key as keyof typeof DIET_DISPLAY];
      expect(entry).toBeDefined();
      expect(entry.label).toBeDefined();
      expect(entry.cost).toBeDefined();
      expect(entry.desc).toBeDefined();
    }
  });

  it("ROSTER_DISPLAY has 5 bands", () => {
    expect(ROSTER_DISPLAY.dominant.label).toBe("Dominant");
    expect(ROSTER_DISPLAY.strong.label).toBe("Strong");
    expect(ROSTER_DISPLAY.competitive.label).toBe("Competitive");
    expect(ROSTER_DISPLAY.developing.label).toBe("Developing");
    expect(ROSTER_DISPLAY.weak.label).toBe("Weak");
  });
});

describe("constants extraction — promotion.ts", () => {
  it("RANK_TIERS has 7 tiers with key, label, color", () => {
    expect(RANK_TIERS).toHaveLength(7);
    for (const tier of RANK_TIERS) {
      expect(tier.key).toBeDefined();
      expect(tier.label).toBeDefined();
      expect(tier.color).toBeDefined();
    }
  });

  it("RANK_TIERS includes yokozuna through makushita", () => {
    const keys = RANK_TIERS.map((t) => t.key);
    expect(keys).toContain("yokozuna");
    expect(keys).toContain("ozeki");
    expect(keys).toContain("sekiwake");
    expect(keys).toContain("komusubi");
    expect(keys).toContain("maegashira");
    expect(keys).toContain("juryo");
    expect(keys).toContain("makushita");
  });
});
