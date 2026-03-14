const fs = require('fs');

function replaceAsAny(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  for (const { search, replace } of replacements) {
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content);
}

// 1. autoSim.ts - No matches seen in output

// 2. bout.ts
replaceAsAny('src/engine/bout.ts', [
  { search: '} as any);', replace: '});' },
  { search: '} as any;', replace: '};' },
  { search: '(k as any).requiredStances', replace: 'k.requiredStances' },
  { search: '(k as any).vector', replace: 'k.vector' },
  { search: '(k as any).baseWeight', replace: 'k.baseWeight' },
  { search: '(k as any).rarity', replace: 'k.rarity' },
  { search: '(k as any).styleAffinity?', replace: 'k.styleAffinity?' },
  { search: 'data: { reversal: true } } as any);', replace: 'data: { reversal: true } });' },
  { search: '(basho as any).id', replace: 'basho.id' },
  { search: '(basho as any).year', replace: 'basho.year' },
  { search: '((basho as any).bashoName ?? (basho as any).name) as BashoName', replace: '(basho.bashoName ?? basho.name) as BashoName' },
  { search: '(east as any).style', replace: 'east.style' },
  { search: '(east as any).archetype', replace: 'east.archetype' },
  { search: '(west as any).style', replace: 'west.style' },
  { search: '(west as any).archetype', replace: 'west.archetype' },
  { search: '(result as any).pbpLines', replace: 'result.pbpLines' },
  { search: '(result as any).pbp', replace: 'result.pbp' },
  { search: '(result as any).narrative', replace: 'result.narrative' },
  { search: 'as any;', replace: ';' } // be careful with this one
]);

// 3. economics.ts
replaceAsAny('src/engine/economics.ts', [
  { search: '(world as any).sponsorPool', replace: 'world.sponsorPool' }
]);

// 4. hallOfFame.ts
replaceAsAny('src/engine/hallOfFame.ts', [
  { search: 'const w = world as any;', replace: 'const w = world;' },
  { search: '(world as any).hallOfFame', replace: 'world.hallOfFame' }
]);

// 5. historyIndex.ts
replaceAsAny('src/engine/historyIndex.ts', [
  { search: '} as any);', replace: '});' },
  { search: '(world as any).currentBasho', replace: 'world.currentBasho' },
  { search: '(stats as any).wins', replace: 'stats.wins' },
  { search: '(stats as any).losses', replace: 'stats.losses' }
]);

// 6. holiday.ts
replaceAsAny('src/engine/holiday.ts', [
  { search: '(r as any).nationality', replace: 'r.nationality' },
  { search: '(world as any)._interimDaysRemaining', replace: 'world._interimDaysRemaining' },
  { search: '(world as any)._postBashoDays', replace: 'world._postBashoDays' }
]);

// 7. injuries.ts
replaceAsAny('src/engine/injuries.ts', [
  { search: '(r as any).injured', replace: 'r.injured' },
  { search: '(r as any).injuryWeeksRemaining', replace: 'r.injuryWeeksRemaining' },
  { search: '(r as any).injuryStatus', replace: 'r.injuryStatus' },
  { search: '(r as any).injury', replace: 'r.injury' },
  { search: '(world as any).injuriesState', replace: 'world.injuriesState' },
  { search: '(loser as any).age', replace: 'loser.age' },
  { search: '(loser as any).injured', replace: 'loser.injured' },
  { search: '(loser as any).injuryWeeksRemaining', replace: 'loser.injuryWeeksRemaining' },
  { search: '(loser as any).injuryStatus', replace: 'loser.injuryStatus' },
  { search: '(loser as any).injury', replace: 'loser.injury' },
  { search: '(world as any).currentBashoName', replace: 'world.currentBashoName' },
  { search: 'const anyW = world as any;', replace: 'const anyW = world;' },
  { search: 'ts?.focusSlots as any[]', replace: 'ts?.focusSlots' }
]);

// 8. lifecycle.ts
replaceAsAny('src/engine/lifecycle.ts', [
  { search: '(origin as any).isElite', replace: 'origin.isElite' },
  { search: '(origin as any).strMod', replace: 'origin.strMod' },
  { search: '(origin as any).techMod', replace: 'origin.techMod' },
  { search: '(origin as any).speedMod', replace: 'origin.speedMod' },
  { search: '(origin as any).weightMod', replace: 'origin.weightMod' }
]);

// 9. matchmaking.ts
replaceAsAny('src/engine/matchmaking.ts', [
  { search: '(a as any).rankNumber', replace: 'a.rankNumber' },
  { search: '(b as any).rankNumber', replace: 'b.rankNumber' },
  { search: '(a as any).side', replace: 'a.side' },
  { search: '(b as any).side', replace: 'b.side' },
  { search: '!(r as any).injured', replace: '!r.injured' }
]);

