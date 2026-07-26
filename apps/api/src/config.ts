import 'dotenv/config';
import { z } from 'zod';

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
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  AUTH_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(500).max(30_000).default(5_000),
});

export type AppConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
  corsOrigins: string[];
  enableDemoAuth: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  authRequestTimeoutMs: number;
};

export function readConfig(environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = ConfigSchema.parse(environment);

  if (parsed.NODE_ENV === 'production' && parsed.ENABLE_DEMO_AUTH) {
    throw new Error('ENABLE_DEMO_AUTH cannot be enabled in production.');
  }

  const hasSupabaseUrl = Boolean(parsed.SUPABASE_URL);
  const hasSupabaseKey = Boolean(parsed.SUPABASE_PUBLISHABLE_KEY);
  if (hasSupabaseUrl !== hasSupabaseKey) {
    throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be configured together.');
  }
  if (parsed.NODE_ENV === 'production' && !hasSupabaseUrl) {
    throw new Error('Supabase authentication must be configured in production.');
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
    supabaseUrl: parsed.SUPABASE_URL,
    supabasePublishableKey: parsed.SUPABASE_PUBLISHABLE_KEY,
    authRequestTimeoutMs: parsed.AUTH_REQUEST_TIMEOUT_MS,
  };
}
