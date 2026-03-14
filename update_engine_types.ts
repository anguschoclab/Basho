import fs from 'fs';

const worldTsPath = 'src/engine/types/world.ts';
let worldTs = fs.readFileSync(worldTsPath, 'utf8');

const worldAdditions = `

  /** Internal/Legacy properties migrated from 'as any' casts */
  _interimDaysRemaining?: number;
  _postBashoDays?: number;
  currentBashoName?: string;
  rivalriesState?: any;
  trainingState?: any;
  injuriesState?: any;
  mediaState?: any;
  welfareState?: any;
  ozekiKadoban?: any;
  hallOfFame?: any;
  talentPool?: any;
  almanacSnapshots?: any;
  sponsorPool?: any;
  currentBasho?: any;
`;

if (!worldTs.includes('_interimDaysRemaining')) {
  worldTs = worldTs.replace(/export interface World \{([\s\S]*?)\}/, (match, p1) => {
    return `export interface World {${p1}${worldAdditions}}`;
  });
  fs.writeFileSync(worldTsPath, worldTs);
  console.log('Updated World interface');
} else {
  console.log('World interface already updated');
}

const rikishiTsPath = 'src/engine/types/rikishi.ts';
let rikishiTs = fs.readFileSync(rikishiTsPath, 'utf8');

const rikishiAdditions = `

  /** Internal/Legacy properties migrated from 'as any' casts */
  injuryWeeksRemaining?: number;
  injuryStatus?: any;
  injury?: any;
  injured?: boolean;
  power?: number;
  economics?: any;
`;

if (!rikishiTs.includes('injuryWeeksRemaining')) {
  rikishiTs = rikishiTs.replace(/export interface Rikishi \{([\s\S]*?)\}/, (match, p1) => {
    return `export interface Rikishi {${p1}${rikishiAdditions}}`;
  });
  fs.writeFileSync(rikishiTsPath, rikishiTs);
  console.log('Updated Rikishi interface');
} else {
  console.log('Rikishi interface already updated');
}
