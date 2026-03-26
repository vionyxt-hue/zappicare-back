import { z } from 'zod';

const EnvironmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('Zappicare Backend'),
  APP_VERSION: z.string().default('1.0.0'),

  // PostgreSQL (Knex + pg) — use DATABASE_URL **or** DB_HOST / DB_NAME / …
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().int().default(5432),
  DB_NAME: z.string().default('zappicare'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('Atul16'),
  DB_POOL_MIN: z.coerce.number().int().min(0).max(100).default(0),
  DB_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  DB_MIGRATIONS_TABLE: z.string().default('knex_migrations'),
  DB_DATA_SCHEMA: z.string().default('data'),
  DB_AUDIT_SCHEMA: z.string().default('audit'),
  DB_PUBLIC_SCHEMA: z.string().default('public'),
  /** Set to `true` to enable TLS (e.g. managed Postgres). */
  DB_SSL: z.string().optional(),
  /** When SSL is on, set to `false` to allow self-signed certs (default matches typical cloud dev). */
  DB_SSL_REJECT_UNAUTHORIZED: z.string().optional(),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // OAuth (optional – omit to disable)
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(), // Apple bundle ID / service ID for token audience
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info'),

  // AWS S3 (optional – for provider document uploads)
  AWS_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),
});

export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

export class EnvironmentConfigValidator {
  static validate(config: Record<string, unknown>): EnvironmentConfig {
    try {
      return EnvironmentSchema.parse(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues
          .map((err) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        throw new Error(`Environment validation failed: ${errorMessages}`);
      }
      throw error;
    }
  }
}
