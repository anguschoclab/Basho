// Style win/loss tracking
type StyleRecord = {
  wins: number;
  losses: number;
  kills: number;
};

type FightInput = {
  styleA: string;
  styleD: string;
  winner: 'A' | 'D' | null;
  by: string | null;
  isTournament: boolean;
};

const weeklyRecords = new Map<string, StyleRecord>();
const tournamentRecords = new Map<string, StyleRecord>();

function ensure(style: string, map: Map<string, StyleRecord>): StyleRecord {
  if (!map.has(style)) {
    map.set(style, { wins: 0, losses: 0, kills: 0 });
  }
  return map.get(style)!;
}

export const StyleMeter = {
  recordFight(input: FightInput) {
    const map = input.isTournament ? tournamentRecords : weeklyRecords;
    const recA = ensure(input.styleA, map);
    const recD = ensure(input.styleD, map);

    if (input.winner === 'A') {
      recA.wins++;
      recD.losses++;
      if (input.by === 'Kill') recA.kills++;
    } else if (input.winner === 'D') {
      recD.wins++;
      recA.losses++;
      if (input.by === 'Kill') recD.kills++;
    }
  },

  getWeeklyRecords(): Map<string, StyleRecord> {
    return new Map(weeklyRecords);
  },

  getTournamentRecords(): Map<string, StyleRecord> {
    return new Map(tournamentRecords);
  },

  flushWeek() {
    weeklyRecords.clear();
  },

  flushTournament() {
    tournamentRecords.clear();
  },
};
