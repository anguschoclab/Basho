/**
 * i18n.ts — localization seam (T3.2).
 *
 * Single-source lookup for UI strings with real locale packs.
 * `t(key, params, fallback)` resolves against the active locale table,
 * falling back to English, then `fallback`, then the key itself.
 * `{param}` placeholders interpolate from `params`.
 *
 * Locales: "en" (English) and "ja" (romanized Japanese — rōmaji glosses
 * so chrome stays legible without a CJK font requirement).
 */

export type Locale = "en" | "ja";

/** English source-of-truth table. New keys land here first. */
const EN: Record<string, string> = {
  // Navigation / chrome
  "nav.dashboard": "Dashboard",
  "nav.stable": "My Stable",
  "nav.basho": "Basho",
  "nav.banzuke": "Banzuke",
  "nav.economy": "Finances",
  "nav.roster": "Roster",
  "nav.almanac": "Almanac",
  "nav.settings": "Settings",
  // Common actions
  "action.save": "Save",
  "action.load": "Load",
  "action.delete": "Delete",
  "action.cancel": "Cancel",
  "action.confirm": "Confirm",
  "action.continue": "Continue",
  "action.close": "Close",
  "action.export": "Export",
  "action.import": "Import",
  // Game modes
  "mode.career": "Career Mode",
  "mode.ironman": "Ironman Mode",
  "mode.sandbox": "Sandbox Mode",
  // Settings — language card
  "settings.language": "Language",
  "settings.language.description": "Interface language for navigation and actions",
  "settings.language.en": "English",
  "settings.language.ja": "Japanese (rōmaji)",
  // Game over
  "gameover.title": "Career Over — {name}",
  "gameover.review": "Review Final State",
  "gameover.newCareer": "Start New Career",
  // Glossary page
  "glossary.title": "Sumo Glossary",
};

/** Romanized-Japanese pack — rōmaji glosses of the English strings. */
const JA: Record<string, string> = {
  "nav.dashboard": "Menyū",
  "nav.stable": "Heya",
  "nav.basho": "Honbasho",
  "nav.banzuke": "Banzuke",
  "nav.economy": "Zaimu",
  "nav.roster": "Rikishi Ichiran",
  "nav.almanac": "Kiroku-chō",
  "nav.settings": "Settei",
  "action.save": "Hozon",
  "action.load": "Yomikomi",
  "action.delete": "Sakujo",
  "action.cancel": "Torikeshi",
  "action.confirm": "Kakunin",
  "action.continue": "Tsuzukeru",
  "action.close": "Tojiru",
  "action.export": "Kakidashi",
  "action.import": "Torikomi",
  "mode.career": "Kyaria Mōdo",
  "mode.ironman": "Aianman Mōdo",
  "mode.sandbox": "Sando Mōdo",
  "settings.language": "Gengo",
  "settings.language.description": "Menyū to botan no hyōji gengo",
  "settings.language.en": "Eigo",
  "settings.language.ja": "Nihongo (rōmaji)",
  "gameover.title": "Intai — {name}",
  "gameover.review": "Saishū Jōtai o Miru",
  "gameover.newCareer": "Atarashii Kyaria",
  "glossary.title": "Sumō Yōgo-shū",
};

/** Registered translation tables, keyed by locale → string key. */
const TABLES: Record<Locale, Record<string, string>> = {
  en: EN,
  ja: JA,
};

let currentLocale: Locale = "en";

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export const SUPPORTED_LOCALES: Locale[] = ["en", "ja"];

/**
 * Translate `key`; falls back to English, then `fallback`, then the key.
 * `{param}` placeholders interpolate from `params`.
 */
export function t(key: string, params?: Record<string, string | number>, fallback?: string): string {
  let out = TABLES[currentLocale][key] ?? TABLES.en[key] ?? fallback ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}
