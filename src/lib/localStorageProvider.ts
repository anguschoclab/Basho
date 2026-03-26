/**
 * Local Storage Provider
 * 
 * Manages persistence of UI state (dashboard layouts, widget visibility, etc.)
 */

export const STORAGE_KEYS = {
  DASHBOARD_LAYOUT: "basho_dashboard_layout",
  WIDGET_CONFIG: "basho_widget_config",
  UI_PREFERENCES: "basho_ui_prefs",
};

export const localStorageProvider = {
  save: (key: string, data: any) => {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (e) {
      console.error("Failed to save to localStorage", e);
    }
  },

  load: <T>(key: string, defaultValue: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item) as T;
    } catch (e) {
      console.warn(`Failed to load ${key} from localStorage, using default.`, e);
      return defaultValue;
    }
  },

  remove: (key: string) => {
    localStorage.removeItem(key);
  },

  clear: () => {
    localStorage.clear();
  }
};
