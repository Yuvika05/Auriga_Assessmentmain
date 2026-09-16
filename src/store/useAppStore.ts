import { create } from 'zustand';
import { Pool, User, Contribution, Participant, TargetAmountAudit, ActivityLogItem, PoolCategory } from '../types';
import { authRepository, poolRepository } from '../repositories';
import { createDemoFarewellGiftPool, createEmptyPool } from '../data/defaultPools';
import { formatPaise, rupeesToPaise } from '../utils/settlementMath';
import { PoolSchema, ContributionSchema, TargetAmountAuditSchema } from '../schemas';
import { realtimeSync, RealtimeEventPayload } from '../services/realtimeSync';
import { paymentGatewayService, RazorpayOrder, WebhookVerificationResult } from '../services/paymentGateway';
import { ReminderService, DispatchedReminderResult } from '../services/reminderService';

export type NavTab =
  | 'overview'
  | 'participants'
  | 'contributions'
  | 'settle'
  | 'activity'
  | 'my_transactions'
  | 'settings';

interface AppState {
  currentUser: User | null;
  authLoading: boolean;
  pools: Pool[];
  activePoolId: string | null;
  activeTab: NavTab;
  errorMessage: string | null;
  toastMessage: string | null;

  // Initializer
  init: () => Promise<void>;

  // Auth actions
  login: (email: string, passwordPlain: string) => Promise<void>;
  signup: (name: string, email: string, passwordPlain: string) => Promise<void>;
  loginGuest: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ token: string; message: string }>;
  resetPasswordWithToken: (email: string, token: string, newPasswordPlain: string) => Promise<void>;
  logout: () => Promise<void>;

  // Navigation & UI
  setActiveTab: (tab: NavTab) => void;
  showToast: (msg: string) => void;
  clearError: () => void;

  // Multi-Pool Management
  selectPool: (poolId: string) => void;
  createPool: (
    name: string,
    targetAmountPaise: number,
    currency?: string,
    organizerName?: string,
    description?: string,
    category?: PoolCategory,
    deadline?: string
  ) => Promise<string>;
  clonePool: (poolId: string, newName?: string) => Promise<string>;
  deletePool: (poolId: string) => Promise<void>;
  updatePoolMeta: (updates: Partial<Pick<Pool, 'name' | 'currency' | 'organizerName' | 'description' | 'category'>>) => Promise<void>;
  updatePoolDeadline: (deadline?: string, cooldownDays?: number) => Promise<void>;

  // Editable Target Amount
  updateTargetAmount: (newTargetPaise: number, reason?: string) => Promise<void>;

  // Participants
  addParticipant: (name: string, phoneOrEmail?: string) => Promise<void>;
  updateParticipant: (id: string, name: string, phoneOrEmail?: string) => Promise<void>;
  removeParticipant: (id: string) => Promise<void>;

  // Contributions & Gateway
  addContribution: (data: Omit<Contribution, 'id' | 'createdAt' | 'poolId'>) => Promise<void>;
  recordGatewayPayment: (order: RazorpayOrder, action?: 'success' | 'fail' | 'expire', note?: string) => Promise<WebhookVerificationResult>;
  updateContribution: (id: string, data: Omit<Contribution, 'id' | 'createdAt' | 'poolId'>) => Promise<void>;
  deleteContribution: (id: string) => Promise<void>;

  // Reminders
  sendManualReminder: (participantId: string, channel: 'email' | 'whatsapp' | 'upi', customMessage?: string) => Promise<DispatchedReminderResult>;
  runAutomatedRemindersCheck: () => Promise<number>;

  // Settlements
  toggleSettlementDone: (txId: string) => Promise<void>;
  resetSettlements: () => Promise<void>;

  // Reset / Demo
  resetPoolToDemo: () => Promise<void>;
  resetPoolEmpty: () => Promise<void>;
}

let realtimeSubscribed = false;

