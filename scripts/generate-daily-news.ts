import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Standalone fix for __dirname in ESM if needed, though Bun/Node often handle it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * * ARCHITECTURAL FIX:
 * This script is now 100% STANDALONE. It does not import any files from the 
 * browser-based game engine (/src/... ). By decoupling this script from Vite, 
 * OPFS, and React, we completely eliminate the cascade of Syntax and Dependency 
 * errors in the headless CI/CD environment.
 */
async function generateNarrative() {
  console.log("Initializing Standalone Headless Narrative Generation (Daily Digest)...");
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // Grab the model from the environment variable set by the bash loop, fallback to 2.5
  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";

  console.log(`Constructing prompt for Gemini (Model: ${model})...`);
  
  const promptText = `You are a seasoned sports journalist covering a fictional professional Sumo wrestling circuit.
  Please write a short, engaging daily news digest. 
  Discuss rumors, training camp updates, up-and-coming recruits, or tournament anticipation. Keep it immersive and realistic.
  
  Return ONLY a valid JSON object with the following structure:
  {
    "id": "digest_<random_hash>",
    "timestamp": <current_unix_timestamp>,
    "type": "DAILY_DIGEST",
    "headline": "<Engaging Headline>",
    "content": "<2-3 paragraphs of narrative content>"
  }`;

  console.log("Calling Gemini API...");

  // Execute direct fetch to Gemini API, bypassing the game engine's internal client
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        // Force the LLM to return strict, parseable JSON
        generationConfig: {
          responseMimeType: "application/json",
        }
      })
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API returned ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawText) {
    throw new Error("Received empty or malformed response from Gemini API.");
  }

  let newDigest;
  try {
    newDigest = JSON.parse(rawText);
    // Sanitize fallbacks in case the LLM misses the strict structure
    newDigest.id = newDigest.id || `digest_${Math.random().toString(36).substring(7)}`;
    newDigest.timestamp = newDigest.timestamp || Date.now();
    newDigest.type = newDigest.type || "DAILY_DIGEST";
  } catch (e) {
    console.error("Failed to parse JSON from Gemini. Raw text received:\n", rawText);
    throw new Error("LLM did not return valid JSON.");
  }

  console.log(`LLM Generation Complete: "${newDigest.headline}"`);

  // PERSISTENCE
  // Write directly to the archive.json digests array
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive: any = { version: "2.2.0", digests: [], domains: { events: {} } };
  if (fs.existsSync(archivePath)) {
    const fileContent = fs.readFileSync(archivePath, "utf-8");
    try {
        archive = JSON.parse(fileContent);
    } catch(e) { 
        console.warn("Could not parse existing archive.json, starting fresh.");
    }
  }

  // Ensure structure exists
  archive.digests = archive.digests || [];
  archive.digests.push(newDigest);
  
  fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
  
  console.log(`Success: Appended new digest to ${archivePath} (Total: ${archive.digests.length})`);
}

generateNarrative().catch((error) => {
  console.error("\nPipeline Failed:", error);
  process.exit(1);
});
