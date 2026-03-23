const fs = require('fs');
const path = './src/engine/__tests__/uiModels.test.ts';
let content = fs.readFileSync(path, 'utf8');

const newTests = `
  describe("Injury Modifiers", () => {
    it("should project injury modifiers when rikishi has a minor knee injury", () => {
      const world = generateWorld("test-inj-1");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "sprain", severity: "minor", location: "knee", weeksRemaining: 1 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("taped_up");
    });

    it("should project injury modifiers when rikishi has a moderate back injury", () => {
      const world = generateWorld("test-inj-2");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = true;
      rikishi.injuryStatus = { type: "strain", severity: 40, location: "back", weeksRemaining: 2 };

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toContain("hampered");
    });

    it("should not project injury modifiers when rikishi is healthy", () => {
      const world = generateWorld("test-inj-3");
      const rikishiId = Array.from(world.rikishi.keys())[0];
      const rikishi = world.rikishi.get(rikishiId)!;

      rikishi.injured = false;
      rikishi.injuryStatus = undefined;

      const uiRikishi = projectRikishi(rikishi, world);
      expect(uiRikishi.descriptor.injuryModifiers).toEqual([]);
    });
  });
});`;

content = content.replace(/}\);\n$/, newTests);
fs.writeFileSync(path, content);
console.log('Tests patched');
