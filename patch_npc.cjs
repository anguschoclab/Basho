const fs = require('fs');
const file = 'src/engine/npcAI.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Add OyakataMood to imports
if (!code.includes('OyakataMood')) {
  code = code.replace('OyakataArchetype, Oyakata,', 'OyakataArchetype, Oyakata, OyakataMood,');
}

// 2. Add mood logic into getManagerPersona
if (!code.includes('mood: OyakataMood;')) {
  code = code.replace(
    'perception: PerceptionSnapshot;',
    'perception: PerceptionSnapshot;\n  mood: OyakataMood;'
  );

  const personaCreation = `return {
    archetype: oyakata.archetype,
    traits: oyakata.traits,
    quirks: oyakata.quirks ?? [],
    styleBias,
    welfareDiscipline,
    riskAppetite,
    perception
  };`;

  const newPersonaCreation = `
  let mood = oyakata.mood ?? "neutral";
  // Dynamically adjust mood based on perception if not fixed
  if (!oyakata.mood) {
    let score = 50;
    if (perception.rosterStrengthBand === "dominant") score += 20;
    if (perception.rosterStrengthBand === "weak") score -= 20;
    if (perception.welfareRiskBand === "critical") score -= 30;
    if (perception.stableMediaHeatBand === "blazing") score -= 10;
    if (perception.moraleBand === "inspired") score += 15;
    if (perception.moraleBand === "mutinous") score -= 30;

    if (score >= 80) mood = "ecstatic";
    else if (score >= 60) mood = "pleased";
    else if (score >= 40) mood = "neutral";
    else if (score >= 20) mood = "frustrated";
    else mood = "furious";
  }

  return {
    archetype: oyakata.archetype,
    traits: oyakata.traits,
    quirks: oyakata.quirks ?? [],
    styleBias,
    welfareDiscipline,
    riskAppetite,
    perception,
    mood
  };`;

  code = code.replace(personaCreation, newPersonaCreation);
}

// 3. Update decideTrainingIntensity
if (!code.includes('moodModifier')) {
  const oldFunc = `function decideTrainingIntensity(
  perception: PerceptionSnapshot,
  riskAppetite: number,
  welfareDiscipline: number,
  complianceCap?: TrainingIntensity,
  philosophy?: RecruitmentPhilosophy
): { intensity: TrainingIntensity; reason: string } {`;

  const newFunc = `function decideTrainingIntensity(
  perception: PerceptionSnapshot,
  riskAppetite: number,
  welfareDiscipline: number,
  mood: OyakataMood,
  complianceCap?: TrainingIntensity,
  philosophy?: RecruitmentPhilosophy
): { intensity: TrainingIntensity; reason: string } {`;

  code = code.replace(oldFunc, newFunc);

  const moodLogic = `
  // 1. Mood Modifiers
  let moodModifier = 0;
  if (mood === "furious") moodModifier = 20; // Furious Oyakata trains harder
  if (mood === "ecstatic") moodModifier = -10; // Ecstatic Oyakata might ease up a bit

  const adjustedRiskAppetite = riskAppetite + moodModifier;
  `;

  code = code.replace('// 1. Welfare compliance check (A7.1)', moodLogic + '\n  // 2. Welfare compliance check (A7.1)');
  code = code.replace('riskAppetite > 75', 'adjustedRiskAppetite > 75');
  code = code.replace('riskAppetite > 60', 'adjustedRiskAppetite > 60');

  // Update makeNPCWeeklyDecision call
  code = code.replace(
    'const intensityDecision = decideTrainingIntensity(\n    perception, persona.riskAppetite, persona.welfareDiscipline, complianceCap, philosophy\n  );',
    'const intensityDecision = decideTrainingIntensity(\n    perception, persona.riskAppetite, persona.welfareDiscipline, persona.mood, complianceCap, philosophy\n  );'
  );
}

fs.writeFileSync(file, code);
console.log('patched npcAI.ts');
