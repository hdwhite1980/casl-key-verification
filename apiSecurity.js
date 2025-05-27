// src/services/apiSecurity.js
import { configManager } from './ConfigManager.js';
import { errorHandler } from './ErrorHandler.js';

class ApiSecurityService {
  constructor() {
    this.clientId = null;
  }

  /**
   * Initialize security — only stores client ID for now
   */
  async initialize() {
    try {
      this.clientId = this.generateClientId();
    } catch (error) {
      errorHandler.handleError(error);
    }
  }

  /**
   * Generate a consistent fingerprint-based client ID
   */
  generateClientId() {
    const stored = localStorage.getItem('casl_client_id');
    if (stored) return stored;

    const fingerprint = [
      screen.width,
      screen.height,
      screen.colorDepth,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
      navigator.platform
    ].join('|');

    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const chr = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0;
    }

    const clientId = Math.abs(hash).toString(36);
    localStorage.setItem('casl_client_id', clientId);
    return clientId;
  }

  /**
   * Return auth headers (client ID only, no token-based auth needed)
   */
  async getAuthHeaders(headers = {}) {
    return {
      ...headers,
      'X-Client-ID': this.clientId || this.generateClientId()
    };
  }

  /**
   * Check if user is authenticated (basic `/user-check` fallback)
   */
  async isAuthenticated(email) {
    try {
      const apiBaseUrl = configManager.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/user-check`, {
        method: 'POST',
        headers: {
          ...(await this.getAuthHeaders()),
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email })
      });

      const result = await response.json();
      return result.found === true;
    } catch (error) {
      errorHandler.handleError(error);
      return false;
    }
  }

  /**
   * Placeholder logout — just clears local identifiers
   */
  logout() {
    try {
      localStorage.removeItem('casl_client_id');
      sessionStorage.removeItem('casl_refresh_token');
      sessionStorage.removeItem('casl_token_expiry');
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      return false;
    }
  }
}

export const apiSecurity = new ApiSecurityService();
