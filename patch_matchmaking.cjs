const fs = require('fs');
const file = 'src/engine/matchmaking.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('sanyaku_matchup')) {
  // Update DEFAULT_MATCHMAKING_RULES to reflect the new requirements if needed
  // Right now rules already have avoidSameHeya: true

  // 1. Add day awareness and Joi-jin rules
  const joiJinLogic = `
  // Soft: similar records
  if (rules.preferSimilarRecords) {
    const ra = getRecord(basho, a.id);
    const rb = getRecord(basho, b.id);
    const s = recordSimilarity(ra, rb);

    // In the second half of the tournament (day > 7), strictly prioritize similar records (Swiss-system style)
    const day = (basho as any).day || 1;
    if (day > 7) {
      score *= (0.2 + 0.8 * s); // Much higher weight to record similarity
      if (s > 0.9) reasons.push("strict_record_match");

      // Final Day (Senshuraku) Championship Contender Logic
      if (day === 15 && ra.wins >= 11 && rb.wins >= 11 && Math.abs(ra.wins - rb.wins) <= 1) {
         score *= 2.0;
         reasons.push("yusho_contenders");
      }
    } else {
      score *= (0.6 + 0.4 * s);
      if (s > 0.75) reasons.push("similar_records");
    }
  }

  // Soft: similar rank slot
  if (rules.preferSimilarRank) {
    const s = rankSimilarity(a, b);
    const day = (basho as any).day || 1;

    // Joi-jin Scheduling (Top Ranks)
    // Sanyaku vs Sanyaku usually happens more frequently in the second half.
    // In the first half, Sanyaku fight top Maegashira.
    const isSanyaku = (r: Rikishi) => ["yokozuna", "ozeki", "sekiwake", "komusubi"].includes(r.rank);
    const aSanyaku = isSanyaku(a);
    const bSanyaku = isSanyaku(b);

    if (aSanyaku && bSanyaku) {
      if (day > 7) {
         score *= 1.5; // Encourage Sanyaku matchups late
         reasons.push("sanyaku_matchup");
      } else {
         score *= 0.5; // Discourage Sanyaku matchups early
         reasons.push("sanyaku_avoided_early");
      }
    } else if ((aSanyaku && !bSanyaku) || (!aSanyaku && bSanyaku)) {
      if (day <= 7 && s > 0.5) {
         score *= 1.2; // Sanyaku vs high Maegashira early
         reasons.push("joi_jin_scheduling");
      }
    }

    score *= (0.6 + 0.4 * s);
    if (s > 0.75 && !reasons.includes("similar_rank")) reasons.push("similar_rank");
  }
`;

  code = code.replace(
    /  \/\/ Soft: similar records\n[\s\S]*?  \/\/ Soft: avoid huge weight mismatch/,
    joiJinLogic + '\n  // Soft: avoid huge weight mismatch'
  );

  fs.writeFileSync(file, code);
  console.log("Patched matchmaking.ts");
} else {
  console.log("matchmaking.ts already patched");
}
