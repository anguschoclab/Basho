import fs from "fs";

function showLines(file, pattern) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    const idx = lines.findIndex(l => l.match(pattern));
    if (idx !== -1) {
        console.log(`\n--- ${file} ---`);
        console.log(lines.slice(Math.max(0, idx - 5), idx + 15).join('\n'));
    }
}

showLines("src/engine/overflow.ts", /scoredCandidates\.sort/);
showLines("src/engine/mergers.ts", /candidates\.sort/);
showLines("src/engine/uiDigest.ts", /candidates\.sort/);
showLines("src/engine/uiModels.ts", /rivalEntries\.sort/);
showLines("src/engine/rivalries.ts", /rows\.sort/);
showLines("src/engine/rivalries.ts", /entries\.sort/);
