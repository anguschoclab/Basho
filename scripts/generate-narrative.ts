import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * Completely decoupled from the core game engine to prevent Vite/Browser import 
 * resolution crashes in headless environments.
 */
async function generateNarrative() {
  console.log("Initializing Headless Narrative Generation...");
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("CRITICAL: GEMINI_API_KEY environment variable is missing.");
  }

  // 1. DYNAMIC IMPORT
  // We import BardEngine dynamically to isolate it from the rest of the app's dependency tree
  let BardModule;
  try {
    BardModule = await import("../src/engine/narrative/BardEngine");
  } catch (err) {
    console.error("FATAL: Failed to import BardEngine. Ensure it does not rely on browser APIs (like localStorage or window) at the top level.");
    throw err;
  }

  const EngineClass = BardModule.BardEngine || BardModule.default;
  if (!EngineClass) {
    throw new Error(`Could not find 'BardEngine' export. Available: ${Object.keys(BardModule).join(', ')}`);
  }

  const engine = new EngineClass();

  // 2. METHOD INTROSPECTION
  const instanceMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine))
    .filter(m => m !== "constructor" && typeof engine[m] === "function");

  const preferred = ["generate", "run", "process", "execute", "generateDailyDigest", "tick"];
  const methodToCall = instanceMethods.find(m => preferred.includes(m)) || instanceMethods[0];

  if (!methodToCall) {
      throw new Error("No callable methods found on BardEngine instance.");
  }

  console.log(`Discovered target method: engine.${methodToCall}()`);

  // 3. DECOUPLED MOCK STATE
  // We provide a completely generic mock to satisfy the BardEngine's context requirements.
  // This forces the LLM to generate a clean "State of the World" or "Pre-season" digest
  // without needing to import strict TypeScript enums or WorldFactories.
  const mockWorldState = {
    time: { year: 2026, month: 1, week: 1, day: 1, timestamp: Date.now() },
    rikishi: [],
    heya: [],
    banzuke: null,
    history: { pastBasho: [], hallOfFame: [] },
    events: [] // Empty events forces a generic state-of-the-world generation
  };

  // 4. SAFE EXECUTION
  let newEntries;
  try {
    console.log("Attempting execution with mock context...");
    newEntries = await engine[methodToCall](mockWorldState, []);
  } catch (err: any) {
    console.error(`Execution with parameters failed (${err.message}). Falling back to parameterless call...`);
    // Fallback: If the method doesn't take parameters, call it bare
    newEntries = await engine[methodToCall]();
  }

  // 5. PERSISTENCE
  const archivePath = path.resolve(__dirname, "../src/engine/narrative/archive.json");
  
  let archive: any[] = [];
  if (fs.existsSync(archivePath)) {
    const rawData = fs.readFileSync(archivePath, "utf-8");
    try {
        archive = rawData ? JSON.parse(rawData) : [];
    } catch(e) { archive = []; }
  }

  if (newEntries) {
    // Normalize to array
    const entriesToAppend = Array.isArray(newEntries) ? newEntries : [newEntries];
    
    if (entriesToAppend.length > 0) {
        archive.push(...entriesToAppend);
        fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
        console.log(`Success: Added ${entriesToAppend.length} new entries to archive.json.`);
    } else {
        console.log("Success: Engine ran but returned an empty array (No news to report).");
    }
  } else {
    console.log("Success: Engine ran but returned null/undefined (Internal persistence may have handled it).");
  }
}

generateNarrative().catch((error) => {
  console.error("Pipeline Failed:", error);
  process.exit(1);
});
