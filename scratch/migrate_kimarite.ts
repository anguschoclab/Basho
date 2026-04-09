import * as fs from 'fs';
import * as path from 'path';

const archivePath = './src/engine/narrative/archive.json';
const kimaritePath = './src/engine/kimarite.ts';

const archive = JSON.parse(fs.readFileSync(archivePath, 'utf-8'));
const kimariteContent = fs.readFileSync(kimaritePath, 'utf-8');

// Simple regex extraction for the registry entries
const entryRegex = /K\({\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*nameJa:\s*'([^']+)',\s*jsaCategory:\s*'[^']+',\s*baseWeight:\s*\d+,\s*description:\s*'([^']+)'/g;

let match;
archive.registry.kimarite = {};

while ((match = entryRegex.exec(kimariteContent)) !== null) {
    const [_, id, name, nameJa, description] = match;
    archive.registry.kimarite[id] = {
        name,
        nameJa,
        description
    };
}

// Add the 2 edge cases (fusensho/hansoku)
archive.registry.kimarite['fusensho'] = { name: "Fusensho", nameJa: "不戦勝", description: "Win by default" };
archive.registry.kimarite['hansoku'] = { name: "Hansoku", nameJa: "反則", description: "Win by disqualification" };

fs.writeFileSync(archivePath, JSON.stringify(archive, null, 2));
console.log(`Migrated ${Object.keys(archive.registry.kimarite).length} kimarite entries to archive.json`);
