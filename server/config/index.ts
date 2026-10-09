import 'dotenv/config';

const required = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is required in environment variables.`);
  return value;
};

const secret = (name: string, developmentFallback: string): string =>
  process.env.NODE_ENV === 'production' ? required(name) : (process.env[name] ?? developmentFallback);

export const config = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: process.env.DATABASE_URL ?? 'mongodb://127.0.0.1:27017/astraprep',
  redisUrl: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
  jwtAccessSecret: secret('JWT_ACCESS_SECRET', 'astraprep-dev-jwt-access-secret-key-2026'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'astraprep-dev-jwt-refresh-secret-key-2026'),
  accessTokenTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTokenTtlSeconds: Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 604800),
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://127.0.0.1:5173,http://localhost:5173').split(',').map((o) => o.trim()),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: process.env.NODE_ENV === 'production',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads/question_papers',

  // Permanent Super Admin account configuration
  adminName: process.env.ADMIN_NAME ?? 'Super Administrator',
  adminEmail: (process.env.ADMIN_EMAIL ?? 'admin@demo.com').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD ?? 'SuperAdmin@123456',
  adminMobile: process.env.ADMIN_MOBILE ?? '9999999999',
};
