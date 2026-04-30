import JSON5 from "json5";
import { destr } from "destr";

/**
 * Safely parses JSON from LLM outputs, repairing common malformations.
 * Enforces pure logic separation: takes a raw string, returns a generic type, or throws.
 */
export function parseLLMResponse<T>(rawText: string): T {
  // Attempt 1: Happy path (strict JSON)
  try {
    return JSON.parse(rawText) as T;
  } catch (initialError) {
    console.warn("[jsonParser] Initial parse failed, attempting sanitization...");
  }

  let cleanedText = rawText.trim();

  // Attempt 2: Strip Markdown JSON blocks (e.g., ```json ... ```)
  // Using `{3}` instead of literal backticks to avoid breaking markdown parsers
  const codeBlockRegex = /`{3}(?:json)?\n([\s\S]*?)\n`{3}/i;
  const match = cleanedText.match(codeBlockRegex);
  if (match) {
    cleanedText = match[1].trim();
  }

  // Attempt 3: Use JSON5 to handle unquoted keys, trailing commas, comments, etc.
  try {
    return JSON5.parse(cleanedText) as T;
  } catch (finalError) {
    console.error("[jsonParser] Critical Parse Failure on output:", cleanedText);
    throw new Error(
      `Failed to parse LLM payload after sanitization. Ensure generationConfig.responseMimeType is 'application/json'. Error: ${(finalError as Error).message}`
    );
  }
}

export function safeParse<T extends object>(jsonString: string, fallback: T): T {
  try {
    const result = destr(jsonString);
    if (result !== null && typeof result === "object") {
      return result as T;
    }
    return fallback;
  } catch (e) {
    return fallback;
  }
}
