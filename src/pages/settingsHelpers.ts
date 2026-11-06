/**
 * settingsHelpers.ts
 *
 * Utility functions for settings management.
 * Extracted from SettingsPage.tsx to comply with react-refresh rules.
 */

const AUTOSAVE_ENABLED_KEY = "basho_autosave_enabled";

/**
 * Get autosave enabled status from localStorage.
 * @returns boolean indicating if autosave is enabled (defaults to true)
 */
export function getAutosaveEnabled(): boolean {
  try {
    const val = localStorage.getItem(AUTOSAVE_ENABLED_KEY);
    return val !== "false"; // default true
  } catch {
    return true;
  }
}

/**
 * Set autosave enabled status in localStorage.
 * @param enabled - Whether autosave should be enabled
 */
export function setAutosaveEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOSAVE_ENABLED_KEY, String(enabled));
  } catch {
    /* silent */
  }
}

const LOCALE_KEY = "basho_locale";

/**
 * Persisted UI locale (T3.2). Defaults to English.
 * @returns the stored locale, or "en"
 */
export function getStoredLocale(): "en" | "ja" {
  try {
    return localStorage.getItem(LOCALE_KEY) === "ja" ? "ja" : "en";
  } catch {
    return "en";
  }
}

/**
 * Persist the UI locale and update the i18n runtime.
 * @param locale - locale to activate
 */
export function setStoredLocale(locale: "en" | "ja"): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* silent */
  }
}
