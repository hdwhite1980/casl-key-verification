// src/services/apiSecurity.js
import { configManager } from '../utils/ConfigManager.js';
import { cookieUtility } from '../utils/CookieUtility.js';
import { errorHandler } from '../utils/ErrorHandler.js';

/**
 * API security service for CASL Verification
 * Provides secure authentication and request encryption with HTTP-only cookies
 */
class ApiSecurityService {
  constructor() {
    this.tokenExpiry = null;
    this.refreshToken = null;
    this.pendingRefresh = null;
    this.clientId = null;
  }

  /**
   * Initialize the security service
   * @param {Object} config - Security configuration
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    try {
      // Generate device fingerprint/client ID
      this.clientId = this.generateClientId();
      
      // Check for stored refresh token in secure storage
      this.refreshToken = sessionStorage.getItem('casl_refresh_token');
      this.tokenExpiry = sessionStorage.getItem('casl_token_expiry');
      
      // If token is expired or missing, attempt to refresh
      if (this.isTokenExpired()) {
        await this.refreshApiToken();
      }
    } catch (error) {
      errorHandler.handleError(error);
      // Continue without auth - will be handled during requests
    }
  }

  /**
   * Check if the current token is expired
   * @returns {boolean} True if token is expired or missing
   */
  isTokenExpired() {
    if (!this.tokenExpiry) return true;
    
    const expiryDate = new Date(parseInt(this.tokenExpiry));
    const now = new Date();
    
    // Add a buffer of 30 seconds to prevent edge cases
    now.setSeconds(now.getSeconds() + 30);
    
    return now >= expiryDate;
  }

  /**
   * Refresh the API token
   * @returns {Promise<boolean>} Success status
   */
  async refreshApiToken() {
    // If already refreshing, wait for that to complete
    if (this.pendingRefresh) {
      return this.pendingRefresh;
    }
    
    this.pendingRefresh = (async () => {
      try {
        // Use refresh token if available
        if (this.refreshToken) {
          const result = await cookieUtility.refreshAuthCookie(this.refreshToken);
          
          if (result.success) {
            this.updateTokenExpiry(result.expiresIn);
            this.pendingRefresh = null;
            return true;
          }
        }
        
        // If no refresh token or refresh failed, get a new token
        return await this.authenticateClient();
      } catch (error) {
        errorHandler.handleError(error);
        this.clearTokens();
        return false;
      } finally {
        this.pendingRefresh = null;
      }
    })();
    
    return this.pendingRefresh;
  }

  /**
   * Authenticate the client to get new tokens
   * @returns {Promise<boolean>} Success status
   */
  async authenticateClient() {
    try {
      // Create a secure client identifier
      const clientId = this.clientId || this.generateClientId();
      
      // Get API base URL from config
      const apiBaseUrl = configManager.getApiBaseUrl();
      
      // Authenticate with the API
      const response = await fetch(`${apiBaseUrl}/auth/client`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId,
          // Add additional device/environment info for security
          environment: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }),
        credentials: 'include' // Important for receiving cookies
      });
      
      if (!response.ok) {
        throw errorHandler.createApiError(
          'Authentication failed', 
          response.status
        );
      }
      
      const data = await response.json();
      
      // Update token info
      this.updateTokenExpiry(data.expiresIn);
      this.refreshToken = data.refreshToken;
      
      // Store refresh token in sessionStorage (more secure than localStorage)
      sessionStorage.setItem('casl_refresh_token', this.refreshToken);
      
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      return false;
    }
  }

  /**
   * Update token expiry time based on expiresIn value
   * @param {number} expiresIn - Seconds until token expires
   */
  updateTokenExpiry(expiresIn) {
    const expiryTime = Date.now() + (expiresIn * 1000);
    this.tokenExpiry = expiryTime.toString();
    sessionStorage.setItem('casl_token_expiry', this.tokenExpiry);
  }

  /**
   * Clear tokens from memory and storage
   */
  clearTokens() {
    this.tokenExpiry = null;
    this.refreshToken = null;
    
    sessionStorage.removeItem('casl_token_expiry');
    sessionStorage.removeItem('casl_refresh_token');
    
    // Clear HTTP-only cookie via API
    cookieUtility.clearAuthCookie().catch(error => {
      console.warn('Failed to clear auth cookie:', error);
    });
  }

  /**
   * Generate a unique client identifier
   * @returns {string} Client ID
   */
  generateClientId() {
    // First check if we already have a stored client ID
    const storedClientId = localStorage.getItem('casl_client_id');
    if (storedClientId) return storedClientId;
    
    // Get device fingerprint data
    const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const platform = navigator.platform;
    
    // Combine and hash data to create a unique ID
    const baseString = `${screenInfo}|${timeZone}|${language}|${platform}|${Date.now()}`;
    const clientId = this.hashString(baseString);
    
    // Store for future use
    localStorage.setItem('casl_client_id', clientId);
    
    return clientId;
  }

  /**
   * Simple hash function for client ID
   * @param {string} str - String to hash
   * @returns {string} Hashed string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Add authentication headers to a request
   * @param {Object} headers - Existing headers
   * @returns {Promise<Object>} Headers with authentication
   */
  async getAuthHeaders(headers = {}) {
    // Ensure we have a valid token
    if (this.isTokenExpired()) {
      await this.refreshApiToken();
    }
    
    // Add client ID header - auth is in HTTP-only cookie
    return {
      ...headers,
      'X-Client-ID': this.clientId || this.generateClientId()
    };
  }

  /**
   * Encrypt request data
   * @param {Object} data - Data to encrypt
   * @returns {string} Encrypted data
   */
  encryptData(data) {
    // In a real implementation, use a robust encryption library
    // This is a placeholder for the concept
    const jsonStr = JSON.stringify(data);
    
    // For demonstration purposes, we'll use base64 encoding
    // In production, use actual encryption with a secure library
    return btoa(jsonStr);
  }

  /**
   * Decrypt response data
   * @param {string} encryptedData - Encrypted data
   * @returns {Object} Decrypted data
   */
  decryptData(encryptedData) {
    try {
      const jsonStr = atob(encryptedData);
      return JSON.parse(jsonStr);
    } catch (error) {
      errorHandler.handleError(error);
      return null;
    }
  }
  
  /**
   * Check if the user is authenticated
   * @returns {Promise<boolean>} Authentication status
   */
  async isAuthenticated() {
    // Check for auth cookie existence
    const hasAuthCookie = cookieUtility.hasAuthCookie();
    
    if (!hasAuthCookie) {
      return false;
    }
    
    // Validate token with the server
    try {
      const apiBaseUrl = configManager.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/validate`, {
        method: 'GET',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      errorHandler.handleError(error);
      return false;
    }
  }
  
  /**
   * Log out and clear auth state
   * @returns {Promise<boolean>} Success status
   */
  async logout() {
    try {
      // Call logout endpoint
      const apiBaseUrl = configManager.getApiBaseUrl();
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        credentials: 'include'
      });
      
      // Clear local tokens
      this.clearTokens();
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      // Still clear tokens on error
      this.clearTokens();
      return false;
    }
  }
}

// Export singleton instance
export const apiSecurity = new ApiSecurityService();
