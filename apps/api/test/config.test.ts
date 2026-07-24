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

    expect(config.corsOrigins).toEqual([
      'https://one.example',
      'https://two.example',
    ]);
  });
});
