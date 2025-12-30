import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),

  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_URL: Joi.string().allow('').optional(),

  // Auth
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_SALT_ROUNDS: Joi.number().default(10),

  // Storage - FIXED TO ALLOW CLOUDINARY
  UPLOAD_DRIVER: Joi.string().valid('local', 'supabase', 'cloudinary').default('local'),

  // Cloudinary Validation
  CLOUDINARY_CLOUD_NAME: Joi.when('UPLOAD_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_KEY: Joi.when('UPLOAD_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_API_SECRET: Joi.when('UPLOAD_DRIVER', {
    is: 'cloudinary',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  CLOUDINARY_UPLOAD_PRESET: Joi.string().allow('').optional(),

  // Supabase Validation
  SUPABASE_URL: Joi.when('UPLOAD_DRIVER', {
    is: 'supabase',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  SUPABASE_SERVICE_ROLE_KEY: Joi.when('UPLOAD_DRIVER', {
    is: 'supabase',
    then: Joi.string().required(),
    otherwise: Joi.string().allow('').optional(),
  }),
  SUPABASE_STORAGE_BUCKET: Joi.string().default('dms-files'),

  // Email & SMS
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.string().allow('').optional(),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASSWORD: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
  SMS_PROVIDER: Joi.string().default('stub'),
  MSG91_KEY: Joi.string().allow('').optional(),

  // Misc
  INVOICE_PREFIX_DEFAULT: Joi.string().default('SC-INV-'),
  CRON_TZ: Joi.string().default('Asia/Kolkata'),
  NOMINATIM_BASE_URL: Joi.string().allow('').optional(),
  NOMINATIM_USER_AGENT: Joi.string().allow('').optional(),
  SERVICE_CENTER_SEARCH_RADIUS: Joi.number().optional(),
  GEOCODING_CACHE_TTL: Joi.number().optional(),
});
