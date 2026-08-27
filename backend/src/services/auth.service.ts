import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ethers } from 'ethers';
import type { PublicUser, User } from '@shared/types';
import { db, newId, now } from '../db';
import { isValidEmail } from '../utils';

const USERS = 'users';
const NONCES = 'nonces';

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
  await db().insertOne(USERS, user);
  return user;
}

export async function login(email: string, password: string): Promise<User> {
  const user = await db().findOne<User>(USERS, { email: email.trim().toLowerCase() });
  if (!user?.passwordHash) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (!bcrypt.compareSync(password, user.passwordHash)) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  return user;
}

/* --------------------------- MetaMask wallet login --------------------------- */

export async function createNonce(address: string): Promise<{ nonce: string; message: string }> {
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

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<User, 'name' | 'bio' | 'avatarUrl'>> & { settings?: Partial<User['settings']> }
): Promise<User | null> {
  const set: Record<string, any> = { updatedAt: now() };
  if (patch.name !== undefined) set.name = patch.name;
  if (patch.bio !== undefined) set.bio = patch.bio;
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
