import * as fs from "fs";
import * as path from "path";

/**
 * Bard Engine v2.2: Autonomous Content Generator (NHK Persona)
 * ==========================================================
 * Weaponized standalone script to populate exhaustive narrative archives.
 * 
 * Execution: bun run scripts/generate-narrative.ts
 */

const DOMAINS = [
  { 
    name: "basho", 
    targets: ["bout_title", "bout_summary", "status_title", "status_summary"],
    tones: { common: "analytical", intensity_3: "aggressive" }
  },
  { 
    name: "recruiting", 
    targets: ["title", "scouting_reports", "signing_narratives"],
    tones: { common: "analytical" }
  },
  { 
    name: "economy", 
    targets: ["title", "summary", "market_shifts", "loan_title", "loan_summary"],
    tones: { common: "analytical" }
  },
  { 
    name: "medical", 
    targets: ["title", "summary"],
    tones: { common: "analytical", intensity_3: "poetic" }
  },
  { 
    name: "governance", 
    targets: ["title", "summary"],
    tones: { common: "analytical", intensity_3: "aggressive" }
  },
  { 
    name: "rivalry", 
    targets: ["title", "press_rumors", "escalated_title", "escalated_summary"],
    tones: { common: "aggressive", intensity_3: "aggressive" }
  },
  { 
    name: "lifecycle", 
    targets: ["title", "summary", "naturalization_title", "naturalization_summary", "merger_title", "merger_summary"],
    tones: { common: "poetic" }
  },
  { 
    name: "welfare", 
    targets: ["title", "summary"],
    tones: { common: "analytical" }
  },
  { 
    name: "awards", 
    targets: ["title", "summary"],
    tones: { common: "poetic" }
  },
  { 
    name: "training", 
    targets: ["title", "summary"],
    tones: { common: "analytical" }
  },
  {
    name: "management",
    targets: ["decision_title", "decision_summary", "yearly_strategy_title", "yearly_strategy_summary", "roster_overflow_title", "roster_overflow_summary"],
    tones: { common: "analytical" }
  },
  {
    name: "facility",
    targets: ["upgraded_title", "upgraded_summary", "degraded_title", "degraded_summary"],
    tones: { common: "analytical" }
  },
  {
    name: "narrative",
    targets: ["mood_shift_title", "mood_shift_summary", "strategy_shift_title", "strategy_shift_summary", "prestige_title", "prestige_summary"],
    tones: { common: "analytical", intensity_3: "aggressive" }
  }
];

const PERSONAS = ["aggressive", "analytical", "poetic", "casual"];
const INTENSITIES = ["high_stakes", "technical", "neutral"];

async function callGemini(apiKey: string, model: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const err = new Error(`Gemini API returned ${response.status}: ${errorBody}`);
    (err as any).status = response.status;
    throw err;
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error("Empty response from Gemini.");
  return JSON.parse(rawText);
}

async function try3Times(apiKey: string, model: string, prompt: string) {
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`    [Attempt ${i}/3] model: ${model}...`);
      return await callGemini(apiKey, model, prompt);
    } catch (err: any) {
      console.warn(`    [Attempt ${i}/3] FAILED: ${err.message}`);
      if (i === 3) throw err;
      await new Promise(r => setTimeout(r, 1000 * i)); // Exponential backoff
    }
  }
}

async function callWithFallback(apiKey: string, primary: string, fallback: string, prompt: string) {
  try {
    console.log(`  --> Primary Model: ${primary}`);
    return await try3Times(apiKey, primary, prompt);
  } catch (err: any) {
    console.warn(`  !!! Primary cluster exhausted. Switching to fallback...`);
    console.log(`  --> Fallback Model: ${fallback}`);
    return await try3Times(apiKey, fallback, prompt);
  }
}

