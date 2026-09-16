import { Pool, PoolCategory } from '../types';

export function createDemoFarewellGiftPool(userId: string): Pool {
  const poolId = `pool-farewell-${userId.slice(0, 6)}`;
  // Default deadline: 5 days from today
  const deadlineDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return {
    id: poolId,
    userId,
    name: "Manager's Farewell Gift",
    category: 'gift',
    targetAmountPaise: 600000, // ₹6,000.00
    currency: '₹',
    organizerName: 'Priya Sharma',
    description: 'Chipping in equally for our manager Vikramaditya’s farewell watch & card.',
    deadline: deadlineDate,
    reminderCooldownDays: 3,
    participants: [
      { id: 'p-priya', name: 'Priya Sharma', avatarColor: '#6366F1', isOrganizer: true, phoneOrEmail: 'priya@company.com' },
      { id: 'p-sneha', name: 'Sneha Patel', avatarColor: '#10B981', phoneOrEmail: 'sneha@company.com' },
      { id: 'p-vikram', name: 'Vikram Joshi', avatarColor: '#3B82F6', phoneOrEmail: 'vikram@company.com' },
      { id: 'p-rohan', name: 'Rohan Mehra', avatarColor: '#F59E0B', phoneOrEmail: 'rohan@company.com' },
      { id: 'p-ananya', name: 'Ananya Rao', avatarColor: '#EC4899', phoneOrEmail: 'ananya@company.com' },
      { id: 'p-kabir', name: 'Kabir Khan', avatarColor: '#8B5CF6', phoneOrEmail: 'kabir@company.com' },
    ],
    contributions: [
      {
        id: 'c-priya-1',
        poolId,
        payerId: 'p-priya',
        payerName: 'Priya Sharma',
        amountPaise: 100000, // ₹1,000
        date: '2026-09-11',
        note: 'Direct UPI transfer to pool fund',
        paymentMethod: 'upi_qr',
        paymentStatus: 'confirmed',
        splits: [{ participantId: 'p-priya', amountPaise: 100000 }],
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 'c-rohan-1',
        poolId,
        payerId: 'p-rohan',
        payerName: 'Rohan Mehra',
        amountPaise: 50000, // ₹500
        date: '2026-09-12',
        note: 'Part payment via GPay (will transfer remaining later)',
        paymentMethod: 'manual',
        paymentStatus: 'confirmed',
        splits: [{ participantId: 'p-rohan', amountPaise: 50000 }],
        createdAt: '2026-09-12T14:30:00Z',
      },
      {
        id: 'c-sneha-1',
        poolId,
        payerId: 'p-sneha',
        payerName: 'Sneha Patel',
        amountPaise: 200000, // ₹2,000 (Generous soul covering Vikram too)
        date: '2026-09-13',
        note: 'Paid for myself (₹1000) and covered Vikram (₹1000)',
        paymentMethod: 'manual',
        paymentStatus: 'confirmed',
        splits: [
          { participantId: 'p-sneha', amountPaise: 100000 },
          { participantId: 'p-vikram', amountPaise: 100000 },
        ],
        createdAt: '2026-09-13T16:15:00Z',
      },
    ],
    settlementDoneIds: [],
    targetAuditTrail: [
      {
        id: 'aud-1',
        poolId,
        oldTargetPaise: 500000, // Started at ₹5,000
        newTargetPaise: 600000, // Upgraded to ₹6,000
        timestamp: '2026-09-12T11:00:00Z',
        updatedBy: 'Priya Sharma',
        reason: 'Upgraded gift to include engraved premium case and team sign card',
      },
    ],
    activityLogs: [
      {
        id: 'act-1',
        poolId,
        type: 'pool_created',
        description: 'Pool "Manager\'s Farewell Gift" created with initial budget of ₹5,000.00',
        timestamp: '2026-09-10T09:00:00Z',
      },
      {
        id: 'act-2',
        poolId,
        type: 'contribution_added',
        description: 'Priya Sharma contributed ₹1,000.00',
        timestamp: '2026-09-11T10:00:00Z',
      },
      {
        id: 'act-3',
        poolId,
        type: 'target_changed',
        description: 'Target amount changed from ₹5,000.00 to ₹6,000.00: "Upgraded gift to include engraved premium case and team sign card"',
        timestamp: '2026-09-12T11:00:00Z',
      },
      {
        id: 'act-4',
        poolId,
        type: 'contribution_added',
        description: 'Rohan Mehra contributed partial payment of ₹500.00',
        timestamp: '2026-09-12T14:30:00Z',
      },
      {
        id: 'act-5',
        poolId,
        type: 'contribution_added',
        description: 'Sneha Patel contributed ₹2,000.00 (₹1,000.00 for Sneha Patel and ₹1,000.00 on behalf of Vikram Joshi)',
        timestamp: '2026-09-13T16:15:00Z',
      },
    ],
    isArchived: false,
    createdAt: '2026-09-10T09:00:00Z',
    updatedAt: '2026-09-13T16:15:00Z',
  };
}

