// src/utils/ConfigManager.js

/**
 * Configuration manager to handle environment variables
 * Provides a centralized way to access environment configuration
 */
class ConfigManager {
  constructor() {
    // Default configuration values
    this.defaults = {
      API_BASE_URL: 'https://api.casl-key.example.com/v1',
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
      REQUIRE_SECURE_CONTEXT: true
    };
    
    // Loaded configuration values
    this.config = {};
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize configuration
   */
  init() {
    // Load configuration from environment variables
    this.loadFromEnv();
    
    // Load configuration from meta tags
    this.loadFromMetaTags();
    
    // Load configuration from local storage
    this.loadFromLocalStorage();
    
    // Merge with defaults
    this.mergeDefaults();
    
    // Validate secure context if required
    this.validateSecureContext();
  }
  
  /**
   * Load configuration from environment variables
   */
  loadFromEnv() {
    // For browser environment, we can't directly access process.env
    // This is more relevant for bundled environments with webpack/etc.
    try {
      // Check if process.env is available (e.g., when using webpack)
      if (typeof process !== 'undefined' && process.env) {
        Object.keys(process.env).forEach(key => {
          if (key.startsWith('CASL_')) {
            const configKey = key.replace('CASL_', '');
            this.config[configKey] = process.env[key];
          }
        });
      }
    } catch (error) {
      console.warn('Could not load config from environment variables:', error);
    }
  }
  
  /**
   * Load configuration from meta tags
   */
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
  
  /**
   * Load configuration from local storage
   */
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
  
  /**
   * Merge defaults with loaded configuration
   */
  mergeDefaults() {
    Object.keys(this.defaults).forEach(key => {
      if (this.config[key] === undefined) {
        this.config[key] = this.defaults[key];
      }
    });
    
    // Apply any transformations needed
    this.transformConfig();
  }
  
  /**
   * Transform specific config values
   */
  transformConfig() {
    // Parse any values that should be boolean
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
    
    // Parse any values that should be numbers
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
    
    // Parse any values that should be arrays
    const arrayKeys = ['VERIFICATION_METHODS', 'ALLOWED_IMAGE_TYPES'];
    
    arrayKeys.forEach(key => {
      if (typeof this.config[key] === 'string') {
        this.config[key] = this.config[key].split(',').map(item => item.trim());
      }
    });
  }
  
  /**
   * Parse a string value to its type
   * @param {string} value - Value to parse
   * @returns {any} Parsed value
   */
  parseValue(value) {
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch (e) {
      // If not valid JSON, return as is
      return value;
    }
  }
  
  /**
   * Parse a string to boolean
   * @param {string} value - Value to parse
   * @returns {boolean} Parsed boolean
   */
  parseBoolean(value) {
    return value.toLowerCase() === 'true' || 
           value === '1' || 
           value === 'yes' || 
           value === 'y';
  }
  
  /**
   * Get a configuration value
   * @param {string} key - Configuration key
   * @param {any} defaultValue - Default value if config key not found
   * @returns {any} Configuration value
   */
  get(key, defaultValue = null) {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
  
  /**
   * Get API base URL
   * @returns {string} API base URL
   */
  getApiBaseUrl() {
    return this.get('API_BASE_URL');
  }
  
  /**
   * Get whether debug mode is enabled
   * @returns {boolean} Whether debug mode is enabled
   */
  isDebugMode() {
    return this.get('DEBUG_MODE', false);
  }
  
  /**
   * Get authentication cookie configuration
   * @returns {Object} Auth cookie config
   */
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
  
  /**
   * Get refresh token cookie configuration
   * @returns {Object} Refresh token cookie config
   */
  getRefreshTokenCookieConfig() {
    return {
      name: this.get('REFRESH_TOKEN_COOKIE_NAME'),
      domain: this.get('AUTH_COOKIE_DOMAIN'),
      secure: this.get('AUTH_COOKIE_SECURE'),
      maxAge: this.get('AUTH_COOKIE_MAX_AGE') * 2, // Refresh token lives longer
      sameSite: 'strict',
      path: '/'
    };
  }
  
  /**
   * Get allowed verification methods
   * @returns {Array} Verification methods
   */
  getVerificationMethods() {
    return this.get('VERIFICATION_METHODS', []);
  }
  
  /**
   * Get allowed image MIME types
   * @returns {Array} Allowed image types
   */
  getAllowedImageTypes() {
    return this.get('ALLOWED_IMAGE_TYPES', []);
  }
  
  /**
   * Validate that we're in a secure context if required
   */
  validateSecureContext() {
    if (this.get('REQUIRE_SECURE_CONTEXT') && typeof window !== 'undefined') {
      if (!window.isSecureContext) {
        console.warn('Application requires a secure context (HTTPS) but is running in an insecure context.');
      }
    }
  }
  
  /**
   * Set a configuration value
   * @param {string} key - Configuration key
   * @param {any} value - Configuration value
   */
  set(key, value) {
    this.config[key] = value;
    
    // Persist changes to local storage
    this.saveToLocalStorage();
  }
  
  /**
   * Save configuration to local storage
   */
  saveToLocalStorage() {
    try {
      // Only save non-sensitive config items
      const storableConfig = {};
      const sensitiveKeys = [
        'API_KEY',
        'AWS_ACCESS_KEY',
        'AWS_SECRET_KEY',
        'STRIPE_KEY'
      ];
      
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
  
  /**
   * Reset configuration to defaults
   */
  reset() {
    this.config = { ...this.defaults };
    this.saveToLocalStorage();
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
