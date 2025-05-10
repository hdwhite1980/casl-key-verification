// src/services/paymentService.js
import { API_BASE_URL } from '../utils/constants.js';
import { userService } from './userService.js';

/**
 * Payment service for handling Wix payments integration
 * This service communicates with both Wix and AWS for payment processing
 */
class PaymentService {
  constructor() {
    this.wixAppInstance = null;
    this.paymentInProgress = false;
  }
  
  /**
   * Initialize Wix payment integration
   */
  initWixPayment() {
    // Check if we're in a Wix environment
    if (typeof window.wixSdk !== 'undefined') {
      this.wixAppInstance = window.wixSdk;
      console.log('Wix SDK initialized for payments');
    } else {
      console.warn('Wix SDK not found - payment functionality may be limited');
    }
  }
  
  /**
   * Start payment process for a package
   * @param {Object} packageData - Package to purchase
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Payment result
   */
  async startPayment(packageData, userId) {
    if (this.paymentInProgress) {
      throw new Error('A payment is already in progress');
    }
    
    this.paymentInProgress = true;
    
    try {
      // Initialize Wix payment if needed
      if (!this.wixAppInstance) {
        this.initWixPayment();
      }
      
      // First create a payment intent on the server
      const intent = await this.createPaymentIntent(packageData, userId);
      
      if (this.wixAppInstance) {
        // Use Wix payment process
        return await this.processWixPayment(intent, packageData);
      } else {
        // Use fallback payment process
        return await this.processFallbackPayment(intent, packageData);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    } finally {
      this.paymentInProgress = false;
    }
  }
  
  /**
   * Create a payment intent on the server
   * @param {Object} packageData - Package to purchase
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Payment intent
   */
  async createPaymentIntent(packageData, userId) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...userService.getAuthHeaders()
      };
      
      const response = await fetch(`${API_BASE_URL}/create-payment-intent`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          packageId: packageData.id,
          userId,
          amount: packageData.price,
          currency: packageData.currency || 'USD'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }
  
  /**
   * Process payment using Wix
   * @param {Object} intent - Payment intent
   * @param {Object} packageData - Package data
   * @returns {Promise<Object>} Payment result
   */
  async processWixPayment(intent, packageData) {
    return new Promise((resolve, reject) => {
      // Prepare payment data for Wix
      const paymentData = {
        id: intent.id,
        amount: packageData.price,
        currency: packageData.currency || 'USD',
        description: `CASL Key - ${packageData.name}`,
        items: [{
          name: packageData.name,
          description: packageData.description,
          price: packageData.price,
          quantity: 1
        }]
      };
      
      // Use Wix Payment API
      this.wixAppInstance.payments.startPayment(paymentData)
        .then(result => {
          if (result.status === 'paid') {
            // Verify payment on server
            this.verifyPayment(intent.id, result.transactionId)
              .then(verificationResult => {
                resolve({
                  success: true,
                  transactionId: result.transactionId,
                  packageId: packageData.id,
                  verificationCount: packageData.verificationCount,
                  ...verificationResult
                });
              })
              .catch(reject);
          } else {
            reject(new Error(result.error || 'Payment failed'));
          }
        })
        .catch(error => {
          console.error('Wix payment error:', error);
          reject(error);
        });
    });
  }
  
  /**
   * Process payment using fallback method (redirect to payment page)
   * @param {Object} intent - Payment intent
   * @param {Object} packageData - Package data
   * @returns {Promise<Object>} Payment result
   */
  async processFallbackPayment(intent, packageData) {
    // Create a payment URL
    const response = await fetch(`${API_BASE_URL}/create-payment-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...userService.getAuthHeaders()
      },
      body: JSON.stringify({
        intentId: intent.id,
        packageId: packageData.id,
        returnUrl: window.location.href
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create payment URL');
    }
    
    const { paymentUrl } = await response.json();
    
    // Store the intent ID in session storage for when user returns
    sessionStorage.setItem('casl_payment_intent', intent.id);
    sessionStorage.setItem('casl_package_id', packageData.id);
    
    // Redirect to payment page
    window.location.href = paymentUrl;
    
    // This will never resolve as the page is being redirected
    return new Promise(() => {});
  }
  
  /**
   * Verify payment with server
   * @param {string} intentId - Payment intent ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyPayment(intentId, transactionId) {
    const response = await fetch(`${API_BASE_URL}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...userService.getAuthHeaders()
      },
      body: JSON.stringify({
        intentId,
        transactionId
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Payment verification failed');
    }
    
    return await response.json();
  }
  
  /**
   * Check for pending payment (after redirect)
   * @returns {Promise<Object|null>} Payment result or null if no pending payment
   */
  async checkPendingPayment() {
    const intentId = sessionStorage.getItem('casl_payment_intent');
    const packageId = sessionStorage.getItem('casl_package_id');
    
    if (!intentId || !packageId) {
      return null;
    }
    
    try {
      // Clear pending payment data
      sessionStorage.removeItem('casl_payment_intent');
      sessionStorage.removeItem('casl_package_id');
      
      // Check payment status
      const response = await fetch(`${API_BASE_URL}/check-payment/${intentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...userService.getAuthHeaders()
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment status check failed');
      }
      
      const result = await response.json();
      
      if (result.status === 'succeeded') {
        // Load package data
        const packageResponse = await fetch(`${API_BASE_URL}/packages/${packageId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!packageResponse.ok) {
          throw new Error('Failed to load package data');
        }
        
        const packageData = await packageResponse.json();
        
        // Dispatch payment success event
        this.dispatchPaymentSuccess({
          id: packageId,
          verificationCount: packageData.verificationCount,
          expiryDate: result.expiryDate,
          transactionId: result.transactionId
        });
        
        return {
          success: true,
          packageId,
          verificationCount: packageData.verificationCount
        };
      }
      
      return {
        success: false,
        error: result.error || 'Payment not completed'
      };
    } catch (error) {
      console.error('Error checking pending payment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Dispatch payment success event
   * @param {Object} packageData - Package data
   */
  dispatchPaymentSuccess(packageData) {
    const event = new CustomEvent('casl-package-purchased', {
      detail: packageData,
      bubbles: true,
      composed: true
    });
    
    window.dispatchEvent(event);
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
