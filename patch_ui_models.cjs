const fs = require('fs');
let file = fs.readFileSync('src/engine/uiModels.ts', 'utf8');

file = file.replace(
  'import { toRikishiDescriptor, toPotentialBand, toPrizeBand, PRIZE_LABELS, type RikishiDescriptor, type PotentialBand } from "./descriptorBands";',
  'import { toRikishiDescriptor, toPotentialBand, toPrizeBand, PRIZE_LABELS, toConditionBand, toFatigueBand, toMomentumBand, toMotivationBand, type ConditionBand, type FatigueBand, type MomentumBand, type MotivationBand, type RikishiDescriptor, type PotentialBand } from "./descriptorBands";'
);

file = file.replace(/condition: number; \/\/ 0-100 \(allowed to show\)/g, 'conditionBand: ConditionBand;');
file = file.replace(/motivation: number; \/\/ 0-100 \(allowed to show\)/g, 'motivationBand: MotivationBand;');
file = file.replace(/fatigue: number; \/\/ 0-100 \(allowed to show\)/g, 'fatigueBand: FatigueBand;');
file = file.replace(/momentum: number; \/\/ 0-100 \(allowed to show\)/g, 'momentumBand: MomentumBand;');

file = file.replace(/condition: r\.condition,/g, 'conditionBand: toConditionBand(r.condition),');
file = file.replace(/motivation: r\.motivation,/g, 'motivationBand: toMotivationBand(r.motivation),');
file = file.replace(/fatigue: r\.fatigue,/g, 'fatigueBand: toFatigueBand(r.fatigue),');
file = file.replace(/momentum: r\.momentum,/g, 'momentumBand: toMomentumBand(r.momentum),');

file = file.replace(/condition: number;/g, 'conditionBand: ConditionBand;');
file = file.replace(/fatigue: number;/g, 'fatigueBand: FatigueBand;');
file = file.replace(/momentum: number;/g, 'momentumBand: MomentumBand;');

fs.writeFileSync('src/engine/uiModels.ts', file, 'utf8');
