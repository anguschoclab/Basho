import fs from "fs";

// Check the suspicious sorts
function check(file, lineRegex) {
   const content = fs.readFileSync(file, 'utf8');
   const lines = content.split('\n');
   lines.forEach((l, i) => {
      if (l.match(lineRegex)) {
         console.log(`${file}:${i+1}: ${l}`);
      }
   });
}

check("src/engine/overflow.ts", /scoredCandidates\.sort/);
check("src/engine/mergers.ts", /candidates\.sort/);
check("src/engine/kimarite.ts", /styleAffinity/);
check("src/engine/kimarite.ts", /archetypeBonus/);
check("src/engine/uiDigest.ts", /recentWins/);
check("src/engine/uiModels.ts", /rivalEntries\.sort/);
check("src/engine/rivalries.ts", /rows\.sort/);
check("src/engine/rivalries.ts", /entries\.sort/);
