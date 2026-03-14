const fs = require('fs');
const file = 'src/engine/npcAI.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('logEngineEvent(') || !code.includes('OyakataMood')) {
  console.log("Not ready to patch event yet, something is wrong");
} else {

  const logEventReplacement = `
    const oldMood = heya.oyakataId ? world.oyakata.get(heya.oyakataId)?.mood : "neutral";
    const newMood = decision.mood;

    // Set the mood back on the Oyakata
    if (heya.oyakataId) {
      const oyakata = world.oyakata.get(heya.oyakataId);
      if (oyakata) oyakata.mood = newMood;
    }

    if (oldMood !== newMood) {
      logEngineEvent(world, {
        type: "OYAKATA_MOOD_SHIFT",
        category: "narrative",
        importance: "major",
        scope: "heya",
        heyaId: heya.id,
        title: \`\${heya.name} Oyakata is \${newMood}\`,
        summary: \`The master of \${heya.name} is now feeling \${newMood}.\`,
        data: { oldMood, newMood }
      });
    }

    // Publish scouting priority for talentpool consumption
  `;

  if (!code.includes('OYAKATA_MOOD_SHIFT')) {
    code = code.replace('// Publish scouting priority for talentpool consumption', logEventReplacement);

    // We also need to export mood in the decision
    code = code.replace(
      'individualPushes: Id[];\n  reasoning: string[];\n}',
      'individualPushes: Id[];\n  reasoning: string[];\n  mood: OyakataMood;\n}'
    );

    code = code.replace(
      'individualPushes,\n    reasoning\n  };',
      'individualPushes,\n    reasoning,\n    mood: persona.mood\n  };'
    );

    fs.writeFileSync(file, code);
    console.log("Patched npcAI to emit OYAKATA_MOOD_SHIFT");
  } else {
    console.log("Already patched events");
  }
}
