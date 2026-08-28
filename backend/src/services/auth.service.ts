import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import type { PublicUser, User } from '@shared/types';
import { config } from '../config';
import { db, newId, now } from '../db';
import { isValidEmail } from '../utils';
import { sendEmail } from './notifications.service';

const USERS = 'users';
const NONCES = 'nonces';
const RESETS = 'password_resets';
const VERIFICATIONS = 'email_verifications';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 60;

export async function register(email: string, password: string, name: string): Promise<User> {
  email = email.trim().toLowerCase();
  if (!isValidEmail(email)) throw Object.assign(new Error('Invalid email address'), { status: 400 });
  if (!password || password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
  const exists = await db().findOne<User>(USERS, { email });
  if (exists) throw Object.assign(new Error('An account with this email already exists'), { status: 409 });

  const user: User = {
    _id: newId(),
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    name: name.trim() || email.split('@')[0],
    role: 'user',
    settings: { emailNotifications: true, pushNotifications: true, newsletter: false, theme: 'dark' },
    createdAt: now(),
    updatedAt: now(),
  };
  try {
    await db().insertOne(USERS, user);
  } catch (e: any) {
    // Unique-index race on MongoDB: another parallel register won — report 409.
    if (String(e?.message || '').match(/duplicate|E11000/i)) {
      throw Object.assign(new Error('An account with this email already exists'), { status: 409 });
    }
    throw e;
  }
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  if (!email || !password) throw Object.assign(new Error('Email and password are required'), { status: 400 });
  const user = await db().findOne<User>(USERS, { email: email.trim().toLowerCase() });
  if (!user?.passwordHash) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  // Account lockout: too many failed attempts → temporary block (brute-force protection).
  if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
    const mins = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
    throw Object.assign(new Error(`Account temporarily locked after too many failed attempts. Try again in ${mins} minute(s).`), { status: 423 });
  }

  if (!bcrypt.compareSync(password, user.passwordHash)) {
    const failed = (user.failedLogins ?? 0) + 1;
    const set: Record<string, any> = { failedLogins: failed, updatedAt: now() };
    if (failed >= MAX_FAILED_LOGINS) {
      set.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString();
      set.failedLogins = 0;
    }
    await db().updateOne(USERS, { _id: user._id }, { $set: set });
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  if (user.failedLogins || user.lockedUntil) {
    await db().updateOne(USERS, { _id: user._id }, { $set: { failedLogins: 0, lockedUntil: undefined } });
  }
  return user;
}

/* --------------------------- MetaMask wallet login --------------------------- */

export async function createNonce(address: string): Promise<{ nonce: string; message: string }> {
  if (!address || typeof address !== 'string') throw Object.assign(new Error('address is required'), { status: 400 });
  const addr = address.toLowerCase();
  if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) throw Object.assign(new Error('Invalid wallet address'), { status: 400 });
  const nonce = `Sign this message to sign in to GrinCryptoWorld.\n\nWallet: ${addr}\nNonce: ${randomBytes(16).toString('hex')}\nTimestamp: ${Date.now()}`;
  await db().deleteMany(NONCES, { address: addr });
  await db().insertOne(NONCES, {
    _id: newId(),
    address: addr,
    nonce,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  return { nonce, message: nonce };
}

export async function verifyWalletSignature(address: string, signature: string): Promise<User> {
  if (!address || !signature) throw Object.assign(new Error('address and signature are required'), { status: 400 });
  const addr = address.toLowerCase();
  const record = await db().findOne<any>(NONCES, { address: addr });
  if (!record) throw Object.assign(new Error('No login challenge found — request a new one'), { status: 400 });
  if (new Date(record.expiresAt) < new Date()) {
    await db().deleteMany(NONCES, { address: addr });
    throw Object.assign(new Error('Challenge expired — request a new one'), { status: 400 });
  }

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(record.nonce, signature);
  } catch {
    throw Object.assign(new Error('Invalid signature'), { status: 401 });
  }
  if (recovered.toLowerCase() !== addr) {
    throw Object.assign(new Error('Signature does not match wallet address'), { status: 401 });
  }
  await db().deleteMany(NONCES, { address: addr });

  let user = await db().findOne<User>(USERS, { walletAddress: addr });
  if (!user) {
    user = {
      _id: newId(),
      email: `${addr.slice(0, 10)}@wallet.grincrypto.world`,
      name: `Crypto User ${addr.slice(2, 6).toUpperCase()}`,
      role: 'user',
      walletAddress: addr,
      settings: { emailNotifications: false, pushNotifications: true, newsletter: false, theme: 'dark' },
      createdAt: now(),
      updatedAt: now(),
    };
    await db().insertOne(USERS, user);
  }
  return user;
}

export async function getProfile(userId: string): Promise<User | null> {
  return db().findOne<User>(USERS, { _id: userId });
}

/* -------------------- Password reset (email token flow) -------------------- */

/** Creates a one-time reset token and emails the link. Always resolves (never reveals if the email exists). */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await db().findOne<User>(USERS, { email: email.trim().toLowerCase() });
  if (!user) return; // silently ignore unknown emails (no account enumeration)

  const token = randomBytes(32).toString('hex');
  await db().deleteMany(RESETS, { userId: user._id });
  await db().insertOne(RESETS, {
    _id: newId(),
    userId: user._id,
    token,
    expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000).toISOString(),
  });

  const link = `${config.webAppUrl}/auth/reset?token=${token}`;
  await sendEmail(
    user.email,
    'Reset your GrinCryptoWorld password',
    `Hello ${user.name},\n\nWe received a request to reset your password. Open this link within ${RESET_TTL_MINUTES} minutes:\n\n${link}\n\nIf you didn't request this, you can safely ignore this email.`
  );
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  if (!token || !newPassword || newPassword.length < 8) {
    throw Object.assign(new Error('A valid token and a password of at least 8 characters are required'), { status: 400 });
  }
  const record = await db().findOne<any>(RESETS, { token: String(token).trim() });
  if (!record || new Date(record.expiresAt) < new Date()) {
    throw Object.assign(new Error('This reset link is invalid or has expired — request a new one'), { status: 400 });
  }
  await db().updateOne<User>(USERS, { _id: record.userId }, {
    $set: { passwordHash: bcrypt.hashSync(newPassword, 10), failedLogins: 0, lockedUntil: undefined, updatedAt: now() },
  });
  await db().deleteMany(RESETS, { userId: record.userId });
}

