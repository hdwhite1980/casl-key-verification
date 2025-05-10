// src/services/userService.js
import { apiSecurity } from './apiSecurity.js';
import { API_BASE_URL } from '../utils/constants.js';

/**
 * User service for managing authentication with Cognito
 */
class UserService {
  constructor() {
    // AWS Cognito configuration
    this.userPoolId = null;
    this.clientId = null;
    this.region = 'us-east-2'; // Update with your AWS region
    
    // User state
    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize the service
   */
  async initialize() {
    try {
      // Load configuration from API
      const config = await this.fetchConfiguration();
      
      this.userPoolId = config.userPoolId;
      this.clientId = config.clientId;
      
      // Check if user is already authenticated
      await this.loadStoredSession();
    } catch (error) {
      console.error('Failed to initialize user service:', error);
    }
  }
  
  /**
   * Fetch Cognito configuration from API
   * @returns {Promise<Object>} Configuration object
   */
  async fetchConfiguration() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth-config`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch configuration: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      
      // Return default configuration in case of error
      return {
        userPoolId: 'us-east-2_xyzABCDEF',  // Replace with your actual User Pool ID
        clientId: 'abcdefghijklmnopqrstuv'  // Replace with your actual Client ID
      };
    }
  }
  
  /**
   * Load stored user session from localStorage
   */
  async loadStoredSession() {
    try {
      const accessToken = localStorage.getItem('casl_access_token');
      const refreshToken = localStorage.getItem('casl_refresh_token');
      const userDataStr = localStorage.getItem('casl_user_data');
      
      if (accessToken && refreshToken && userDataStr) {
        // Validate token before restoring session
        const isValid = await this.validateToken(accessToken);
        
        if (isValid) {
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
          this.currentUser = JSON.parse(userDataStr);
        } else {
          // Try refreshing the token
          const refreshed = await this.refreshSession(refreshToken);
          
          if (!refreshed) {
            // Clear invalid session
            this.clearSession();
          }
        }
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      this.clearSession();
    }
  }
  
  /**
   * Validate an access token
   * @param {string} token - Access token to validate
   * @returns {Promise<boolean>} Whether token is valid
   */
  async validateToken(token) {
    try {
      const response = await fetch(`${API_BASE_URL}/validate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }
  
  /**
   * Refresh user session with refresh token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<boolean>} Success status
   */
  async refreshSession(refreshToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }
      
      const result = await response.json();
      
      // Update tokens
      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken;
      
      // Save to localStorage
      localStorage.setItem('casl_access_token', this.accessToken);
      localStorage.setItem('casl_refresh_token', this.refreshToken);
      
      return true;
    } catch (error) {
      console.error('Session refresh error:', error);
      return false;
    }
  }
  
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise<Object>} Registration result
   */
  async registerUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          password: userData.password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const result = await response.json();
      
      return {
        success: true,
        username: userData.username,
        requiresConfirmation: result.requiresConfirmation || false
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }
  
  /**
   * Confirm user registration with verification code
   * @param {string} username - Username
   * @param {string} code - Verification code
   * @returns {Promise<boolean>} Success status
   */
  async confirmRegistration(username, code) {
    try {
      const response = await fetch(`${API_BASE_URL}/confirm-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          code
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Confirmation failed');
      }
      
      return true;
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    }
  }
  
  /**
   * Login user
   * @param {string} username - Username
   * @param {string} password - Password
   * @returns {Promise<Object>} User object
   */
  async loginUser(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          password
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const result = await response.json();
      
      // Save tokens
      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken;
      
      // Save user data
      this.currentUser = {
        username,
        email: result.email,
        id: result.userId,
        attributes: result.attributes || {}
      };
      
      // Save to localStorage for persistence
      localStorage.setItem('casl_access_token', this.accessToken);
      localStorage.setItem('casl_refresh_token', this.refreshToken);
      localStorage.setItem('casl_user_data', JSON.stringify(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
  
  /**
   * Logout user
   * @returns {Promise<boolean>} Success status
   */
  async logoutUser() {
    try {
      if (this.accessToken) {
        // Call logout API
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      }
      
      // Clear session regardless of API response
      this.clearSession();
      
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      
      // Still clear session on error
      this.clearSession();
      
      return true;
    }
  }
  
  /**
   * Clear user session data
   */
  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;
    
    localStorage.removeItem('casl_access_token');
    localStorage.removeItem('casl_refresh_token');
    localStorage.removeItem('casl_user_data');
  }
  
  /**
   * Get current authentication state
   * @returns {Promise<Object>} Authentication state
   */
  async getCurrentUser() {
    // If we have a current user and valid token, return it
    if (this.currentUser && this.accessToken) {
      const isValid = await this.validateToken(this.accessToken);
      
      if (isValid) {
        return {
          isAuthenticated: true,
          user: this.currentUser
        };
      }
      
      // Try to refresh token
      const refreshed = await this.refreshSession(this.refreshToken);
      
      if (refreshed) {
        return {
          isAuthenticated: true,
          user: this.currentUser
        };
      }
      
      // Clear invalid session
      this.clearSession();
    }
    
    return {
      isAuthenticated: false,
      user: null
    };
  }
  
  /**
   * Get auth headers for API requests
   * @returns {Object} Headers with authentication
   */
  getAuthHeaders() {
    if (!this.accessToken) {
      return {};
    }
    
    return {
      'Authorization': `Bearer ${this.accessToken}`
    };
  }
}

// Export singleton instance
export const userService = new UserService();
