import archData from './archive.json';
import { SeededRNG } from '../rng';
import type { NarrativeContext } from '../types/events';
import { KIMARITE_REGISTRY } from '../kimarite';

export type ResolutionPath = string; // e.g., 'combat.phases.tachiai'

export interface BardResult {
  text: string;
  id: string; 
  path: ResolutionPath;
}

/**
 * The Bard Engine v2.2: A Data-Driven Reactive Narrative System.
 * Ref: Phase 2 exhaustive refactor.
 */
export class BardEngine {
  private static archive = archData;
  private static lruCache: string[] = [];
  private static MAX_CACHE_SIZE = 50;

  private static currencyFormatter = new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0
  });

  private static percentFormatter = new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  });

  /**
   * Resolves a narrative path into a final interpolated string.
   */
  public static resolve(
    rng: SeededRNG,
    path: ResolutionPath,
    context: NarrativeContext = {}
  ): BardResult {
    const intensityValue = context.intensity ?? 2;
    const intensity = typeof intensityValue === 'number' ? intensityValue : 2; 
    
    let options = this.getOptions(path, intensity);
    
    if (options.length === 0) {
      console.warn(`BardEngine: No options found at path "${path}" (Intensity: ${intensity})`);
      return { text: `[System Log]: No narrative templates found at ${path}`, id: 'unknown', path };
    }

    // LRU Cache Anti-Repetition Logic
    let attempts = 0;
    let idx = 0;
    let template = "";
    
    do {
      idx = rng.int(0, options.length - 1);
      template = options[idx];
      attempts++;
    } while (this.lruCache.includes(template) && attempts < 3 && options.length > 1);

    this.updateCache(template);

    const templateId = `${path}_i${intensity}_${idx}`;
    const interpolatedText = this.interpolate(template, context);

    return {
      text: interpolatedText,
      id: templateId,
      path
    };
  }

  /**
   * Internal helper to traverse the JSON archive.
   */
  private static getOptions(path: string, intensity: number): string[] {
    const keys = path.split('.');
    let current: any = (this.archive as any).domains;

    for (const key of keys) {
      if (current[key] === undefined) return [];
      current = current[key];
    }

    if (Array.isArray(current)) return current;
    if (typeof current === 'string') return [current];

    if (typeof current === 'object' && current !== null) {
      const intensityKey = `intensity_${intensity}`;
      if (Array.isArray(current[intensityKey])) return current[intensityKey];
      if (Array.isArray(current.common)) return current.common;
      
      const firstArrayKey = Object.keys(current).find(k => Array.isArray(current[k]));
      if (firstArrayKey) return current[firstArrayKey];
    }

    return [];
  }

  /**
   * Zero-Leakage Interpolation with Auto-Formatting and Domain-Specific Logic.
   */
  private static interpolate(text: string, context: NarrativeContext): string {
    const pattern = /%([A-Z0-9_]+)%|\{\{([a-zA-Z0-9_]+)\}\}/g;
    
    const result = text.replace(pattern, (match, p1, p2) => {
      const key = (p1 || p2);
      const value = context[key] ?? context[key.toLowerCase()];

      if (value === undefined || value === null) {
        const errorMsg = `BardEngine Error: Missing token {${key}} in context for template: "${text}"`;
        if (process.env.NODE_ENV === 'test' || process.env.CI) {
          throw new Error(errorMsg);
        }
        console.error(errorMsg);
        return `[MISSING: ${key}]`;
      }

      // Special Domain Logic: Kimarite Multi-language ("寄り切り (Yorikiri)")
      if (key === 'kimarite' && typeof value === 'string') {
        const entry = KIMARITE_REGISTRY.find(k => k.id === value.toLowerCase() || k.name.toLowerCase() === value.toLowerCase());
        if (entry && entry.nameJa) {
          return `${entry.nameJa} (${entry.name})`;
        }
      }

      // Auto-Formatting Rules
      if (typeof value === 'number') {
        if (key.includes('money') || key.includes('kensho') || key.includes('cost') || key.includes('revenue') || key.includes('profit')) {
          return this.currencyFormatter.format(value);
        }
        if (key.includes('rate') || key.includes('chance')) {
          return this.percentFormatter.format(value > 1 ? value / 100 : value);
        }
      }

      return value.toString();
    });

    if (result.includes('%') || result.includes('{{') || result.includes('}}')) {
       const leakMsg = `BardEngine Warning: Token leakage or unresolved brackets in result: "${result}"`;
       if (process.env.NODE_ENV === 'test' || process.env.CI) {
         throw new Error(leakMsg);
       }
       console.warn(leakMsg);
    }

    return result;
  }
  /**
   * Update the LRU cache with the newest used template.
   */
  private static updateCache(template: string) {
    this.lruCache.push(template);
    if (this.lruCache.length > this.MAX_CACHE_SIZE) {
      this.lruCache.shift();
    }
  }

  /**
   * Maps a float (0-1) or integer to a narrative intensity level (1-3).
   */
  public static calculateIntensity(value: number, range: [number, number] = [0, 1]): number {
    const [min, max] = range;
    const normalized = (value - min) / (max - min);
    if (normalized < 0.33) return 1;
    if (normalized < 0.66) return 2;
    return 3;
  }
}
