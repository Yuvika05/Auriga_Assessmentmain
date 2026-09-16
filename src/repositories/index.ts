import { Pool, User } from '../types';
import { PoolSchema, UserSchema } from '../schemas';

export interface PoolRepository {
  getPools(userId: string): Promise<Pool[]>;
  getPool(poolId: string): Promise<Pool | null>;
  savePool(pool: Pool): Promise<void>;
  createPool(pool: Pool): Promise<void>;
  clonePool(poolId: string, newName?: string): Promise<Pool>;
  deletePool(poolId: string): Promise<void>;
}

export interface AuthRepository {
  getCurrentUser(): Promise<User | null>;
  login(email: string, passwordPlain: string): Promise<User>;
  signup(email: string, name: string, passwordPlain: string): Promise<User>;
  loginAsGuest(): Promise<User>;
  requestPasswordReset(email: string): Promise<{ token: string; message: string }>;
  resetPasswordWithToken(email: string, token: string, newPasswordPlain: string): Promise<void>;
  logout(): Promise<void>;
}

const STORAGE_USERS_KEY = 'splitpool_users_v2';
const STORAGE_CURRENT_USER_KEY = 'splitpool_current_user_v2';
const STORAGE_POOLS_KEY = 'splitpool_pools_v2';

// Simple, secure browser SHA-256 hashing with salt for credentials
async function hashPassword(password: string, salt: string = 'splitpool_salt_2026'): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class LocalStorageAuthRepository implements AuthRepository {
  private getUsers(): User[] {
    try {
      const raw = localStorage.getItem(STORAGE_USERS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((u) => UserSchema.parse(u));
    } catch {
      return [];
    }
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (!raw) return null;
      return UserSchema.parse(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  async login(email: string, passwordPlain: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === trimmedEmail);

    if (!existing) {
      throw new Error('No user found with this email address. Please sign up.');
    }

    const inputHash = await hashPassword(passwordPlain);
    if (existing.passwordHash !== inputHash) {
      throw new Error('Incorrect password. Please try again.');
    }

    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(existing));
    return existing;
  }

  async signup(email: string, name: string, passwordPlain: string): Promise<User> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const users = this.getUsers();

    if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      throw new Error('An account already exists with this email address. Please log in.');
    }

    const passwordHash = await hashPassword(passwordPlain);
    const newUser: User = {
      id: `usr-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      email: trimmedEmail,
      name: trimmedName,
      passwordHash,
      isGuest: false,
      createdAt: new Date().toISOString(),
    };

    const validated = UserSchema.parse(newUser);
    users.push(validated);
    this.saveUsers(users);
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(validated));
    return validated;
  }

  async loginAsGuest(): Promise<User> {
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      email: `guest-${Math.floor(Math.random() * 1000)}@splitpool.local`,
      name: 'Guest Organiser',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    const validated = UserSchema.parse(guestUser);
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(validated));
    return validated;
  }

  async requestPasswordReset(email: string): Promise<{ token: string; message: string }> {
    const trimmedEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);

    if (userIndex === -1) {
      throw new Error('No account found with this email address.');
    }

    // Generate secure 6-digit numeric token valid for 15 minutes
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    users[userIndex].resetToken = token;
    users[userIndex].resetTokenExpiresAt = expiresAt;
    this.saveUsers(users);

    return {
      token,
      message: `Password reset token generated for ${trimmedEmail}. In production, this is emailed. (Dev/Demo code: ${token})`,
    };
  }

  async resetPasswordWithToken(email: string, token: string, newPasswordPlain: string): Promise<void> {
    const trimmedEmail = email.trim().toLowerCase();
    const users = this.getUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === trimmedEmail);

    if (userIndex === -1) {
      throw new Error('No account found with this email address.');
    }

    const user = users[userIndex];
    if (!user.resetToken || user.resetToken !== token.trim()) {
      throw new Error('Invalid verification code. Please check and try again.');
    }

    if (user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
      throw new Error('Verification code has expired. Please request a new one.');
    }

    const newHash = await hashPassword(newPasswordPlain);
    users[userIndex].passwordHash = newHash;
    users[userIndex].resetToken = undefined;
    users[userIndex].resetTokenExpiresAt = undefined;
    this.saveUsers(users);
  }

  async logout(): Promise<void> {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  }
}

export class LocalStoragePoolRepository implements PoolRepository {
  private getAllRawPools(): Pool[] {
    try {
      const raw = localStorage.getItem(STORAGE_POOLS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((p) => {
          const res = PoolSchema.safeParse(p);
          return res.success ? res.data : null;
        })
        .filter((p): p is Pool => p !== null);
    } catch {
      return [];
    }
  }

  private saveRawPools(pools: Pool[]): void {
    localStorage.setItem(STORAGE_POOLS_KEY, JSON.stringify(pools));
  }

  async getPools(userId: string): Promise<Pool[]> {
    const all = this.getAllRawPools();
    return all.filter((p) => p.userId === userId);
  }

  async getPool(poolId: string): Promise<Pool | null> {
    const all = this.getAllRawPools();
    return all.find((p) => p.id === poolId) || null;
  }

  async savePool(pool: Pool): Promise<void> {
    const validated = PoolSchema.parse(pool);
    const all = this.getAllRawPools();
    const index = all.findIndex((p) => p.id === validated.id);

    if (index >= 0) {
      all[index] = validated;
    } else {
      all.push(validated);
    }
    this.saveRawPools(all);
  }

  async createPool(pool: Pool): Promise<void> {
    const validated = PoolSchema.parse(pool);
    const all = this.getAllRawPools();
    all.unshift(validated);
    this.saveRawPools(all);
  }

  async clonePool(poolId: string, newName?: string): Promise<Pool> {
    const original = await this.getPool(poolId);
    if (!original) {
      throw new Error(`Pool not found to clone: ${poolId}`);
    }

    const now = new Date().toISOString();
    const cloneName = newName?.trim() || `${original.name} (Next Cycle)`;
    const newPoolId = `pool-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const clonedPool: Pool = {
      ...original,
      id: newPoolId,
      name: cloneName,
      contributions: [], // Starts fresh with zero contributions
      settlementDoneIds: [], // Clears settlement checkboxes
      targetAuditTrail: [
        {
          id: `audit-${Date.now()}`,
          poolId: newPoolId,
          oldTargetPaise: 0,
          newTargetPaise: original.targetAmountPaise,
          timestamp: now,
          updatedBy: original.organizerName,
          reason: `Initial target copied from parent pool: ${original.name}`,
        },
      ],
      activityLogs: [
        {
          id: `act-${Date.now()}`,
          poolId: newPoolId,
          type: 'pool_cloned',
          description: `Pool cloned from "${original.name}" with ${original.participants.filter((p) => !p.isArchived).length} members`,
          timestamp: now,
        },
      ],
      createdAt: now,
      updatedAt: now,
    };

    const validated = PoolSchema.parse(clonedPool);
    await this.createPool(validated);
    return validated;
  }

  async deletePool(poolId: string): Promise<void> {
    const all = this.getAllRawPools();
    const filtered = all.filter((p) => p.id !== poolId);
    this.saveRawPools(filtered);
  }
}

// Singletons for the app, easily swappable with Firebase/API implementations
export const authRepository: AuthRepository = new LocalStorageAuthRepository();
export const poolRepository: PoolRepository = new LocalStoragePoolRepository();
