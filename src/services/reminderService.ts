import { ActivityLogItem, Participant, Pool } from '../types';
import { calculateParticipantSummaries, formatPaise } from '../utils/settlementMath';
import { realtimeSync } from './realtimeSync';

const REMINDERS_SENT_STORAGE = 'splitpool_reminders_sent_history';

interface ReminderLogRecord {
  participantId: string;
  poolId: string;
  lastSentAt: string;
  sentCount: number;
}

function getReminderHistory(): Record<string, ReminderLogRecord> {
  try {
    const raw = localStorage.getItem(REMINDERS_SENT_STORAGE);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function recordReminderSent(poolId: string, participantId: string): void {
  try {
    const history = getReminderHistory();
    const key = `${poolId}:${participantId}`;
    const existing = history[key];
    history[key] = {
      poolId,
      participantId,
      lastSentAt: new Date().toISOString(),
      sentCount: (existing?.sentCount || 0) + 1,
    };
    localStorage.setItem(REMINDERS_SENT_STORAGE, JSON.stringify(history));
  } catch {
    // ignore
  }
}

export function getLastReminderSentAt(poolId: string, participantId: string): string | null {
  const history = getReminderHistory();
  return history[`${poolId}:${participantId}`]?.lastSentAt || null;
}

export interface DispatchedReminderResult {
  poolId: string;
  poolName: string;
  participantId: string;
  participantName: string;
  recipientEmail?: string;
  amountOwedPaise: number;
  type: 'manual' | 'automated';
  channel: string;
  message: string;
  timestamp: string;
}

export class ReminderService {
  /**
   * Manual Payment Request trigger
   */
  public static sendManualReminder(params: {
    pool: Pool;
    participant: Participant;
    amountOwedPaise: number;
    channel: 'email' | 'whatsapp' | 'upi';
    customMessage?: string;
  }): { activityItem: ActivityLogItem; dispatched: DispatchedReminderResult } {
    const { pool, participant, amountOwedPaise, channel, customMessage } = params;
    const now = new Date().toISOString();
    const formattedAmount = formatPaise(amountOwedPaise, pool.currency);

    recordReminderSent(pool.id, participant.id);

    const channelLabels: Record<string, string> = {
      email: 'Email',
      whatsapp: 'WhatsApp / Message',
      upi: 'UPI Payment Link',
    };

    const description = `Payment reminder sent to ${participant.name} for ${formattedAmount} via ${channelLabels[channel] || channel}`;

    const activityItem: ActivityLogItem = {
      id: `act-rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      poolId: pool.id,
      type: 'reminder_sent',
      description,
      timestamp: now,
      metadata: {
        participantId: participant.id,
        participantName: participant.name,
        amountOwedPaise,
        channel,
        type: 'manual',
        message: customMessage,
      },
    };

    const dispatched: DispatchedReminderResult = {
      poolId: pool.id,
      poolName: pool.name,
      participantId: participant.id,
      participantName: participant.name,
      recipientEmail: participant.phoneOrEmail,
      amountOwedPaise,
      type: 'manual',
      channel,
      message: customMessage || `Friendly reminder from SplitPool: Outstanding share of ${formattedAmount} for "${pool.name}".`,
      timestamp: now,
    };

    realtimeSync.broadcast({
      type: 'REMINDER_DISPATCHED',
      poolId: pool.id,
      timestamp: now,
      data: {
        message: description,
      },
    });

    return { activityItem, dispatched };
  }

  /**
   * Automated scheduled reminder checker (equivalent to Supabase pg_cron + Edge Function)
   * Finds members with overdue balances past deadline, enforces cooldown (default 3 days).
   */
  public static checkAndRunAutomatedReminders(pool: Pool): {
    updatedActivityLogs: ActivityLogItem[];
    dispatchedReminders: DispatchedReminderResult[];
  } {
    if (!pool.deadline) {
      return { updatedActivityLogs: [], dispatchedReminders: [] };
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const isPastDeadline = todayIso >= pool.deadline;
    if (!isPastDeadline) {
      return { updatedActivityLogs: [], dispatchedReminders: [] };
    }

    const cooldownDays = pool.reminderCooldownDays || 3;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    const nowIso = new Date().toISOString();

    const summaries = calculateParticipantSummaries(pool);
    const newLogs: ActivityLogItem[] = [];
    const dispatchedList: DispatchedReminderResult[] = [];

    summaries.forEach((s) => {
      if (s.participant.isArchived) return;
      if (s.balancePaise >= 0) return; // Not overdue / owes nothing

      const amountOwedPaise = Math.abs(s.balancePaise);
      const lastSent = getLastReminderSentAt(pool.id, s.participant.id);

      if (lastSent) {
        const lastSentTime = new Date(lastSent).getTime();
        if (nowTime - lastSentTime < cooldownMs) {
          // Cooldown active, skip to avoid spamming
          return;
        }
      }

      // Eligible for automated reminder
      recordReminderSent(pool.id, s.participant.id);
      const formatted = formatPaise(amountOwedPaise, pool.currency);
      const description = `Automated deadline reminder sent to ${s.participant.name} for overdue balance of ${formatted} (cooldown: ${cooldownDays}d)`;

      const logItem: ActivityLogItem = {
        id: `act-auto-rem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        poolId: pool.id,
        type: 'reminder_sent',
        description,
        timestamp: nowIso,
        metadata: {
          participantId: s.participant.id,
          participantName: s.participant.name,
          amountOwedPaise,
          channel: 'email_automated',
          type: 'automated',
        },
      };

      newLogs.push(logItem);
      dispatchedList.push({
        poolId: pool.id,
        poolName: pool.name,
        participantId: s.participant.id,
        participantName: s.participant.name,
        recipientEmail: s.participant.phoneOrEmail,
        amountOwedPaise,
        type: 'automated',
        channel: 'email_automated',
        message: `Automated reminder: Your share of ${formatted} for "${pool.name}" was due on ${pool.deadline}. Please settle up online.`,
        timestamp: nowIso,
      });
    });

    if (newLogs.length > 0) {
      realtimeSync.broadcast({
        type: 'REMINDER_DISPATCHED',
        poolId: pool.id,
        timestamp: nowIso,
        data: {
          message: `${newLogs.length} automated deadline reminder(s) dispatched.`,
        },
      });
    }

    return {
      updatedActivityLogs: newLogs,
      dispatchedReminders: dispatchedList,
    };
  }
}
