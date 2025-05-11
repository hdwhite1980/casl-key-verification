// src/services/api.js
import { configManager } from '../utils/ConfigManager.js';
import { generateCASLKeyId } from '../utils/idGenerator.js';
import { apiSecurity } from './apiSecurity.js';
import { errorHandler } from '../utils/ErrorHandler.js';
import { stateManager } from '../utils/StateManager.js';

/**
 * API service for CASL Verification with enhanced security and error handling
 */
class ApiService {
  constructor() {
    this.baseUrl = configManager.getApiBaseUrl();
    this.initializeApiSecurity();
  }

  /**
   * Initialize API security
   */
  async initializeApiSecurity() {
    try {
      await apiSecurity.initialize();
      
      // Update global loading state when initialized
      stateManager.setLoading(false);
    } catch (error) {
      errorHandler.handleError(error);
    }
  }

  /**
   * Generic request method with error handling and enhanced security
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method
   * @param {Object} data - Request body data
   * @param {boolean} secure - Whether to use secure headers and encryption
   * @param {boolean} includeCredentials - Whether to include credentials (cookies)
   * @returns {Promise<Object>} Response data
   */
  async request(
    endpoint, 
    method = 'GET', 
    data = null, 
    secure = true,
    includeCredentials = true
  ) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    
    try {
      // Start request tracking
      stateManager.updateState('ui', ui => ({
        ...ui,
        activeRequests: [...(ui.activeRequests || []), requestId]
      }));
      
      const url = `${this.baseUrl}/${endpoint}`;
      
      // Base headers
      let headers = {
        'Content-Type': 'application/json',
        'Accept-Language': this.getPreferredLanguage(),
        'X-Request-ID': requestId
      };
      
      // Add authentication headers for secure requests
      if (secure) {
        headers = await apiSecurity.getAuthHeaders(headers);
      }
      
      // Process request data
      let processedData = data;
      if (data && secure) {
        // For secure requests, encrypt sensitive data if enabled
        if (configManager.get('ENCRYPT_REQUESTS', false)) {
          processedData = {
            payload: apiSecurity.encryptData(data),
            timestamp: Date.now()
          };
        }
      }
      
      const options = {
        method,
        headers,
        body: processedData ? JSON.stringify(processedData) : undefined
      };
      
      // Include credentials (cookies) if needed
      if (includeCredentials) {
        options.credentials = 'include';
      }
      
      // Execute request with timeout
      const response = await this.timeoutFetch(url, options);
      
      // Handle non-OK responses
      if (!response.ok) {
        // Try to parse error data
        let errorData = null;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response can't be parsed as JSON, use text
          const errorText = await response.text();
          errorData = {
            message: errorText || `API Error: ${response.status}`
          };
        }
        
        // Create appropriate error type
        if (response.status === 401 || response.status === 403) {
          throw errorHandler.createAuthError(
            errorData?.message || `Authentication error: ${response.status}`,
            response.status
          );
        } else {
          throw errorHandler.createApiError(
            errorData?.message || `API Error: ${response.status}`,
            response.status,
            errorData
          );
        }
      }
      
      // Process response
      let responseData;
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        responseData = await response.json();
        
