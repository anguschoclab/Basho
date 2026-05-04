import { GoogleGenerativeAI } from "@google/generative-ai";
import { parseLLMResponse } from "../utils/jsonParser";

/**
 * GeminiClient: Interfaces with Google's Generative AI to provide
 * autonomous content expansion and variation for the Bard Engine.
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private primaryModel: string;
  private fallbackModel: string;

  constructor(apiKey: string, options: { primary?: string; fallback?: string } = {}) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.primaryModel = options.primary || "gemini-3-flash-preview";
    this.fallbackModel = options.fallback || "gemini-2.5-flash";
  }

  /**
   * Internal helper to execute a generation with 3x retry on primary, then 3x on fallback.
   */
  private async runWithFallback(
    prompt: string,
    responseMimeType: "application/json" | "text/plain" = "application/json"
  ): Promise<string> {
    const models = [this.primaryModel, this.fallbackModel];

    for (const modelId of models) {
      console.log(`  [GeminiClient] Attempting model: ${modelId}`);
      for (let i = 1; i <= 3; i++) {
        try {
          const model = this.genAI.getGenerativeModel({
            model: modelId,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 2048,
              responseMimeType: responseMimeType as any,
            },
          });

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          if (!text) throw new Error("Empty response from Gemini.");
          return text;
        } catch (err: any) {
          console.warn(`    [GeminiClient] ${modelId} Attempt ${i}/3 FAILED: ${err.message}`);
          if (i === 3) {
            if (modelId === this.fallbackModel) throw err;
            console.warn(`  [GeminiClient] Primary exhausted. Switching to fallback...`);
          } else {
            await new Promise((r) => setTimeout(r, 1000 * i));
          }
        }
      }
    }
    throw new Error("All models and retries exhausted.");
  }

  /**
   * Generates NHK-style narrative variations for a given context and path.
   */
  async generateVariations(
    path: string,
    existingTemplates: string[],
    count: number = 3
  ): Promise<string[]> {
    const prompt = `
      You are an NHK World Sumo Commentator. 
      Your tone is professional, technical, respectful, and slightly understated but capable of excitement.
      
      TASK: Generate ${count} new narrative templates for the following path in a Sumo Simulation engine:
      Path: ${path}
      
      CONTEXT:
      - Use tokens like %ATTACKER%, %DEFENDER%, %WINNER%, %LOSER%, %KIMARITE% where appropriate (wrapped in percent signs).
      - Maintain the "NHK Broadcast" style (e.g., "A technical battle on the belt," instead of "BOOM! SLAM!").
      - Ensure variety.
      
      EXISTING TEMPLATES (Do not duplicate):
      ${existingTemplates.map((t) => `- ${t}`).join("\n")}
      
      RETURN: A JSON array of strings only.
    `;

    try {
      const text = await this.runWithFallback(prompt, "application/json");
      const jsonMatch = text.match(/\[.*\]/s);

      // Fallback to full text if match fails, letting parseLLMResponse handle the cleanup
      const rawJson = jsonMatch ? jsonMatch[0] : text;

      return parseLLMResponse<string[]>(rawJson);
    } catch (error) {
      console.error("GeminiClient generateVariations Error:", error);
      return [];
    }
  }

  /**
   * Audits the archive for missing techniques and suggests additions.
   */
  async suggestedFill(missingPaths: string[]): Promise<Record<string, string[]>> {
    const prompt = `
      You are an expert in Sumo (Osumo) and a professional commentator.
      
      TASK: Provide at least 2 NHK-style narrative templates for each of the following missing techniques:
      ${missingPaths.join(", ")}
      
      REQUIREMENTS:
      - TONE: Professional NHK English Broadcast.
      - TOKENS: Use %WINNER% and %LOSER%.
      - Accuracy: Ensure the description matches the Japanese kimarite name.
      
      RETURN: A JSON object where keys are the paths and values are arrays of strings.
    `;

    try {
      const text = await this.runWithFallback(prompt, "application/json");

      // Extract the outermost JSON object using a greedy match to ensure nested objects are captured properly.
      const jsonMatch = text.match(/\{.*\}/s);
      const rawJson = jsonMatch ? jsonMatch[0] : text;

      const parsed = parseLLMResponse<Record<string, string[]>>(rawJson);
      console.log(`GeminiClient: Successfully parsed ${Object.keys(parsed).length} suggestions.`);
      return parsed;
    } catch (error) {
      console.error("GeminiClient Audit Error:", error);
      return {};
    }
  }
}
