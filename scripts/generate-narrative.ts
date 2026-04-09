import { BardEngine } from "../src/engine/narrative/BardEngine";
import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * This script initializes the environment, dynamically finds the correct 
 * BardEngine execution method, and saves the generated output to the local archive.
 */
async function generateNarrative() {
  console.log("Initializing Bard Engine...");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // 1. Initialize the engine. 
  const engine = new BardEngine();

  console.log("Inspecting BardEngine for the correct execution method...");
  
  // 2. Dynamically hunt for the correct method name
  let methodToCall: string | null = null;
  const commonMethods = ["run", "generate", "process", "execute", "generateDrama", "generateNarrative", "create", "tick"];
  
  // Check against common names first
  for (const name of commonMethods) {
    if (typeof (engine as any)[name] === "function") {
      methodToCall = name;
      break;
    }
  }

  // Fallback: If not a common name, grab the first available custom method on the prototype
  if (!methodToCall) {
    const availableMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine))
      .filter(prop => typeof (engine as any)[prop] === "function" && prop !== "constructor");
    
    if (availableMethods.length > 0) {
      methodToCall = availableMethods[0];
      console.log(`Fallback: Using discovered method '${methodToCall}'...`);
    } else {
      throw new Error("Could not find any callable methods on the BardEngine instance.");
    }
  }

  console.log(`Executing narrative generation via engine.${methodToCall}()...`);
  
  // Execute the discovered method
  const newEntries = await (engine as any)[methodToCall]();

  // 3. Persist the results to ensure git detects a file change
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive: any[] = [];
  if (fs.existsSync(archivePath)) {
    const rawData = fs.readFileSync(archivePath, "utf-8");
    archive = rawData ? JSON.parse(rawData) : [];
  }

  // Safely append entries if the engine returned an array of results
  if (newEntries && Array.isArray(newEntries) && newEntries.length > 0) {
    archive.push(...newEntries);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    console.log(`Success: Added ${newEntries.length} new entries to archive.json.`);
  } else {
    console.log("Engine executed successfully, but returned no new narrative array (Blank Slate or internal persistence handled it).");
  }
}

// Execute the workflow
generateNarrative().catch((error) => {
  console.error("Narrative Generation Failed:", error);
  process.exit(1);
});