export function createDemoTripPool(userId: string): Pool {
  const poolId = `pool-trip-${userId.slice(0, 6)}`;
  const deadlineDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return {
    id: poolId,
    userId,
    name: 'Goa Weekend Villa Trip',
    category: 'trip',
    targetAmountPaise: 4000000, // ₹40,000.00
    currency: '₹',
    organizerName: 'Arjun Verma',
    description: 'Advance booking for beach villa, airport cab, and catamaran cruise.',
    deadline: deadlineDate,
    reminderCooldownDays: 2,
    participants: [
      { id: 'p-arjun', name: 'Arjun Verma', avatarColor: '#0EA5E9', isOrganizer: true, phoneOrEmail: 'arjun@trip.co' },
      { id: 'p-tanya', name: 'Tanya Sengupta', avatarColor: '#EC4899', phoneOrEmail: 'tanya@trip.co' },
      { id: 'p-karan', name: 'Karan Malhotra', avatarColor: '#10B981', phoneOrEmail: 'karan@trip.co' },
      { id: 'p-meera', name: 'Meera Nair', avatarColor: '#8B5CF6', phoneOrEmail: 'meera@trip.co' },
    ],
    contributions: [
      {
        id: 'c-trip-1',
        poolId,
        payerId: 'p-arjun',
        payerName: 'Arjun Verma',
        amountPaise: 1000000,
        date: '2026-09-14',
        note: 'Villa deposit advance paid via netbanking',
        paymentMethod: 'bank_transfer',
        paymentStatus: 'confirmed',
        splits: [{ participantId: 'p-arjun', amountPaise: 1000000 }],
        createdAt: '2026-09-14T08:00:00Z',
      },
    ],
    settlementDoneIds: [],
    targetAuditTrail: [],
    activityLogs: [
      {
        id: `act-trip-1`,
        poolId,
        type: 'pool_created',
        description: 'Trip pool "Goa Weekend Villa Trip" created with target budget of ₹40,000.00',
        timestamp: '2026-09-14T08:00:00Z',
      },
    ],
    isArchived: false,
    createdAt: '2026-09-14T08:00:00Z',
    updatedAt: '2026-09-14T08:00:00Z',
  };
}

export function createEmptyPool(
  userId: string,
  name: string = 'New Collection Pool',
  targetPaise: number = 500000,
  category: PoolCategory = 'gift'
): Pool {
  const poolId = `pool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  return {
    id: poolId,
    userId,
    name,
    category,
    targetAmountPaise: targetPaise,
    currency: '₹',
    organizerName: 'Organiser',
    description: 'Shared group expense collection pool',
    reminderCooldownDays: 3,
    participants: [
      { id: `p-${Date.now()}-1`, name: 'Organiser', avatarColor: '#6366F1', isOrganizer: true },
    ],
    contributions: [],
    settlementDoneIds: [],
    targetAuditTrail: [],
    activityLogs: [
      {
        id: `act-${Date.now()}`,
        poolId,
        type: 'pool_created',
        description: `Pool "${name}" created.`,
        timestamp: now,
      },
    ],
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}
