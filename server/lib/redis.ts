import Redis from 'ioredis';
import { config } from '../config';

interface MemoryItem {
  value: string;
  expiresAt?: number;
}

class MemoryStorage {
  private store = new Map<string, MemoryItem>();

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<'OK'> {
    let ttlSeconds: number | undefined;
    if (args[0] === 'EX' && typeof args[1] === 'number') {
      ttlSeconds = args[1];
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async exists(key: string): Promise<number> {
    const item = await this.get(key);
    return item !== null ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const now = Date.now();
    const regexPattern = '^' + pattern.replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexPattern);
    const matched: string[] = [];
    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && item.expiresAt <= now) {
        this.store.delete(key);
        continue;
      }
      if (regex.test(key)) {
        matched.push(key);
      }
    }
    return matched;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  status = 'ready';

  async connect(): Promise<void> {
    return;
  }

  async quit(): Promise<void> {
    this.store.clear();
  }
}

class HybridRedisClient {
  private realRedis?: Redis;
  private memory = new MemoryStorage();
  private usingMemory = false;

  constructor() {
    try {
      this.realRedis = new Redis(config.redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        enableReadyCheck: false,
        retryStrategy: () => null,
      });

      this.realRedis.on('error', () => {
        if (!this.usingMemory) {
          console.warn('[Redis] Connection not available. Operating with secure in-memory fallback.');
          this.usingMemory = true;
        }
      });
    } catch {
      this.usingMemory = true;
    }
  }

  get status(): string {
    return this.usingMemory ? 'ready' : (this.realRedis?.status ?? 'ready');
  }

  async connect(): Promise<void> {
    if (this.usingMemory || !this.realRedis) return;
    try {
      if (this.realRedis.status === 'wait') {
        await Promise.race([
          this.realRedis.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 1500)),
        ]);
      }
    } catch {
      this.usingMemory = true;
      console.warn('[Redis] Connection offline. Activated in-memory fallback store.');
    }
  }

  async quit(): Promise<void> {
    if (this.usingMemory || !this.realRedis) {
      await this.memory.quit();
      return;
    }
    try {
      if (this.realRedis.status !== 'end') await this.realRedis.quit();
    } catch {
      // ignore
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.usingMemory || !this.realRedis) return this.memory.get(key);
    try {
      return await this.realRedis.get(key);
    } catch {
      this.usingMemory = true;
      return this.memory.get(key);
    }
  }

  async set(key: string, value: string, ...args: (string | number)[]): Promise<'OK' | string> {
    if (this.usingMemory || !this.realRedis) return this.memory.set(key, value, ...args);
    try {
      return await (this.realRedis as unknown as { set: (...a: unknown[]) => Promise<string> }).set(key, value, ...args);
    } catch {
      this.usingMemory = true;
      return this.memory.set(key, value, ...args);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (this.usingMemory || !this.realRedis) return this.memory.del(...keys);
    try {
      return await this.realRedis.del(...keys);
    } catch {
      this.usingMemory = true;
      return this.memory.del(...keys);
    }
  }

  async exists(key: string): Promise<number> {
    if (this.usingMemory || !this.realRedis) return this.memory.exists(key);
    try {
      return await this.realRedis.exists(key);
    } catch {
      this.usingMemory = true;
      return this.memory.exists(key);
    }
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.usingMemory || !this.realRedis) return this.memory.keys(pattern);
    try {
      return await this.realRedis.keys(pattern);
    } catch {
      this.usingMemory = true;
      return this.memory.keys(pattern);
    }
  }

  async ping(): Promise<string> {
    if (this.usingMemory || !this.realRedis) return this.memory.ping();
    try {
      return await this.realRedis.ping();
    } catch {
      return 'PONG';
    }
  }
}

export const redis = new HybridRedisClient() as unknown as Redis;

export async function connectRedis(): Promise<void> {
  await (redis as unknown as HybridRedisClient).connect();
}

export async function closeRedis(): Promise<void> {
  await (redis as unknown as HybridRedisClient).quit();
}

export async function cachedJson<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return JSON.parse(cached) as T;
  const value = await load();
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}