/* -------------------- Email verification (optional, non-blocking) -------------------- */

export async function sendEmailVerification(userId: string): Promise<void> {
  const user = await db().findOne<User>(USERS, { _id: userId });
  if (!user || user.emailVerified) return;
  const token = randomBytes(32).toString('hex');
  await db().deleteMany(VERIFICATIONS, { userId });
  await db().insertOne(VERIFICATIONS, { _id: newId(), userId, token, expiresAt: new Date(Date.now() + 24 * 3600_000).toISOString() });
  const link = `${config.webAppUrl}/auth/verify?token=${token}`;
  await sendEmail(user.email, 'Verify your email — GrinCryptoWorld', `Welcome ${user.name}!\n\nConfirm your email address by opening this link within 24 hours:\n\n${link}`);
}

export async function verifyEmail(token: string): Promise<void> {
  const record = await db().findOne<any>(VERIFICATIONS, { token: String(token).trim() });
  if (!record || new Date(record.expiresAt) < new Date()) {
    throw Object.assign(new Error('This verification link is invalid or has expired'), { status: 400 });
  }
  await db().updateOne(USERS, { _id: record.userId }, { $set: { emailVerified: true, updatedAt: now() } });
  await db().deleteMany(VERIFICATIONS, { userId: record.userId });
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<User, 'name' | 'bio' | 'avatarUrl'>> & { settings?: Partial<User['settings']> }
): Promise<User | null> {
  const set: Record<string, any> = { updatedAt: now() };
  if (patch.name !== undefined) {
    const name = String(patch.name).trim();
    if (name.length < 2 || name.length > 60) {
      throw Object.assign(new Error('Display name must be 2–60 characters'), { status: 400 });
    }
    set.name = name;
  }
  if (patch.bio !== undefined) {
    if (String(patch.bio).length > 500) throw Object.assign(new Error('Bio must be at most 500 characters'), { status: 400 });
    set.bio = patch.bio;
  }
  if (patch.avatarUrl !== undefined) set.avatarUrl = patch.avatarUrl;
  if (patch.settings) set['settings'] = { ...patch.settings };
  if (patch.settings && Object.keys(patch.settings).length) {
    const cur = await db().findOne<User>(USERS, { _id: userId });
    set.settings = { ...(cur?.settings ?? {}), ...patch.settings };
  }
  return db().updateOne<User>(USERS, { _id: userId }, { $set: set });
}

export { USERS };
export type { PublicUser };
