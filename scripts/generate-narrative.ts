import { BardEngine } from "../src/engine/narrative/BardEngine";
import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * This script initializes the environment, triggers the BardEngine,
 * and saves the generated output to the local archive.
 */
async function generateNarrative() {
  console.log("Initializing Bard Engine...");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // 1. Initialize the engine. 
  // If BardEngine requires seeded data to function (e.g. world state), 
  // load it and pass it to the constructor here.
  const engine = new BardEngine();

  console.log("Executing narrative generation...");
  
  // 2. Trigger the generation routine.
  // Note: Adjust the method call to match your specific BardEngine implementation (e.g., .run(), .generate(), .processEvents())
  const newEntries = await engine.generate(); 

  // 3. Persist the results to ensure git detects a change
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive = [];
  if (fs.existsSync(archivePath)) {
    const rawData = fs.readFileSync(archivePath, "utf-8");
    archive = rawData ? JSON.parse(rawData) : [];
  }

  if (newEntries && newEntries.length > 0) {
    // Append new entries and write to disk
    archive.push(...newEntries);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    console.log(`Success: Added ${newEntries.length} new entries to archive.json.`);
  } else {
    console.log("Engine executed successfully, but no new narrative entries were generated (Blank Slate).");
  }
}

// Execute the workflow
generateNarrative().catch((error) => {
  console.error("Narrative Generation Failed:", error);
  process.exit(1);
});
