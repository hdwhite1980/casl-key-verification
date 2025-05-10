// src/services/governmentIdVerification.js
import { apiService } from './api.js';
import { i18nService } from './i18n.js';

/**
 * Government ID verification service
 * Handles verification of users via government-issued ID and selfie
 */
class GovernmentIdVerification {
  constructor() {
    this.verificationStatus = null;
    this.idImageData = null;
    this.selfieImageData = null;
    this.verificationResult = null;
    this.isLoading = false;
    this.error = null;
  }
  
  /**
   * Reset verification state
   */
  reset() {
    this.verificationStatus = null;
    this.idImageData = null;
    this.selfieImageData = null;
    this.verificationResult = null;
    this.isLoading = false;
    this.error = null;
  }
  
  /**
   * Handle ID image upload
   * @param {File} file - ID image file
   * @returns {Promise<boolean>} Success status
   */
  async uploadIdImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.error = i18nService.translate('governmentId.invalidFileType');
      return false;
    }
    
    try {
      this.idImageData = await this.readFileAsDataURL(file);
      return true;
    } catch (error) {
      console.error('Error reading ID image:', error);
      this.error = i18nService.translate('governmentId.errorReadingFile');
      return false;
    }
  }
  
  /**
   * Handle selfie image upload
   * @param {File} file - Selfie image file
   * @returns {Promise<boolean>} Success status
   */
  async uploadSelfieImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      this.error = i18nService.translate('governmentId.invalidFileType');
      return false;
    }
    
    try {
      this.selfieImageData = await this.readFileAsDataURL(file);
      return true;
    } catch (error) {
      console.error('Error reading selfie image:', error);
      this.error = i18nService.translate('governmentId.errorReadingFile');
      return false;
    }
  }
  
  /**
   * Read file as data URL
   * @param {File} file - File to read
   * @returns {Promise<string>} Data URL
   */
  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  }
  
  /**
   * Verify ID and selfie with API
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Verification result
   */
  async verifyId(userId) {
    if (!this.idImageData || !this.selfieImageData) {
      this.error = i18nService.translate('governmentId.missingImages');
      return null;
    }
    
    try {
      this.isLoading = true;
      this.error = null;
      this.verificationStatus = 'processing';
      
      // Call API to verify ID
      const result = await apiService.verifyGovernmentId(
        this.idImageData,
        this.selfieImageData,
        userId
      );
      
      // Update verification result
      this.verificationResult = result;
      this.verificationStatus = result.status;
      
      return result;
    } catch (error) {
      console.error('Error verifying ID:', error);
      this.error = error.message || i18nService.translate('governmentId.verificationFailed');
      this.verificationStatus = 'error';
      return null;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Render Government ID verification component
   * @param {string} userId - User ID
   * @returns {string} HTML content
   */
  renderIdVerificationComponent(userId) {
    const t = i18nService.translate.bind(i18nService);
    
    // If verification is complete, show result
    if (this.verificationStatus === 'verified') {
      return `
        <div class="form-section">
          <h3>${t('governmentId.verified')}</h3>
          <div class="alert alert-success">
            <p>${t('governmentId.verificationSuccessful')}</p>
          </div>
        </div>
      `;
    }
    
    // If verification is being processed, show status
    if (this.verificationStatus === 'processing') {
      return `
        <div class="form-section">
          <h3>${t('governmentId.verifying')}</h3>
          <div class="alert alert-info">
            <p>${t('governmentId.verificationInProgress')}</p>
          </div>
        </div>
      `;
    }
    
    // If there was an error, show error message
    if (this.error) {
      return `
        <div class="form-section">
          <h3>${t('governmentId.verification')}</h3>
          <div class="alert alert-error">
            <p>${this.error}</p>
          </div>
          ${this.renderUploadForm(userId)}
        </div>
      `;
    }
    
    // Otherwise, show upload form
    return `
      <div class="form-section">
        <h3>${t('governmentId.verification')}</h3>
        <p>${t('governmentId.description')}</p>
        ${this.renderUploadForm(userId)}
      </div>
    `;
  }
  
  /**
   * Render upload form
   * @param {string} userId - User ID
   * @returns {string} HTML content
   */
  renderUploadForm(userId) {
    const t = i18nService.translate.bind(i18nService);
    
    return `
      <div class="id-verification-form">
        <div class="id-upload-section">
          <h4>${t('governmentId.uploadId')}</h4>
          <p>${t('governmentId.idInstructions')}</p>
          
          <div class="screenshot-container" id="id-image-dropzone">
            ${this.idImageData ? `
              <img src="${this.idImageData}" class="screenshot-preview" alt="Government ID preview" />
              <button onclick="this.getRootNode().host.clearIdImage()" class="neutral">
                ${t('governmentId.removeImage')}
              </button>
            ` : `
              <p>${t('governmentId.dragId')}</p>
              <input 
                type="file" 
                accept="image/*" 
                id="id-image-input" 
                class="file-input"
                aria-label="${t('governmentId.uploadId')}"
                onchange="this.getRootNode().host.handleIdImageUpload(event)" 
              />
            `}
          </div>
        </div>
        
        <div class="selfie-upload-section">
          <h4>${t('governmentId.uploadSelfie')}</h4>
          <p>${t('governmentId.selfieInstructions')}</p>
          
          <div class="screenshot-container" id="selfie-image-dropzone">
            ${this.selfieImageData ? `
              <img src="${this.selfieImageData}" class="screenshot-preview" alt="Selfie preview" />
              <button onclick="this.getRootNode().host.clearSelfieImage()" class="neutral">
                ${t('governmentId.removeImage')}
              </button>
            ` : `
              <p>${t('governmentId.dragSelfie')}</p>
              <input 
                type="file" 
                accept="image/*" 
                id="selfie-image-input" 
                class="file-input"
                aria-label="${t('governmentId.uploadSelfie')}"
                onchange="this.getRootNode().host.handleSelfieImageUpload(event)" 
              />
            `}
          </div>
        </div>
        
        <div class="verification-privacy-notice">
          <h4>${t('governmentId.privacyNotice')}</h4>
          <p>${t('governmentId.privacyDescription')}</p>
        </div>
        
        <div class="verification-actions">
          <button 
            onclick="this.getRootNode().host.verifyGovId('${userId}')"
            ${!this.idImageData || !this.selfieImageData || this.isLoading ? 'disabled' : ''}
            class="success"
          >
            ${this.isLoading ? t('app.loading') : t('governmentId.verifyNow')}
          </button>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const governmentIdVerification = new GovernmentIdVerification();
