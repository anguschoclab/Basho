import * as BardModule from "../src/engine/narrative/BardEngine";
import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * This script initializes the environment, diagnoses the BardEngine structure,
 * dynamically executes it, and saves the output.
 */
async function generateNarrative() {
  console.log("Initializing Bard Engine...");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // 1. Identify the engine class/export
  const EngineClass = (BardModule as any).BardEngine || (BardModule as any).default;
  if (!EngineClass) {
    console.error("Available exports in BardEngine.ts:", Object.keys(BardModule));
    throw new Error("Could not find 'BardEngine' export in the module.");
  }

  // Initialize the engine
  const engine = new EngineClass();

  // 2. Diagnostic dump - Print everything so we know exactly what is inside
  const protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine));
  const instanceMethods = Object.keys(engine);
  const staticMethods = Object.getOwnPropertyNames(EngineClass);

  console.log("\n--- BARD ENGINE STRUCTURE ---");
  console.log("Instance Properties:", instanceMethods);
  console.log("Prototype Methods:", protoMethods);
  console.log("Static Properties:", staticMethods);
  console.log("-----------------------------\n");

  // 3. Extract all callable methods
  const allCallable = [...new Set([...protoMethods, ...instanceMethods])]
    .filter(p => typeof engine[p] === "function" && p !== "constructor");

  if (allCallable.length === 0) {
    throw new Error("CRITICAL: No callable methods found on the engine. Ensure your methods aren't hidden or fully encapsulated.");
  }

  // Prioritize known generation verbs
  const preferred = ["generate", "run", "process", "execute", "generateDrama", "tick"];
  const methodToCall = allCallable.find(m => preferred.includes(m)) || allCallable[0];

  console.log(`Executing narrative generation via engine.${methodToCall}()...`);
  
  // 4. Execute the discovered method
  const newEntries = await engine[methodToCall]();

  // 5. Persist the results
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive: any[] = [];
  if (fs.existsSync(archivePath)) {
    const rawData = fs.readFileSync(archivePath, "utf-8");
    archive = rawData ? JSON.parse(rawData) : [];
  }

  if (newEntries && Array.isArray(newEntries) && newEntries.length > 0) {
    archive.push(...newEntries);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    console.log(`Success: Added ${newEntries.length} new entries to archive.json.`);
  } else if (newEntries && typeof newEntries === "object") {
    // Handle case where engine returns a single object instead of an array
    archive.push(newEntries);
    fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
    console.log(`Success: Added 1 new entry object to archive.json.`);
  } else {
    console.log("Engine executed successfully, but returned no new data to append (Blank Slate or internally saved).");
  }
}

// Execute the workflow
generateNarrative().catch((error) => {
  console.error("Narrative Generation Failed:", error);
  process.exit(1);
});
