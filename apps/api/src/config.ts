import 'dotenv/config';
import { z } from 'zod';
import type { JwtVerificationConfig } from './modules/identity/authentication.js';

const BooleanStringSchema = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4_000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006'),
  ENABLE_DEMO_AUTH: BooleanStringSchema,
  AUTH_ISSUER: z.string().url().optional(),
  AUTH_AUDIENCE: z.string().optional(),
  AUTH_JWKS_URL: z.string().url().optional(),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  corsOrigins: string[];
  enableDemoAuth: boolean;
  authentication?: JwtVerificationConfig;
};

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = ConfigSchema.parse(environment);

  if (parsed.NODE_ENV === 'production' && parsed.ENABLE_DEMO_AUTH) {
    throw new Error('ENABLE_DEMO_AUTH cannot be enabled in production.');
  }

  const authValues = [parsed.AUTH_ISSUER, parsed.AUTH_AUDIENCE, parsed.AUTH_JWKS_URL];
  const authConfigured = authValues.some((value) => value !== undefined && value.length > 0);
  if (authConfigured && authValues.some((value) => value === undefined || value.length === 0)) {
    throw new Error('AUTH_ISSUER, AUTH_AUDIENCE, and AUTH_JWKS_URL must be configured together.');
  }
  if (parsed.NODE_ENV === 'production' && !authConfigured) {
    throw new Error('Authentication verification must be configured in production.');
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    host: parsed.HOST,
    port: parsed.PORT,
    logLevel: parsed.LOG_LEVEL,
    corsOrigins: parsed.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    enableDemoAuth: parsed.ENABLE_DEMO_AUTH,
    ...(authConfigured
      ? {
          authentication: {
            issuer: parsed.AUTH_ISSUER!,
            audiences: parsed
              .AUTH_AUDIENCE!.split(',')
              .map((audience) => audience.trim())
              .filter(Boolean),
            jwksUrl: parsed.AUTH_JWKS_URL!,
          },
        }
      : {}),
  };
}
