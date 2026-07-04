import { destr } from "destr";
import { warn, error } from "./Logger";

const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Recursively removes __proto__, constructor, and prototype keys from an object
 * or array to prevent prototype pollution attacks. Returns a new object/array
 * rather than mutating the input.
 */
function stripDangerousKeys<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => stripDangerousKeys(item)) as unknown as T;
  }

  const obj = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    result[key] = stripDangerousKeys(obj[key]);
  }
  return result as unknown as T;
}

/**
 * Safely parses JSON from LLM outputs, repairing common malformations.
 * Enforces pure logic separation: takes a raw string, returns a generic type, or throws.
 */
export function parseLLMResponse<T>(rawText: string): T {
  // Attempt 1: Happy path (strict JSON via destr)
  try {
    const result = destr(rawText);
    if (result !== null && typeof result === "object") {
      return stripDangerousKeys(result) as T;
    }
    // If it's not an object (e.g. primitive), we fall back so we can catch it
    if (typeof result === "string" && result === rawText) {
      throw new Error("Failed initial strict destr parse");
    }
    return result as T;
  } catch (_initialError) {
    warn("Initial parse failed, attempting sanitization...", "jsonParser");
  }

  let cleanedText = rawText.trim();

  // Attempt 2: Strip Markdown JSON blocks (e.g., ```json ... ```)
  // Using `{3}` instead of literal backticks to avoid breaking markdown parsers
  const codeBlockRegex = /`{3}(?:json)?\n([\s\S]*?)\n`{3}/i;
  const match = cleanedText.match(codeBlockRegex);
  if (match) {
    cleanedText = match[1].trim();
  }

  // Attempt 3: Use destr again for the cleaned text (safe against prototype pollution)
  try {
    const result = destr(cleanedText);
    if (result !== null && typeof result === "object") {
      return stripDangerousKeys(result) as T;
    }
    if (typeof result === "string" && result === cleanedText) {
      throw new Error("destr returned input unchanged — not valid JSON");
    }
    return result as T;
  } catch (finalError) {
    error("Critical Parse Failure on output", "jsonParser", cleanedText);
    throw new Error(
      `Failed to parse LLM payload after sanitization. Ensure generationConfig.responseMimeType is 'application/json'. Error: ${(finalError as Error).message}`
    );
  }
}

export function safeParse<T extends object>(jsonString: string, fallback: T): T {
  try {
    const result = destr(jsonString);
    if (result !== null && typeof result === "object") {
      return stripDangerousKeys(result) as T;
    }
    return fallback;
  } catch (_e) {
    return fallback;
  }
}
