import archData from './archive.json';
import { SeededRNG } from '../rng';

export type ResolutionPath = string; // e.g., 'combat.phases.tachiai'

export interface NarrativeContext {
  [key: string]: any;
  intensity?: number; // 1, 2, or 3
}

export interface BardResult {
  text: string;
  id: string; 
  path: ResolutionPath;
}

/**
 * The Bard Engine: A Data-Driven Reactive Narrative System.
 */
export class BardEngine {
  private static archive = archData;

  /**
   * Resolves a narrative path into a final interpolated string.
   */
  public static resolve(
    rng: SeededRNG,
    path: ResolutionPath,
    context: NarrativeContext = {}
  ): BardResult {
    const intensity = context.intensity ?? 2;
    const options = this.getOptions(path, intensity);
    
    if (options.length === 0) {
      console.warn(`BardEngine: No options found at path "${path}" (Intensity: ${intensity})`);
      return { text: `[MISSING_NARRATIVE: ${path}]`, id: 'unknown', path };
    }

    const idx = rng.int(0, options.length - 1);
    const rawTemplate = options[idx];
    const templateId = `${path}_i${intensity}_${idx}`;

    const interpolatedText = this.interpolate(rawTemplate, context);

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
    let current: any = this.archive.domains;

    for (const key of keys) {
      if (current[key] === undefined) return [];
      current = current[key];
    }

    // If it's an array, return it directly
    if (Array.isArray(current)) return current;

    // If it's a string, wrap it in an array
    if (typeof current === 'string') return [current];

    // If it's an object, look for intensity blocks or 'common'
    if (typeof current === 'object' && current !== null) {
      const intensityKey = `intensity_${intensity}`;
      if (Array.isArray(current[intensityKey])) return current[intensityKey];
      if (Array.isArray(current.common)) return current.common;
      
      // Fallback: search for any array
      const firstArrayKey = Object.keys(current).find(k => Array.isArray(current[k]));
      if (firstArrayKey) return current[firstArrayKey];
    }

    return [];
  }

  /**
   * Replaces %TOKEN% placeholders with context values.
   */
  private static interpolate(text: string, context: NarrativeContext): string {
    let result = text;
    for (const [key, value] of Object.entries(context)) {
      if (value === undefined || value === null) continue;
      const displayValue = value.toString();
      
      // Support %TOKEN%, %token%, and {{token}}
      const patterns = [
        new RegExp(`%${key.toUpperCase()}%`, 'g'),
        new RegExp(`%${key.toLowerCase()}%`, 'g'),
        new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      ];

      for (const pattern of patterns) {
        result = result.replace(pattern, displayValue);
      }
    }
    return result;
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
