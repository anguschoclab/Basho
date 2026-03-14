const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src/engine/__tests__/facilities.test.ts');
let content = fs.readFileSync(targetPath, 'utf-8');

const newTests = `
describe("Facilities: NPC Auto-Investment missing branches", () => {
  it("should prioritize the weakest facility if ambition and compassion are low", () => {
    // We want the 'else' branch where ambition <= 70 and compassion <= 70
    const world = makeWorld(
      { funds: 50_000_000, facilities: { training: 50, recovery: 50, nutrition: 30 } },
      {
        playerOwned: false,
        oyakataOverrides: { traits: { ambition: 50, patience: 50, risk: 50, tradition: 80, compassion: 50 } },
      }
    );

    tickMonthly(world);

    const heya = world.heyas.get("test-heya");
    // Nutrition was the weakest (30), so it should be prioritized for investment
    expect(heya.facilities.nutrition).toBeGreaterThan(30);
  });
});
`;

fs.writeFileSync(targetPath, content + newTests);
console.log("Successfully patched tests part 2.");
