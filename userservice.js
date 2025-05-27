// src/services/userService.js
import { apiSecurity } from './apiSecurity.js';
import { API_BASE_URL } from './constants.js';

/**
 * User service for managing authentication with Cognito
 */
class UserService {
  constructor() {
    this.userPoolId = null;
    this.clientId = null;
    this.region = 'us-east-2';

    this.currentUser = null;
    this.accessToken = null;
    this.refreshToken = null;

    this._initialized = this.initialize(); // ✅ Store the initialization promise
  }

  async initialize() {
    try {
      const config = await this.fetchConfiguration();
      this.userPoolId = config.userPoolId;
      this.clientId = config.clientId;
      await this.loadStoredSession();
    } catch (error) {
      console.error('Failed to initialize user service:', error);
    }
  }

  // ✅ Await this in CASLApp to ensure init completes
  async whenReady() {
    try {
      await this._initialized;
    } catch (err) {
      console.error('[UserService] Initialization error in whenReady():', err);
    }
  }

  async fetchConfiguration() {
    try {
      const response = await fetch(`${API_BASE_URL}/casl-config`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error(`Failed config fetch: ${response.status}`);

      return await response.json();
    } catch (error) {
      console.error('Error fetching configuration:', error);
      return {
        userPoolId: 'CASLKeyAppClient',
        clientId: '6eihn0891v31dsovg33g2e1h90'
      };
    }
  }

  async loadStoredSession() {
    try {
      const accessToken = localStorage.getItem('casl_access_token');
      const refreshToken = localStorage.getItem('casl_refresh_token');
      const userDataStr = localStorage.getItem('casl_user_data');

      if (accessToken && refreshToken && userDataStr) {
        const isValid = await this.validateToken(accessToken);
        if (isValid) {
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
          this.currentUser = JSON.parse(userDataStr);
        } else {
          const refreshed = await this.refreshSession(refreshToken);
          if (!refreshed) this.clearSession();
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
    }
  }

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

  async refreshSession(refreshToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Refresh failed');

      const result = await response.json();
      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken;

      localStorage.setItem('casl_access_token', this.accessToken);
      localStorage.setItem('casl_refresh_token', this.refreshToken);

      return true;
    } catch (error) {
      console.error('Refresh error:', error);
      return false;
    }
  }

  async registerUser(userData) {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userData.username,
          email: userData.email,
          password: userData.password
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Registration failed');
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

  async confirmRegistration(username, code) {
    try {
      const response = await fetch(`${API_BASE_URL}/confirm-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, code })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Confirmation failed');
      }

      return true;
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    }
  }

  async loginUser(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Login failed');
      }

      const result = await response.json();

      this.accessToken = result.accessToken;
      this.refreshToken = result.refreshToken;
      this.currentUser = {
        username,
        email: result.email,
        id: result.userId,
        attributes: result.attributes || {}
      };

      localStorage.setItem('casl_access_token', this.accessToken);
      localStorage.setItem('casl_refresh_token', this.refreshToken);
      localStorage.setItem('casl_user_data', JSON.stringify(this.currentUser));

      return this.currentUser;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async logoutUser() {
    try {
      if (this.accessToken) {
        await fetch(`${API_BASE_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.accessToken}`
          }
        });
      }
      this.clearSession();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      this.clearSession();
      return true;
    }
  }

  clearSession() {
    this.accessToken = null;
    this.refreshToken = null;
    this.currentUser = null;

    localStorage.removeItem('casl_access_token');
    localStorage.removeItem('casl_refresh_token');
    localStorage.removeItem('casl_user_data');
  }

  async getCurrentUser() {
    if (this.currentUser && this.accessToken) {
      const isValid = await this.validateToken(this.accessToken);
      if (isValid) {
        return {
          isAuthenticated: true,
          user: this.currentUser
        };
      }

      const refreshed = await this.refreshSession(this.refreshToken);
      if (refreshed) {
        return {
          isAuthenticated: true,
          user: this.currentUser
        };
      }

      this.clearSession();
    }

    return {
      isAuthenticated: false,
      user: null
    };
  }

  getAuthHeaders() {
    return this.accessToken ? { 'Authorization': `Bearer ${this.accessToken}` } : {};
  }
}

export const userService = new UserService();
