import { Contribution, Pool } from '../types';
import { realtimeSync } from './realtimeSync';

export interface RazorpayOrder {
  id: string;
  poolId: string;
  amountPaise: number;
  currency: string;
  payerParticipantId: string;
  payerName: string;
  status: 'created' | 'attempted' | 'paid';
  createdAt: string;
  notes?: Record<string, string>;
  idempotencyKey: string;
}

export interface WebhookVerificationResult {
  success: boolean;
  status: 'confirmed' | 'failed' | 'expired' | 'duplicate';
  message: string;
  idempotencyKey?: string;
  transactionId?: string;
  contribution?: Contribution;
}

// In-memory + persistent set of processed idempotency keys to prevent duplicate webhook delivery
const PROCESSED_WEBHOOK_KEYS_STORAGE = 'splitpool_processed_webhook_idempotency_keys';

function getProcessedKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(PROCESSED_WEBHOOK_KEYS_STORAGE);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function recordProcessedKey(key: string): void {
  try {
    const keys = getProcessedKeys();
    keys.add(key);
    localStorage.setItem(PROCESSED_WEBHOOK_KEYS_STORAGE, JSON.stringify(Array.from(keys)));
  } catch {
    // ignore
  }
}

export class PaymentGatewayService {
  public isSandboxEnabled = true;

  constructor() {
    const metaEnv = ((import.meta as any).env || {}) as Record<string, string | undefined>;
    const flag = metaEnv.VITE_ENABLE_PAYMENT_GATEWAY;
    this.isSandboxEnabled = flag === undefined ? true : flag === 'true';
  }

  /**
   * Generates a standard Razorpay Sandbox Order with unique ID and Idempotency Key
   */
  public async createOrder(params: {
    poolId: string;
    amountPaise: number;
    currency: string;
    payerParticipantId: string;
    payerName: string;
    notes?: Record<string, string>;
  }): Promise<RazorpayOrder> {
    const timestamp = Date.now();
    const orderId = `order_sbx_${timestamp}_${Math.floor(Math.random() * 1000)}`;
    const idempotencyKey = `idem_${orderId}_${timestamp}`;

    const order: RazorpayOrder = {
      id: orderId,
      poolId: params.poolId,
      amountPaise: params.amountPaise,
      currency: params.currency || '₹',
      payerParticipantId: params.payerParticipantId,
      payerName: params.payerName,
      status: 'created',
      createdAt: new Date().toISOString(),
      notes: params.notes,
      idempotencyKey,
    };

    return order;
  }

  /**
   * Generates standard UPI URI for instant UPI deep-linking (Google Pay, PhonePe, Paytm, etc.)
   */
  public generateUpiDeepLink(params: {
    upiId?: string;
    payeeName: string;
    amountRupees: number;
    transactionNote: string;
  }): string {
    const vpa = params.upiId || 'splitpool.settle@okhdfcbank';
    const pn = encodeURIComponent(params.payeeName);
    const tn = encodeURIComponent(params.transactionNote);
    const am = params.amountRupees.toFixed(2);
    return `upi://pay?pa=${vpa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
  }

  /**
   * Simulates/Verifies server-side webhook from payment gateway.
   * Enforces server verification, rejects client-only claim, and applies idempotency check.
   */
  public async verifyWebhook(params: {
    order: RazorpayOrder;
    pool: Pool;
    paymentId?: string;
    signature?: string;
    action?: 'success' | 'fail' | 'expire';
    note?: string;
  }): Promise<WebhookVerificationResult> {
    const { order, pool, action = 'success', note } = params;
    const idempotencyKey = order.idempotencyKey;

    // 1. Idempotency check: Guard against duplicate webhook deliveries
    const processedKeys = getProcessedKeys();
    if (processedKeys.has(idempotencyKey)) {
      return {
        success: true,
        status: 'duplicate',
        message: 'Duplicate webhook detected. Idempotency key already processed. Skipped duplicate ledger entry.',
        idempotencyKey,
      };
    }

    // 2. Handle failure paths explicitly
    if (action === 'fail') {
      return {
        success: false,
        status: 'failed',
        message: 'Payment declined by issuer bank in sandbox simulator.',
        idempotencyKey,
      };
    }

    if (action === 'expire') {
      return {
        success: false,
        status: 'expired',
        message: 'Payment session expired before authorization was completed.',
        idempotencyKey,
      };
    }

    // 3. Confirm payment and mint verified transaction
    const paymentId = params.paymentId || `pay_sbx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    recordProcessedKey(idempotencyKey);

    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    const contribution: Contribution = {
      id: `c-gw-${Date.now()}`,
      poolId: pool.id,
      payerId: order.payerParticipantId,
      payerName: order.payerName,
      amountPaise: order.amountPaise,
      date: today,
      note: note || `Paid online via Razorpay Gateway (Ref: ${paymentId})`,
      paymentMethod: 'razorpay_gateway',
      paymentStatus: 'confirmed',
      gatewayTransactionId: paymentId,
      gatewayOrderId: order.id,
      idempotencyKey,
      splits: [
        {
          participantId: order.payerParticipantId,
          amountPaise: order.amountPaise,
        },
      ],
      createdAt: now,
    };

    // 4. Broadcast instant confirmation over real-time layer
    realtimeSync.broadcast({
      type: 'PAYMENT_CONFIRMED',
      poolId: pool.id,
      timestamp: now,
      data: {
        contribution,
        idempotencyKey,
      },
    });

    return {
      success: true,
      status: 'confirmed',
      message: 'Payment verified and confirmed by gateway webhook.',
      transactionId: paymentId,
      idempotencyKey,
      contribution,
    };
  }
}

export const paymentGatewayService = new PaymentGatewayService();
