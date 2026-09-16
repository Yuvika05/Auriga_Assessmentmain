import {
  Contribution,
  Participant,
  ParticipantSummary,
  Pool,
  PoolMetrics,
  SettlementTransaction,
  SUPPORTED_CURRENCIES,
  UserTransactionItem,
} from '../types';

/**
 * Converts integer paise to decimal currency (e.g. 600000 -> 6000.00)
 */
export function paiseToRupees(paise: number): number {
  if (typeof paise !== 'number' || isNaN(paise) || !isFinite(paise)) return 0;
  return paise / 100;
}

/**
 * Converts decimal currency input to integer paise (e.g. 6000.50 -> 600050)
 */
export function rupeesToPaise(rupees: number): number {
  if (typeof rupees !== 'number' || isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Formats integer paise into a localized currency string
 * e.g. 600000 paise with '₹' -> "₹6,000.00"
 * Handles negative values cleanly: -100000 -> "-₹1,000.00"
 */
export function formatPaise(paise: number | null | undefined, symbol: string = '₹'): string {
  if (typeof paise !== 'number' || isNaN(paise) || !isFinite(paise)) {
    return `${symbol}0.00`;
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const units = absPaise / 100;

  const found = SUPPORTED_CURRENCIES.find((c) => c.symbol === symbol);
  const locale = found ? found.locale : 'en-IN';

  const formatted = units.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

/**
 * Calculates live participant summaries from the pool state:
 * - Active participants divide targetAmountPaise equally
 * - amountPaidPaise: physical cash paid out-of-pocket
 * - amountCreditedPaise: all splits allocated to this person
 * - balancePaise: amountCreditedPaise - fairSharePaise
 * - cashBalancePaise: amountPaidPaise - fairSharePaise
 */
export function calculateParticipantSummaries(pool: Pool): ParticipantSummary[] {
  const activeParticipants = pool.participants.filter((p) => !p.isArchived);
  const count = activeParticipants.length;

  // Base integer fair share in paise
  const baseFairSharePaise = count > 0 ? Math.floor(pool.targetAmountPaise / count) : 0;
  const totalRemainderPaise = count > 0 ? pool.targetAmountPaise - (baseFairSharePaise * count) : 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const isPastDeadline = Boolean(pool.deadline && todayIso > pool.deadline);

  return pool.participants.map((participant) => {
    const isArchived = Boolean(participant.isArchived);
    // Active participants get fair share. The first 'totalRemainderPaise' members take +1 paise so sum matches target exactly!
    let fairSharePaise = 0;
    if (!isArchived) {
      const activeIndex = activeParticipants.findIndex((p) => p.id === participant.id);
      fairSharePaise = baseFairSharePaise + (activeIndex >= 0 && activeIndex < totalRemainderPaise ? 1 : 0);
    }

    // 1. Contributions physically paid by this participant
    const contributionsPaid = pool.contributions.filter((c) => c.payerId === participant.id);
    const amountPaidPaise = contributionsPaid.reduce((sum, c) => sum + (c.amountPaise || 0), 0);

    // 2. Credits allocated to this participant across all contributions
    const splitsReceived: ParticipantSummary['splitsReceived'] = [];
    let amountCreditedPaise = 0;

    for (const c of pool.contributions) {
      const split = c.splits.find((s) => s.participantId === participant.id);
      if (split && split.amountPaise > 0) {
        amountCreditedPaise += split.amountPaise;
        const payer = pool.participants.find((p) => p.id === c.payerId);
        splitsReceived.push({
          contributionId: c.id,
          payerId: c.payerId,
          payerName: payer ? payer.name : c.payerName || 'Former Participant',
          amountPaise: split.amountPaise,
          date: c.date,
          note: c.note,
          isSelf: c.payerId === participant.id,
        });
      }
    }

    const balancePaise = amountCreditedPaise - fairSharePaise;
    const cashBalancePaise = amountPaidPaise - fairSharePaise;
    const isOverdue = !isArchived && isPastDeadline && balancePaise < 0;

    // Status classification
    let status: ParticipantSummary['status'] = 'owes_full';
    let statusLabel = 'Owes full share';
    let statusColor: ParticipantSummary['statusColor'] = 'rose';

    if (isArchived) {
      status = 'paid_in_full';
      statusLabel = 'Former Member';
      statusColor = 'sky';
    } else if (amountPaidPaise > fairSharePaise || amountCreditedPaise > fairSharePaise) {
      status = 'overpaid';
      statusLabel = 'Overpaid / Covering others';
      statusColor = 'sky';
    } else if (amountCreditedPaise >= fairSharePaise) {
      status = 'paid_in_full';
      statusLabel = 'Paid in full';
      statusColor = 'emerald';
    } else if (amountCreditedPaise > 0) {
      status = 'partially_paid';
      statusLabel = 'Partially paid';
      statusColor = 'amber';
    } else {
      status = 'owes_full';
      statusLabel = isOverdue ? 'Overdue' : 'Owes full share';
      statusColor = 'rose';
    }

    return {
      participant,
      fairSharePaise,
      amountPaidPaise,
      amountCreditedPaise,
      balancePaise,
      cashBalancePaise,
      status,
      statusLabel,
      statusColor,
      isOverdue,
      splitsReceived,
      contributionsPaid,
    };
  });
}

/**
 * Calculates aggregate pool metrics including deadline status
 */
export function calculatePoolMetrics(pool: Pool): PoolMetrics {
  const totalCollectedPaise = pool.contributions.reduce((sum, c) => sum + (c.amountPaise || 0), 0);
  const activeParticipants = pool.participants.filter((p) => !p.isArchived);
  const participantCount = activeParticipants.length;

  const fairSharePaise = participantCount > 0 ? Math.floor(pool.targetAmountPaise / participantCount) : 0;
  const remainingNeededPaise = Math.max(0, pool.targetAmountPaise - totalCollectedPaise);
  const surplusPaise = Math.max(0, totalCollectedPaise - pool.targetAmountPaise);
  const percentage = pool.targetAmountPaise > 0 ? Math.round((totalCollectedPaise / pool.targetAmountPaise) * 100) : 0;
  const isTargetMet = totalCollectedPaise >= pool.targetAmountPaise;

  const exactSharesSum = fairSharePaise * participantCount;
  const remainderPaise = participantCount > 1 ? pool.targetAmountPaise - exactSharesSum : 0;

  let daysUntilDeadline: number | null = null;
  let isOverdue = false;

  if (pool.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(pool.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - today.getTime();
    daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOverdue = daysUntilDeadline < 0 && remainingNeededPaise > 0;
  }

  return {
    totalTargetPaise: pool.targetAmountPaise,
    totalCollectedPaise,
    remainingNeededPaise,
    surplusPaise,
    percentage,
    isTargetMet,
    fairSharePaise,
    participantCount,
    remainderPaise,
    isOverdue,
    daysUntilDeadline,
  };
}

/**
 * Greedy Debt Simplification Algorithm (O(N log N)):
 * Minimizes peer-to-peer cash transactions required to settle all net balances.
 */
export function calculateGreedySettlements(
  participants: { id: string; name: string; netBalancePaise: number }[],
  completedIds: string[] = []
): SettlementTransaction[] {
  interface Node {
    id: string;
    name: string;
    amountPaise: number;
  }

  const creditors: Node[] = [];
  const debtors: Node[] = [];

  participants.forEach((p) => {
    if (p.netBalancePaise > 0) {
      creditors.push({ id: p.id, name: p.name, amountPaise: p.netBalancePaise });
    } else if (p.netBalancePaise < 0) {
      debtors.push({ id: p.id, name: p.name, amountPaise: Math.abs(p.netBalancePaise) });
    }
  });

  // Sort descending: largest debtors and creditors first
  creditors.sort((a, b) => b.amountPaise - a.amountPaise);
  debtors.sort((a, b) => b.amountPaise - a.amountPaise);

  const transactions: SettlementTransaction[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const transferPaise = Math.min(debtor.amountPaise, creditor.amountPaise);

    if (transferPaise > 0) {
      const txId = `settle_${debtor.id}_${creditor.id}_${transferPaise}`;
      transactions.push({
        id: txId,
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amountPaise: transferPaise,
        isCompleted: completedIds.includes(txId),
        description: `Simplified peer transfer to balance accounts`,
      });
    }

    debtor.amountPaise -= transferPaise;
    creditor.amountPaise -= transferPaise;

    if (debtor.amountPaise === 0) i++;
    if (creditor.amountPaise === 0) j++;
  }

  return transactions;
}

/**
 * Smart Team Social Settlement:
 * Reimburses friends who covered someone directly, and routes remaining unpaid shares to the pool organiser.
 */
export function calculateSmartSocialSettlements(
  pool: Pool,
  summaries: ParticipantSummary[],
  completedIds: string[] = []
): SettlementTransaction[] {
  const transactions: SettlementTransaction[] = [];
  const organizerName = `${pool.organizerName || 'Pool Organiser'} (Gift Fund)`;

  // 1. Peer-to-peer friend covers
  const peerDebts: { [key: string]: { fromId: string; fromName: string; toId: string; toName: string; amountPaise: number } } = {};

  pool.contributions.forEach((c) => {
    const payer = pool.participants.find((p) => p.id === c.payerId);
    if (!payer) return;

    c.splits.forEach((s) => {
      if (s.participantId !== c.payerId && s.amountPaise > 0) {
        const recipient = pool.participants.find((p) => p.id === s.participantId);
        if (!recipient) return;

        const key = `${recipient.id}_to_${payer.id}`;
        if (!peerDebts[key]) {
          peerDebts[key] = {
            fromId: recipient.id,
            fromName: recipient.name,
            toId: payer.id,
            toName: payer.name,
            amountPaise: 0,
          };
        }
        peerDebts[key].amountPaise += s.amountPaise;
      }
    });
  });

  Object.values(peerDebts).forEach((debt) => {
    if (debt.amountPaise > 0) {
      const txId = `peer_cover_${debt.fromId}_${debt.toId}_${debt.amountPaise}`;
      transactions.push({
        id: txId,
        fromId: debt.fromId,
        fromName: debt.fromName,
        toId: debt.toId,
        toName: debt.toName,
        amountPaise: debt.amountPaise,
        isCompleted: completedIds.includes(txId),
        description: `Reimburses ${debt.toName} for covering them in the pool`,
      });
    }
  });

  // 2. Direct Unpaid Dues to the Pool Fund
  summaries.forEach((s) => {
    if (s.participant.isArchived) return;
    const remainingToPool = Math.max(0, s.fairSharePaise - s.amountPaidPaise);
    const peerRepayments = transactions.filter((t) => t.fromId === s.participant.id).reduce((sum, t) => sum + t.amountPaise, 0);
    const directPoolOwed = Math.max(0, remainingToPool - peerRepayments);

    if (directPoolOwed > 0) {
      const txId = `pool_direct_${s.participant.id}_${directPoolOwed}`;
      transactions.push({
        id: txId,
        fromId: s.participant.id,
        fromName: s.participant.name,
        toId: 'organizer',
        toName: organizerName,
        amountPaise: directPoolOwed,
        isCompleted: completedIds.includes(txId),
        description: `Transfers remaining fair share directly into the gift fund`,
      });
    }
  });

  return transactions;
}

/**
 * Aggregates private cross-pool transaction history for the authenticated user only.
 * Strictly enforces Requirement 6: "Your Transactions - private to you".
 */
export function calculateUserPrivateTransactions(
  userId: string,
  userEmail: string,
  userName: string,
  pools: Pool[]
): UserTransactionItem[] {
  const transactions: UserTransactionItem[] = [];
  const normalizedEmail = userEmail?.trim().toLowerCase();
  const normalizedName = userName?.trim().toLowerCase();

  pools.forEach((pool) => {
    // Find all matching participant IDs representing this user in this pool
    const myParticipantIds = new Set(
      pool.participants
        .filter(
          (p) =>
            (p.userId && p.userId === userId) ||
            (normalizedEmail && p.phoneOrEmail && p.phoneOrEmail.toLowerCase() === normalizedEmail) ||
            (normalizedName && p.name.toLowerCase() === normalizedName)
        )
        .map((p) => p.id)
    );

    // If the user created the pool and is organizer, but wasn't found in participant IDs,
    // also check if organizerName matches
    if (myParticipantIds.size === 0 && pool.userId === userId) {
      const org = pool.participants.find((p) => p.isOrganizer);
      if (org) myParticipantIds.add(org.id);
    }

    if (myParticipantIds.size === 0) return;

    // 1. Direct Contributions paid by the user
    pool.contributions.forEach((c) => {
      if (myParticipantIds.has(c.payerId)) {
        transactions.push({
          id: `tx-${c.id}`,
          poolId: pool.id,
          poolName: pool.name,
          poolCategory: pool.category || 'gift',
          type: 'contribution',
          amountPaise: c.amountPaise,
          date: c.date,
          status: c.paymentStatus || 'confirmed',
          paymentMethod: c.paymentMethod || 'manual',
          note: c.note || (c.paymentMethod === 'razorpay_gateway' ? 'Paid via Razorpay Gateway' : undefined),
          currency: pool.currency,
          gatewayTransactionId: c.gatewayTransactionId,
        });
      } else {
        // 2. Contributions where this user was a beneficiary (covered by a friend)
        const mySplit = c.splits.find((s) => myParticipantIds.has(s.participantId));
        if (mySplit && mySplit.amountPaise > 0) {
          transactions.push({
            id: `tx-beneficiary-${c.id}-${mySplit.participantId}`,
            poolId: pool.id,
            poolName: pool.name,
            poolCategory: pool.category || 'gift',
            type: 'split_beneficiary',
            amountPaise: mySplit.amountPaise,
            date: c.date,
            status: c.paymentStatus || 'confirmed',
            paymentMethod: c.paymentMethod || 'manual',
            note: c.note || `Covered by ${c.payerName || 'group member'}`,
            currency: pool.currency,
            counterpartyName: c.payerName,
          });
        }
      }
    });
  });

  // Sort chronologically descending
  transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return transactions;
}
