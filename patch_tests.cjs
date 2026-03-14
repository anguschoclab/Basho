const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src/engine/__tests__/facilities.test.ts');
let content = fs.readFileSync(targetPath, 'utf-8');

// Append getUpgradeCostEstimate block inside the already existing Facilities: Investment block?
// No, let's just append at the end of the file. It's safer and easier.

const newTests = `

// ============================================================================
// ADDED TESTS FOR COVERAGE
// ============================================================================

describe("Facilities: getUpgradeCostEstimate coverage", () => {
  it("should handle custom points correctly", () => {
    const heya = makeHeya({ facilities: { training: 50, recovery: 50, nutrition: 50 } });
    const cost5 = getUpgradeCostEstimate(heya, "training", 5);
    const cost1 = getUpgradeCostEstimate(heya, "training", 1);

    // We expect 5 points to cost roughly 5 times 1 point (or slightly more if threshold crossed)
    expect(cost5).toBeGreaterThan(cost1);
    expect(cost1).toBeGreaterThan(0);
  });

  it("should cap at MAX_FACILITY when requesting points past the max", () => {
    // Current is 98, Max is 100. Effective should be 2.
    const heya = makeHeya({ facilities: { training: 98, recovery: 50, nutrition: 50 } });
    const costFor5 = getUpgradeCostEstimate(heya, "training", 5);
    const costFor2 = getUpgradeCostEstimate(heya, "training", 2);

    // Since effective is maxed at 2, asking for 5 should cost the same as asking for 2.
    expect(costFor5).toBe(costFor2);
  });

  it("should return 0 when already at MAX_FACILITY", () => {
    const heya = makeHeya({ facilities: { training: 100, recovery: 50, nutrition: 50 } });
    const cost = getUpgradeCostEstimate(heya, "training", 5);

    expect(cost).toBe(0);
  });
});

describe("Facilities: Monthly Decay Logging", () => {
  it("should log FACILITY_DEGRADED event when a facility drops in band", () => {
    // Start at exactly 25 (basic band) with 0 funds
    const heya = makeHeya({
      facilities: { training: 25, recovery: 25, nutrition: 25 },
      facilitiesBand: "basic",
      funds: 0
    });
    const world = makeWorld({}, { playerOwned: false });
    // Override the world heya to our strict setup
    world.heyas.set(heya.id, heya);

    tickMonthly(world);

    // After tickMonthly, since funds are 0, it should decay by DECAY_RATE (2 points) -> 23 average
    // This drops the band from basic to minimal.
    expect(heya.facilitiesBand).toBe("minimal");

    // The event log should now contain a FACILITY_DEGRADED event
    const degradeEvent = world.events.log.find(e => e.type === "FACILITY_DEGRADED");
    expect(degradeEvent).toBeDefined();
    expect(degradeEvent?.data?.oldBand).toBe("basic");
    expect(degradeEvent?.data?.newBand).toBe("minimal");
  });
});
`;

fs.writeFileSync(targetPath, content + newTests);
console.log("Successfully patched tests.");
