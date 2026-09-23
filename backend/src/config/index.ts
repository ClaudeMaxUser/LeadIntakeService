import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.union([z.string(), z.number()]).default(3000).transform((v) => (typeof v === 'number' ? v : parseInt(v, 10) || 3000)),
  DATABASE_URL: z.string().default('postgresql://postgres:postgrespassword@localhost:5432/lead_intake_db'),
  API_KEY: z.string().default('dev_secret_api_key_12345'),
  WEBHOOK_VERIFY_TOKEN: z.string().default('dev_meta_verify_token_12345'),
  META_APP_SECRET: z.string().default('dev_meta_app_secret_12345'),
  CORS_ORIGIN: z.string().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn('⚠️ Environment variable notice:', parsed.error.format());
}

export const config = parsed.success
  ? parsed.data
  : {
      PORT: parseInt(process.env.PORT || '3000', 10) || 3000,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/lead_intake_db',
      API_KEY: process.env.API_KEY || 'dev_secret_api_key_12345',
      WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN || 'dev_meta_verify_token_12345',
      META_APP_SECRET: process.env.META_APP_SECRET || 'dev_meta_app_secret_12345',
      CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    };

