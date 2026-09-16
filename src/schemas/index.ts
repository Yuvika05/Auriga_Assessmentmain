import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email('Please enter a valid email address'),
  name: z.string().min(1, 'Name is required'),
  passwordHash: z.string().optional(),
  isGuest: z.boolean().optional(),
  resetToken: z.string().optional(),
  resetTokenExpiresAt: z.string().optional(),
  createdAt: z.string(),
});

export const ParticipantSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, 'Participant name is required'),
  avatarColor: z.string().default('#6366F1'),
  isOrganizer: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  phoneOrEmail: z.string().trim().optional(),
  userId: z.string().optional(), // Links participant to a registered user account when applicable
});

export const ContributionSplitSchema = z.object({
  participantId: z.string().min(1),
  amountPaise: z.number().int().nonnegative('Split amount must be non-negative'),
});

export const PaymentMethodSchema = z.enum([
  'manual',
  'razorpay_gateway',
  'upi_qr',
  'cash',
  'bank_transfer',
]);

export const PaymentStatusSchema = z.enum([
  'confirmed',
  'pending',
  'failed',
  'expired',
]);

export const ContributionSchema = z.object({
  id: z.string().min(1),
  poolId: z.string().min(1),
  payerId: z.string().min(1, 'Payer is required'),
  payerName: z.string().optional(),
  amountPaise: z.number().int().positive('Contribution amount must be greater than zero'),
  splits: z.array(ContributionSplitSchema).min(1, 'At least one split allocation is required'),
  date: z.string(),
  note: z.string().trim().optional(),
  paymentMethod: PaymentMethodSchema.default('manual'),
  paymentStatus: PaymentStatusSchema.default('confirmed'),
  gatewayTransactionId: z.string().optional(),
  gatewayOrderId: z.string().optional(),
  idempotencyKey: z.string().optional(),
  receiptUrl: z.string().optional(),
  createdAt: z.string(),
});

export const TargetAmountAuditSchema = z.object({
  id: z.string().min(1),
  poolId: z.string().min(1),
  oldTargetPaise: z.number().int().nonnegative(),
  newTargetPaise: z.number().int().positive('Target amount must be positive'),
  timestamp: z.string(),
  updatedBy: z.string(),
  reason: z.string().optional(),
});

export const ActivityLogItemSchema = z.object({
  id: z.string().min(1),
  poolId: z.string().min(1),
  type: z.enum([
    'contribution_added',
    'contribution_updated',
    'contribution_deleted',
    'target_changed',
    'member_added',
    'member_updated',
    'member_archived',
    'pool_created',
    'pool_cloned',
    'reminder_sent',
    'deadline_changed',
    'payment_gateway_verified',
  ]),
  description: z.string().min(1),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export const PoolCategorySchema = z.enum([
  'gift',
  'trip',
  'kitty_party',
  'office_pool',
  'custom',
]);

export const PoolSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1, 'Pool must be associated with an organiser user'),
  name: z.string().trim().min(1, 'Pool name is required'),
  category: PoolCategorySchema.default('gift'),
  targetAmountPaise: z.number().int().positive('Target amount must be greater than zero'),
  currency: z.string().default('₹'),
  organizerName: z.string().trim().min(1, 'Organiser name is required'),
  description: z.string().trim().optional(),
  deadline: z.string().optional(), // YYYY-MM-DD
  reminderCooldownDays: z.number().int().positive().default(3),
  participants: z.array(ParticipantSchema).default([]),
  contributions: z.array(ContributionSchema).default([]),
  settlementDoneIds: z.array(z.string()).default([]),
  targetAuditTrail: z.array(TargetAmountAuditSchema).default([]),
  activityLogs: z.array(ActivityLogItemSchema).default([]),
  isArchived: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const LoginInputSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const SignupInputSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export const RequestPasswordResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export const ResetPasswordWithTokenSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  token: z.string().min(4, 'Verification code must be at least 4 digits'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters long'),
});
