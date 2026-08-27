import { Router } from 'express';
import { asyncHandler } from '../utils';
import { authRequired, rateLimit, signToken, toPublicUser } from '../middleware/auth';
import { createNonce, login, register, updateProfile, verifyWalletSignature, getProfile } from '../services/auth.service';

export const authRouter = Router();

/** POST /api/auth/register — email + password signup */
authRouter.post('/register', rateLimit(10), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body || {};
  const user = await register(email, password, name);
  res.status(201).json({ token: signToken(user), user: toPublicUser(user) });
}));

/** POST /api/auth/login — email + password login */
authRouter.post('/login', rateLimit(10), asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await login(email, password);
  res.json({ token: signToken(user), user: toPublicUser(user) });
}));

/** POST /api/auth/wallet/nonce — get a MetaMask sign-in challenge */
authRouter.post('/wallet/nonce', rateLimit(20), asyncHandler(async (req, res) => {
  const { address } = req.body || {};
  const data = await createNonce(address);
  res.json(data);
}));

/** POST /api/auth/wallet/verify — verify signature, login or auto-create account */
authRouter.post('/wallet/verify', rateLimit(20), asyncHandler(async (req, res) => {
  const { address, signature } = req.body || {};
  const user = await verifyWalletSignature(address, signature);
  res.json({ token: signToken(user), user: toPublicUser(user) });
}));

/** GET /api/auth/me — current profile */
authRouter.get('/me', authRequired, asyncHandler(async (req, res) => {
  const user = await getProfile(req.user!.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: toPublicUser(user) });
}));

/** PATCH /api/auth/me — update profile / settings */
authRouter.patch('/me', authRequired, asyncHandler(async (req, res) => {
  const { name, bio, avatarUrl, settings } = req.body || {};
  const user = await updateProfile(req.user!.id, { name, bio, avatarUrl, settings });
  res.json({ user: user ? toPublicUser(user) : null });
}));
