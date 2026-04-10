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

  // Attempt 3: Surgical fix for unquoted keys (Bun/JSC specific failure)
  // Matches {, followed by optional space, an unquoted alphanumeric key, and a colon.
  // Warning: Regex JSON repair is a fallback, not a substitute for strict API schemas.
  cleanedText = cleanedText.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');

  try {
    return JSON.parse(cleanedText) as T;
  } catch (finalError) {
    console.error("[jsonParser] Critical Parse Failure on output:", cleanedText);
    throw new Error(`Failed to parse LLM payload after sanitization. Ensure generationConfig.responseMimeType is 'application/json'. Error: ${(finalError as Error).message}`);
  }
}
