import { BardEngine } from "../src/engine/narrative/BardEngine";
import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * This script initializes a minimal world state, triggers the BardEngine's
 * specific 'generateDailyDigest' method, and saves the output.
 */
async function generateNarrative() {
  console.log("Initializing Bard Engine & World State...");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // 1. Initialize the engine
  const engine = new BardEngine();

  // 2. Bootstrap a minimal world state for the engine to read
  // We use a raw object mock to completely bypass import resolution and TypeScript 
  // compilation errors (like 'WorldFactory not found') in the CI environment.
  console.log("Bootstrapping minimal world state mock for narrative context...");
  const worldState: any = {
    time: { year: 2026, month: 1, week: 1, day: 1, timestamp: Date.now() },
    rikishi: [],
    heya: [],
    banzuke: null,
    history: { pastBasho: [], hallOfFame: [] },
    events: []
  };

  console.log("Executing engine.generateDailyDigest()...");
  
  // 3. Execute the specific method without dummy events.
  // Passing an empty array forces the BardEngine to analyze the baseline 
  // worldState (roster, current date, etc.) and generate a general status 
  // update, natively filling out its JSON categories without fake inputs.
  const dailyDigest = await engine.generateDailyDigest(worldState, []);

  // 4. Persist the results
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive: any[] = [];
  if (fs.existsSync(archivePath)) {
    const rawData = fs.readFileSync(archivePath, "utf-8");
    archive = rawData ? JSON.parse(rawData) : [];
  }

  if (dailyDigest) {
    // Append the new digest object
    archive.push(dailyDigest);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    console.log(`Success: Added 1 new daily digest to archive.json.`);
    console.log(`Title: ${dailyDigest?.headline || "Unknown Headline"}`);
  } else {
    console.log("Engine executed successfully, but returned a null digest.");
  }
}

// Execute the workflow
generateNarrative().catch((error) => {
  console.error("Narrative Generation Failed:", error);
  process.exit(1);
});