        // Decrypt response if it's encrypted
        if (secure && responseData.encrypted) {
          return apiSecurity.decryptData(responseData.payload);
        }
      } else {
        // Handle non-JSON responses
        const text = await response.text();
        responseData = { data: text };
      }
      
      return responseData;
    } catch (error) {
      // Handle token expiration
      if (
        error.status === 401 || 
        error.message?.includes('token expired') || 
        error.message?.includes('unauthorized')
      ) {
        // Try to refresh token and retry the request
        try {
          const refreshed = await apiSecurity.refreshApiToken();
          
          if (refreshed) {
            // Retry the request once
            return this.request(endpoint, method, data, secure, includeCredentials);
          }
        } catch (refreshError) {
          // If refresh fails, throw the original error
          errorHandler.handleError(error);
          throw error;
        }
      }
      
      // Pass error to error handler
      errorHandler.handleError(error);
      throw error;
    } finally {
      // End request tracking
      stateManager.updateState('ui', ui => ({
        ...ui,
        activeRequests: (ui.activeRequests || []).filter(id => id !== requestId)
      }));
    }
  }
  
  /**
   * Fetch with timeout
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Response>} Fetch response
   */
  async timeoutFetch(url, options, timeout = 30000) {
    return Promise.race([
      fetch(url, options),
      new Promise((_, reject) => 
        setTimeout(() => reject(errorHandler.createApiError('Request timeout', 408)), timeout)
      )
    ]);
  }
  
  /**
   * Get preferred language from browser or settings
   * @returns {string} Language code
   */
  getPreferredLanguage() {
    // First check UI state
    const uiState = stateManager.getState('ui');
    if (uiState && uiState.language) {
      return uiState.language;
    }
    
    // Then check if user has set a preference
    const userPref = localStorage.getItem(configManager.get('LOCALIZATION_KEY'));
    if (userPref) return userPref;
    
    // Otherwise use browser language
    return navigator.language || configManager.get('DEFAULT_LANGUAGE');
  }
  
  /**
   * Check if a user exists in the system
   * @param {Object} userData - User data for checking
   * @returns {Promise<Object>} User verification data
   */
  async checkUserStatus(userData) {
    try {
      // Update verification state to loading
      stateManager.setVerification({
        loading: true,
        error: null
      });
      
      const result = await this.request('user-check', 'POST', {
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        address: userData.address
      });
      
      let verificationData;
      
      if (result.found) {
        verificationData = {
          caslKeyId: result.userData.caslKeyId,
          isExistingUser: true,
          isVerified: result.userData.isVerified,
          verificationType: 'existing',
          isChecking: false,
          error: null,
          platformData: result.userData.platformData || null,
          idVerificationData: result.userData.idVerificationData || null
        };
      } else {
        // Generate new CASL Key ID for new user
        const newId = generateCASLKeyId();
        
        verificationData = {
          caslKeyId: newId,
          isExistingUser: false,
          isVerified: false,
          verificationType: null,
          isChecking: false,
          error: null,
          platformData: null,
          idVerificationData: null
        };
      }
      
      // Update verification state
      stateManager.setVerification({
        ...verificationData,
        loading: false
      });
      
      return verificationData;
    } catch (error) {
      // Update verification state with error
      stateManager.setVerification({
        loading: false,
        error: error.message || 'Failed to verify user'
      });
      
      throw error;
    }
  }

  /**
   * Upload a screenshot for verification
   * @param {string} imageData - Base64 encoded image data
   * @param {string} userId - User ID for verification
   * @returns {Promise<Object>} Upload result
   */
  async uploadScreenshot(imageData, userId) {
    // Validate image data and size
    this.validateImageData(imageData);
    
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    
    try {
      return await this.request('upload', 'POST', {
        userId,
        imageData
      });
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }

  /**
   * Check verification status of a user
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} Status check result
   */
  async checkVerificationStatus(userId) {
    return this.request(`status?userId=${encodeURIComponent(userId)}`, 'GET');
  }

  /**
   * Submit verification data to the API
   * @param {Object} verificationData - Complete verification data
   * @returns {Promise<Object>} Submission result
   */
  async submitVerification(verificationData) {
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    stateManager.updateState('results', { isSubmitted: false });
    
    try {
      const result = await this.request('verify', 'POST', verificationData);
      
      // Update results state
      stateManager.updateState('results', {
        isSubmitted: true,
        ...result
      });
      
      return result;
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }
  
  /**
   * Verify identity via government ID
   * @param {string} idImageData - Base64 encoded ID image data
   * @param {string} selfieImageData - Base64 encoded selfie image data
   * @param {string} userId - User ID for verification
   * @returns {Promise<Object>} Verification result
   */
  async verifyGovernmentId(idImageData, selfieImageData, userId) {
    // Validate image data and size
    this.validateImageData(idImageData);
    this.validateImageData(selfieImageData);
    
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    
    try {
      return await this.request('verify-id', 'POST', {
        userId,
        idImageData,
        selfieImageData
      });
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }
  
  /**
   * Verify with phone number via SMS code
   * @param {string} phoneNumber - Phone number to verify
   * @param {string} userId - User ID for verification
   * @returns {Promise<Object>} Verification result with code ID
   */
  async requestPhoneVerification(phoneNumber, userId) {
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    
    try {
      return await this.request('verify-phone/request', 'POST', {
        userId,
        phoneNumber
      });
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }
  
  /**
   * Verify SMS code sent to phone
   * @param {string} code - Verification code
   * @param {string} verificationId - Verification ID from request
   * @param {string} userId - User ID for verification
   * @returns {Promise<Object>} Verification result
   */
  async verifyPhoneCode(code, verificationId, userId) {
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    
    try {
      return await this.request('verify-phone/verify', 'POST', {
        userId,
        verificationId,
        code
      });
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }
  
  /**
   * Verify with social media profile
   * @param {string} platform - Social media platform name
   * @param {string} profileUrl - Profile URL
   * @param {string} accessToken - OAuth access token (if available)
   * @param {string} userId - User ID for verification
   * @returns {Promise<Object>} Verification result
   */
  async verifySocialMedia(platform, profileUrl, accessToken, userId) {
    // Update UI state
    stateManager.updateState('ui', { loading: true });
    
    try {
      return await this.request('verify-social', 'POST', {
        userId,
        platform,
        profileUrl,
        accessToken
      });
    } finally {
      stateManager.updateState('ui', { loading: false });
    }
  }
  
  /**
   * Get available languages for the API
   * @returns {Promise<Array>} Available languages
   */
  async getAvailableLanguages() {
    return this.request('languages', 'GET', null, false);
  }
  
  /**
   * Set preferred language for API responses
   * @param {string} languageCode - ISO language code
   */
  setLanguagePreference(languageCode) {
    localStorage.setItem(configManager.get('LOCALIZATION_KEY'), languageCode);
    
    // Update UI state
    stateManager.updateState('ui', { language: languageCode });
  }
  
  /**
   * Validate image data for uploads
   * @param {string} imageData - Base64 encoded image data
   * @throws {Error} If validation fails
   */
  validateImageData(imageData) {
    if (!imageData) {
      throw errorHandler.createValidationError('Image data is required');
    }
    
    // Check if it's a valid data URL
    if (!imageData.startsWith('data:image/')) {
      throw errorHandler.createValidationError('Invalid image data format');
    }
    
    // Check size
    const maxSize = configManager.get('MAX_SCREENSHOT_SIZE');
    const sizeInBytes = Math.ceil((imageData.length * 3) / 4);
    
    if (sizeInBytes > maxSize) {
      throw errorHandler.createValidationError(
        `Image size exceeds maximum allowed size of ${Math.floor(maxSize / (1024 * 1024))}MB`
      );
    }
    
    // Check allowed types
    const allowedTypes = configManager.getAllowedImageTypes();
    const typeMatch = imageData.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    
    if (!typeMatch || !allowedTypes.includes(typeMatch[1])) {
      throw errorHandler.createValidationError('Image type not allowed');
    }
  }
}
