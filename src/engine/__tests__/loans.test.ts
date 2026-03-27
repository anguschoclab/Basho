import { describe, it, expect, vi, beforeEach } from 'vitest';
import { issueBailoutLoanIfNeeded, processMonthlyLoanRepayments } from '../loans';
import type { WorldState } from '../types/world';
import type { Heya } from '../types/heya';
import * as eventsModule from '../events';
import * as mediaModule from '../media';

// Mock side-effects
vi.mock('../events', () => ({
  logEngineEvent: vi.fn(),
}));

vi.mock('../media', () => ({
  generateGovernanceHeadline: vi.fn(),
}));

describe('Loans - issueBailoutLoanIfNeeded', () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorld = {
      year: 2024,
      week: 1,
      calendar: { month: 1 } as any,
      seed: 'test-seed',
      heyas: new Map<string, Heya>(),
      events: { version: 1, log: [] } as any,
      sponsorPool: { koenkais: new Map(), sponsors: new Map() } as any,
    } as any;
  });

  const createHeya = (id: string, funds: number, existingLoans: any[] = [], scandalScore: number = 0): Heya => {
    const heya: Heya = {
      id,
      name: `Heya ${id}`,
      funds,
      activeLoans: [...existingLoans],
      scandalScore,
      reputation: 50,
    } as any;
    mockWorld.heyas.set(id, heya);
    return heya;
  };

  it('should not issue loan if heya does not exist', () => {
    issueBailoutLoanIfNeeded(mockWorld, 'nonexistent');
    expect(eventsModule.logEngineEvent).not.toHaveBeenCalled();
  });

  it('should not issue loan if funds are above the critical threshold', () => {
    createHeya('heya1', -4_999_999);
    issueBailoutLoanIfNeeded(mockWorld, 'heya1');
    expect(eventsModule.logEngineEvent).not.toHaveBeenCalled();
    expect(mockWorld.heyas.get('heya1')?.activeLoans).toEqual([]);
  });

  it('should not issue another loan if they already have a benefactor loan', () => {
    const heya = createHeya('heya1', -6_000_000, [{ type: 'benefactor' }]);
    issueBailoutLoanIfNeeded(mockWorld, 'heya1');
    expect(eventsModule.logEngineEvent).not.toHaveBeenCalled();
    expect(heya.activeLoans?.length).toBe(1); // Still just the one
  });

  it('should issue an emergency loan (tier 1) for first-time insolvency without high scandal', () => {
    const heya = createHeya('heya1', -6_000_000, [], 10);
    issueBailoutLoanIfNeeded(mockWorld, 'heya1');

    expect(heya.activeLoans?.length).toBe(1);
    const loan = heya.activeLoans![0];

    expect(loan.type).toBe('emergency');
    expect(loan.interestRate).toBe(0);
    // principal = deficit + 2M buffer
    expect(loan.principal).toBe(6_000_000 + 2_000_000);
    expect(loan.remainingBalance).toBe(8_000_000);
    expect(loan.stringsAttached).toContain('recruitment_ban');

    // Funds should be updated
    expect(heya.funds).toBe(-6_000_000 + 8_000_000); // 2_000_000
    // Reputation penalized
    expect(heya.reputation).toBe(40);

    expect(eventsModule.logEngineEvent).toHaveBeenCalled();
    expect(mediaModule.generateGovernanceHeadline).toHaveBeenCalled();
  });

  it('should issue a supporter loan (tier 2) for second-time insolvency or high scandal', () => {
    const heya = createHeya('heya1', -6_000_000, [{ type: 'emergency' }], 10);
    issueBailoutLoanIfNeeded(mockWorld, 'heya1');

    expect(heya.activeLoans?.length).toBe(2);
    const loan = heya.activeLoans![1];

    expect(loan.type).toBe('supporter');
    expect(loan.interestRate).toBe(0.03);
    expect(loan.stringsAttached).toContain('facility_downgrade_risk');
    expect(heya.scandalScore).toBe(20); // 10 + 10
  });

  it('should issue a benefactor loan (tier 3) for third-time insolvency', () => {
    const heya = createHeya('heya1', -6_000_000, [{ type: 'emergency' }, { type: 'supporter' }]);
    issueBailoutLoanIfNeeded(mockWorld, 'heya1');

    expect(heya.activeLoans?.length).toBe(3);
    const loan = heya.activeLoans![2];

    expect(loan.type).toBe('benefactor');
    expect(loan.interestRate).toBe(0.06);
    expect(loan.stringsAttached).toContain('merger_block');
    expect(heya.scandalScore).toBe(10); // 0 + 10
  });
});

describe('Loans - processMonthlyLoanRepayments', () => {
  let mockWorld: WorldState;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWorld = {
      heyas: new Map<string, Heya>(),
      events: { version: 1, log: [] } as any,
    } as any;
  });

  const createHeya = (id: string, funds: number, loans: any[]): Heya => {
    const heya: Heya = {
      id,
      name: `Heya ${id}`,
      funds,
      activeLoans: loans,
    } as any;
    mockWorld.heyas.set(id, heya);
    return heya;
  };

  it('should process monthly repayments correctly', () => {
    const heya = createHeya('heya1', 10_000_000, [
      {
        id: 'loan_1',
        type: 'emergency',
        remainingBalance: 5_000_000,
        monthlyPayment: 1_000_000,
        providerName: 'Test Provider 1',
      },
      {
        id: 'loan_2',
        type: 'supporter',
        remainingBalance: 500_000,
        monthlyPayment: 1_000_000, // Payment is larger than remaining
        providerName: 'Test Provider 2',
      }
    ]);

    processMonthlyLoanRepayments(mockWorld);

    expect(heya.funds).toBe(10_000_000 - 1_000_000 - 500_000);
    expect(heya.activeLoans?.length).toBe(1);

    const remainingLoan = heya.activeLoans![0];
    expect(remainingLoan.id).toBe('loan_1');
    expect(remainingLoan.remainingBalance).toBe(4_000_000);

    expect(eventsModule.logEngineEvent).toHaveBeenCalledTimes(1);
  });
});
