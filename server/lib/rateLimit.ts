import type { RequestHandler } from 'express';
import { redis } from './redis';

export function redisRateLimit(options: { windowSeconds: number; max: number; prefix: string }): RequestHandler {
  return async (req, res, next) => {
    try {
      const key = `${options.prefix}:${req.ip}`;
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, options.windowSeconds);
      if (count > options.max) return res.status(429).json({ message: 'Too many requests. Please retry later.', code: 'RATE_LIMITED' });
      return next();
    } catch {
      // Redis is coordination infrastructure; availability of saved MongoDB data
      // must not be coupled to a rate-limit counter outage.
      return next();
    }
  };
}
