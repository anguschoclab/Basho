import { describe, it, expect } from "vitest";
import {
  NON_SEKITORI_BASHO_ALLOWANCE,
  POLITICAL_FAVOR_ADVANCE_PAYOUT,
  NPC_FALLBACK_MONTHLY_BURN_ESTIMATE,
  NPC_RIKISHI_BURN_ESTIMATE_MONTHLY,
  NPC_FACILITY_BURN_MULTIPLIER,
  INSOLVENCY_WARNING_THRESHOLD,
  FINE_PENALTY_SEVERE_THRESHOLD,
  FINE_PENALTY_SIGNIFICANT_THRESHOLD,
  FINE_PENALTY_MODERATE_THRESHOLD,
  BACKSTORY_STARTING_FUNDS,
  MYOSEKI_TOTAL_COUNT,
  MYOSEKI_BASE_ASKING_PRICE,
  MYOSEKI_MAX_ASKING_PRICE,
  MYOSEKI_LEASE_RATE_PERCENT,
  MYOSEKI_PRICE_JITTER,
  MYOSEKI_PRICE_ADJUSTMENT_RANGE,
  MYOSEKI_GENERATION_BASE_PRICES,
  SPONSOR_RECRUITMENT_COSTS,
} from "@/constants/engine/economic";

describe("Extracted economic constants", () => {
  describe("SPONSOR_RECRUITMENT_COSTS", () => {
    it("has all 6 sponsor tiers with correct values", () => {
      expect(SPONSOR_RECRUITMENT_COSTS.T0).toBe(50_000);
      expect(SPONSOR_RECRUITMENT_COSTS.T1).toBe(150_000);
      expect(SPONSOR_RECRUITMENT_COSTS.T2).toBe(400_000);
      expect(SPONSOR_RECRUITMENT_COSTS.T3).toBe(800_000);
      expect(SPONSOR_RECRUITMENT_COSTS.T4).toBe(1_500_000);
      expect(SPONSOR_RECRUITMENT_COSTS.T5).toBe(4_000_000);
    });
  });

  describe("MYOSEKI_GENERATION_BASE_PRICES", () => {
    it("has 3 prestige tiers with correct values", () => {
      expect(MYOSEKI_GENERATION_BASE_PRICES.elite).toBe(250_000_000);
      expect(MYOSEKI_GENERATION_BASE_PRICES.respected).toBe(200_000_000);
      expect(MYOSEKI_GENERATION_BASE_PRICES.modest).toBe(150_000_000);
    });
  });

  describe("MYOSEKI market constants", () => {
    it("has correct total count", () => {
      expect(MYOSEKI_TOTAL_COUNT).toBe(105);
    });
    it("has correct base asking price", () => {
      expect(MYOSEKI_BASE_ASKING_PRICE).toBe(150_000_000);
    });
    it("has correct max asking price", () => {
      expect(MYOSEKI_MAX_ASKING_PRICE).toBe(350_000_000);
    });
    it("has correct lease rate percent", () => {
      expect(MYOSEKI_LEASE_RATE_PERCENT).toBe(0.05);
    });
    it("has correct price jitter", () => {
      expect(MYOSEKI_PRICE_JITTER).toBe(50_000_000);
    });
    it("has correct price adjustment range", () => {
      expect(MYOSEKI_PRICE_ADJUSTMENT_RANGE).toBe(20_000_000);
    });
  });

  describe("POLITICAL_FAVOR_ADVANCE_PAYOUT", () => {
    it("equals 5,000,000", () => {
      expect(POLITICAL_FAVOR_ADVANCE_PAYOUT).toBe(5_000_000);
    });
  });

  describe("NPC burn estimates", () => {
    it("NPC_FALLBACK_MONTHLY_BURN_ESTIMATE equals 5,000,000", () => {
      expect(NPC_FALLBACK_MONTHLY_BURN_ESTIMATE).toBe(5_000_000);
    });
    it("NPC_RIKISHI_BURN_ESTIMATE_MONTHLY equals 150,000", () => {
      expect(NPC_RIKISHI_BURN_ESTIMATE_MONTHLY).toBe(150_000);
    });
    it("NPC_FACILITY_BURN_MULTIPLIER equals 9,000", () => {
      expect(NPC_FACILITY_BURN_MULTIPLIER).toBe(9_000);
    });
  });

  describe("INSOLVENCY_WARNING_THRESHOLD", () => {
    it("equals 1,000,000", () => {
      expect(INSOLVENCY_WARNING_THRESHOLD).toBe(1_000_000);
    });
  });

  describe("FINE_PENALTY thresholds", () => {
    it("severe threshold equals 10,000,000", () => {
      expect(FINE_PENALTY_SEVERE_THRESHOLD).toBe(10_000_000);
    });
    it("significant threshold equals 3,000,000", () => {
      expect(FINE_PENALTY_SIGNIFICANT_THRESHOLD).toBe(3_000_000);
    });
    it("moderate threshold equals 500,000", () => {
      expect(FINE_PENALTY_MODERATE_THRESHOLD).toBe(500_000);
    });
  });

  describe("BACKSTORY_STARTING_FUNDS", () => {
    it("has all 7 backstory IDs with correct values", () => {
      expect(BACKSTORY_STARTING_FUNDS.yokozuna_champion).toBe(3_000_000);
      expect(BACKSTORY_STARTING_FUNDS.ozeki_legend).toBe(5_000_000);
      expect(BACKSTORY_STARTING_FUNDS.sanyaku_veteran).toBe(10_000_000);
      expect(BACKSTORY_STARTING_FUNDS.maegashira_lifer).toBe(15_000_000);
      expect(BACKSTORY_STARTING_FUNDS.injury_comeback).toBe(8_000_000);
      expect(BACKSTORY_STARTING_FUNDS.international_scout).toBe(12_000_000);
      expect(BACKSTORY_STARTING_FUNDS.council_elder).toBe(20_000_000);
    });
  });

  describe("NON_SEKITORI_BASHO_ALLOWANCE (2027 updated values)", () => {
    it("makushita receives 180,000", () => {
      expect(NON_SEKITORI_BASHO_ALLOWANCE.makushita).toBe(180_000);
    });
    it("sandanme receives 120,000", () => {
      expect(NON_SEKITORI_BASHO_ALLOWANCE.sandanme).toBe(120_000);
    });
    it("jonidan receives 96,000", () => {
      expect(NON_SEKITORI_BASHO_ALLOWANCE.jonidan).toBe(96_000);
    });
    it("jonokuchi receives 84,000", () => {
      expect(NON_SEKITORI_BASHO_ALLOWANCE.jonokuchi).toBe(84_000);
    });
  });
});
