import { BardEngine } from "../src/engine/narrative/BardEngine";
import * as fs from "fs";
import * as path from "path";

/**
 * CI/CD Entry Point for the Autonomous Narrative Generation
 * This script initializes the environment, dynamically finds the correct 
 * BardEngine execution method (static or instance), and saves the output.
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
  let isStatic = false;
  const commonMethods = ["run", "generate", "process", "execute", "generateDrama", "generateNarrative", "create", "tick"];
  
  // A. Check common instance methods
  for (const name of commonMethods) {
    if (typeof (engine as any)[name] === "function") {
      methodToCall = name;
      break;
    }
  }

  // B. Check common static methods
  if (!methodToCall) {
    for (const name of commonMethods) {
      if (typeof (BardEngine as any)[name] === "function") {
        methodToCall = name;
        isStatic = true;
        break;
      }
    }
  }

  // C. Fallback: Deep introspection for any custom named function
  if (!methodToCall) {
    const protoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(engine));
    const instanceMethods = Object.keys(engine);
    const staticMethods = Object.getOwnPropertyNames(BardEngine);

    const allCallable = [...new Set([...protoMethods, ...instanceMethods])]
      .filter(p => typeof (engine as any)[p] === "function" && p !== "constructor");
    
    const allStaticCallable = staticMethods
      .filter(p => typeof (BardEngine as any)[p] === "function" && !["constructor", "name", "length", "prototype"].includes(p));

    if (allCallable.length > 0) {
      methodToCall = allCallable[0];
      console.log(`Fallback: Discovered custom instance method '${methodToCall}'...`);
    } else if (allStaticCallable.length > 0) {
      methodToCall = allStaticCallable[0];
      isStatic = true;
      console.log(`Fallback: Discovered custom static method '${methodToCall}'...`);
    } else {
      console.error("\n--- DEBUG INFO: BARD ENGINE STRUCTURE ---");
      console.error("Instance Properties:", instanceMethods);
      console.error("Prototype Properties:", protoMethods);
      console.error("Static Properties:", staticMethods);
      console.error("-----------------------------------------\n");
      throw new Error("Could not find any callable methods on the BardEngine instance or class. Check the debug logs above.");
    }
  }

  const callType = isStatic ? "BardEngine" : "engine";
  console.log(`Executing narrative generation via ${callType}.${methodToCall}()...`);
  
  // Execute the discovered method
  const target = isStatic ? BardEngine : engine;
  const newEntries = await (target as any)[methodToCall]();

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
