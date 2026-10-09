import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/User';
import { PasswordReset } from '../models/PasswordReset';
import { AuditLog } from '../models/AuditLog';
import { redis } from '../lib/redis';
import type { AuthClaims } from '../middleware/auth';

const refreshKey = (sessionId: string) => `auth:refresh:${sessionId}`;
const revokedKey = (sessionId: string) => `auth:revoked:${sessionId}`;

export class AuthService {
  /**
   * Ensure permanent Super Admin account exists in MongoDB.
   * Credentials configured exclusively via secure environment variables.
   */
  async ensureSuperAdmin(): Promise<void> {
    const adminEmail = config.adminEmail;
    const existing = await User.findOne({ email: adminEmail });

    if (!existing) {
      console.log(`[Super Admin] Initializing master administrator account for ${adminEmail}...`);
      const passwordHash = await bcrypt.hash(config.adminPassword, 12);
      await User.create({
        _id: 'A-001',
        name: config.adminName,
        email: adminEmail,
        mobile: config.adminMobile,
        passwordHash,
        role: 'admin',
        status: 'verified',
        isFirstLogin: false,
        streak: 0,
        createdAt: new Date().toISOString().slice(0, 10),
      });
      console.log(`[Super Admin] Account ${adminEmail} initialized successfully.`);
    } else {
      // Ensure password hash matches configured ADMIN_PASSWORD and status is verified
      const matches = await bcrypt.compare(config.adminPassword, existing.passwordHash);
      if (!matches) {
        existing.passwordHash = await bcrypt.hash(config.adminPassword, 12);
      }
      existing.role = 'admin';
      existing.status = 'verified';
      await existing.save();
    }
  }

  issueAccessToken(claims: Pick<AuthClaims, 'sub' | 'role' | 'sessionId' | 'email' | 'name'>): string {
    return jwt.sign(claims, config.jwtAccessSecret, {
      expiresIn: config.accessTokenTtl as jwt.SignOptions['expiresIn'],
    });
  }

  async issueRefreshToken(claims: Pick<AuthClaims, 'sub' | 'role' | 'sessionId'>): Promise<string> {
    const token = crypto.randomBytes(48).toString('base64url');
    const digest = crypto.createHash('sha256').update(token).digest('hex');
    await redis.set(refreshKey(claims.sessionId), JSON.stringify({ ...claims, digest }), 'EX', config.refreshTokenTtlSeconds);
    return token;
  }

  async rotateRefreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; claims: AuthClaims } | null> {
    const digest = crypto.createHash('sha256').update(token).digest('hex');
    const keys = await redis.keys('auth:refresh:*');

    for (const key of keys) {
      const raw = await redis.get(key);
      if (!raw) continue;
      const stored = JSON.parse(raw) as AuthClaims & { digest: string };
      if (stored.digest !== digest || (await redis.exists(revokedKey(stored.sessionId)))) continue;

      await redis.del(key);
      const user = await User.findById(stored.sub);
      if (!user || user.status !== 'verified') return null;

      const claims: AuthClaims = {
        sub: user._id,
        role: user.role,
        sessionId: `${user._id}:${Date.now()}`,
        email: user.email,
        name: user.name,
      };

      return {
        accessToken: this.issueAccessToken(claims),
        refreshToken: await this.issueRefreshToken(claims),
        claims,
      };
    }
    return null;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await Promise.all([
      redis.del(refreshKey(sessionId)),
      redis.set(revokedKey(sessionId), '1', 'EX', config.refreshTokenTtlSeconds),
    ]);
  }

  /**
   * Request password recovery OTP / token.
   * Returns generic response to prevent account enumeration.
   */
  async requestPasswordReset(identifier: string, ip?: string): Promise<{ message: string; codePreview?: string }> {
    const normalized = identifier.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ email: normalized }, { _id: identifier.trim() }, { mobile: identifier.trim() }],
    });

    if (!user) {
      return { message: 'If this account exists in our system, recovery instructions have been sent.' };
    }

    // Generate single-use secure reset token and 6-digit OTP
    const resetToken = crypto.randomBytes(32).toString('hex');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Invalidate previous pending resets for this email
    await PasswordReset.deleteMany({ email: user.email });

    // Store new record with 15-minute expiry
    await PasswordReset.create({
      email: user.email,
      tokenHash,
      otpHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      used: false,
    });

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'auth',
      ip,
      metadata: { email: user.email },
    });

    console.log(`[Password Recovery] Reset OTP for ${user.email}: ${otp} (Token: ${resetToken})`);

    return {
      message: 'If this account exists in our system, recovery instructions have been sent.',
      codePreview: config.nodeEnv === 'development' ? otp : undefined,
    };
  }

  /**
   * Reset password using OTP or Token.
   */
  async resetPassword(params: { email: string; otpOrToken: string; newPassword: string }): Promise<boolean> {
    const { email, otpOrToken, newPassword } = params;
    const normalizedEmail = email.trim().toLowerCase();
    const hash = crypto.createHash('sha256').update(otpOrToken.trim()).digest('hex');

    const resetRecord = await PasswordReset.findOne({
      email: normalizedEmail,
      $or: [{ tokenHash: hash }, { otpHash: hash }],
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetRecord) {
      throw new Error('Invalid or expired password reset token / OTP.');
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      throw new Error('Associated user account not found.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.isFirstLogin = false;
    user.tempPassword = false;
    await user.save();

    resetRecord.used = true;
    await resetRecord.save();

    await AuditLog.create({
      actorId: user._id,
      actorRole: user.role,
      actorName: user.name,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'auth',
      metadata: { email: user.email },
    });

    return true;
  }
}

export const authService = new AuthService();
