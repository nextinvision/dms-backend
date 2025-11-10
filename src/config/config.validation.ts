import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.string().default('4000'),

  DATABASE_URL: Joi.string().required(),

  REDIS_URL: Joi.string().allow('').optional(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('30m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.string().default('12'),

  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.string().allow('').optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),

  SMS_PROVIDER: Joi.string().default('stub'),
  MSG91_KEY: Joi.string().allow('').optional(),

  UPLOAD_DRIVER: Joi.string().valid('local', 'supabase').default('local'),
  SUPABASE_URL: Joi.string().allow('').optional(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().allow('').optional(),
  SUPABASE_STORAGE_BUCKET: Joi.string().allow('').optional(),

  INVOICE_PREFIX_DEFAULT: Joi.string().default('SC-INV-'),
  CRON_TZ: Joi.string().default('Asia/Kolkata'),
});