// 10. media.ts
replaceAsAny('src/engine/media.ts', [
  { search: '(winner as any).injury', replace: 'winner.injury' },
  { search: '(loser as any).injury', replace: 'loser.injury' },
  { search: '(r as any).economics', replace: 'r.economics' },
  { search: '(world as any).basho', replace: 'world.basho' },
  { search: '(standings as any)[result.winnerRikishiId]', replace: 'standings[result.winnerRikishiId]' },
  { search: '(standings as any)[loserId]', replace: 'standings[loserId]' },
  { search: 'const w = world as any;', replace: 'const w = world;' }
]);

// 11. narrative.ts
replaceAsAny('src/engine/narrative.ts', [
  { search: '(result as any).log', replace: 'result.log' }
]);

// 12. pbp.ts
replaceAsAny('src/engine/pbp.ts', [
  { search: '(result as any).log', replace: 'result.log' }
]);

// 13. pbpMatrix.ts
replaceAsAny('src/engine/pbpMatrix.ts', [
  { search: 'lib.tachiai as any', replace: 'lib.tachiai' },
  { search: 'lib.clinch as any', replace: 'lib.clinch' },
  { search: 'lib.momentum as any', replace: 'lib.momentum' },
  { search: 'lib.finish as any', replace: 'lib.finish' }
]);

// 14. perception.ts
replaceAsAny('src/engine/perception.ts', [
  { search: '(world as any).rivalriesState', replace: 'world.rivalriesState' },
  { search: '(world as any).mediaState', replace: 'world.mediaState' }
]);

// 15. rivalries.ts
replaceAsAny('src/engine/rivalries.ts', [
  { search: '(world as any).rivalriesState', replace: 'world.rivalriesState' },
  { search: 'const w = world as any;', replace: 'const w = world;' }
]);

// 16. saveload.ts - special handling below

// 17. scoutingStore.ts
replaceAsAny('src/engine/scoutingStore.ts', [
  { search: 'const w: any = world as any;', replace: 'const w = world;' },
  { search: '(truth as any).heyaId', replace: 'truth.heyaId' }
]);

// 18. talentpool.ts
replaceAsAny('src/engine/talentpool.ts', [
  { search: '(world as any).week', replace: 'world.week' },
  { search: '(world as any).calendar?.currentWeek', replace: 'world.calendar?.currentWeek' },
  { search: 'const w = world as any;', replace: 'const w = world;' },
  { search: '(world as any).playerHeyaId', replace: 'world.playerHeyaId' },
  { search: '} as any;', replace: '};' },
  { search: '(h as any).funds', replace: 'h.funds' },
  { search: '(h as any).reputation', replace: 'h.reputation' },
  { search: 'r as any', replace: 'r' },
  { search: '(heya as any).rikishiIds', replace: 'heya.rikishiIds' },
  { search: '(heya as any)?.welfareState', replace: 'heya?.welfareState' },
  { search: '(world as any).talentPool', replace: 'world.talentPool' }
]);

// 19. uiDigest.ts
replaceAsAny('src/engine/uiDigest.ts', [
  { search: '(r as any).injury', replace: 'r.injury' },
  { search: '(basho as any).currentDay', replace: 'basho.currentDay' },
  { search: '(match as any).eastRikishiId', replace: 'match.eastRikishiId' },
  { search: '(match as any).rikishiEastId', replace: 'match.rikishiEastId' },
  { search: '(match as any).eastId', replace: 'match.eastId' },
  { search: '(match as any).westRikishiId', replace: 'match.westRikishiId' },
  { search: '(match as any).rikishiWestId', replace: 'match.rikishiWestId' },
  { search: '(match as any).westId', replace: 'match.westId' }
]);

// 20. welfare.ts
replaceAsAny('src/engine/welfare.ts', [
  { search: '(r as any).injuryStatus', replace: 'r.injuryStatus' },
  { search: '(r as any).injury', replace: 'r.injury' },
  { search: '(r as any).injured', replace: 'r.injured' },
  { search: '(heya as any).riskIndicators', replace: 'heya.riskIndicators' }
]);

// 21. world.ts
replaceAsAny('src/engine/world.ts', [
  { search: '(schedule as any).generateDaySchedule', replace: 'schedule.generateDaySchedule' },
  { search: 'world.rikishi as any,', replace: 'world.rikishi,' },
  { search: 'r as any,', replace: 'r,' }
]);

console.log('Fixed simple replacements.');
