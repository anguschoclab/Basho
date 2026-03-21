import fs from "fs";

function showLines(file, pattern) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const idx = lines.findIndex(l => l.match(pattern));
    if (idx !== -1) {
        console.log(`\n--- ${file} ---`);
        console.log(lines.slice(Math.max(0, idx - 5), idx + 15).join('\n'));
    }
}

showLines("src/engine/uiDigest.ts", /export interface OzekiRunCandidate/);
showLines("src/engine/uiModels.ts", /export interface UIRivalEntry/);
showLines("src/engine/rivalries.ts", /export interface RivalryPairState/);
