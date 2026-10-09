import type { Request, Response, NextFunction } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { redis } from '../lib/redis';

export interface AuthClaims extends JwtPayload {
  sub: string;
  role: 'student' | 'faculty' | 'admin';
  sessionId: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthClaims;
  user?: import('../models/User').IUser;
}

const revokedKey = (sessionId: string) => `auth:revoked:${sessionId}`;

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response> {
  let token: string | undefined;

  const header = req.header('authorization');
  if (header?.startsWith('Bearer ')) {
    token = header.slice(7).trim();
  } else if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)accessToken=([^;]+)/);
    if (match) token = decodeURIComponent(match[1]);
  }

  if (!token) {
    return res.status(401).json({ message: 'Authentication required. Please log in.', code: 'AUTH_REQUIRED' });
  }

  try {
    const claims = jwt.verify(token, config.jwtAccessSecret) as AuthClaims;

    // Check if session has been revoked
    if (claims.sessionId && (await redis.exists(revokedKey(claims.sessionId)))) {
      return res.status(401).json({ message: 'Session has been revoked. Please log in again.', code: 'SESSION_REVOKED' });
    }

    // Verify user in MongoDB
    const user = await User.findById(claims.sub);
    if (!user) {
      return res.status(401).json({ message: 'User account not found.', code: 'ACCOUNT_NOT_FOUND' });
    }

    if (user.status !== 'verified') {
      return res.status(403).json({
        message: `Account is ${user.status}. Contact administrator for access.`,
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.auth = claims;
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired access token.', code: 'AUTH_INVALID' });
  }
}
