import { BardEngine } from "../src/engine/narrative/BardEngine";
import { WorldFactory } from "../src/engine/systems/generation/WorldFactory";
import { GameEvent, EventType } from "../src/engine/types/events";
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
  // We use WorldFactory to ensure it has valid structure without needing a save file
  console.log("Bootstrapping world state for narrative context...");
  const worldState = WorldFactory.createNewWorld();

  // 3. Create some dummy events for the Bard to report on
  // In a real scenario, you might read these from a queued JSON file,
  // but for the daily chron job, we'll give it the "dawn of a new era" context.
  const dummyEvents: GameEvent[] = [
    {
      id: `evt_${Date.now()}`,
      type: EventType.NEWS_ARTICLE,
      timestamp: worldState.time.timestamp,
      description: "A new era begins in the Sumo world as the latest banzuke is prepared.",
      severity: 'info'
    }
  ];

  console.log("Executing engine.generateDailyDigest()...");
  
  // 4. Execute the specific method with the required arguments
  const dailyDigest = await engine.generateDailyDigest(worldState, dummyEvents);

  // 5. Persist the results
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
    console.log(`Title: ${dailyDigest.headline}`);
  } else {
    console.log("Engine executed successfully, but returned a null digest.");
  }
}

// Execute the workflow
generateNarrative().catch((error) => {
  console.error("Narrative Generation Failed:", error);
  process.exit(1);
});
