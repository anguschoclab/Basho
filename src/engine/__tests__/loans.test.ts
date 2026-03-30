import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueBailoutLoanIfNeeded, processMonthlyLoanRepayments } from '../loans';
import type { WorldState } from '../types/world';
import type { Heya } from '../types/heya';
import * as eventsModule from '../events';
import * as mediaModule from '../media';
import * as rngModule from '../rng';

// Mock dependencies
vi.mock('../events', () => ({
  logEngineEvent: vi.fn(),
}));

vi.mock('../media', () => ({
  generateGovernanceHeadline: vi.fn(),
}));

describe('Loans & Benefactors', () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWorld = {
      seed: 'test-seed',
      year: 2024,
      week: 1,
      calendar: { month: 1, weekInMonth: 1, season: 'Hatsu', isBasho: true, day: 1 },
      heyas: new Map(),
      sponsorPool: {
        koenkais: new Map(),
        sponsors: new Map(),
      },
      rikishi: new Map(),
      history: {
        events: [],
        bashoHistory: [],
        yearlyAwards: [],
      },
    } as unknown as WorldState;
  });

  describe('issueBailoutLoanIfNeeded', () => {
    it('does nothing if heya funds are >= -5,000,000', () => {
      const heya: Heya = { id: 'h1', name: 'Test Heya', funds: -4_999_999 } as Heya;
      mockWorld.heyas.set('h1', heya);

      issueBailoutLoanIfNeeded(mockWorld, 'h1');

      expect(heya.activeLoans).toBeUndefined();
      expect(eventsModule.logEngineEvent).not.toHaveBeenCalled();
    });

    it('issues emergency loan for 0 loans, scandal < 30', () => {
      const heya: Heya = { id: 'h1', name: 'Test Heya', funds: -6_000_000, scandalScore: 10 } as Heya;
      mockWorld.heyas.set('h1', heya);

      issueBailoutLoanIfNeeded(mockWorld, 'h1');

      expect(heya.activeLoans).toBeDefined();
      expect(heya.activeLoans?.length).toBe(1);
      const loan = heya.activeLoans![0];
      expect(loan.type).toBe('emergency');
      expect(loan.principal).toBe(8_000_000); // 6m deficit + 2m buffer
      expect(loan.interestRate).toBe(0);
      expect(loan.providerName).toBe('Sumo Association');
      expect(loan.stringsAttached).toContain('recruitment_ban');

      expect(heya.funds).toBe(2_000_000); // -6m + 8m
      expect(eventsModule.logEngineEvent).toHaveBeenCalledWith(
        mockWorld,
        expect.objectContaining({ type: 'LOAN_ISSUED', heyaId: 'h1' })
      );
    });

    it('does not issue a new loan if a benefactor loan already exists', () => {
       const heya: Heya = {
         id: 'h1',
         name: 'Test Heya',
         funds: -6_000_000,
         activeLoans: [{ type: 'benefactor', id: '1', principal: 1, interestRate: 1, providerName: '', remainingBalance: 1, monthlyPayment: 1, issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: []}]
       } as Heya;
       mockWorld.heyas.set('h1', heya);

       issueBailoutLoanIfNeeded(mockWorld, 'h1');

       expect(heya.activeLoans?.length).toBe(1); // No new loan added
    });

    it('issues supporter loan for 1 existing loan', () => {
        const heya: Heya = {
            id: 'h1',
            name: 'Test Heya',
            funds: -6_000_000,
            scandalScore: 10,
            activeLoans: [{ type: 'emergency', id: '1', principal: 1, interestRate: 1, providerName: '', remainingBalance: 1, monthlyPayment: 1, issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: []}]
        } as Heya;
        mockWorld.heyas.set('h1', heya);

        issueBailoutLoanIfNeeded(mockWorld, 'h1');

        expect(heya.activeLoans?.length).toBe(2);
        const newLoan = heya.activeLoans![1];
        expect(newLoan.type).toBe('supporter');
        expect(newLoan.interestRate).toBe(0.03);
    });

    it('issues benefactor loan for 2 existing loans', () => {
        const heya: Heya = {
            id: 'h1',
            name: 'Test Heya',
            funds: -6_000_000,
            scandalScore: 10,
            activeLoans: [
                { type: 'emergency', id: '1', principal: 1, interestRate: 1, providerName: '', remainingBalance: 1, monthlyPayment: 1, issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: []},
                { type: 'supporter', id: '2', principal: 1, interestRate: 1, providerName: '', remainingBalance: 1, monthlyPayment: 1, issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: []}
            ]
        } as Heya;
        mockWorld.heyas.set('h1', heya);

        issueBailoutLoanIfNeeded(mockWorld, 'h1');

        expect(heya.activeLoans?.length).toBe(3);
        const newLoan = heya.activeLoans![2];
        expect(newLoan.type).toBe('benefactor');
        expect(newLoan.interestRate).toBe(0.06);
    });
  });

  describe('processMonthlyLoanRepayments', () => {
    it('does nothing if no heyas exist', () => {
      expect(() => processMonthlyLoanRepayments(mockWorld)).not.toThrow();
    });

    it('does nothing if heya has no active loans', () => {
      const heya: Heya = { id: 'h1', funds: 10_000_000 } as Heya;
      mockWorld.heyas.set('h1', heya);

      processMonthlyLoanRepayments(mockWorld);

      expect(heya.funds).toBe(10_000_000);
    });

    it('processes repayments correctly, deducting from remainingBalance and funds', () => {
      const heya: Heya = {
        id: 'h1',
        name: 'Test Heya',
        funds: 10_000_000,
        activeLoans: [
          { type: 'emergency', id: 'loan_1', remainingBalance: 1_000_000, monthlyPayment: 100_000, principal: 1, interestRate: 0, providerName: 'Association', issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: [] }
        ]
      } as Heya;
      mockWorld.heyas.set('h1', heya);

      processMonthlyLoanRepayments(mockWorld);

      expect(heya.funds).toBe(9_900_000);
      expect(heya.activeLoans![0].remainingBalance).toBe(900_000);
    });

    it('truncates payment if remaining balance is less than monthly payment and removes loan', () => {
      const heya: Heya = {
        id: 'h1',
        name: 'Test Heya',
        funds: 10_000_000,
        activeLoans: [
          { type: 'emergency', id: 'loan_1', remainingBalance: 50_000, monthlyPayment: 100_000, principal: 1, interestRate: 0, providerName: 'Association', issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: [] }
        ]
      } as Heya;
      mockWorld.heyas.set('h1', heya);

      processMonthlyLoanRepayments(mockWorld);

      expect(heya.funds).toBe(9_950_000); // Only deducted 50,000
      expect(heya.activeLoans?.length).toBe(0); // Loan removed

      expect(eventsModule.logEngineEvent).toHaveBeenCalledWith(
        mockWorld,
        expect.objectContaining({ type: 'LOAN_PAID_OFF', heyaId: 'h1' })
      );
    });

    it('handles multiple active loans for a single heya', () => {
       const heya: Heya = {
        id: 'h1',
        name: 'Test Heya',
        funds: 10_000_000,
        activeLoans: [
          { type: 'emergency', id: 'loan_1', remainingBalance: 1_000_000, monthlyPayment: 100_000, principal: 1, interestRate: 0, providerName: 'Association', issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: [] },
          { type: 'supporter', id: 'loan_2', remainingBalance: 2_000_000, monthlyPayment: 150_000, principal: 1, interestRate: 0, providerName: 'Koenkai', issuedAtYear: 1, issuedAtMonth: 1, stringsAttached: [] }
        ]
      } as Heya;
      mockWorld.heyas.set('h1', heya);

      processMonthlyLoanRepayments(mockWorld);

      expect(heya.funds).toBe(9_750_000); // 10m - 100k - 150k
      expect(heya.activeLoans![0].remainingBalance).toBe(900_000);
      expect(heya.activeLoans![1].remainingBalance).toBe(1_850_000);
    });
  });
});
