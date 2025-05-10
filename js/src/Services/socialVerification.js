// src/services/socialVerification.js
import { apiService } from './api.js';
import { i18nService } from './i18n.js';

/**
 * Social Media verification service
 * Handles verification of users via social media accounts
 */
class SocialVerification {
  constructor() {
    this.verificationStatus = null;
    this.platform = null;
    this.profileUrl = null;
    this.isLoading = false;
    this.error = null;
    
    // Available social platforms
    this.availablePlatforms = [
      { id: 'facebook', name: 'Facebook', icon: 'facebook' },
      { id: 'linkedin', name: 'LinkedIn', icon: 'linkedin' },
      { id: 'instagram', name: 'Instagram', icon: 'instagram' },
      { id: 'twitter', name: 'Twitter', icon: 'twitter' },
      { id: 'tiktok', name: 'TikTok', icon: 'tiktok' }
    ];
  }
  
  /**
   * Reset verification state
   */
  reset() {
    this.verificationStatus = null;
    this.platform = null;
    this.profileUrl = null;
    this.isLoading = false;
    this.error = null;
  }
  
  /**
   * Verify social media profile
   * @param {string} platform - Social media platform
   * @param {string} profileUrl - Profile URL
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Verification result
   */
  async verifySocialProfile(platform, profileUrl, userId) {
    if (!platform || !profileUrl) {
      this.error = i18nService.translate('socialVerification.missingInfo');
      return null;
    }
    
    try {
      this.isLoading = true;
      this.error = null;
      this.platform = platform;
      this.profileUrl = profileUrl;
      
      // Get OAuth token if available (in a real app)
      const accessToken = null; // For demo
      
      // Call API to verify social profile
      const result = await apiService.verifySocialMedia(
        platform,
        profileUrl,
        accessToken,
        userId
      );
      
      // Update verification status
      this.verificationStatus = result.status;
      
      return result;
    } catch (error) {
      console.error('Error verifying social profile:', error);
      this.error = error.message || i18nService.translate('socialVerification.verificationFailed');
      this.verificationStatus = 'error';
      return null;
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Check if platform is valid
   * @param {string} platformId - Platform ID to check
   * @returns {boolean} Whether platform is valid
   */
  isValidPlatform(platformId) {
    return this.availablePlatforms.some(p => p.id === platformId);
  }
  
  /**
   * Get platform info by ID
   * @param {string} platformId - Platform ID
   * @returns {Object|null} Platform info
   */
  getPlatformInfo(platformId) {
    return this.availablePlatforms.find(p => p.id === platformId) || null;
  }
  
  /**
   * Render social verification component
   * @param {string} userId - User ID
   * @returns {string} HTML content
   */
  renderSocialVerificationComponent(userId) {
    const t = i18nService.translate.bind(i18nService);
    
    // If verification is complete, show result
    if (this.verificationStatus === 'verified') {
      const platformInfo = this.getPlatformInfo(this.platform);
      const platformName = platformInfo ? platformInfo.name : this.platform;
      
      return `
        <div class="form-section">
          <h3>${t('socialVerification.verified')}</h3>
          <div class="alert alert-success">
            <p>${t('socialVerification.profileVerified', { platform: platformName })}</p>
          </div>
        </div>
      `;
    }
    
    // If verification is pending manual review
    if (this.verificationStatus === 'manual_review') {
      return `
        <div class="form-section">
          <h3>${t('socialVerification.manualReview')}</h3>
          <div class="alert alert-warning">
            <p>${t('socialVerification.pendingReview')}</p>
          </div>
        </div>
      `;
    }
    
    // If verification failed or errored
    if (this.verificationStatus === 'failed' || this.verificationStatus === 'error') {
      return `
        <div class="form-section">
          <h3>${t('socialVerification.verification')}</h3>
          <div class="alert alert-error">
            <p>${this.error || t('socialVerification.verificationFailed')}</p>
          </div>
          ${this.renderVerificationForm(userId)}
        </div>
      `;
    }
    
    // Otherwise, show verification form
    return `
      <div class="form-section">
        <h3>${t('socialVerification.verification')}</h3>
        <p>${t('socialVerification.description')}</p>
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
    
    // Generate platform options
    let platformOptions = '';
    this.availablePlatforms.forEach(platform => {
      platformOptions += `
        <option value="${platform.id}" ${this.platform === platform.id ? 'selected' : ''}>
          ${platform.name}
        </option>
      `;
    });
    
    return `
      <div class="social-verification-form">
        <div class="platform-selection">
          <label for="social-platform">${t('socialVerification.selectPlatform')}</label>
          <select 
            id="social-platform" 
            onchange="this.getRootNode().host.handleSocialPlatformChange(event)"
          >
            <option value="">${t('socialVerification.choosePlatform')}</option>
            ${platformOptions}
          </select>
        </div>
        
        <div class="profile-url-section">
          <label for="profile-url">${t('socialVerification.profileUrl')}</label>
          <input 
            type="url" 
            id="profile-url" 
            placeholder="https://www.example.com/profile/username"
            value="${this.profileUrl || ''}"
          />
          <p class="hint">${t('socialVerification.profileUrlHint')}</p>
        </div>
        
        <div class="verification-privacy-notice">
          <h4>${t('socialVerification.privacyNotice')}</h4>
          <p>${t('socialVerification.privacyDescription')}</p>
        </div>
        
        <div class="verification-actions">
          <button 
            onclick="this.getRootNode().host.verifySocialProfile('${userId}')"
            ${this.isLoading ? 'disabled' : ''}
            class="success"
          >
            ${this.isLoading ? t('app.loading') : t('socialVerification.verify')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Get OAuth URL for social platform
   * @param {string} platform - Platform ID
   * @returns {string|null} OAuth URL or null if not supported
   */
  getOAuthUrl(platform) {
    // This would be implemented with real OAuth endpoints
    // For demo purposes, return mock URLs
    const baseOAuthUrl = 'https://casl-key-auth.example.com/oauth';
    
    switch (platform) {
      case 'facebook':
        return `${baseOAuthUrl}/facebook`;
      case 'linkedin':
        return `${baseOAuthUrl}/linkedin`;
      case 'instagram':
        return `${baseOAuthUrl}/instagram`;
      default:
        return null; // Direct URL verification
    }
  }
  
  /**
   * Handle OAuth callback
   * @param {Object} params - URL parameters from OAuth callback
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async handleOAuthCallback(params, userId) {
    if (!params || !params.code || !params.state) {
      this.error = i18nService.translate('socialVerification.invalidCallback');
      return false;
    }
    
    try {
      this.isLoading = true;
      
      // Extract platform from state parameter
      const platform = params.state.split('-')[0];
      
      if (!this.isValidPlatform(platform)) {
        throw new Error(i18nService.translate('socialVerification.invalidPlatform'));
      }
      
      // Call API to verify with OAuth code
      const result = await apiService.verifySocialMedia(
        platform,
        null, // No URL needed with OAuth
        params.code,
        userId
      );
      
      // Update verification status
      this.platform = platform;
      this.verificationStatus = result.status;
      
      return true;
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
      this.error = error.message || i18nService.translate('socialVerification.oauthFailed');
      this.verificationStatus = 'error';
      return false;
    } finally {
      this.isLoading = false;
    }
  }
}

// Export singleton instance
export const socialVerification = new SocialVerification();
