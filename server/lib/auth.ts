import crypto from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Request, RequestHandler } from 'express';
import { config } from '../config';
import { redis } from './redis';

export interface AuthClaims extends JwtPayload {
  sub: string;
  role: 'student' | 'faculty' | 'admin';
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthClaims;
}

const refreshKey = (sessionId: string) => `auth:refresh:${sessionId}`;
const revokedKey = (sessionId: string) => `auth:revoked:${sessionId}`;

export function issueAccessToken(claims: Pick<AuthClaims, 'sub' | 'role' | 'sessionId'>): string {
  return jwt.sign(claims, config.jwtAccessSecret, { expiresIn: config.accessTokenTtl as jwt.SignOptions['expiresIn'] });
}

export async function issueRefreshToken(claims: Pick<AuthClaims, 'sub' | 'role' | 'sessionId'>): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  await redis.set(refreshKey(claims.sessionId), JSON.stringify({ ...claims, digest }), 'EX', config.refreshTokenTtlSeconds);
  return token;
}

export async function rotateRefreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; claims: AuthClaims } | null> {
  const digest = crypto.createHash('sha256').update(token).digest('hex');
  const keys = await redis.keys('auth:refresh:*');
  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const stored = JSON.parse(raw) as AuthClaims & { digest: string };
    if (stored.digest !== digest || await redis.exists(revokedKey(stored.sessionId))) continue;
    await redis.del(key);
    const claims = { sub: stored.sub, role: stored.role, sessionId: stored.sessionId } as AuthClaims;
    return { accessToken: issueAccessToken(claims), refreshToken: await issueRefreshToken(claims), claims };
  }
  return null;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await Promise.all([redis.del(refreshKey(sessionId)), redis.set(revokedKey(sessionId), '1', 'EX', config.refreshTokenTtlSeconds)]);
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ message: 'Authentication required.', code: 'AUTH_REQUIRED' });
  try {
    (req as AuthenticatedRequest).auth = jwt.verify(header.slice(7), config.jwtAccessSecret) as AuthClaims;
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired access token.', code: 'AUTH_INVALID' });
  }
};

export const requireRole = (...roles: AuthClaims['role'][]): RequestHandler => (req, res, next) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth || !roles.includes(auth.role)) return res.status(403).json({ message: 'You do not have permission for this action.', code: 'FORBIDDEN' });
  return next();
};
