// src/utils/ConfigManager.js

/**
 * Configuration manager to handle environment variables
 * Provides a centralized way to access environment configuration
 */
class ConfigManager {
  constructor() {
    // Default configuration values (UPDATED FOR PRODUCTION)
    this.defaults = {
      API_BASE_URL: 'https://2mez9qoyt6.execute-api.us-east-2.amazonaws.com/prod',
      DEBUG_MODE: false,
      LOG_LEVEL: 'error',
      AUTH_COOKIE_NAME: 'casl_auth_token',
      AUTH_COOKIE_DOMAIN: window.location.hostname,
      AUTH_COOKIE_SECURE: window.location.protocol === 'https:',
      AUTH_COOKIE_MAX_AGE: 7 * 24 * 60 * 60, // 7 days in seconds
      REFRESH_TOKEN_COOKIE_NAME: 'casl_refresh_token',
      USER_DATA_KEY: 'casl_user_data',
      STORAGE_PREFIX: 'casl_',
      LOCALIZATION_KEY: 'casl_language',
      DEFAULT_LANGUAGE: 'en',
      FORM_AUTO_SAVE: true,
      ENABLE_ANALYTICS: false,
      VERIFICATION_EXPIRY_DAYS: 365,
      VERIFICATION_MIN_SCORE: 50,
      MAX_SCREENSHOT_SIZE: 5 * 1024 * 1024, // 5MB
      VERIFICATION_METHODS: ['screenshot', 'government-id', 'phone', 'social', 'background-check'],
      ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
      VERIFICATION_POLL_INTERVAL: 3000, // 3 seconds
      COGNITO_REGION: 'us-east-2',
      COGNITO_USER_POOL_ID: 'us-east-2_wxVzxzC7V',
      COGNITO_CLIENT_ID: '6eihn0891v31dsovg33g2e1h90',
      REQUIRE_SECURE_CONTEXT: true
    };

    this.config = {};
    this.init();
  }

  init() {
    this.loadFromGlobalConfig();
    this.loadFromMetaTags();
    this.loadFromLocalStorage();
    this.mergeDefaults();
    this.validateSecureContext();
  }

  loadFromGlobalConfig() {
    try {
      if (typeof window !== 'undefined' && window.CASL_CONFIG) {
        const config = this.flattenConfig(window.CASL_CONFIG);
        Object.keys(config).forEach(key => {
          this.config[key] = config[key];
        });
      }
    } catch (error) {
      console.warn('Could not load config from global config object:', error);
    }
  }

  flattenConfig(obj, prefix = '') {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? `${prefix}_` : '';
      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(acc, this.flattenConfig(obj[key], `${pre}${key}`));
      } else {
        acc[`${pre}${key}`.toUpperCase()] = obj[key];
      }
      return acc;
    }, {});
  }

  loadFromMetaTags() {
    try {
      const metaTags = document.querySelectorAll('meta[name^="casl-config-"]');
      metaTags.forEach(tag => {
        const key = tag.getAttribute('name').replace('casl-config-', '').toUpperCase();
        const value = tag.getAttribute('content');
        this.config[key] = this.parseValue(value);
      });
    } catch (error) {
      console.warn('Could not load config from meta tags:', error);
    }
  }

  loadFromLocalStorage() {
    try {
      const configStr = localStorage.getItem('casl_config');
      if (configStr) {
        const storedConfig = JSON.parse(configStr);
        Object.keys(storedConfig).forEach(key => {
          this.config[key] = storedConfig[key];
        });
      }
    } catch (error) {
      console.warn('Could not load config from local storage:', error);
    }
  }

  mergeDefaults() {
    Object.keys(this.defaults).forEach(key => {
      if (this.config[key] === undefined) {
        this.config[key] = this.defaults[key];
      }
    });
    this.transformConfig();
  }

  transformConfig() {
    const booleanKeys = [
      'DEBUG_MODE',
      'AUTH_COOKIE_SECURE',
      'FORM_AUTO_SAVE',
      'ENABLE_ANALYTICS',
      'REQUIRE_SECURE_CONTEXT'
    ];

    booleanKeys.forEach(key => {
      if (typeof this.config[key] === 'string') {
        this.config[key] = this.parseBoolean(this.config[key]);
      }
    });

    const numberKeys = [
      'AUTH_COOKIE_MAX_AGE',
      'VERIFICATION_EXPIRY_DAYS',
      'VERIFICATION_MIN_SCORE',
      'MAX_SCREENSHOT_SIZE',
      'VERIFICATION_POLL_INTERVAL'
    ];

    numberKeys.forEach(key => {
      if (typeof this.config[key] === 'string') {
        this.config[key] = parseInt(this.config[key], 10);
      }
    });

    const arrayKeys = ['VERIFICATION_METHODS', 'ALLOWED_IMAGE_TYPES'];
    arrayKeys.forEach(key => {
      if (typeof this.config[key] === 'string') {
        this.config[key] = this.config[key].split(',').map(item => item.trim());
      }
    });
  }

  parseValue(value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }

  parseBoolean(value) {
    return value.toLowerCase() === 'true' || value === '1' || value === 'yes' || value === 'y';
  }

  get(key, defaultValue = null) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  getApiBaseUrl() {
    if (typeof window !== 'undefined' && window.CASL_CONFIG?.api?.baseUrl) {
      return window.CASL_CONFIG.api.baseUrl;
    }
    return this.get('API_BASE_URL');
  }

  isDebugMode() {
    return this.get('DEBUG_MODE', false);
  }

  getAuthCookieConfig() {
    return {
      name: this.get('AUTH_COOKIE_NAME'),
      domain: this.get('AUTH_COOKIE_DOMAIN'),
      secure: this.get('AUTH_COOKIE_SECURE'),
      maxAge: this.get('AUTH_COOKIE_MAX_AGE'),
      sameSite: 'strict',
      path: '/'
    };
  }

  getRefreshTokenCookieConfig() {
    return {
      name: this.get('REFRESH_TOKEN_COOKIE_NAME'),
      domain: this.get('AUTH_COOKIE_DOMAIN'),
      secure: this.get('AUTH_COOKIE_SECURE'),
      maxAge: this.get('AUTH_COOKIE_MAX_AGE') * 2,
      sameSite: 'strict',
      path: '/'
    };
  }

  getVerificationMethods() {
    return this.get('VERIFICATION_METHODS', []);
  }

  getAllowedImageTypes() {
    return this.get('ALLOWED_IMAGE_TYPES', []);
  }

  validateSecureContext() {
    if (this.get('REQUIRE_SECURE_CONTEXT') && typeof window !== 'undefined') {
      if (!window.isSecureContext) {
        console.warn('Application requires a secure context (HTTPS) but is running in an insecure context.');
      }
    }
  }

  set(key, value) {
    this.config[key] = value;
    this.saveToLocalStorage();
  }

  saveToLocalStorage() {
    try {
      const storableConfig = {};
      const sensitiveKeys = ['API_KEY', 'AWS_ACCESS_KEY', 'AWS_SECRET_KEY', 'STRIPE_KEY'];
      Object.keys(this.config).forEach(key => {
        if (!sensitiveKeys.includes(key)) {
          storableConfig[key] = this.config[key];
        }
      });
      localStorage.setItem('casl_config', JSON.stringify(storableConfig));
    } catch (error) {
      console.warn('Could not save config to local storage:', error);
    }
  }

  reset() {
    this.config = { ...this.defaults };
    this.saveToLocalStorage();
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
