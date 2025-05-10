// src/utils/ErrorHandler.js

/**
 * Centralized error handling utility for CASL Verification System
 * Provides consistent error handling, logging, and user feedback
 */
class ErrorHandler {
  constructor() {
    this.listeners = [];
    this.lastError = null;
    
    // Error categories for different handling strategies
    this.errorCategories = {
      NETWORK: 'network',
      AUTH: 'authentication',
      VALIDATION: 'validation',
      API: 'api',
      PAYMENT: 'payment',
      UNKNOWN: 'unknown'
    };
    
    // Error event handling method
    this.handleGlobalErrors();
  }
  
  /**
   * Set up global error event listeners
   */
  handleGlobalErrors() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason || new Error('Unhandled Promise rejection'));
    });
    
    // Handle global errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message));
    });
  }
  
  /**
   * Categorize an error based on its properties
   * @param {Error} error - The error to categorize
   * @returns {string} Error category
   */
  categorizeError(error) {
    if (!error) return this.errorCategories.UNKNOWN;
    
    // Network errors
    if (error.name === 'NetworkError' || 
        error.message.includes('network') || 
        error.message.includes('failed to fetch') ||
        error.message.includes('timeout')) {
      return this.errorCategories.NETWORK;
    }
    
    // Authentication errors
    if (error.name === 'AuthError' || 
        error.message.includes('unauthorized') || 
        error.message.includes('forbidden') ||
        error.message.includes('token') ||
        error.status === 401 ||
        error.status === 403) {
      return this.errorCategories.AUTH;
    }
    
    // Validation errors
    if (error.name === 'ValidationError' || 
        error.message.includes('validation') ||
        error.message.includes('invalid') ||
        error.message.includes('required')) {
      return this.errorCategories.VALIDATION;
    }
    
    // API errors
    if (error.name === 'ApiError' || 
        error.status >= 400 ||
        error.message.includes('api') ||
        error.message.includes('endpoint')) {
      return this.errorCategories.API;
    }
    
    // Payment errors
    if (error.name === 'PaymentError' || 
        error.message.includes('payment') ||
        error.message.includes('transaction') ||
        error.message.includes('purchase')) {
      return this.errorCategories.PAYMENT;
    }
    
    // Default to unknown
    return this.errorCategories.UNKNOWN;
  }
  
  /**
   * Process error into a standardized format
   * @param {Error|string} error - The error to process
   * @returns {Object} Standardized error object
   */
  processError(error) {
    // If error is a string, convert to Error object
    if (typeof error === 'string') {
      error = new Error(error);
    }
    
    // If not an Error object, create one
    if (!(error instanceof Error)) {
      error = new Error('Unknown error');
    }
    
    // Create standardized error object
    const category = this.categorizeError(error);
    const timestamp = new Date().toISOString();
    const errorId = `err_${timestamp.replace(/[-:.TZ]/g, '')}_${Math.random().toString(36).substr(2, 5)}`;
    
    return {
      id: errorId,
      message: error.message,
      category,
      timestamp,
      name: error.name,
      stack: error.stack,
      status: error.status || null,
      code: error.code || null,
      data: error.data || null,
      handled: false
    };
  }
  
  /**
   * Log error to console and/or remote logging service
   * @param {Object} errorObj - Processed error object
   */
  logError(errorObj) {
    // Console logging for development
    console.error(
      `[${errorObj.category.toUpperCase()}] ${errorObj.id}: ${errorObj.message}`,
      errorObj
    );
    
    // TODO: Add remote logging service integration
    // this.remoteLogError(errorObj);
  }
  
  /**
   * Handle an error by processing, logging, and notifying listeners
   * @param {Error|string} error - The error to handle
   * @returns {Object} Processed error object
   */
  handleError(error) {
    const errorObj = this.processError(error);
    
    // Log the error
    this.logError(errorObj);
    
    // Store as last error
    this.lastError = errorObj;
    
    // Notify all listeners
    this.notifyListeners(errorObj);
    
    // Mark as handled
    errorObj.handled = true;
    
    return errorObj;
  }
  
  /**
   * Get a user-friendly error message
   * @param {Object} errorObj - Processed error object
   * @returns {string} User-friendly error message
   */
  getUserFriendlyMessage(errorObj) {
    switch (errorObj.category) {
      case this.errorCategories.NETWORK:
        return 'Network error. Please check your internet connection and try again.';
      
      case this.errorCategories.AUTH:
        return 'Authentication error. Please log in again.';
      
      case this.errorCategories.VALIDATION:
        return errorObj.message || 'Please check your input and try again.';
      
      case this.errorCategories.API:
        return 'Server error. Please try again later.';
      
      case this.errorCategories.PAYMENT:
        return 'Payment processing error. Please try again or use a different payment method.';
      
      case this.errorCategories.UNKNOWN:
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  
  /**
   * Create a ValidationError with specified field errors
   * @param {string} message - Overall error message
   * @param {Object} fieldErrors - Field-specific errors
   * @returns {Error} Validation error object
   */
  createValidationError(message, fieldErrors = {}) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.fieldErrors = fieldErrors;
    error.category = this.errorCategories.VALIDATION;
    return error;
  }
  
  /**
   * Create an AuthError
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @returns {Error} Auth error object
   */
  createAuthError(message, status = 401) {
    const error = new Error(message);
    error.name = 'AuthError';
    error.status = status;
    error.category = this.errorCategories.AUTH;
    return error;
  }
  
  /**
   * Create an ApiError
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @param {Object} data - Additional error data
   * @returns {Error} API error object
   */
  createApiError(message, status = 500, data = null) {
    const error = new Error(message);
    error.name = 'ApiError';
    error.status = status;
    error.data = data;
    error.category = this.errorCategories.API;
    return error;
  }
  
  /**
   * Add an error listener
   * @param {Function} listener - Error listener function
   */
  addListener(listener) {
    if (typeof listener === 'function' && !this.listeners.includes(listener)) {
      this.listeners.push(listener);
    }
  }
  
  /**
   * Remove an error listener
   * @param {Function} listener - Error listener function to remove
   */
  removeListener(listener) {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * Notify all listeners of an error
   * @param {Object} errorObj - Processed error object
   */
  notifyListeners(errorObj) {
    this.listeners.forEach(listener => {
      try {
        listener(errorObj);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }
  
  /**
   * Get most recent error
   * @returns {Object|null} Last error object or null
   */
  getLastError() {
    return this.lastError;
  }
  
  /**
   * Clear the last error
   */
  clearLastError() {
    this.lastError = null;
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();
