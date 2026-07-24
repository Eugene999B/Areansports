import { describe, expect, it } from 'vitest';
import { readConfig } from '../src/config.js';

describe('readConfig', () => {
  it('refuses development demo authentication in production', () => {
    expect(() =>
      readConfig({
        NODE_ENV: 'production',
        ENABLE_DEMO_AUTH: 'true',
      }),
    ).toThrow(/cannot be enabled in production/);
  });

  it('normalizes CORS origins', () => {
    const config = readConfig({
      NODE_ENV: 'test',
      CORS_ORIGINS: 'https://one.example, https://two.example',
    });

    expect(config.corsOrigins).toEqual(['https://one.example', 'https://two.example']);
  });
  it('requires the complete authentication verification boundary in production', () => {
    expect(() => readConfig({ NODE_ENV: 'production' })).toThrow(
      /Authentication verification must be configured/,
    );
    expect(() =>
      readConfig({ NODE_ENV: 'test', AUTH_ISSUER: 'https://project.supabase.co/auth/v1' }),
    ).toThrow(/must be configured together/);
  });

  it('normalizes authentication audiences', () => {
    const config = readConfig({
      NODE_ENV: 'production',
      AUTH_ISSUER: 'https://project.supabase.co/auth/v1',
      AUTH_AUDIENCE: 'authenticated, mobile',
      AUTH_JWKS_URL: 'https://project.supabase.co/auth/v1/.well-known/jwks.json',
    });

    expect(config.authentication?.audiences).toEqual(['authenticated', 'mobile']);
  });
});
