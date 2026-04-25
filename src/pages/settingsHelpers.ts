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
