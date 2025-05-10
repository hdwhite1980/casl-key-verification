// src/utils/CookieUtility.js
import { configManager } from './ConfigManager.js';

/**
 * Utility for working with HTTP cookies, including HTTP-only cookies
 */
class CookieUtility {
  /**
   * Set a cookie with the provided options
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   * @param {Object} options - Cookie options
   * @returns {boolean} Success status
   */
  setCookie(name, value, options = {}) {
    try {
      const cookieOptions = {
        path: '/',
        ...options
      };
      
      let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      
      if (cookieOptions.expires) {
        if (typeof cookieOptions.expires === 'number') {
          const days = cookieOptions.expires;
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          cookieOptions.expires = date;
        }
        cookieString += `; expires=${cookieOptions.expires.toUTCString()}`;
      }
      
      if (cookieOptions.maxAge) {
        cookieString += `; max-age=${cookieOptions.maxAge}`;
      }
      
      if (cookieOptions.domain) {
        cookieString += `; domain=${cookieOptions.domain}`;
      }
      
      if (cookieOptions.path) {
        cookieString += `; path=${cookieOptions.path}`;
      }
      
      if (cookieOptions.secure) {
        cookieString += '; secure';
      }
      
      if (cookieOptions.sameSite) {
        cookieString += `; samesite=${cookieOptions.sameSite}`;
      }
      
      // Set the cookie
      document.cookie = cookieString;
      return true;
    } catch (error) {
      console.error('Error setting cookie:', error);
      return false;
    }
  }
  
  /**
   * Get a cookie value by name
   * @param {string} name - Cookie name
   * @returns {string|null} Cookie value or null if not found
   */
  getCookie(name) {
    try {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.indexOf(`${encodeURIComponent(name)}=`) === 0) {
          return decodeURIComponent(cookie.substring(name.length + 1));
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cookie:', error);
      return null;
    }
  }
  
  /**
   * Delete a cookie by name
   * @param {string} name - Cookie name
   * @param {Object} options - Cookie options
   * @returns {boolean} Success status
   */
  deleteCookie(name, options = {}) {
    // To delete a cookie, set it with an expiration date in the past
    return this.setCookie(name, '', {
      ...options,
      expires: new Date(0) // Unix epoch
    });
  }
  
  /**
   * Set an HTTP-only auth token cookie via API
   * @param {string} token - Auth token
   * @returns {Promise<boolean>} Success status
   */
  async setAuthCookie(token) {
    try {
      // Use the configured API URL
      const apiBaseUrl = configManager.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/set-cookie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Token is sent in the request body
        body: JSON.stringify({ token }),
        // Credentials must be included to set cookies
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error setting auth cookie:', error);
      return false;
    }
  }
  
  /**
   * Clear the auth cookie via API
   * @returns {Promise<boolean>} Success status
   */
  async clearAuthCookie() {
    try {
      const apiBaseUrl = configManager.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/clear-cookie`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error clearing auth cookie:', error);
      return false;
    }
  }
  
  /**
   * Check if the auth cookie exists (just checks presence, not validity)
   * @returns {boolean} Whether auth cookie exists
   */
  hasAuthCookie() {
    const authCookieConfig = configManager.getAuthCookieConfig();
    return !!this.getCookie(authCookieConfig.name);
  }
  
  /**
   * Refresh the auth token cookie
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} Refresh result
   */
  async refreshAuthCookie(refreshToken) {
    try {
      const apiBaseUrl = configManager.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh auth token');
      }
      
      // Parse response
      const result = await response.json();
      
      // The API should have set the cookie already, but also return a token
      // in case we need it for something else
      return {
        success: true,
        token: result.accessToken,
        expiresIn: result.expiresIn
      };
    } catch (error) {
      console.error('Error refreshing auth token:', error);
      return {
        success: false,
        error: error.message || 'Failed to refresh auth token'
      };
    }
  }
}

// Export singleton instance
export const cookieUtility = new CookieUtility();
