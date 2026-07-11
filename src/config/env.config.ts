import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });


const validateRequired = (vars: Record<string, string | undefined>): void => {
  const missing = Object.entries(vars).filter(([key, value]) => !value);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.map(([key]) => key).join(', ')}`);
  }
};

const config = {
  // Server Configuration
  port: Number(process.env.PORT),
  nodeEnv: process.env.NODE_ENV,

  // Database Configuration
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT Authentication
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN,

  // Stripe Payment
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Application Settings
  defaultCurrency: process.env.DEFAULT_CURRENCY,
  maxRentalDays: Number(process.env.MAX_RENTAL_DAYS),
  maxRentalItems: Number(process.env.MAX_RENTAL_ITEMS),
  maxItemsPerOrder: Number(process.env.MAX_ITEMS_PER_ORDER),
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS),

  // Rate Limiting
  rateLimit: {
    strictWindowMs: Number(process.env.STRICT_WINDOW_MS),
    strictMaxRequests: Number(process.env.STRICT_MAX_REQUESTS),
    authWindowMs: Number(process.env.AUTH_WINDOW_MS),
    authMaxRequests: Number(process.env.AUTH_MAX_REQUESTS),
    standardWindowMs: Number(process.env.STANDARD_WINDOW_MS),
    standardMaxRequests: Number(process.env.STANDARD_MAX_REQUESTS),
  },

  // File Upload
  upload: {
    maxFileSize: Number(process.env.MAX_FILE_SIZE),
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
    uploadDir: process.env.UPLOAD_DIR,
  },

  // Logging
  logging: {
    logLevel: process.env.LOG_LEVEL,
    logFormat: process.env.LOG_FORMAT,
    logFile: process.env.LOG_FILE,
  },

  // Validation Configuration
  validation: {
    passwordMinLength: Number(process.env.PASSWORD_MIN_LENGTH),
    passwordRequireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
    passwordRequireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
    passwordRequireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
    passwordRequireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
    maxSearchLength: parseInt(process.env.MAX_SEARCH_LENGTH || '100', 10),
    maxCommentLength: parseInt(process.env.MAX_COMMENT_LENGTH || '1000', 10),
    maxNotesLength: parseInt(process.env.MAX_NOTES_LENGTH || '500', 10),
  },

  // Feature Flags
  features: {
    enableRegistration: process.env.ENABLE_REGISTRATION !== 'false',
    enableSocialLogin: process.env.ENABLE_SOCIAL_LOGIN === 'true',
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
  },

  // Validate configuration on startup
  validate() {
    try {
      // Validate critical configurations
      const requiredConfigs = {
        'DATABASE_URL': this.databaseUrl,
        'JWT_SECRET': this.jwtSecret,
      };

      validateRequired(requiredConfigs);

      // Validate production-specific requirements
      if (this.nodeEnv === 'production') {
        if (this.jwtSecret && (this.jwtSecret.includes('change-in-production') || this.jwtSecret.includes('your-super-secret'))) {
          throw new Error('JWT_SECRET must be changed in production');
        }

        if (!this.stripeSecretKey) {
          // Stripe payment gateway not configured
        }
      }

      // Configuration validated successfully (silent in production)
    } catch (error) {
      console.error('Configuration validation failed:', error instanceof Error ? error.message : error);
      throw error;
    }
  },

  /**
   * Get safe config for logging (hides sensitive values)
   */
  getSafeConfig() {
    return {
      port: this.port,
      nodeEnv: this.nodeEnv,
      databaseUrl: this.databaseUrl ? '***CONFIGURED***' : 'NOT CONFIGURED',
      jwtSecret: this.jwtSecret ? '***CONFIGURED***' : 'NOT CONFIGURED',
      jwtExpiresIn: this.jwtExpiresIn,
      jwtRefreshExpiresIn: this.jwtRefreshExpiresIn,
      stripeSecretKey: this.stripeSecretKey ? '***CONFIGURED***' : 'NOT CONFIGURED',
      stripePublishableKey: this.stripePublishableKey || 'NOT CONFIGURED',
      stripeWebhookSecret: this.stripeWebhookSecret ? '***CONFIGURED***' : 'NOT CONFIGURED',
      defaultCurrency: this.defaultCurrency,
      maxRentalDays: this.maxRentalDays,
      maxRentalItems: this.maxRentalItems,
      maxItemsPerOrder: this.maxItemsPerOrder,
      bcryptRounds: this.bcryptRounds,
      rateLimit: this.rateLimit,
      upload: this.upload,
      logging: this.logging,
      features: this.features,
    };
  }
};

export default config;