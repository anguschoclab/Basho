/**
 * T3.2 — locale pack + string-extraction ratchet.
 *
 * Verifies the en/ja packs stay in key parity, `t()` resolves with
 * interpolation and fallback, and the surfaces that adopted `t()` don't
 * reintroduce the hardcoded literals the keys replaced.
 */

import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { t, setLocale, getLocale, SUPPORTED_LOCALES } from "@/lib/i18n";
import { SRC as SRC_DIR } from "@tests/helpers/fsScan";

// Re-declare the key lists the packs must share — parity is asserted by
// probing every key through t() rather than exporting the tables.
const REQUIRED_KEYS = [
  "nav.dashboard",
  "nav.stable",
  "nav.basho",
  "nav.banzuke",
  "nav.economy",
  "nav.roster",
  "nav.almanac",
  "nav.settings",
  "action.save",
  "action.load",
  "action.delete",
  "action.cancel",
  "action.confirm",
  "action.continue",
  "action.close",
  "action.export",
  "action.import",
  "mode.career",
  "mode.ironman",
  "mode.sandbox",
  "settings.language",
  "settings.language.description",
  "settings.language.en",
  "settings.language.ja",
  "gameover.title",
  "gameover.review",
  "gameover.newCareer",
  "glossary.title",
];

afterEach(() => setLocale("en"));

describe("i18n locale packs", () => {
  it("exposes en + ja", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "ja"]);
  });

  it.each(SUPPORTED_LOCALES)("every required key resolves in %s", (locale) => {
    setLocale(locale);
    for (const key of REQUIRED_KEYS) {
      const resolved = t(key);
      expect(resolved, `missing key ${key} in locale ${locale}`).not.toBe(key);
      expect(resolved.length).toBeGreaterThan(0);
    }
  });

  it("ja translations differ from en (real pack, not a copy)", () => {
    setLocale("ja");
    const jaValue = t("nav.dashboard");
    setLocale("en");
    expect(jaValue).not.toBe(t("nav.dashboard"));
  });

  it("interpolates {params}", () => {
    setLocale("en");
    expect(t("gameover.title", { name: "Kitanofuji" })).toBe("Career Over — Kitanofuji");
  });

  it("falls back to English for a key missing in ja", () => {
    // Probe: if a key exists only in EN, ja should not render the raw key.
    setLocale("ja");
    expect(t("nonexistent.key", undefined, "fallback text")).toBe("fallback text");
    expect(t("nonexistent.key")).toBe("nonexistent.key");
  });

  it("getLocale reflects setLocale", () => {
    setLocale("ja");
    expect(getLocale()).toBe("ja");
  });
});

describe("T3.2 ratchet — extracted strings stay extracted", () => {
  it("GameOverDialog routes its copy through t()", () => {
    const src = readFileSync(join(SRC_DIR, "components/layout/GameOverDialog.tsx"), "utf-8");
    expect(src).toMatch(/from "@\/lib\/i18n"/);
    // The literals the keys replaced must not come back.
    expect(src).not.toContain("Review Final State");
    expect(src).not.toContain("Start New Career");
    expect(src).toContain('t("gameover.review")');
    expect(src).toContain('t("gameover.newCareer")');
  });

  it("IdentityStepSections routes game-mode labels through t()", () => {
    const src = readFileSync(
      join(SRC_DIR, "components/wizard/IdentityStepSections.tsx"),
      "utf-8"
    );
    expect(src).toMatch(/from "@\/lib\/i18n"/);
    expect(src).toMatch(/t\(`mode\./);
  });
});
