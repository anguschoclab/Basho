import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * GeminiClient: Interfaces with Google's Generative AI to provide 
 * autonomous content expansion and variation for the Bard Engine.
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // Upgraded to Gemini 3 for superior instruction following
      generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2048,
      }
    });
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
      ${existingTemplates.map(t => `- ${t}`).join('\n')}
      
      RETURN: A JSON array of strings only.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON array
      const jsonMatch = text.match(/\[.*\]/s);
      if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      console.error("GeminiClient Error:", error);
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
      ${missingPaths.join(', ')}
      
      REQUIREMENTS:
      - TONE: Professional NHK English Broadcast.
      - TOKENS: Use %WINNER% and %LOSER%.
      - Accuracy: Ensure the description matches the Japanese kimarite name.
      
      RETURN: A JSON object where keys are the paths and values are arrays of strings.
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json|```/g, '').trim();
      const jsonMatch = cleanText.match(/\{.*?\}/s);
      
      if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`GeminiClient: Successfully parsed ${Object.keys(parsed).length} suggestions.`);
          return parsed;
      }
      console.warn("GeminiClient: No JSON found in response text:", text);
      return {};
    } catch (error) {
      console.error("GeminiClient Audit Error:", error);
      return {};
    }
  }
}
