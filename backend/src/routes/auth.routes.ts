import { Router } from 'express';
import { asyncHandler } from '../utils';
import { authRequired, clearAuthCookie, getTokenFromReq, rateLimit, revokeToken, setAuthCookie, signToken, toPublicUser } from '../middleware/auth';
import {
  createNonce, login, register, updateProfile, verifyWalletSignature, getProfile,
  requestPasswordReset, resetPassword, sendEmailVerification, verifyEmail,
} from '../services/auth.service';

export const authRouter = Router();

/** POST /api/auth/register — email + password signup (sends verification email when SMTP configured) */
authRouter.post('/register', rateLimit(10), asyncHandler(async (req, res) => {
  const { email, password, name } = req.body || {};
  const user = await register(email, password, name);
  const token = signToken(user);
  setAuthCookie(res, token);
  sendEmailVerification(user._id).catch(() => undefined);
  res.status(201).json({ token, user: toPublicUser(user) });
}));

/** POST /api/auth/login — email + password login */
authRouter.post('/login', rateLimit(10), asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  const user = await login(email, password);
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, user: toPublicUser(user) });
}));

/** POST /api/auth/logout — clears the httpOnly cookie AND revokes the token server-side */
authRouter.post('/logout', (req, res) => {
  const token = getTokenFromReq(req);
  if (token) revokeToken(token).catch(() => undefined);
  clearAuthCookie(res);
  res.json({ ok: true });
});

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
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ token, user: toPublicUser(user) });
}));

/** POST /api/auth/forgot-password — emails a one-time reset link (never reveals whether the email exists) */
authRouter.post('/forgot-password', rateLimit(5), asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  if (email) await requestPasswordReset(email);
  res.json({ ok: true, message: 'If that email is registered, a reset link is on its way.' });
}));

/** POST /api/auth/reset-password — consume the token and set a new password */
authRouter.post('/reset-password', rateLimit(5), asyncHandler(async (req, res) => {
  const { token, password } = req.body || {};
  await resetPassword(token, password);
  clearAuthCookie(res);
  res.json({ ok: true, message: 'Password updated — you can sign in now.' });
}));

/** GET /api/auth/verify-email?token=… — marks the account as verified */
authRouter.get('/verify-email', asyncHandler(async (req, res) => {
  try {
    await verifyEmail(String(req.query.token || ''));
    res.json({ ok: true, message: 'Email verified ✅' });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
}));

/** POST /api/auth/resend-verification (auth) */
authRouter.post('/resend-verification', authRequired, asyncHandler(async (req, res) => {
  await sendEmailVerification(req.user!.id);
  res.json({ ok: true });
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
