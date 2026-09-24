import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { envSchema, parseConfig } from '../../src/config/index.js';

describe('Environment Configuration & Validation (Fail-Closed)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('successfully parses valid development environment with defaults', () => {
    const devEnv = {
      NODE_ENV: 'development',
    };

    const config = parseConfig(devEnv);
    expect(config.NODE_ENV).toBe('development');
    expect(config.PORT).toBe(3000);
    expect(config.API_KEY).toBe('dev_secret_api_key_12345');
  });

  it('fails closed when invalid NODE_ENV is provided', () => {
    const invalidEnv = {
      NODE_ENV: 'invalid_stage',
    };

    expect(() => parseConfig(invalidEnv)).toThrow(/Environment validation failed/);
  });

  it('fails closed in production if default development secrets are used', () => {
    const insecureProdEnv = {
      NODE_ENV: 'production',
      PORT: '3000',
      DATABASE_URL: 'postgresql://postgres:postgrespassword@localhost:5432/lead_intake_db',
      API_KEY: 'dev_secret_api_key_12345',
      WEBHOOK_VERIFY_TOKEN: 'dev_meta_verify_token_12345',
      META_APP_SECRET: 'dev_meta_app_secret_12345',
    };

    expect(() => parseConfig(insecureProdEnv)).toThrow(/Environment validation failed/);
    const result = envSchema.safeParse(insecureProdEnv);
    expect(result.success).toBe(false);
    if (!result.success) {
      const formatted = result.error.format();
      expect(formatted.DATABASE_URL?._errors).toBeDefined();
      expect(formatted.API_KEY?._errors).toBeDefined();
      expect(formatted.WEBHOOK_VERIFY_TOKEN?._errors).toBeDefined();
      expect(formatted.META_APP_SECRET?._errors).toBeDefined();
    }
  });

  it('passes validation in production when all secrets are properly configured', () => {
    const secureProdEnv = {
      NODE_ENV: 'production',
      PORT: '8080',
      DATABASE_URL: 'postgresql://prod_user:prod_secure_pass@db.example.internal:5432/prod_db?sslmode=require',
      API_KEY: 'prod_super_secret_api_key_889922',
      WEBHOOK_VERIFY_TOKEN: 'prod_meta_verify_token_776655',
      META_APP_SECRET: 'prod_meta_app_secret_112233',
      CORS_ORIGIN: 'https://app.mycompany.com',
    };

    const parsed = parseConfig(secureProdEnv);
    expect(parsed.NODE_ENV).toBe('production');
    expect(parsed.PORT).toBe(8080);
    expect(parsed.API_KEY).toBe('prod_super_secret_api_key_889922');
    expect(parsed.DATABASE_URL).toBe('postgresql://prod_user:prod_secure_pass@db.example.internal:5432/prod_db?sslmode=require');
    expect(parsed.CORS_ORIGIN).toBe('https://app.mycompany.com');
  });

  it('triggers process.exit(1) when validation fails and exitOnError is active', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    const brokenEnv = {
      NODE_ENV: 'production',
    };

    expect(() => parseConfig(brokenEnv, { exitOnError: true })).toThrow();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
