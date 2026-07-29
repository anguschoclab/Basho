import registryData from "./registry.json";
import { SeededRNG } from "../rng";
import type { NarrativeContext } from "../types/events";
import { warn } from "../utils/Logger";
import { formatCurrency as formatCurrencyEnUS } from "../utils/formatters";

export type ResolutionPath = string; // e.g., 'combat.phases.tachiai'

export interface BardResult {
  text: string;
  id: string;
  path: ResolutionPath;
}

export interface RegistryEntry {
  label: string;
  labelJa?: string;
  description?: string;
  name?: string;
  [key: string]: unknown;
}

export interface BardArchive {
  version: string;
  registry: Record<string, Record<string, RegistryEntry>>;
  domains: Record<string, unknown>;
}

type DomainMap = Record<string, unknown>;

/**
 * The Bard Engine v2.2: A Data-Driven Reactive Narrative System.
 * Ref: Phase 2 exhaustive refactor.
 */
const registry = registryData as unknown as Record<string, Record<string, RegistryEntry>>;

let domainsPromise: Promise<DomainMap> | null = null;
let domainsData: DomainMap | null = null;

let lruCache: string[] = [];
const MAX_CACHE_SIZE = 50;

async function loadDomainsInternal(): Promise<DomainMap> {
  const mod = await import("./domains.json");
  return mod.default as unknown as DomainMap;
}

function getDomains(): DomainMap | null {
  return domainsData;
}

function formatCurrency(amount: number): string {
  return formatCurrencyEnUS(amount, "en-US");
}

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

/**
 * Update the LRU cache with the newest used template.
 */
function updateCache(template: string) {
  lruCache.push(template);
  if (lruCache.length > MAX_CACHE_SIZE) {
    lruCache.shift();
  }
}

/**
 * Internal helper to traverse the JSON archive.
 */
function getOptions(path: string, intensity: number): string[] {
  const keys = path.split(".");
  let current: unknown;
  let startIndex = 0;

  // Check if path starts with the registry root key
  const isRootKey = keys[0] === "registry";

  if (isRootKey) {
    current = registry;
    startIndex = 1; // skip 'registry' prefix
  } else if (keys[0] === "domains") {
    current = getDomains();
    if (!current) return [];
    startIndex = 1; // skip 'domains' prefix
  } else {
    // Legacy support: auto-prefix with 'domains' if not explicitly provided
    current = getDomains();
    if (!current) return [];
  }

  for (let i = startIndex; i < keys.length; i++) {
    const key = keys[i];
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return [];
    }
  }

  if (Array.isArray(current)) return current as string[];
  if (typeof current === "string") return [current];

  if (current && typeof current === "object") {
    const obj = current as Record<string, unknown>;
    // If we are looking for a specific intensity variant
    const intensityKey = `intensity_${intensity}`;
    if (Array.isArray(obj[intensityKey])) return obj[intensityKey] as string[];
    if (Array.isArray(obj.common)) return obj.common as string[];

    // If we are looking at a Registry entry (e.g., registry.kimarite.yorikiri)
    // Standardized to prioritize .label, with fallbacks to .name or .description
    if (typeof obj.label === "string") return [obj.label];
    if (typeof obj.name === "string") return [obj.name];
    if (typeof obj.description === "string") return [obj.description];

    const firstArrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (firstArrayKey) return obj[firstArrayKey] as string[];
  }

  return [];
}

/**
 * Zero-Leakage Interpolation with Auto-Formatting and Domain-Specific Logic.
 */
