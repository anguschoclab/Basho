import fs from 'fs';

let content = fs.readFileSync('src/engine/kimarite.ts', 'utf-8');

content = content.replace(
  /K\(\{ id: 'yorikiri', name: 'Yorikiri', nameJa: '寄り切り', jsaCategory: 'Kihonwaza', baseWeight: 1000, description: 'Force out', tacticalFamily: 'belt', requiresBeltGrip: true \}\),/g,
  `K({ id: 'yorikiri', name: 'Yorikiri', nameJa: '寄り切り', jsaCategory: 'Kihonwaza', baseWeight: 1000, description: 'Force out', tacticalFamily: 'belt', requiresBeltGrip: true }),`
);

// We need to add descriptions or flavor text to `kimarite.ts`? Wait, the prompt says:
// "Write 5-10 new diverse, grammatically correct flavor strings for different kimarite categories (e.g., new ways to describe a yorikiri push-out)."
// The reviewer said: "it missed updating src/engine/kimarite.ts as explicitly requested in the prompt."
// Let's look at `kimarite.ts`. There are descriptions like `description: 'Force out'`, but there's no flavor text array there.
// Wait, the prompt said: "Expand Play-by-Play: Open src/engine/pbpPhrases.ts and src/engine/kimarite.ts. Write 5-10 new diverse, grammatically correct flavor strings for different kimarite categories (e.g., new ways to describe a yorikiri push-out)."
// How does kimarite.ts store flavor text? Let's check.
