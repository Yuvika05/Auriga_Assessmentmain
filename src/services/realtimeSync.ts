import { Contribution, Pool } from '../types';

export type RealtimeEventType =
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_FAILED'
  | 'POOL_UPDATED'
  | 'REMINDER_DISPATCHED'
  | 'SETTLEMENT_TOGGLED';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  poolId: string;
  timestamp: string;
  data?: {
    contribution?: Contribution;
    pool?: Pool;
    txId?: string;
    message?: string;
    idempotencyKey?: string;
  };
}

type RealtimeListener = (event: RealtimeEventPayload) => void;

class RealtimeChannelService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<RealtimeListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    try {
      this.channel = new BroadcastChannel('splitpool_realtime_bus');
      this.channel.onmessage = (event) => {
        if (event?.data && event.data.type) {
          this.notifyListeners(event.data);
        }
      };
      this.isInitialized = true;
    } catch {
      // Fallback for environments where BroadcastChannel is constrained
      window.addEventListener('storage', (e) => {
        if (e.key === 'splitpool_realtime_event' && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.notifyListeners(parsed);
          } catch {
            // ignore JSON parse error
          }
        }
      });
      this.isInitialized = true;
    }
  }

  public subscribe(listener: RealtimeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public broadcast(event: RealtimeEventPayload) {
    // Notify in-process listeners
    this.notifyListeners(event);

    // Broadcast across windows / tabs
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch {
        // channel closed or failed
      }
    } else if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('splitpool_realtime_event', JSON.stringify({ ...event, _t: Date.now() }));
      } catch {
        // storage quota or error
      }
    }
  }

  private notifyListeners(event: RealtimeEventPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.warn('Realtime listener error:', err);
      }
    });
  }
}

export const realtimeSync = new RealtimeChannelService();