export function interpolate(text: string, context: NarrativeContext): string {
  // Static pattern: character classes use a single '+' quantifier with no
  // nesting or overlapping alternation, and context keys are never interpolated
  // into the pattern. Therefore this regex is not susceptible to ReDoS.
  const pattern = /%([A-Z0-9_]+)%|\{\{([a-zA-Z0-9_]+)\}\}/g;
  const MAX_CONTEXT_VALUE_LENGTH = 2000;
  const MAX_INTERPOLATED_LENGTH = 10000;

  const result = text.replace(pattern, (_match, p1, p2) => {
    const key = (p1 || p2) as string;
    const value = context[key] ?? context[key.toLowerCase()];

    if (value === undefined || value === null) {
      warn(`Missing token {${key}} in context for template: "${text}"`, "BardEngine");
      return `[MISSING: ${key}]`;
    }

    // Special Domain Logic: Kimarite Multi-language ("寄り切り (Yorikiri)")
    if (key === "kimarite" && typeof value === "string") {
      const entry = BardEngine.getRegistryEntry("kimarite", value.toLowerCase());
      if (entry && entry.labelJa) {
        return `${entry.labelJa} (${entry.label})`;
      }
    }

    // Auto-Formatting Rules
    if (typeof value === "number") {
      if (
        key.includes("money") ||
        key.includes("kensho") ||
        key.includes("cost") ||
        key.includes("revenue") ||
        key.includes("profit")
      ) {
        return formatCurrency(value);
      }
      if (key.includes("rate") || key.includes("chance")) {
        return percentFormatter.format(value > 1 ? value / 100 : value);
      }
    }

    // Entity Tagging Logic: Wrap known entities in special tags for UI linking
    const lowerKey = key.toLowerCase();
    let entityType: string | undefined;
    let entityId: string | number | boolean | object | null | undefined;

    if (lowerKey === "shikona") {
      entityType = "rikishi";
      entityId = context.rikishiId || context.id;
    } else if (lowerKey === "winner") {
      entityType = "rikishi";
      entityId = context.winnerId || context.winnerRikishiId;
    } else if (lowerKey === "loser") {
      entityType = "rikishi";
      entityId = context.loserId || context.loserRikishiId;
    } else if (lowerKey === "rival") {
      entityType = "rikishi";
      entityId = context.rivalId || context.rikishiRivalId;
    } else if (lowerKey === "heya" || lowerKey === "stable") {
      entityType = "stable";
      entityId = context.heyaId || context.stableId;
    } else if (lowerKey === "oyakata") {
      entityType = "oyakata";
      entityId = context.oyakataId;
    } else if (lowerKey === "east") {
      entityType = "rikishi";
      entityId = context.eastRikishiId || context.winnerId;
    } else if (lowerKey === "west") {
      entityType = "rikishi";
      entityId = context.westRikishiId || context.loserId;
    } else if (lowerKey === "attacker") {
      entityType = "rikishi";
      entityId = context.attackerId;
    } else if (lowerKey === "defender") {
      entityType = "rikishi";
      entityId = context.defenderId;
    } else if (lowerKey === "name") {
      entityType = "rikishi";
      entityId = context.nameId;
    }

    const raw = typeof value === "string" ? value : String(value);
    const capped = raw.length > MAX_CONTEXT_VALUE_LENGTH
      ? raw.slice(0, MAX_CONTEXT_VALUE_LENGTH) + "…truncated"
      : raw;
    const stringValue = capped.replace(/[\[\]:]/g, "");

    if (entityType && entityId) {
      const safeEntityId = String(entityId).replace(/[\[\]:]/g, "");
      return `[[${entityType}:${safeEntityId}:${stringValue}]]`;
    }

    return stringValue;
  });

  if (result.length > MAX_INTERPOLATED_LENGTH) {
    warn(`BardEngine: interpolated result exceeded ${MAX_INTERPOLATED_LENGTH} chars, truncating`, "BardEngine");
    return result.slice(0, MAX_INTERPOLATED_LENGTH) + "…[truncated]";
  }

  if (result.includes("%") || result.includes("{{") || result.includes("}}")) {
    const leakMsg = `BardEngine Warning: Token leakage or unresolved brackets in result: "${result}"`;
    const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    const shouldThrow =
      typeof proc !== "undefined" && (proc.env?.NODE_ENV === "test" || proc.env?.CI);
    if (shouldThrow) {
      throw new Error(leakMsg);
    }
    warn(leakMsg, "BardEngine");
  }

  return result;
}

export const BardEngine = {
  /**
   * Pre-loads domain templates so resolve/has can work synchronously.
   * Returns a cached promise — safe to call multiple times.
   */
  loadDomains(): Promise<DomainMap> {
    if (!domainsPromise) {
      domainsPromise = loadDomainsInternal();
      domainsPromise.then((d: DomainMap) => {
        domainsData = d;
      });
    }
    return domainsPromise;
  },

  /**
   * Resolves a narrative path into a final interpolated string.
   */
  resolve(rng: SeededRNG, path: ResolutionPath, context: NarrativeContext = {}): BardResult {
    const intensityValue = context.intensity ?? 2;
    const intensity = typeof intensityValue === "number" ? intensityValue : 2;

    const options = getOptions(path, intensity);

    if (options.length === 0) {
      warn(`No options found at path "${path}" (Intensity: ${intensity})`, "BardEngine");
      return { text: "", id: "unknown", path };
    }

    // LRU Cache Anti-Repetition Logic
    let attempts = 0;
    let idx = 0;
    let template = "";

    const proc = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process;
    const isTest = typeof proc !== "undefined" && proc.env?.NODE_ENV === "test";

    do {
      idx = rng.int(0, options.length - 1);
      template = options[idx];
      attempts++;
    } while (lruCache.includes(template) && attempts < 3 && options.length > 1 && !isTest);

    if (!isTest) {
      updateCache(template);
    }

    const templateId = `${path}_i${intensity}_${idx}`;
    const interpolatedText = interpolate(template, context);

    return {
      text: interpolatedText,
      id: templateId,
      path,
    };
  },

  /**
   * Returns true if the archive has at least one option at the given path/intensity.
   * Lets callers probe for a template (e.g. a specific kimarite) and fall back
   * gracefully instead of triggering a "No options found" warning via resolve().
   */
  has(path: ResolutionPath, intensity = 2): boolean {
    return getOptions(path, intensity).length > 0;
  },

  /**
   * Retrieves a raw registry entry (metadata object) from the archive.
   * Useful for the UI/Presenters to get 'label', 'labelJa', and 'description'.
   */
  getRegistryEntry(domain: string, id: string): RegistryEntry | null {
    if (!registry || !registry[domain]) return null;
    return registry[domain][id] || null;
  },

  /**
   * Maps a float (0-1) or integer to a narrative intensity level (1-3).
   */
  calculateIntensity(value: number, range: [number, number] = [0, 1]): number {
    const [min, max] = range;
    const normalized = (value - min) / (max - min);
    if (normalized < 0.33) return 1;
    if (normalized < 0.66) return 2;
    return 3;
  },

  /**
   * Reset the LRU cache. Used in test cleanup to prevent state pollution.
   */
  resetCache(): void {
    lruCache = [];
  },
};
