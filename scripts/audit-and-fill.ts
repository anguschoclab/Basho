import fs from 'fs';
import path from 'path';
import { GeminiClient } from '../src/engine/narrative/GeminiClient.ts';

/**
 * audit-and-fill.ts
 * 
 * This script audits archive.json for narrative gaps and utilizes
 * the Gemini 1.5 Flash API to autonomously generate NHK-style 
 * content to fill those holes.
 */

const ARCHIVE_PATH = path.resolve(process.cwd(), 'src/engine/narrative/archive.json');
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  process.exit(1);
}

const client = new GeminiClient(API_KEY);

async function run() {
  console.log("Starting Narrative Audit...");
  
  const archive = JSON.parse(fs.readFileSync(ARCHIVE_PATH, 'utf-8'));
  const missingKimarite: string[] = [];
  
  // 1. Audit Kimarite
  // We'll use a subset for this demonstration, or ideally extract from combat.ts
  const allKimarite = [
    'yorikiri', 'oshidashi', 'oshitaoshi', 'yoritaoshi', 'tsukidashi',
    'tsukitaoshi', 'abisetaoshi', 'hatakikomi', 'hikiotoshi', 'okuridashi',
    'tsuriotoshi', 'tsuridashi', 'utchari', 'okuritaoshi', 'katasukashi',
    'sokubiotoshi', 'okurigake', 'okurihikiotoshi', 'waridashi', 'okurinage',
    'tsukaminage', 'okuritsuridashi', 'okuritsuriotoshi', 'yobimodoshi', 'ushiromotare',
    'uwatenage', 'sukuinage', 'shitatenage', 'kotenage', 'shitatedashinage',
    'uwatedashinage', 'kubinage', 'koshihineri', 'ipponzeoi', 'nichonage',
    'yaguranage', 'kakenage', 'tsukiotoshi', 'tottari', 'shitatehineri',
    'uwatehineri', 'kotehineri', 'amiuchi', 'kainahineri', 'zubuneri',
    'sakatottari', 'kubiotoshi', 'gasshohineri', 'harimanage', 'osakate',
    'sabaori', 'sotokomata_hinerite', 'tokkurinage', 'makiotoshi', 'uchimuso',
    'sotomuso', 'ashitori', 'sotogake', 'uchigake', 'ketaguri',
    'watashikomi', 'kekaeshi', 'kosotogake', 'komatasukui', 'chongake',
    'kawarigake', 'susoharai', 'kirikaeshi', 'nimaigeri', 'omata',
    'susotori', 'mitokorozeme', 'kosotogari', 'tsumatori', 'izori',
    'kakezori', 'shumokuzori', 'sototasukizori', 'tasukizori', 'tsutaezori',
    'kimedashi', 'kimetaoshi', 'isamiashi', 'koshikudake', 'tsukite',
    'tsukihiza', 'fumidashi', 'fusensho', 'hansoku'
  ];

  for (const id of allKimarite) {
    if (!archive.domains.combat.kimarite[id] || archive.domains.combat.kimarite[id].length < 2) {
      missingKimarite.push(id);
    }
  }

  if (missingKimarite.length > 0) {
    console.log(`Found ${missingKimarite.length} hollow kimarite paths. Requesting AI fill in batches...`);
    
    // Batch processing to avoid truncation/limits
    const batchSize = 5;
    for (let i = 0; i < missingKimarite.length; i += batchSize) {
      const batch = missingKimarite.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(missingKimarite.length / batchSize)}...`);
      
      try {
        const suggestions = await client.suggestedFill(batch);
        for (const [id, strings] of Object.entries(suggestions)) {
          archive.domains.combat.kimarite[id] = strings;
        }
        // Save incrementally in case of crash
        fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
      } catch (err) {
        console.error(`Batch ${i} failed:`, err);
      }
    }
  }

  // 2. Audit Engagement for intensity variety
  const engagementModes = ['push', 'belt', 'trick', 'speed'];
  for (const mode of engagementModes) {
    for (let i = 1; i <= 3; i++) {
      const p = archive.domains.combat.engagement[mode][`intensity_${i}`];
      if (p.length < 3) {
        console.log(`Engagement ${mode} i${i} is sparse. Generating variations...`);
        const variations = await client.generateVariations(`combat.engagement.${mode}.i${i}`, p, 3 - p.length);
        archive.domains.combat.engagement[mode][`intensity_${i}`].push(...variations);
      }
    }
  }

  // 3. Save Back
  fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(archive, null, 2));
  console.log("Audit and Fill complete. Archive updated.");
}

run().catch(console.error);
