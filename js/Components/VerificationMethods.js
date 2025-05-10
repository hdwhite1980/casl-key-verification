// src/components/VerificationMethods.js
import { i18nService as i18n } from '../services/i18n.js';
import { governmentIdVerification } from '../services/governmentIdVerification.js';
import { phoneVerification } from '../services/phoneVerification.js';
import { socialVerification } from '../services/socialVerification.js';

/**
 * Renders a selector for additional verification methods
 * @param {Object} userIdentification - User identification object
 * @returns {string} HTML for verification method selector
 */
export function renderVerificationMethodSelector(userIdentification) {
  const t = (key, params = {}) => i18n.translate(key, params);
  
  // Determine which methods are already verified
  const idVerified = userIdentification.idVerificationData?.verified;
  const phoneVerified = phoneVerification.verificationStatus === 'verified';
  const socialVerified = socialVerification.verificationStatus === 'verified';
  
  return `
    <div class="verification-methods-selector">
      <h3>${t('verificationMethods.additionalVerification')}</h3>
      <p>${t('verificationMethods.description')}</p>
      
      <div class="verification-method-options">
        <div class="verification-method-card ${idVerified ? 'verified' : ''}" onclick="this.getRootNode().host.selectVerificationMethod('government-id')">
          <div class="method-icon">🪪</div>
          <div class="method-info">
            <h4>${t('verificationMethods.governmentId')}</h4>
            <p>${t('verificationMethods.governmentIdDesc')}</p>
            ${idVerified ? `<span class="verified-badge">✅ ${t('verificationMethods.verified')}</span>` : ''}
          </div>
        </div>
        
        <div class="verification-method-card ${phoneVerified ? 'verified' : ''}" onclick="this.getRootNode().host.selectVerificationMethod('phone')">
          <div class="method-icon">📱</div>
          <div class="method-info">
            <h4>${t('verificationMethods.phone')}</h4>
            <p>${t('verificationMethods.phoneDesc')}</p>
            ${phoneVerified ? `<span class="verified-badge">✅ ${t('verificationMethods.verified')}</span>` : ''}
          </div>
        </div>
        
        <div class="verification-method-card ${socialVerified ? 'verified' : ''}" onclick="this.getRootNode().host.selectVerificationMethod('social')">
          <div class="method-icon">👤</div>
          <div class="method-info">
            <h4>${t('verificationMethods.social')}</h4>
            <p>${t('verificationMethods.socialDesc')}</p>
            ${socialVerified ? `<span class="verified-badge">✅ ${t('verificationMethods.verified')}</span>` : ''}
          </div>
        </div>
      </div>
      
      <p class="verification-benefits">
        ${t('verificationMethods.benefits')}
      </p>
    </div>
  `;
}

/**
 * Renders the selected verification method component
 * @param {string} method - Selected verification method
 * @param {string} userId - User ID
 * @returns {string} HTML for verification method component
 */
export function renderVerificationMethod(method, userId) {
  switch (method) {
    case 'government-id':
      return governmentIdVerification.renderIdVerificationComponent(userId);
    case 'phone':
      return phoneVerification.renderPhoneVerificationComponent(userId);
    case 'social':
      return socialVerification.renderSocialVerificationComponent(userId);
    default:
      return '';
  }
}

/**
 * Get verification bonus info - how much a method improves trust score
 * @param {string} method - Verification method
 * @returns {Object} Bonus info
 */
export function getVerificationBonus(method) {
  switch (method) {
    case 'government-id':
      return { points: 10, reason: i18n.translate('verificationMethods.governmentIdBonus') };
    case 'phone':
      return { points: 5, reason: i18n.translate('verificationMethods.phoneBonus') };
    case 'social':
      return { points: 3, reason: i18n.translate('verificationMethods.socialBonus') };
    default:
      return { points: 0, reason: null };
  }
}

/**
 * Handle verification method selection in the main component
 * @param {string} method - Selected verification method
 * @param {Object} component - CASLVerification component instance
 */
export function handleVerificationMethodSelection(method, component) {
  // Reset all verification services
  governmentIdVerification.reset();
  phoneVerification.reset();
  socialVerification.reset();
  
  // Set selected method in component
  component.selectedVerificationMethod = method;
  
  // Update state and re-render
  component.render();
}

/**
 * Handle verification method completion in the main component
 * @param {string} method - Completed verification method
 * @param {Object} component - CASLVerification component instance
 */
export function handleVerificationMethodComplete(method, component) {
  // Update user identification data
  if (method === 'government-id' && governmentIdVerification.verificationStatus === 'verified') {
    component.userIdentification.idVerificationData = {
      verified: true,
      method: 'government-id',
      timestamp: new Date().toISOString()
    };
  }
  
  // Update trust preview and score
  component.updateTrustPreview();
  
  // Go back to method selector
  component.selectedVerificationMethod = null;
  
  // Update state and re-render
  component.render();
}
