import { generateInitialWorld } from './src/engine/systems/generation/WorldFactory';

const world = generateInitialWorld("test-uimodels-heya");
const heyaId = Array.from(world.heyas.keys())[0];

console.time("Array.from.filter");
for(let i=0; i<10000; i++) {
    const expectedSize = Array.from(world.rikishi.values()).filter((r: any) => r.heyaId === heyaId).length;
}
console.timeEnd("Array.from.filter");

console.time("for...of");
for(let i=0; i<10000; i++) {
    let expectedSize = 0;
    for (const r of world.rikishi.values()) {
        if (r.heyaId === heyaId) {
            expectedSize++;
        }
    }
}
console.timeEnd("for...of");
