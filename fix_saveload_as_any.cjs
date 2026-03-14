const fs = require('fs');

const filePath = 'src/engine/saveload.ts';
let content = fs.readFileSync(filePath, 'utf8');

// The file has several `world as any` and `serialized as any`
content = content.replace(/\(world as any\)\.talentPool/g, 'world.talentPool');
content = content.replace(/\(world as any\)\.almanacSnapshots/g, 'world.almanacSnapshots');
content = content.replace(/\(world as any\)\.sponsorPool/g, 'world.sponsorPool');
content = content.replace(/\(world as any\)\.ozekiKadoban/g, 'world.ozekiKadoban');
content = content.replace(/\(world as any\)\.hallOfFame/g, 'world.hallOfFame');
content = content.replace(/\(world as any\)\.mediaState/g, 'world.mediaState');

content = content.replace(/\(serialized as any\)\.heyas/g, 'serialized.heyas');
content = content.replace(/\(serialized as any\)\.rikishi/g, 'serialized.rikishi');
content = content.replace(/\(serialized as any\)\.oyakata/g, 'serialized.oyakata');
content = content.replace(/\(serialized as any\)\.calendar/g, 'serialized.calendar');
content = content.replace(/\(serialized as any\)\.dayIndexGlobal/g, 'serialized.dayIndexGlobal');
content = content.replace(/\(serialized as any\)\.events/g, 'serialized.events');
content = content.replace(/\(serialized as any\)\.talentPool/g, 'serialized.talentPool');
content = content.replace(/\(serialized as any\)\.almanacSnapshots/g, 'serialized.almanacSnapshots');
content = content.replace(/\(serialized as any\)\.sponsorPool/g, 'serialized.sponsorPool');
content = content.replace(/\(serialized as any\)\.ozekiKadoban/g, 'serialized.ozekiKadoban');
content = content.replace(/\(serialized as any\)\.hallOfFame/g, 'serialized.hallOfFame');
content = content.replace(/\(serialized as any\)\.mediaState/g, 'serialized.mediaState');

// Also remove the `anyR` and `anyH` variables
content = content.replace(/const anyR = r as any;/g, 'const anyR = r;');
content = content.replace(/const anyH = h as any;/g, 'const anyH = h;');

fs.writeFileSync(filePath, content);
console.log('Fixed saveload.ts');
