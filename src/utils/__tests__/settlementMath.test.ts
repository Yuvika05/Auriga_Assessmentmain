import { describe, it, expect } from 'vitest';
import {
  paiseToRupees,
  rupeesToPaise,
  formatPaise,
  calculateParticipantSummaries,
  calculatePoolMetrics,
  calculateGreedySettlements,
} from '../settlementMath';
import { Pool } from '../../types';

describe('Settlement Math & Pure Logic', () => {
  it('converts between rupees and integer paise correctly without floating point errors', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(6000.5)).toBe(600050);
    expect(rupeesToPaise(33.33)).toBe(3333);
    expect(paiseToRupees(600000)).toBe(6000);
    expect(paiseToRupees(3333)).toBe(33.33);
  });

  it('formats currency correctly with thousands separators and symbol', () => {
    expect(formatPaise(600000, '₹')).toBe('₹6,000.00');
    expect(formatPaise(-150000, '₹')).toBe('-₹1,500.00');
    expect(formatPaise(0, '₹')).toBe('₹0.00');
    expect(formatPaise(12345678, '₹')).toMatch(/₹.*456\.78/);
  });

  it('calculates fair share and allocates uneven paise remainder without losing a single paise', () => {
    // ₹100 split across 3 people = 10000 paise / 3 = 3333 base + 1 remainder paise
    const pool: Pool = {
      id: 'pool-1',
      userId: 'usr-1',
      name: 'Coffee Fund',
      category: 'gift',
      targetAmountPaise: 10000, // ₹100.00
      currency: '₹',
      organizerName: 'Priya',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [
        { id: 'p1', name: 'Priya', avatarColor: '#6366F1' },
        { id: 'p2', name: 'Rohan', avatarColor: '#10B981' },
        { id: 'p3', name: 'Aarav', avatarColor: '#F59E0B' },
      ],
      contributions: [],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const summaries = calculateParticipantSummaries(pool);
    expect(summaries).toHaveLength(3);

    const totalAllocatedShares = summaries.reduce((sum, s) => sum + s.fairSharePaise, 0);
    expect(totalAllocatedShares).toBe(10000); // Exact 10000 paise (zero currency loss)
    expect(summaries[0].fairSharePaise).toBe(3334); // First gets the remainder paise
    expect(summaries[1].fairSharePaise).toBe(3333);
    expect(summaries[2].fairSharePaise).toBe(3333);
  });

  it('correctly credits payer and recipient in "on behalf of" contributions', () => {
    // ₹6,000 target across 6 people = ₹1,000 (100000 paise) each.
    // Sneha pays ₹2,000: covers herself (₹1,000) and Vikram (₹1,000).
    const pool: Pool = {
      id: 'pool-farewell',
      userId: 'usr-1',
      name: 'Manager Farewell Gift',
      category: 'gift',
      targetAmountPaise: 600000, // ₹6,000
      currency: '₹',
      organizerName: 'Priya',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [
        { id: 'p-sneha', name: 'Sneha', avatarColor: '#6366F1' },
        { id: 'p-vikram', name: 'Vikram', avatarColor: '#10B981' },
      ],
      contributions: [
        {
          id: 'c1',
          poolId: 'pool-farewell',
          payerId: 'p-sneha',
          payerName: 'Sneha',
          amountPaise: 200000, // ₹2,000
          date: '2026-09-15',
          paymentMethod: 'manual',
          paymentStatus: 'confirmed',
          splits: [
            { participantId: 'p-sneha', amountPaise: 100000 },
            { participantId: 'p-vikram', amountPaise: 100000 },
          ],
          createdAt: new Date().toISOString(),
        },
      ],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const summaries = calculateParticipantSummaries(pool);
    const sneha = summaries.find((s) => s.participant.id === 'p-sneha')!;
    const vikram = summaries.find((s) => s.participant.id === 'p-vikram')!;

    // Sneha paid 200000 paise out-of-pocket, but was credited 100000 paise towards her own share
    expect(sneha.amountPaidPaise).toBe(200000);
    expect(sneha.amountCreditedPaise).toBe(100000);

    // Vikram paid 0 out-of-pocket, but was credited 100000 paise because Sneha covered him
    expect(vikram.amountPaidPaise).toBe(0);
    expect(vikram.amountCreditedPaise).toBe(100000);
    expect(vikram.splitsReceived).toHaveLength(1);
    expect(vikram.splitsReceived[0].payerName).toBe('Sneha');
    expect(vikram.splitsReceived[0].amountPaise).toBe(100000);
  });

  it('handles editing target amount dynamically and updates metrics immediately', () => {
    const pool: Pool = {
      id: 'pool-test',
      userId: 'usr-1',
      name: 'Gift Pool',
      category: 'gift',
      targetAmountPaise: 500000, // ₹5,000
      currency: '₹',
      organizerName: 'Amit',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [
        { id: 'p1', name: 'Amit', avatarColor: '#6366F1' },
        { id: 'p2', name: 'Neha', avatarColor: '#10B981' },
      ],
      contributions: [
        {
          id: 'c1',
          poolId: 'pool-test',
          payerId: 'p1',
          payerName: 'Amit',
          amountPaise: 300000, // ₹3,000
          splits: [{ participantId: 'p1', amountPaise: 300000 }],
          paymentMethod: 'manual',
          paymentStatus: 'confirmed',
          date: '2026-09-15',
          createdAt: new Date().toISOString(),
        },
      ],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Initial check at ₹5,000 target
    let metrics = calculatePoolMetrics(pool);
    expect(metrics.totalTargetPaise).toBe(500000);
    expect(metrics.totalCollectedPaise).toBe(300000);
    expect(metrics.remainingNeededPaise).toBe(200000);
    expect(metrics.isTargetMet).toBe(false);

    // Organiser edits target amount down to ₹2,500
    pool.targetAmountPaise = 250000;
    metrics = calculatePoolMetrics(pool);
    expect(metrics.totalTargetPaise).toBe(250000);
    expect(metrics.remainingNeededPaise).toBe(0);
    expect(metrics.surplusPaise).toBe(50000); // ₹500 surplus
    expect(metrics.isTargetMet).toBe(true);
  });

  it('greedy algorithm computes minimum transactions to zero out all debts', () => {
    // Person A: owes 50000 paise (-500)
    // Person B: owes 30000 paise (-300)
    // Person C: surplus of 80000 paise (+800)
    const balances = [
      { id: 'A', name: 'Alice', netBalancePaise: -50000 },
      { id: 'B', name: 'Bob', netBalancePaise: -30000 },
      { id: 'C', name: 'Charlie', netBalancePaise: 80000 },
    ];

    const transactions = calculateGreedySettlements(balances);
    expect(transactions).toHaveLength(2);

    // Alice should pay Charlie 50000
    expect(transactions[0].fromName).toBe('Alice');
    expect(transactions[0].toName).toBe('Charlie');
    expect(transactions[0].amountPaise).toBe(50000);

    // Bob should pay Charlie 30000
    expect(transactions[1].fromName).toBe('Bob');
    expect(transactions[1].toName).toBe('Charlie');
    expect(transactions[1].amountPaise).toBe(30000);
  });

  it('safely handles zero participants without throwing or NaN', () => {
    const emptyPool: Pool = {
      id: 'pool-empty',
      userId: 'usr-1',
      name: 'Empty Pool',
      category: 'gift',
      targetAmountPaise: 600000,
      currency: '₹',
      organizerName: 'Organizer',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [],
      contributions: [],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const metrics = calculatePoolMetrics(emptyPool);
    expect(metrics.fairSharePaise).toBe(0);
    expect(metrics.participantCount).toBe(0);

    const summaries = calculateParticipantSummaries(emptyPool);
    expect(summaries).toEqual([]);
  });

  it('handles one single participant correctly without division issues', () => {
    const singlePool: Pool = {
      id: 'pool-single',
      userId: 'usr-1',
      name: 'Solo Trip',
      category: 'trip',
      targetAmountPaise: 500000, // ₹5,000
      currency: '₹',
      organizerName: 'Solo Organiser',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [{ id: 'p1', name: 'Priya', avatarColor: '#6366F1' }],
      contributions: [],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const metrics = calculatePoolMetrics(singlePool);
    expect(metrics.fairSharePaise).toBe(500000);
    expect(metrics.participantCount).toBe(1);

    const summaries = calculateParticipantSummaries(singlePool);
    expect(summaries).toHaveLength(1);
    expect(summaries[0].balancePaise).toBe(-500000); // owes full ₹5,000
    expect(summaries[0].status).toBe('owes_full');
  });

  it('handles everyone exactly settled resulting in zero required transactions', () => {
    // 3 participants each paid exact fair share of 10000 paise (₹100)
    const balances = [
      { id: 'A', name: 'Alice', netBalancePaise: 0 },
      { id: 'B', name: 'Bob', netBalancePaise: 0 },
      { id: 'C', name: 'Charlie', netBalancePaise: 0 },
    ];

    const transactions = calculateGreedySettlements(balances);
    expect(transactions).toHaveLength(0); // Zero transfers needed
  });

  it('handles all-debtors-no-creditors gracefully (no payments made yet)', () => {
    // Everyone owes their share, but no one has stepped up to pay yet
    const balances = [
      { id: 'A', name: 'Alice', netBalancePaise: -20000 },
      { id: 'B', name: 'Bob', netBalancePaise: -20000 },
      { id: 'C', name: 'Charlie', netBalancePaise: -20000 },
    ];

    const transactions = calculateGreedySettlements(balances);
    // Since no creditor exists to receive peer funds, greedy algorithm returns empty array
    // (Money must be paid into the pool fund rather than peer-to-peer)
    expect(transactions).toHaveLength(0);
  });

  it('preserves history and excludes archived participant when member is removed after being paid on behalf of', () => {
    const poolWithArchived: Pool = {
      id: 'pool-archived',
      userId: 'usr-1',
      name: 'Farewell Pool',
      category: 'gift',
      targetAmountPaise: 600000, // ₹6,000
      currency: '₹',
      organizerName: 'Amit',
      reminderCooldownDays: 3,
      isArchived: false,
      participants: [
        { id: 'p1', name: 'Amit', avatarColor: '#6366F1' },
        { id: 'p2', name: 'Sneha', avatarColor: '#10B981' },
        // Vikram was covered by Sneha, but later left the team / was archived
        { id: 'p3', name: 'Vikram', avatarColor: '#F59E0B', isArchived: true },
      ],
      contributions: [
        {
          id: 'c1',
          poolId: 'pool-archived',
          payerId: 'p2',
          payerName: 'Sneha',
          amountPaise: 200000, // ₹2,000
          splits: [
            { participantId: 'p2', amountPaise: 100000 },
            { participantId: 'p3', amountPaise: 100000 },
          ],
          paymentMethod: 'manual',
          paymentStatus: 'confirmed',
          date: '2026-09-14',
          createdAt: new Date().toISOString(),
        },
      ],
      settlementDoneIds: [],
      targetAuditTrail: [],
      activityLogs: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Metrics should only divide fair share among the 2 ACTIVE participants
    const metrics = calculatePoolMetrics(poolWithArchived);
    expect(metrics.participantCount).toBe(2);
    expect(metrics.fairSharePaise).toBe(300000); // ₹6,000 / 2 = ₹3,000 each

    // Summaries include both active and archived, but archived has 0 fair share
    const summaries = calculateParticipantSummaries(poolWithArchived);
    const vikram = summaries.find((s) => s.participant.id === 'p3')!;
    expect(vikram.participant.isArchived).toBe(true);
    expect(vikram.fairSharePaise).toBe(0); // Excluded from future active share division
    expect(vikram.amountCreditedPaise).toBe(100000); // Historical split preserved!
    expect(vikram.splitsReceived).toHaveLength(1);
    expect(vikram.splitsReceived[0].payerName).toBe('Sneha');
  });
});
