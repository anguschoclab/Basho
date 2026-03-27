const fs = require('fs');

// 02_selectors test error: getPlayerOyakata is not a function. Wait, are they not exported from `world.ts`?
// I placed them in world.ts at the very bottom. Let's check `export function getPlayerOyakata`.
let world = fs.readFileSync('src/engine/world.ts', 'utf8');
if (!world.includes('export function getPlayerOyakata')) {
    world += `
export function getPlayerOyakata(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    const heya = world.heyas.get(world.playerHeyaId);
    if (!heya) return undefined;
    return world.oyakata.get(heya.oyakataId);
}

export function getPlayerStable(world: WorldState) {
    if (!world.playerHeyaId) return undefined;
    return world.heyas.get(world.playerHeyaId);
}

export function getStableRikishi(world: WorldState, heyaId: string) {
    return Array.from(world.rikishi.values()).filter((r) => r.heyaId === heyaId);
}

export function getRikishiBashoStats(world: WorldState, rikishiId: string) {
    if (!world.basho?.leaderboard) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    const stats = world.basho.leaderboard[rikishiId];
    if (!stats) {
        return { wins: 0, losses: 0, absences: 0 };
    }
    return {
        wins: stats.wins || 0,
        losses: stats.losses || 0,
        absences: stats.absences || 0
    };
}
`;
    fs.writeFileSync('src/engine/world.ts', world);
}

// 04_calendar test error: endBasho is not a function.
let calendar = fs.readFileSync('src/engine/calendar.ts', 'utf8');
if (!calendar.includes('export function endBasho')) {
    calendar += `
export function endBasho(world: import('./types').WorldState) {
    if (!world.basho) return;

    world.history.push({
        type: 'BASHO_CONCLUDED',
        bashoId: world.basho.id,
        year: world.basho.year,
        month: world.basho.month,
        leaderboard: JSON.parse(JSON.stringify(world.basho.leaderboard))
    } as any);

    for (const [rikishiId, stats] of Object.entries(world.basho.leaderboard)) {
        const r = world.rikishi.get(rikishiId);
        if (r) {
            r.stats.wins = (r.stats.wins || 0) + ((stats as any).wins || 0);
            r.stats.losses = (r.stats.losses || 0) + ((stats as any).losses || 0);
            r.stats.absences = (r.stats.absences || 0) + ((stats as any).absences || 0);
        }
    }

    world.basho = undefined;
}
`;
    fs.writeFileSync('src/engine/calendar.ts', calendar);
}

// Update 04_calendar.test.ts mock to use Maps
let test04 = fs.readFileSync('src/engine/__tests__/04_calendar.test.ts', 'utf8');
test04 = test04.replace(/rikishi: \{[\s\S]*?\},/g, `rikishi: new Map([
                ['r_1', { id: 'r_1', name: 'A', heyaId: 's1', currentRank: 'M1', birthYear: 2000, stats: { wins: 100, losses: 50, absences: 5 }, attributes: { power: 50 } } as any],
                ['r_2', { id: 'r_2', name: 'B', heyaId: 's1', currentRank: 'M2', birthYear: 2000, stats: { wins: 80, losses: 70, absences: 0 }, attributes: { power: 50 } } as any]
            ]),`);
test04 = test04.replace(/mockWorld\.rikishi\['r_1'\]/g, 'mockWorld.rikishi.get("r_1")');
test04 = test04.replace(/mockWorld\.rikishi\['r_2'\]/g, 'mockWorld.rikishi.get("r_2")');
fs.writeFileSync('src/engine/__tests__/04_calendar.test.ts', test04);
