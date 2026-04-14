import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bard Engine v2.2: Unified Orchestrator
 * =====================================
 * Centralized CI/CD script for dynamic narrative expansion.
 *
 * Jobs:
 * 1. Event Templates (Domains)
 * 2. Play-by-Play Matrix
 * 3. Daily News Digests
 * 4. Registry Enrichment (Descriptions/Labels)
 */

const ARCHIVE_PATH = path.resolve(__dirname, "../src/engine/narrative/archive.json");

const DOMAINS = [
  {
    name: "basho",
    targets: ["bout_title", "bout_summary", "status_title", "status_summary"],
    tones: { common: "analytical", intensity_3: "aggressive" },
  },
  {
    name: "recruiting",
    targets: ["title", "scouting_reports", "signing_narratives"],
    tones: { common: "analytical" },
  },
  {
    name: "economy",
    targets: ["title", "summary", "market_shifts", "loan_title", "loan_summary"],
    tones: { common: "analytical" },
  },
  {
    name: "medical",
    targets: ["title", "summary"],
    tones: { common: "analytical", intensity_3: "poetic" },
  },
  {
    name: "governance",
    targets: ["title", "summary"],
    tones: { common: "analytical", intensity_3: "aggressive" },
  },
  {
    name: "rivalry",
    targets: ["title", "press_rumors", "escalated_title", "escalated_summary"],
    tones: { common: "aggressive", intensity_3: "aggressive" },
  },
  {
    name: "lifecycle",
    targets: [
      "title",
      "summary",
      "naturalization_title",
      "naturalization_summary",
      "merger_title",
      "merger_summary",
    ],
    tones: { common: "poetic" },
  },
  { name: "welfare", targets: ["title", "summary"], tones: { common: "analytical" } },
  { name: "awards", targets: ["title", "summary"], tones: { common: "poetic" } },
  { name: "training", targets: ["title", "summary"], tones: { common: "analytical" } },
  {
    name: "management",
    targets: [
      "decision_title",
      "decision_summary",
      "yearly_strategy_title",
      "yearly_strategy_summary",
    ],
    tones: { common: "analytical" },
  },
  {
    name: "facility",
    targets: ["upgraded_title", "upgraded_summary", "degraded_title", "degraded_summary"],
    tones: { common: "analytical" },
  },
  {
    name: "narrative",
    targets: [
      "mood_shift_title",
      "mood_shift_summary",
      "strategy_shift_title",
      "strategy_shift_summary",
    ],
    tones: { common: "analytical", intensity_3: "aggressive" },
  },
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
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    const err = new Error(`Gemini API returned ${response.status}: ${errorBody}`);
    (err as Error & { status?: number }).status = response.status;
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
    } catch (err: unknown) {
      console.warn(
        `    [Attempt ${i}/3] FAILED: ${err instanceof Error ? err.message : String(err)}`
      );
      if (i === 3) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function callWithFallback(apiKey: string, primary: string, fallback: string, prompt: string) {
  try {
    return await try3Times(apiKey, primary, prompt);
  } catch {
    console.warn(`  !!! Fallback triggered...`);
    return await try3Times(apiKey, fallback, prompt);
  }
}

function mergeUnique(oldArr: string[] = [], newArr: string[] = []): string[] {
  const combined = [...oldArr, ...newArr];
  return Array.from(new Set(combined.map((s) => s.trim()))).filter((s) => s.length > 0);
}

async function orchestrate() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing.");
  const model = process.env.GEMINI_MODEL_PRIMARY || "gemini-3-flash-preview";
  const fallbackModel = process.env.GEMINI_MODEL_FALLBACK || "gemini-2.5-flash";

  console.log("--- BARD ORCHESTRATOR v2.2 ---");

  // Load Archive
  let archive: {
    version: string;
    registry: { kimarite?: Record<string, { description?: string }> };
    matrix: Record<string, Record<string, string[]>>;
    digests: unknown[];
    domains: {
      events: Record<string, Record<string, { common: string[]; intensity_3: string[] }>>;
    };
  } = { version: "2.2.0", registry: {}, matrix: {}, digests: [], domains: { events: {} } };
  if (fs.existsSync(ARCHIVE_PATH)) {
    archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, "utf-8"));
  }

  // JOB 1: Domains (Events)
  console.log("\n[Job 1: Events Generation]");
  for (const domain of DOMAINS) {
    console.log(`  Processing Domain: ${domain.name}`);
    const prompt = `Generate 15 narrative templates for ${domain.name}: ${domain.targets.join(", ")}. Use placeholders: %SHIKONA%, %WINNER%, %LOSER%, %KIMARITE%, %MONEY%, %COST%. Return JSON { "target": { "common": [], "intensity_3": [] } }. Persona: NHK Official (Analytical).`;

    try {
      const results = await callWithFallback(apiKey, model, fallbackModel, prompt);
      if (!archive.domains.events[domain.name]) archive.domains.events[domain.name] = {};

      for (const target of domain.targets) {
        const existing = archive.domains.events[domain.name][target] || {
          common: [],
          intensity_3: [],
        };
        const newlyGenerated = results[target] || { common: [], intensity_3: [] };
        archive.domains.events[domain.name][target] = {
          common: mergeUnique(existing.common, newlyGenerated.common),
          intensity_3: mergeUnique(existing.intensity_3, newlyGenerated.intensity_3),
        };
      }
    } catch {
      console.warn(`  Skipping domain ${domain.name} due to cluster failure.`);
    }
  }

  // JOB 2: Voice Matrix
  console.log("\n[Job 2: Voice Matrix Expansion]");
  const matrixPrompt = `Generate 20 commentary snippets for match finishes. Personas: ${PERSONAS.join(", ")}. Intensities: ${INTENSITIES.join(", ")}. Return JSON { persona: { intensity: [] } }. Use %WINNER%, %LOSER%, %KIMARITE%.`;
  try {
    const matrixRes = await callWithFallback(apiKey, model, fallbackModel, matrixPrompt);
    for (const persona of PERSONAS) {
      if (!archive.matrix[persona]) archive.matrix[persona] = {};
      for (const intensity of INTENSITIES) {
        archive.matrix[persona][intensity] = mergeUnique(
          archive.matrix[persona][intensity],
          matrixRes[persona]?.[intensity]
        );
      }
    }
  } catch {
    console.warn("  Skipping Matrix expansion.");
  }

  // JOB 3: Daily Digest
  console.log("\n[Job 3: Daily Digest Enrichment]");
  const digestPrompt = `Write a short Sumo news digest (NHK style). Return JSON: { "headline": "...", "content": "..." }.`;
  try {
    const digestRes = await callWithFallback(apiKey, model, fallbackModel, digestPrompt);
    const newDigest = {
      ...digestRes,
      id: `digest_${Date.now()}`,
      timestamp: Date.now(),
      type: "DAILY_DIGEST",
    };
    archive.digests = archive.digests || [];
    archive.digests.push(newDigest);
  } catch {
    console.warn("  Skipping Daily Digest.");
  }

  // JOB 4: Registry Enrichment (Missing descriptions)
  console.log("\n[Job 4: Registry Enrichment]");
  const missingKima = Object.entries(archive.registry.kimarite || {})
    .filter(
      ([, val]: [string, unknown]) =>
        val &&
        typeof val === "object" &&
        "description" in val &&
        (!val.description ||
          (typeof val.description === "string" && val.description.includes("\\")))
    )
    .map(([key]) => key);

  if (missingKima.length > 0) {
    console.log(`  Fixing ${missingKima.length} missing Kimarite descriptions...`);
    const kimaPrompt = `Provide short English descriptions for these Kimarite: ${missingKima.join(", ")}. Return JSON { "id": "description" }.`;
    try {
      const kimaRes = await callWithFallback(apiKey, model, fallbackModel, kimaPrompt);
      for (const id in kimaRes) {
        if (archive.registry.kimarite?.[id])
          archive.registry.kimarite[id].description = kimaRes[id];
      }
    } catch {
      console.warn("  Skipping Registry enrichment.");
    }
  }

  // Save Final Archive
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
  console.log(`\n[SUCCESS] Unified Archive updated: ${ARCHIVE_PATH}`);
}

orchestrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
