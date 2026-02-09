import { Rikishi, Heya, WorldState, Rank } from "./types";

export interface RikishiUIModel {
  id: string;
  name: string;
  shikona: string;
  heya: string; // Name of the heya
  rank: Rank;
  record: string; // "8-7", "10-5" etc.
  careerRecord: string; // "145-120"
  stats: {
    strength: number;
    technique: number;
    speed: number;
    weight: number;
    stamina: number;
    mental: number;
    adaptability: number;
    balance: number;
  };
  // New Lifecycle & Narrative Fields
  age: number;
  origin: string;
  archetype: string;
  condition: number; // 0-100
  injuryStatus: {
    isInjured: boolean;
    severity: string; // "None", "Minor", "Major", "Career-Ending"
  };
  // UI Helper for rivalries
  rivalries: { opponentId: string; opponentName: string; record: string }[]; 
}

export function toRikishiUIModel(rikishi: Rikishi, world: WorldState): RikishiUIModel {
  const heya = world.heyas.get(rikishi.heyaId);
  
  // Format record
  const wins = rikishi.currentBashoRecord?.wins || 0;
  const losses = rikishi.currentBashoRecord?.losses || 0;
  const recordStr = `${wins}-${losses}`;

  // Format Career Record
  const cWins = rikishi.careerRecord?.wins || 0;
  const cLosses = rikishi.careerRecord?.losses || 0;
  const careerStr = `${cWins}-${cLosses}`;

  // Injury Text
  let injuryText = "None";
  const severity = rikishi.injuryStatus?.severity;
  const severityNum = typeof severity === "number" ? severity : 0;
  if (rikishi.injuryStatus?.isInjured) {
    if (severityNum < 30) injuryText = "Minor";
    else if (severityNum < 70) injuryText = "Major";
    else injuryText = "Critical";
  }

  // Extract Top Rivalries (Top 3 by total matches fought)
  // Ensure h2h exists
  const h2hMap = rikishi.h2h || {};
  const rivalries = Object.entries(h2hMap)
    .map(([oppId, rec]) => {
      const opp = world.rikishi.get(oppId);
      return {
        opponentId: oppId,
        opponentName: opp?.shikona || "Unknown",
        record: `${rec.wins}-${rec.losses}`,
        total: rec.wins + rec.losses
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
    .map(({ opponentId, opponentName, record }) => ({ opponentId, opponentName, record }));

  const currentYear = world.year;
  const age = currentYear - (rikishi.birthYear || currentYear - 25);

  return {
    id: rikishi.id,
    name: rikishi.name || rikishi.shikona,
    shikona: rikishi.shikona,
    heya: heya?.name || "Unknown",
    rank: rikishi.rank,
    record: recordStr,
    careerRecord: careerStr,
    stats: {
      strength: rikishi.stats?.strength || rikishi.power || 50,
      technique: rikishi.stats?.technique || rikishi.technique || 50,
      speed: rikishi.stats?.speed || rikishi.speed || 50,
      weight: rikishi.stats?.weight || rikishi.weight || 140,
      stamina: rikishi.stats?.stamina || rikishi.stamina || 50,
      mental: rikishi.stats?.mental || rikishi.aggression || 50,
      adaptability: rikishi.stats?.adaptability || rikishi.adaptability || 50,
      balance: rikishi.stats?.balance || rikishi.balance || 50,
    },
    age,
    origin: rikishi.origin || rikishi.nationality || "Unknown",
    archetype: rikishi.archetype || "all_rounder",
    condition: rikishi.condition || 100,
    injuryStatus: {
      isInjured: rikishi.injured || rikishi.injuryStatus?.isInjured || false,
      severity: injuryText
    },
    rivalries
  };
}