export const useAppStore = create<AppState>((set, get) => ({
  currentUser: null,
  authLoading: true,
  pools: [],
  activePoolId: null,
  activeTab: 'overview',
  errorMessage: null,
  toastMessage: null,

  showToast: (msg: string) => {
    set({ toastMessage: msg });
    setTimeout(() => {
      if (get().toastMessage === msg) {
        set({ toastMessage: null });
      }
    }, 3500);
  },

  clearError: () => set({ errorMessage: null }),

  setActiveTab: (tab: NavTab) => set({ activeTab: tab }),

  init: async () => {
    set({ authLoading: true });
    try {
      // Connect real-time subscription once
      if (!realtimeSubscribed) {
        realtimeSubscribed = true;
        realtimeSync.subscribe((event: RealtimeEventPayload) => {
          const { pools } = get();

          if (event.type === 'PAYMENT_CONFIRMED' && event.data?.contribution) {
            const newContrib = event.data.contribution;
            const targetPool = pools.find((p) => p.id === event.poolId);
            if (targetPool) {
              const alreadyExists = targetPool.contributions.some(
                (c) => c.id === newContrib.id || (c.idempotencyKey && c.idempotencyKey === newContrib.idempotencyKey)
              );
              if (!alreadyExists) {
                const activityItem: ActivityLogItem = {
                  id: `act-gw-${Date.now()}`,
                  poolId: targetPool.id,
                  type: 'payment_gateway_verified',
                  description: `Online payment of ${formatPaise(newContrib.amountPaise, targetPool.currency)} confirmed via Razorpay (${newContrib.payerName || 'Member'})`,
                  timestamp: new Date().toISOString(),
                };
                const updatedPool: Pool = {
                  ...targetPool,
                  contributions: [newContrib, ...targetPool.contributions],
                  activityLogs: [activityItem, ...targetPool.activityLogs],
                  updatedAt: new Date().toISOString(),
                };
                set({
                  pools: pools.map((p) => (p.id === event.poolId ? updatedPool : p)),
                });
                get().showToast(`⚡ Realtime: Payment of ${formatPaise(newContrib.amountPaise, targetPool.currency)} received!`);
              }
            }
          } else if (event.type === 'REMINDER_DISPATCHED' && event.data?.message) {
            get().showToast(`🔔 ${event.data.message}`);
          }
        });
      }

      const user = await authRepository.getCurrentUser();
      if (user) {
        let userPools = await poolRepository.getPools(user.id);
        if (userPools.length === 0) {
          const initialPool = createDemoFarewellGiftPool(user.id);
          await poolRepository.createPool(initialPool);
          userPools = [initialPool];
        }
        set({
          currentUser: user,
          pools: userPools,
          activePoolId: userPools[0]?.id || null,
          authLoading: false,
        });
      } else {
        set({ currentUser: null, pools: [], activePoolId: null, authLoading: false });
      }
    } catch (e: any) {
      console.error('Store init failure', { action: 'init', error: e });
      set({ authLoading: false, errorMessage: e?.message || 'Failed to initialize app state' });
    }
  },

  login: async (email: string, passwordPlain: string) => {
    set({ errorMessage: null });
    try {
      const user = await authRepository.login(email, passwordPlain);
      let userPools = await poolRepository.getPools(user.id);
      if (userPools.length === 0) {
        const demo = createDemoFarewellGiftPool(user.id);
        await poolRepository.createPool(demo);
        userPools = [demo];
      }
      set({
        currentUser: user,
        pools: userPools,
        activePoolId: userPools[0].id,
        activeTab: 'overview',
      });
      get().showToast(`Welcome back, ${user.name}!`);
    } catch (e: any) {
      set({ errorMessage: e?.message || 'Login failed' });
      throw e;
    }
  },

  signup: async (name: string, email: string, passwordPlain: string) => {
    set({ errorMessage: null });
    try {
      const user = await authRepository.signup(email, name, passwordPlain);
      const initialPool = createDemoFarewellGiftPool(user.id);
      await poolRepository.createPool(initialPool);
      set({
        currentUser: user,
        pools: [initialPool],
        activePoolId: initialPool.id,
        activeTab: 'overview',
      });
      get().showToast(`Account created! Welcome, ${user.name}.`);
    } catch (e: any) {
      set({ errorMessage: e?.message || 'Signup failed' });
      throw e;
    }
  },

  loginGuest: async () => {
    set({ errorMessage: null });
    try {
      const guest = await authRepository.loginAsGuest();
      const demo = createDemoFarewellGiftPool(guest.id);
      await poolRepository.createPool(demo);
      set({
        currentUser: guest,
        pools: [demo],
        activePoolId: demo.id,
        activeTab: 'overview',
      });
      get().showToast('Logged in as Guest Organiser');
    } catch (e: any) {
      set({ errorMessage: e?.message || 'Guest login failed' });
      throw e;
    }
  },

  requestPasswordReset: async (email: string) => {
    try {
      return await authRepository.requestPasswordReset(email);
    } catch (e: any) {
      set({ errorMessage: e?.message || 'Password reset request failed' });
      throw e;
    }
  },

  resetPasswordWithToken: async (email: string, token: string, newPasswordPlain: string) => {
    try {
      await authRepository.resetPasswordWithToken(email, token, newPasswordPlain);
      get().showToast('Password updated! You can now log in with your new password.');
    } catch (e: any) {
      set({ errorMessage: e?.message || 'Failed to reset password' });
      throw e;
    }
  },

  logout: async () => {
    await authRepository.logout();
    set({
      currentUser: null,
      pools: [],
      activePoolId: null,
      activeTab: 'overview',
    });
    get().showToast('Logged out successfully');
  },

  selectPool: (poolId: string) => {
    const found = get().pools.find((p) => p.id === poolId);
    if (found) {
      set({ activePoolId: poolId });
    }
  },

  createPool: async (
    name: string,
    targetAmountPaise: number,
    currency: string = '₹',
    organizerName?: string,
    description?: string,
    category: PoolCategory = 'gift',
    deadline?: string
  ) => {
    const user = get().currentUser;
    if (!user) throw new Error('Must be logged in to create a pool');

    const newPool = createEmptyPool(user.id, name, targetAmountPaise, category);
    newPool.currency = currency;
    newPool.organizerName = organizerName || user.name;
    newPool.description = description || '';
    if (deadline) newPool.deadline = deadline;

    const validated = PoolSchema.parse(newPool);
    await poolRepository.createPool(validated);

    set((state) => ({
      pools: [validated, ...state.pools],
      activePoolId: validated.id,
      activeTab: 'overview',
    }));

    get().showToast(`Created new pool "${validated.name}"`);
    return validated.id;
  },

  clonePool: async (poolId: string, newName?: string) => {
    const cloned = await poolRepository.clonePool(poolId, newName);
    set((state) => ({
      pools: [cloned, ...state.pools],
      activePoolId: cloned.id,
      activeTab: 'overview',
    }));
    get().showToast(`Cloned pool "${cloned.name}" for new cycle!`);
    return cloned.id;
  },

  deletePool: async (poolId: string) => {
    await poolRepository.deletePool(poolId);
    const updated = get().pools.filter((p) => p.id !== poolId);
    set({
      pools: updated,
      activePoolId: updated[0]?.id || null,
    });
    get().showToast('Pool deleted');
  },

  updatePoolMeta: async (updates) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const updated: Pool = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const validated = PoolSchema.parse(updated);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast('Pool settings updated');
  },

  updatePoolDeadline: async (deadline?: string, cooldownDays?: number) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const now = new Date().toISOString();
    const activityItem: ActivityLogItem = {
      id: `act-dl-${Date.now()}`,
      poolId: current.id,
      type: 'deadline_changed',
      description: deadline
        ? `Target settlement deadline set to ${deadline}`
        : 'Target settlement deadline cleared',
      timestamp: now,
    };

    const updated: Pool = {
      ...current,
      deadline: deadline || undefined,
      reminderCooldownDays: cooldownDays || current.reminderCooldownDays || 3,
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updated);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast(deadline ? `Deadline updated to ${deadline}` : 'Deadline removed');
  },

  updateTargetAmount: async (newTargetPaise: number, reason?: string) => {
    const { pools, activePoolId, currentUser } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const now = new Date().toISOString();
    const oldTarget = current.targetAmountPaise;

    const auditItem: TargetAmountAudit = {
      id: `aud-${Date.now()}`,
      poolId: current.id,
      oldTargetPaise: oldTarget,
      newTargetPaise,
      timestamp: now,
      updatedBy: currentUser?.name || 'Organiser',
      reason: reason?.trim() || undefined,
    };

    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'target_changed',
      description: `Target changed from ${formatPaise(oldTarget, current.currency)} to ${formatPaise(newTargetPaise, current.currency)}${
        reason ? `: "${reason.trim()}"` : ''
      }`,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      targetAmountPaise: newTargetPaise,
      targetAuditTrail: [auditItem, ...current.targetAuditTrail],
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });

    get().showToast(`Target updated to ${formatPaise(newTargetPaise, current.currency)}`);
  },

  addParticipant: async (name: string, phoneOrEmail?: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const AVATAR_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#6366F1'];
    const newParticipant: Participant = {
      id: `p-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: trimmed,
      avatarColor: AVATAR_COLORS[current.participants.length % AVATAR_COLORS.length],
      phoneOrEmail: phoneOrEmail?.trim() || undefined,
    };

    const now = new Date().toISOString();
    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'member_added',
      description: `${trimmed} joined the pool`,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      participants: [...current.participants, newParticipant],
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast(`Added ${trimmed} to pool`);
  },

  updateParticipant: async (id: string, name: string, phoneOrEmail?: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const trimmed = name.trim();
    if (!trimmed) return;

    const updatedPool: Pool = {
      ...current,
      participants: current.participants.map((p) =>
        p.id === id ? { ...p, name: trimmed, phoneOrEmail: phoneOrEmail?.trim() || undefined } : p
      ),
      updatedAt: new Date().toISOString(),
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast('Participant details updated');
  },

  removeParticipant: async (id: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const target = current.participants.find((p) => p.id === id);
    if (!target) return;

    const now = new Date().toISOString();
    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'member_archived',
      description: `${target.name} was archived from pool dues`,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      participants: current.participants.map((p) => (p.id === id ? { ...p, isArchived: true } : p)),
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast(`Archived ${target.name}`);
  },

  addContribution: async (data) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const now = new Date().toISOString();
    const newContrib: Contribution = {
      ...data,
      id: `c-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      poolId: current.id,
      createdAt: now,
    };

    const payer = current.participants.find((p) => p.id === data.payerId);
    const payerName = payer ? payer.name : 'Participant';

    const isCovering = data.splits.some((s) => s.participantId !== data.payerId && s.amountPaise > 0);
    let desc = `${payerName} contributed ${formatPaise(data.amountPaise, current.currency)}`;
    if (isCovering) {
      const coveredNames = data.splits
        .filter((s) => s.participantId !== data.payerId && s.amountPaise > 0)
        .map((s) => {
          const part = current.participants.find((p) => p.id === s.participantId);
          return `${formatPaise(s.amountPaise, current.currency)} for ${part ? part.name : 'others'}`;
        })
        .join(', ');
      desc += ` (covering ${coveredNames})`;
    }

    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'contribution_added',
      description: desc,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      contributions: [newContrib, ...current.contributions],
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast(`Added contribution of ${formatPaise(data.amountPaise, current.currency)}`);
  },

  recordGatewayPayment: async (order: RazorpayOrder, action = 'success', note?: string) => {
    const { pools } = get();
    const current = pools.find((p) => p.id === order.poolId);
    if (!current) throw new Error('Pool not found for gateway payment');

    const result = await paymentGatewayService.verifyWebhook({
      order,
      pool: current,
      action,
      note,
    });

    if (result.success && result.contribution) {
      if (result.status === 'duplicate') {
        get().showToast(result.message);
        return result;
      }

      const now = new Date().toISOString();
      const activityItem: ActivityLogItem = {
        id: `act-${Date.now()}`,
        poolId: current.id,
        type: 'payment_gateway_verified',
        description: `Verified online payment of ${formatPaise(order.amountPaise, current.currency)} via Razorpay Gateway (Ref: ${result.transactionId})`,
        timestamp: now,
      };

      const updatedPool: Pool = {
        ...current,
        contributions: [result.contribution, ...current.contributions],
        activityLogs: [activityItem, ...current.activityLogs],
        updatedAt: now,
      };

      const validated = PoolSchema.parse(updatedPool);
      await poolRepository.savePool(validated);

      set({
        pools: pools.map((p) => (p.id === current.id ? validated : p)),
      });
      get().showToast(`Online payment confirmed! (ID: ${result.transactionId})`);
    } else {
      get().showToast(result.message);
    }

    return result;
  },

  updateContribution: async (id: string, data) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const now = new Date().toISOString();
    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'contribution_updated',
      description: `Updated contribution of ${formatPaise(data.amountPaise, current.currency)}`,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      contributions: current.contributions.map((c) => (c.id === id ? { ...c, ...data } : c)),
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast('Contribution updated');
  },

  deleteContribution: async (id: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const existing = current.contributions.find((c) => c.id === id);
    const now = new Date().toISOString();
    const activityItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      poolId: current.id,
      type: 'contribution_deleted',
      description: `Removed contribution of ${formatPaise(existing?.amountPaise || 0, current.currency)} by ${
        existing?.payerName || 'Member'
      }`,
      timestamp: now,
    };

    const updatedPool: Pool = {
      ...current,
      contributions: current.contributions.filter((c) => c.id !== id),
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: now,
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast('Contribution deleted');
  },

  sendManualReminder: async (participantId: string, channel: 'email' | 'whatsapp' | 'upi', customMessage?: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) throw new Error('No active pool selected');

    const participant = current.participants.find((p) => p.id === participantId);
    if (!participant) throw new Error('Participant not found');

    const summaries = current.participants.map((p) => {
      const paid = current.contributions.filter((c) => c.payerId === p.id).reduce((s, c) => s + c.amountPaise, 0);
      return { id: p.id, paid };
    });
    const fairShare = Math.floor(current.targetAmountPaise / Math.max(1, current.participants.length));
    const myPaid = summaries.find((s) => s.id === participantId)?.paid || 0;
    const amountOwed = Math.max(0, fairShare - myPaid);

    const { activityItem, dispatched } = ReminderService.sendManualReminder({
      pool: current,
      participant,
      amountOwedPaise: amountOwed > 0 ? amountOwed : fairShare,
      channel,
      customMessage,
    });

    const updatedPool: Pool = {
      ...current,
      activityLogs: [activityItem, ...current.activityLogs],
      updatedAt: new Date().toISOString(),
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });

    get().showToast(`Payment reminder dispatched to ${participant.name}!`);
    return dispatched;
  },

  runAutomatedRemindersCheck: async () => {
    const { pools } = get();
    let totalDispatched = 0;

    for (const pool of pools) {
      const { updatedActivityLogs, dispatchedReminders } = ReminderService.checkAndRunAutomatedReminders(pool);
      if (updatedActivityLogs.length > 0) {
        totalDispatched += dispatchedReminders.length;
        const updatedPool: Pool = {
          ...pool,
          activityLogs: [...updatedActivityLogs, ...pool.activityLogs],
          updatedAt: new Date().toISOString(),
        };
        const validated = PoolSchema.parse(updatedPool);
        await poolRepository.savePool(validated);
      }
    }

    if (totalDispatched > 0) {
      const user = get().currentUser;
      if (user) {
        const fresh = await poolRepository.getPools(user.id);
        set({ pools: fresh });
      }
      get().showToast(`Automated check: Dispatched ${totalDispatched} overdue reminder(s)`);
    } else {
      get().showToast('Automated check: No overdue reminders needed (cooldown active or no overdue dues)');
    }

    return totalDispatched;
  },

  toggleSettlementDone: async (txId: string) => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const exists = current.settlementDoneIds.includes(txId);
    const updatedIds = exists ? current.settlementDoneIds.filter((id) => id !== txId) : [...current.settlementDoneIds, txId];

    const updatedPool: Pool = {
      ...current,
      settlementDoneIds: updatedIds,
      updatedAt: new Date().toISOString(),
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
  },

  resetSettlements: async () => {
    const { pools, activePoolId } = get();
    const current = pools.find((p) => p.id === activePoolId);
    if (!current) return;

    const updatedPool: Pool = {
      ...current,
      settlementDoneIds: [],
      updatedAt: new Date().toISOString(),
    };

    const validated = PoolSchema.parse(updatedPool);
    await poolRepository.savePool(validated);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? validated : p)),
    });
    get().showToast('Settlement checklist reset');
  },

  resetPoolToDemo: async () => {
    const { currentUser, activePoolId, pools } = get();
    if (!currentUser) return;

    const demo = createDemoFarewellGiftPool(currentUser.id);
    await poolRepository.savePool(demo);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? demo : p)),
      activePoolId: demo.id,
    });
    get().showToast("Reset to Farewell Gift demo pool");
  },

  resetPoolEmpty: async () => {
    const { currentUser, activePoolId, pools } = get();
    if (!currentUser) return;

    const empty = createEmptyPool(currentUser.id, 'Fresh Collection Pool', 600000);
    await poolRepository.savePool(empty);

    set({
      pools: pools.map((p) => (p.id === activePoolId ? empty : p)),
      activePoolId: empty.id,
    });
    get().showToast('Started fresh with a blank pool');
  },
}));
