import { determineSpecialPrizes } from "./src/engine/banzuke";
import type { MatchSchedule, Rikishi } from "./src/engine/types";

// Mock data
const yokozunaCount = 2;
const candidateCount = 40;
const boutsPerCandidate = 15;
const numIterations = 10000;

const rikishiMap = new Map<string, Rikishi>();
const matches: MatchSchedule[] = [];
const yushoId = "candidate_0";

// Populate rikishi
for (let i = 0; i < yokozunaCount; i++) {
  const id = `yokozuna_${i}`;
  rikishiMap.set(id, { id, division: "makuuchi", rank: "yokozuna", name: `Y${i}` } as Rikishi);
}
for (let i = 0; i < candidateCount; i++) {
  const id = `candidate_${i}`;
  rikishiMap.set(id, { id, division: "makuuchi", rank: "maegashira", name: `M${i}` } as Rikishi);
}

// Populate matches
for (let i = 0; i < candidateCount; i++) {
  const winnerId = `candidate_${i}`;
  // Win enough to be candidate (>=8)
  for (let j = 0; j < 10; j++) {
    // Occasionally beat yusho or yokozuna
    let loserId = `loser_${i}_${j}`;
    if (j === 0) loserId = `yokozuna_${i % yokozunaCount}`;
    if (j === 1) loserId = yushoId;

    matches.push({
      id: `match_${i}_${j}`,
      day: 1,
      eastId: winnerId,
      westId: loserId,
      result: {
        winnerRikishiId: winnerId,
        loserRikishiId: loserId,
        kimarite: "yorikiri"
      }
    });
  }
}

console.log("Starting benchmark...");
const start = performance.now();

for (let i = 0; i < numIterations; i++) {
  determineSpecialPrizes(matches, rikishiMap, yushoId);
}

const end = performance.now();
console.log(`Time taken for ${numIterations} iterations: ${(end - start).toFixed(2)}ms`);
