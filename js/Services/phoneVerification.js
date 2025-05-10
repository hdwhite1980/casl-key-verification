// src/services/phoneVerification.js
import { apiService } from './api.js';
import { i18nService } from './i18n.js';

/**
 * Phone verification service
 * Handles verification of users via SMS codes
 */
class PhoneVerification {
  constructor() {
    this.verificationStatus = null;
    this.verificationId = null;
    this.phoneNumber = null;
    this.isLoading = false;
    this.error = null;
    this.codeSent = false;
    this.remainingTime = 0;
    this.timerInterval = null;
  }
  
  /**
   * Reset verification state
   */
  reset() {
    this.verificationStatus = null;
    this.verificationId = null;
    this.phoneNumber = null;
    this.isLoading = false;
    this.error = null;
    this.codeSent = false;
    this.remainingTime = 0;
    this.clearTimer();
  }
  
  /**
   * Clear countdown timer
   */
  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }
  
  /**
   * Start countdown timer for code expiration
   * @param {number} seconds - Seconds for countdown
   */
  startTimer(seconds = 120) {
    this.clearTimer();
    this.remainingTime = seconds;
    
    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      
      // Update UI if timer ends
      if (this.remainingTime <= 0) {
        this.clearTimer();
        this.codeSent = false;
        
        // Trigger UI update via event
        const event = new CustomEvent('phoneVerificationTimerExpired', {
          bubbles: true,
          composed: true
        });
        document.dispatchEvent(event);
      }
    }, 1000);
  }
  
  /**
   * Format phone number for display
   * @param {string} phoneNumber - Phone number to format
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Basic formatting, in a real app use a library like libphonenumber-js
    if (!phoneNumber) return '';
    
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Format based on length
    if (digitsOnly.length === 10) {
      // US format: (XXX) XXX-XXXX
      return `(${digitsOnly.substring(0, 3)}) ${digitsOnly.substring(3, 6)}-${digitsOnly.substring(6)}`;
    } else if (digitsOnly.length === 11 && digitsOnly[0] === '1') {
      // US with country code: +1 (XXX) XXX-XXXX
      return `+1 (${digitsOnly.substring(1, 4)}) ${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7)}`;
    } else {
      // International format with + prefix
      return `+${digitsOnly}`;
    }
  }
  
  /**
   * Request phone verification code
   * @param {string} phoneNumber - Phone number
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async requestVerificationCode(phoneNumber, userId) {
    if (!phoneNumber) {
      this.error = i18nService.translate('phoneVerification.invalidPhone');
      return false;
    }
    
    try {
      this.isLoading = true;
      this.error = null;
      this.phoneNumber = phoneNumber;
      
      // Call API to request verification
      const result = await apiService.requestPhoneVerification(phoneNumber, userId);
      
      // Save verification ID
      this.verificationId = result.verificationId;
      this.codeSent = true;
      
      // Start countdown timer
      this.startTimer(result.expiresIn || 120);
      
      return true;
    } catch (error) {
      console.error('Error requesting phone verification:', error);
      this.error = error.message || i18nService.translate('phoneVerification.requestFailed');
      return false;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Verify SMS code
   * @param {string} code - Verification code
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Verification result
   */
  async verifyCode(code, userId) {
    if (!code) {
      this.error = i18nService.translate('phoneVerification.emptyCode');
      return null;
    }
    
    if (!this.verificationId) {
      this.error = i18nService.translate('phoneVerification.noVerificationInProgress');
      return null;
    }
    
    try {
      this.isLoading = true;
      this.error = null;
      
      // Call API to verify code
      const result = await apiService.verifyPhoneCode(code, this.verificationId, userId);
      
      // Update verification status
      this.verificationStatus = result.verified ? 'verified' : 'failed';
      
      // Clear timer if verified
      if (result.verified) {
        this.clearTimer();
      }
      
      return result;
    } catch (error) {
      console.error('Error verifying code:', error);
      this.error = error.message || i18nService.translate('phoneVerification.verificationFailed');
      this.verificationStatus = 'error';
      return null;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Render phone verification component
   * @param {string} userId - User ID
   * @returns {string} HTML content
   */
  renderPhoneVerificationComponent(userId) {
    const t = i18nService.translate.bind(i18nService);
    
    // If verification is complete, show result
    if (this.verificationStatus === 'verified') {
      return `
        <div class="form-section">
          <h3>${t('phoneVerification.verified')}</h3>
          <div class="alert alert-success">
            <p>${t('phoneVerification.phoneVerified', { phone: this.formatPhoneNumber(this.phoneNumber) })}</p>
          </div>
        </div>
      `;
    }
    
    // If verification failed, show error
    if (this.verificationStatus === 'failed') {
      return `
        <div class="form-section">
          <h3>${t('phoneVerification.verification')}</h3>
          <div class="alert alert-error">
            <p>${t('phoneVerification.incorrectCode')}</p>
          </div>
          ${this.renderVerificationForm(userId)}
        </div>
      `;
    }
    
    // If there's an error, show error message
    if (this.error) {
      return `
        <div class="form-section">
          <h3>${t('phoneVerification.verification')}</h3>
          <div class="alert alert-error">
            <p>${this.error}</p>
          </div>
          ${this.renderVerificationForm(userId)}
        </div>
      `;
    }
    
    // Otherwise, show verification form
    return `
      <div class="form-section">
        <h3>${t('phoneVerification.verification')}</h3>
        <p>${t('phoneVerification.description')}</p>
        ${this.renderVerificationForm(userId)}
      </div>
    `;
  }
  
  /**
   * Render verification form
   * @param {string} userId - User ID
   * @returns {string} HTML content
   */
  renderVerificationForm(userId) {
    const t = i18nService.translate.bind(i18nService);
    
    // If code has been sent, show code input form
    if (this.codeSent) {
      const minutes = Math.floor(this.remainingTime / 60);
      const seconds = this.remainingTime % 60;
      const timeDisplay = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
      
      return `
        <div class="phone-verification-form">
          <p>${t('phoneVerification.codeSent', { phone: this.formatPhoneNumber(this.phoneNumber) })}</p>
          
          <div class="code-input-section">
            <label for="verification-code">${t('phoneVerification.enterCode')}</label>
            <input 
              type="text" 
              id="verification-code" 
              maxlength="6" 
              placeholder="123456" 
              pattern="[0-9]*" 
              inputmode="numeric"
              autocomplete="one-time-code"
            />
            
            <div class="timer">
              <span>${t('phoneVerification.codeExpires')}: ${timeDisplay}</span>
            </div>
          </div>
          
          <div class="verification-actions">
            <button 
              onclick="this.getRootNode().host.verifyPhoneCode('${userId}')"
              ${this.isLoading ? 'disabled' : ''}
              class="success"
            >
              ${this.isLoading ? t('app.loading') : t('phoneVerification.verify')}
            </button>
            
            <button 
              onclick="this.getRootNode().host.resendVerificationCode('${userId}')"
              ${this.isLoading || this.remainingTime > 0 ? 'disabled' : ''}
              class="neutral"
            >
              ${t('phoneVerification.resend')}
            </button>
          </div>
        </div>
      `;
    }
    
    // Otherwise show phone input form
    return `
      <div class="phone-verification-form">
        <div class="phone-input-section">
          <label for="phone-input">${t('phoneVerification.phoneNumber')}</label>
          <input 
            type="tel" 
            id="phone-input" 
            placeholder="+1 (555) 123-4567"
            value="${this.phoneNumber || ''}"
          />
        </div>
        
        <div class="verification-actions">
          <button 
            onclick="this.getRootNode().host.requestPhoneVerification('${userId}')"
            ${this.isLoading ? 'disabled' : ''}
            class="success"
          >
            ${this.isLoading ? t('app.loading') : t('phoneVerification.sendCode')}
          </button>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const phoneVerification = new PhoneVerification();