function mergeUnique(oldArr: string[] = [], newArr: string[] = []): string[] {
  const combined = [...oldArr, ...newArr];
  return Array.from(new Set(combined.map(s => s.trim()))).filter(s => s.length > 0);
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing.");
  const model = process.env.GEMINI_MODEL_PRIMARY || "gemini-3-flash-preview";
  const fallbackModel = process.env.GEMINI_MODEL_FALLBACK || "gemini-2.5-flash";

  console.log("--- BARD ENGINE v2.2 NHK CONTENT PIPELINE ---");

  // 1. Populate archive.json
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  let archive: any = { version: "2.2.0", domains: { events: {} } };
  
  if (fs.existsSync(archivePath)) {
    try { archive = JSON.parse(fs.readFileSync(archivePath, "utf-8")); } catch (e) {}
  }

  for (const domain of DOMAINS) {
    console.log(`\nDomain: ${domain.name.toUpperCase()}`);
    const prompt = `You are the lead narrative designer for a hardcore Sumo management simulation. 
    Your persona is the "Official NHK English Commentary" - formal, respectful, deeply knowledgeable about Sumo traditions.
    
    Generate exactly 15 diverse narrative templates for each of these targets in the '${domain.name}' domain: ${domain.targets.join(", ")}.
    Use placeholders: %SHIKONA%, %WINNER%, %LOSER%, %KIMARITE%, %MONEY%, %COST%, %RANK%, %HEYA%, %REASON%, %INCIDENT%, %STATUS%, %SEVERITY%.
    
    TONE VARIATION:
    - Use a ${domain.tones.common} tone for standard events.
    - If the event is high intensity (intensity_3), push into a more ${domain.tones.intensity_3 || domain.tones.common} style.
    
    Return ONLY a JSON object where keys are the target names:
    {
      ${domain.targets.map(t => `"${t}": { "common": ["template 1", ...], "intensity_3": ["template 1", ...] }`).join(",\n")}
    }`;

    try {
      const results = await callWithFallback(apiKey, model, fallbackModel, prompt);
      
      // Cumulative Merge
      if (!archive.domains.events[domain.name]) {
        archive.domains.events[domain.name] = {};
      }

      for (const target of domain.targets) {
        const existing = archive.domains.events[domain.name][target] || { common: [], intensity_3: [] };
        const newlyGenerated = results[target] || { common: [], intensity_3: [] };

        archive.domains.events[domain.name][target] = {
          common: mergeUnique(existing.common, newlyGenerated.common),
          intensity_3: mergeUnique(existing.intensity_3, newlyGenerated.intensity_3)
        };
      }
    } catch (err: any) {
      console.error(`CRITICAL: All attempts for domain '${domain.name}' FAILED. Gracefully skipping to next item. Archive will retain legacy data for this domain.`);
    }
  }

  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
  console.log(`\n[SUCCESS] Archive updated (Cumulative): ${archivePath}`);

  // 2. Populate pbp_voice_matrix.json
  const matrixPath = path.resolve(__dirname, "../src/engine/pbp_voice_matrix.json");
  let existingMatrix: any = {};
  if (fs.existsSync(matrixPath)) {
    try { existingMatrix = JSON.parse(fs.readFileSync(matrixPath, "utf-8")); } catch (e) {}
  }
  
  console.log("\nVoice Matrix Generation...");
  const matrixPrompt = `Generate a play-by-play commentary matrix for a Sumo game (NHK Persona).
  For each Persona (${PERSONAS.join(", ")}) and each Intensity (${INTENSITIES.join(", ")}), 
  provide 20 short commentary snippets for a match finish.
  Use tokens: %WINNER%, %LOSER%, %KIMARITE%.
  
  Return ONLY a JSON object where keys are persona names, containing intensity keys, containing arrays of strings.`;

  try {
    const matrixResults = await callWithFallback(apiKey, model, fallbackModel, matrixPrompt);
    
    // Cumulative Merge for Matrix
    for (const persona of PERSONAS) {
      if (!existingMatrix[persona]) existingMatrix[persona] = {};
      for (const intensity of INTENSITIES) {
        const oldArr = existingMatrix[persona][intensity] || [];
        const newArr = matrixResults[persona]?.[intensity] || [];
        existingMatrix[persona][intensity] = mergeUnique(oldArr, newArr);
      }
    }

    fs.writeFileSync(matrixPath, JSON.stringify(existingMatrix, null, 2));
    console.log(`[SUCCESS] Voice Matrix updated (Cumulative): ${matrixPath}`);
  } catch (err: any) {
     console.error(`CRITICAL: All attempts for Voice Matrix FAILED. Retaining legacy matrix.`);
  }

  console.log("\n--- PIPELINE COMPLETE ---");
}

main().catch(err => {
  console.error("FATAL ERROR in Narrative Pipeline:");
  console.error(err);
  process.exit(1);
});
