import { z } from 'zod';
import {
  UserSchema,
  ParticipantSchema,
  ContributionSplitSchema,
  ContributionSchema,
  TargetAmountAuditSchema,
  ActivityLogItemSchema,
  PoolSchema,
  PoolCategorySchema,
  PaymentMethodSchema,
  PaymentStatusSchema,
  LoginInputSchema,
  SignupInputSchema,
  RequestPasswordResetSchema,
  ResetPasswordWithTokenSchema,
} from './schemas';

export type User = z.infer<typeof UserSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type ContributionSplit = z.infer<typeof ContributionSplitSchema>;
export type Contribution = z.infer<typeof ContributionSchema>;
export type TargetAmountAudit = z.infer<typeof TargetAmountAuditSchema>;
export type ActivityLogItem = z.infer<typeof ActivityLogItemSchema>;
export type PoolCategory = z.infer<typeof PoolCategorySchema>;
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;
export type Pool = z.infer<typeof PoolSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type SignupInput = z.infer<typeof SignupInputSchema>;
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetSchema>;
export type ResetPasswordWithTokenInput = z.infer<typeof ResetPasswordWithTokenSchema>;

export type BalanceStatus = 'paid_in_full' | 'partially_paid' | 'owes_full' | 'overpaid';

export interface CurrencyOption {
  symbol: string;
  label: string;
  code: string;
  locale: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { symbol: '₹', label: 'INR (₹) - Indian Rupee', code: 'INR', locale: 'en-IN' },
  { symbol: '$', label: 'USD ($) - US Dollar', code: 'USD', locale: 'en-US' },
  { symbol: '€', label: 'EUR (€) - Euro', code: 'EUR', locale: 'de-DE' },
  { symbol: '£', label: 'GBP (£) - British Pound', code: 'GBP', locale: 'en-GB' },
  { symbol: 'AED', label: 'AED (د.إ) - UAE Dirham', code: 'AED', locale: 'en-AE' },
  { symbol: 'CAD', label: 'CAD ($) - Canadian Dollar', code: 'CAD', locale: 'en-CA' },
  { symbol: 'AUD', label: 'AUD ($) - Australian Dollar', code: 'AUD', locale: 'en-AU' },
  { symbol: 'SGD', label: 'SGD ($) - Singapore Dollar', code: 'SGD', locale: 'en-SG' },
];

export interface PoolCategoryMeta {
  id: PoolCategory;
  label: string;
  description: string;
  iconName: string;
  badgeBg: string;
  badgeText: string;
}

export const POOL_CATEGORIES: Record<PoolCategory, PoolCategoryMeta> = {
  gift: {
    id: 'gift',
    label: 'Farewell & Celebration Gift',
    description: 'Collect contributions for a farewell present, birthday gift, or team milestone reward.',
    iconName: 'Gift',
    badgeBg: 'bg-rose-50 border-rose-200',
    badgeText: 'text-rose-700',
  },
  trip: {
    id: 'trip',
    label: 'Group Trip & Vacation',
    description: 'Split cabin rentals, flights, road trip gas, and group travel excursions.',
    iconName: 'Plane',
    badgeBg: 'bg-sky-50 border-sky-200',
    badgeText: 'text-sky-700',
  },
  kitty_party: {
    id: 'kitty_party',
    label: 'Monthly Kitty Party / Chit Pool',
    description: 'Manage recurring monthly kitty pool shares with instant pool cloning.',
    iconName: 'Coins',
    badgeBg: 'bg-amber-50 border-amber-200',
    badgeText: 'text-amber-700',
  },
  office_pool: {
    id: 'office_pool',
    label: 'Office & Team Events',
    description: 'Pool funds for team lunches, offsite dinners, pizza parties, or office decor.',
    iconName: 'Briefcase',
    badgeBg: 'bg-indigo-50 border-indigo-200',
    badgeText: 'text-indigo-700',
  },
  custom: {
    id: 'custom',
    label: 'Custom Group Pool',
    description: 'Flexible collection pool tailored to your group needs with custom targets.',
    iconName: 'Sparkles',
    badgeBg: 'bg-purple-50 border-purple-200',
    badgeText: 'text-purple-700',
  },
};

export interface ParticipantSummary {
  participant: Participant;
  fairSharePaise: number;
  amountPaidPaise: number;
  amountCreditedPaise: number;
  balancePaise: number;
  cashBalancePaise: number;
  status: BalanceStatus;
  statusLabel: string;
  statusColor: 'emerald' | 'amber' | 'rose' | 'sky';
  isOverdue?: boolean;
  splitsReceived: {
    contributionId: string;
    payerId: string;
    payerName: string;
    amountPaise: number;
    date: string;
    note?: string;
    isSelf: boolean;
  }[];
  contributionsPaid: Contribution[];
}

export interface SettlementTransaction {
  id: string;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amountPaise: number;
  isCompleted: boolean;
  description?: string;
}

export interface PoolMetrics {
  totalTargetPaise: number;
  totalCollectedPaise: number;
  remainingNeededPaise: number;
  surplusPaise: number;
  percentage: number;
  isTargetMet: boolean;
  fairSharePaise: number;
  participantCount: number;
  remainderPaise: number;
  isOverdue?: boolean;
  daysUntilDeadline?: number | null;
}

// Private "My Transactions" view across all pools (Requirement 6)
export interface UserTransactionItem {
  id: string;
  poolId: string;
  poolName: string;
  poolCategory: PoolCategory;
  type: 'contribution' | 'split_beneficiary' | 'settlement_payment' | 'settlement_receipt';
  amountPaise: number;
  date: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  note?: string;
  currency: string;
  gatewayTransactionId?: string;
  counterpartyName?: string;
}
