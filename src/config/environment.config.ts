import { z } from 'zod';

const EnvironmentSchema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3000),
  APP_NAME: z.string().default('Zappicare Backend'),
  APP_VERSION: z.string().default('1.0.0'),

  // MongoDB
  MONGODB_URI: z.string().default('mongodb://localhost:27017/zappicare'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // OAuth (optional – omit to disable)
  GOOGLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(), // Apple bundle ID / service ID for token audience

  // Logging
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'])
    .default('info'),
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
