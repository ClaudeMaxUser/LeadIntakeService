import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

export const envSchema = z
  .object({
    PORT: z
      .union([z.string(), z.number()])
      .default(3000)
      .transform((v) => (typeof v === 'number' ? v : parseInt(v, 10) || 3000)),
    DATABASE_URL: z
      .string({ required_error: 'DATABASE_URL is required' })
      .min(1, 'DATABASE_URL cannot be empty')
      .default('postgresql://postgres:postgrespassword@localhost:5432/lead_intake_db'),
    API_KEY: z
      .string({ required_error: 'API_KEY is required' })
      .min(1, 'API_KEY cannot be empty')
      .default('dev_secret_api_key_12345'),
    WEBHOOK_VERIFY_TOKEN: z
      .string({ required_error: 'WEBHOOK_VERIFY_TOKEN is required' })
      .min(1, 'WEBHOOK_VERIFY_TOKEN cannot be empty')
      .default('dev_meta_verify_token_12345'),
    META_APP_SECRET: z
      .string({ required_error: 'META_APP_SECRET is required' })
      .min(1, 'META_APP_SECRET cannot be empty')
      .default('dev_meta_app_secret_12345'),
    CORS_ORIGIN: z.string().default('*'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.DATABASE_URL || data.DATABASE_URL.includes('postgrespassword@localhost')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['DATABASE_URL'],
          message: 'DATABASE_URL must be configured with a production database in production mode',
        });
      }
      if (!data.API_KEY || data.API_KEY === 'dev_secret_api_key_12345') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['API_KEY'],
          message: 'API_KEY must be explicitly set and cannot use the development default secret in production mode',
        });
      }
      if (!data.WEBHOOK_VERIFY_TOKEN || data.WEBHOOK_VERIFY_TOKEN === 'dev_meta_verify_token_12345') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['WEBHOOK_VERIFY_TOKEN'],
          message: 'WEBHOOK_VERIFY_TOKEN must be explicitly set and cannot use the development default secret in production mode',
        });
      }
      if (!data.META_APP_SECRET || data.META_APP_SECRET === 'dev_meta_app_secret_12345') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['META_APP_SECRET'],
          message: 'META_APP_SECRET must be explicitly set and cannot use the development default secret in production mode',
        });
      }
    }
  });

export type Config = z.infer<typeof envSchema>;

export function parseConfig(
  rawEnv: NodeJS.ProcessEnv = process.env,
  options: { exitOnError?: boolean } = {}
): Config {
  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error('❌ Fatal Environment Configuration Error: Invalid or missing environment configuration.');
    console.error(JSON.stringify(parsed.error.format(), null, 2));

    const shouldExit = options.exitOnError ?? (rawEnv.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test');
    if (shouldExit) {
      process.exit(1);
    }
    throw new Error(`Environment validation failed: ${JSON.stringify(parsed.error.format())}`);
  }

  return parsed.data;
}

export const config: Config = parseConfig(process.env);
