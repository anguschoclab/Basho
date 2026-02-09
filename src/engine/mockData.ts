/**
 * File Name: src/engine/mockData.ts
 * Notes:
 * - Backfilled mock data with 'origin', 'archetype', 'h2h', 'adaptability' fields.
 * - Prevents runtime errors when testing UI components with static data.
 * - Aligns with new Type definitions.
 */

import { Rikishi, Heya, Oyakata } from "./types";

export const SAMPLE_RIKISHI: Rikishi[] = [
  {
    id: "r1",
    name: "Hakuho (Mock)",
    shikona: "Hakuho",
    heyaId: "h1",
    nationality: "Mongolia",
    birthYear: 1985,
    origin: "Mongolia",
    
    rank: "yokozuna",
    division: "makuuchi",
    rankNumber: 1,
    side: "east",
    
    height: 192,
    weight: 155,
    
    stats: {
      strength: 95, 
      technique: 98, 
      speed: 85, 
      weight: 155, 
      stamina: 90, 
      mental: 99, 
      adaptability: 95,
      balance: 92
    },
    
    power: 95,
    speed: 85,
    balance: 92,
    technique: 98,
    aggression: 80,
    experience: 99,
    adaptability: 95,
    fatigue: 0,
    momentum: 80,
    stamina: 90,
    
    style: "yotsu",
    archetype: "yotsu_specialist",
    
    careerWins: 1187,
    careerLosses: 247,
    currentBashoWins: 15,
    currentBashoLosses: 0,
    careerRecord: { wins: 1187, losses: 247, yusho: 45 },
    currentBashoRecord: { wins: 15, losses: 0 },
    
    history: [],
    h2h: {},
    
    injuryStatus: { 
      type: "none",
      isInjured: false, 
      severity: 0, 
      location: "", 
      weeksRemaining: 0,
      weeksToHeal: 0 
    },
    injured: false,
    injuryWeeksRemaining: 0,
    
    condition: 100,
    motivation: 100,
    personalityTraits: ["Legend", "Intimidating"],
    favoredKimarite: [],
    weakAgainstStyles: []
  },
  {
    id: "r2",
    name: "Takakeisho (Mock)",
    shikona: "Takakeisho",
    heyaId: "h2",
    nationality: "Japan",
    birthYear: 1996,
    origin: "Hyogo",
    
    rank: "ozeki",
    division: "makuuchi",
    rankNumber: 1,
    side: "west",
    
    height: 175,
    weight: 165,
    
    stats: {
      strength: 92, 
      technique: 70, 
      speed: 88, 
      weight: 165, 
      stamina: 60, 
      mental: 85, 
      adaptability: 60,
      balance: 75
    },
    
    power: 92,
    speed: 88,
    balance: 75,
    technique: 70,
    aggression: 90,
    experience: 70,
    adaptability: 60,
    fatigue: 10,
    momentum: 70,
    stamina: 60,
    
    style: "oshi",
    archetype: "oshi_specialist",
    
    careerWins: 300,
    careerLosses: 150,
    currentBashoWins: 11,
    currentBashoLosses: 4,
    careerRecord: { wins: 300, losses: 150, yusho: 2 },
    currentBashoRecord: { wins: 11, losses: 4 },
    
    history: [],
    h2h: {},
    
    injuryStatus: { 
      type: "strain",
      isInjured: true, 
      severity: "moderate", 
      location: "Neck", 
      weeksRemaining: 2,
      weeksToHeal: 2 
    },
    injured: true,
    injuryWeeksRemaining: 2,
    
    condition: 75,
    motivation: 90,
    personalityTraits: ["Pusher"],
    favoredKimarite: [],
    weakAgainstStyles: []
  }
];

export const MOCK_RIKISHI = SAMPLE_RIKISHI;

export const MOCK_HEYAS: Heya[] = [
  {
    id: "h1",
    name: "Miyagino",
    oyakataId: "o1",
    location: "Tokyo",
    funds: 5000000,
    reputation: 90,
    rikishiIds: ["r1"],
    
    statureBand: "legendary",
    prestigeBand: "elite",
    facilitiesBand: "world_class",
    koenkaiBand: "powerful",
    runwayBand: "secure",
    
    scandalScore: 0,
    governanceStatus: "good_standing",
    
    facilities: {
      training: 90,
      recovery: 85,
      nutrition: 90
    },
    
    riskIndicators: {
      financial: false,
      governance: false,
      rivalry: false
    }
  },
  {
    id: "h2",
    name: "Tokiwayama",
    oyakataId: "o2",
    location: "Tokyo",
    funds: 3000000,
    reputation: 75,
    rikishiIds: ["r2"],
    
    statureBand: "established",
    prestigeBand: "respected",
    facilitiesBand: "adequate",
    koenkaiBand: "moderate",
    runwayBand: "comfortable",
    
    scandalScore: 0,
    governanceStatus: "good_standing",
    
    facilities: {
      training: 60,
      recovery: 55,
      nutrition: 60
    },
    
    riskIndicators: {
      financial: false,
      governance: false,
      rivalry: false
    }
  }
];

export const MOCK_OYAKATA: Oyakata[] = [
  {
    id: "o1",
    name: "Miyagino Oyakata",
    heyaId: "h1",
    age: 55,
    archetype: "strategist",
    traits: {
      ambition: 80,
      patience: 70,
      risk: 50,
      tradition: 60,
      compassion: 65
    },
    yearsInCharge: 15,
    stats: { scouting: 80, training: 90, politics: 70 },
    personality: "Strategic"
  }
];
