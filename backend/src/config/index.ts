import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((v) => parseInt(v, 10)),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  API_KEY: z.string().min(1, 'API_KEY is required'),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'WEBHOOK_VERIFY_TOKEN is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const config = parsed.success
  ? parsed.data
  : {
      PORT: 3000,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/lead_intake_db',
      API_KEY: process.env.API_KEY || 'dev_secret_api_key_12345',
      WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || 'dev_meta_verify_token_12345',
      META_APP_SECRET: process.env.META_APP_SECRET || 'dev_meta_app_secret_12345',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'test',
    };
