const fs = require('fs');
const content = fs.readFileSync('src/engine/__tests__/events.test.ts', 'utf8');

const testSuite = `
  describe("EventBus factories", () => {
    let world;

    beforeEach(() => {
      world = createMockWorld();
    });

    it("should log injury event", () => {
      EventBus.injury(world, "r1", "Title", "Summary", { severity: "serious" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("INJURY_OCCURRED");
      expect(ev.category).toBe("injury");
      expect(ev.importance).toBe("headline");
      expect(ev.scope).toBe("rikishi");
      expect(ev.rikishiId).toBe("r1");
    });

    it("should log recovery event", () => {
      EventBus.recovery(world, "r1", "h1", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("INJURY_RECOVERED");
      expect(ev.importance).toBe("notable");
      expect(ev.heyaId).toBe("h1");
    });

    it("should log governance event", () => {
      EventBus.governance(world, "h1", "Ruling", "Summary", { fine: 500 }, "headline");
      const ev = world.events.log[0];
      expect(ev.type).toBe("GOVERNANCE_RULING");
      expect(ev.category).toBe("discipline");
      expect(ev.heyaId).toBe("h1");
      expect(ev.importance).toBe("headline");
    });

    it("should log trainingMilestone event", () => {
      EventBus.trainingMilestone(world, "r1", "h1", "Milestone", "Summary", { stat: "power" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("TRAINING_MILESTONE");
      expect(ev.category).toBe("training");
      expect(ev.rikishiId).toBe("r1");
      expect(ev.heyaId).toBe("h1");
    });

    it("should log trainingProfileChanged event", () => {
      EventBus.trainingProfileChanged(world, "h1", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("TRAINING_PROFILE_CHANGED");
      expect(ev.heyaId).toBe("h1");
    });

    it("should log financialAlert event", () => {
      EventBus.financialAlert(world, "h1", "Alert", "Summary", { insolvency: true });
      const ev = world.events.log[0];
      expect(ev.type).toBe("FINANCIAL_ALERT");
      expect(ev.category).toBe("economy");
      expect(ev.importance).toBe("headline");
    });

    it("should log kenshoAwarded event", () => {
      EventBus.kenshoAwarded(world, "r1", "h1", 300000, 5);
      const ev = world.events.log[0];
      expect(ev.type).toBe("KENSHO_AWARDED");
      expect(ev.importance).toBe("notable");
      expect(ev.data).toEqual({ amount: 300000, envelopes: 5 });
    });

    it("should log rivalryEscalated event", () => {
      EventBus.rivalryEscalated(world, "r1", "r2", "inferno", "bitter", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RIVALRY_ESCALATED");
      expect(ev.importance).toBe("headline");
      expect(ev.data.heatBand).toBe("inferno");
    });

    it("should log rivalryFormed event", () => {
      EventBus.rivalryFormed(world, "r1", "r2", "friendly", "Summary");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RIVALRY_FORMED");
      expect(ev.data.aId).toBe("r1");
    });

    it("should log retirement event", () => {
      EventBus.retirement(world, "r1", "h1", "John", "Old age");
      const ev = world.events.log[0];
      expect(ev.type).toBe("RETIREMENT");
      expect(ev.category).toBe("career");
      expect(ev.data.reason).toBe("Old age");
    });

    it("should log rookieDebut event", () => {
      EventBus.rookieDebut(world, "r1", "h1", "New Guy");
      const ev = world.events.log[0];
      expect(ev.type).toBe("ROOKIE_DEBUT");
      expect(ev.rikishiId).toBe("r1");
    });

    it("should log scoutingInvestmentChanged event", () => {
      EventBus.scoutingInvestmentChanged(world, "r1", "high");
      const ev = world.events.log[0];
      expect(ev.type).toBe("SCOUTING_INVESTMENT_CHANGED");
      expect(ev.data.level).toBe("high");
    });

    it("should log bashoStarted event", () => {
      EventBus.bashoStarted(world, "Hatsu");
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_STARTED");
      expect(ev.data.bashoName).toBe("Hatsu");
    });

    it("should log bashoEnded event", () => {
      EventBus.bashoEnded(world, "Hatsu", "r1", "Champ");
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_ENDED");
      expect(ev.data.yushoId).toBe("r1");
    });

    it("should log bashoDay event", () => {
      EventBus.bashoDay(world, 15);
      const ev = world.events.log[0];
      expect(ev.type).toBe("BASHO_DAY_ADVANCED");
      expect(ev.importance).toBe("major");
      expect(ev.data.day).toBe(15);
    });

    it("should log welfareAlert event", () => {
      EventBus.welfareAlert(world, "h1", "Warning", "Summary", { complianceState: "sanctioned" });
      const ev = world.events.log[0];
      expect(ev.type).toBe("WELFARE_ALERT");
      expect(ev.importance).toBe("headline");
    });

    it("should log boutResult event", () => {
      EventBus.boutResult(world, "w1", "l1", "yorikiri", 5);
      const ev = world.events.log[0];
      expect(ev.type).toBe("BOUT_RESULT");
      expect(ev.data.kimarite).toBe("yorikiri");
      expect(ev.data.winnerId).toBe("w1");
    });
  });
`;

const insertIndex = content.indexOf('describe("logEngineEvent", () => {');
const newContent = content.slice(0, insertIndex) + testSuite + '\n  ' + content.slice(insertIndex);

fs.writeFileSync('src/engine/__tests__/events.test.ts', newContent);
