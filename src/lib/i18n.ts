/**
 * i18n.ts — localization scaffold (T3.2).
 *
 * Single-source lookup for UI strings. Today it returns the English
 * default; the contract (`t(key, params)`) is the seam where real
 * locale packs plug in later (en.json → ja.json etc.) without touching
 * call sites. Start extracting strings here as components adopt it.
 */

export type Locale = "en";

let currentLocale: Locale = "en";

/** Registered translation tables, keyed by locale → string key. */
const TABLES: Record<Locale, Record<string, string>> = {
  en: {},
};

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

/**
 * Translate `key`; falls back to `fallback` (or the key itself).
 * `{param}` placeholders interpolate from `params`.
 */
export function t(key: string, params?: Record<string, string | number>, fallback?: string): string {
  let out = TABLES[currentLocale][key] ?? fallback ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}
