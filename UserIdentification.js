// src/components/FormSteps/UserIdentification.js
import { VERIFICATION_STATUSES } from './constants.js';
import { renderTooltip, renderBackgroundCheckNotification } from './Alerts.js';

/**
 * Renders the User Identification form step with enhanced accessibility
 * @param {Object} formData - Form data values
 * @param {Object} errors - Validation errors
 * @param {Object} userIdentification - User identification data
 * @param {boolean} showScreenshotUpload - Whether to show screenshot upload
 * @param {string|null} screenshotData - Screenshot data URL
 * @param {string} verificationStatus - Current verification status
 * @returns {string} HTML string for user identification step
 */
export function renderUserIdentification(
  formData, 
  errors, 
  userIdentification, 
  showScreenshotUpload, 
  screenshotData, 
  verificationStatus
) {
  if (userIdentification.isChecking) {
    return `
      <div 
        id="step-content-0"
        class="form-section loading-state" 
        style="text-align: center"
      >
        <h2>User Identification</h2>
        <p>Checking user status...</p>
        <div 
          class="loading-spinner" 
          role="status" 
          aria-live="polite"
        >
          <div class="spinner-visual" aria-hidden="true"></div>
          <span class="sr-only">Verifying your information. Please wait.</span>
        </div>
      </div>
    `;
  }
  
  let platformVerificationHtml = '';
  
  // Add the screenshot upload section if shown
  if (showScreenshotUpload) {
    platformVerificationHtml = `
      <div 
        class="screenshot-section" 
        aria-labelledby="screenshot-heading"
      >
        <h3 id="screenshot-heading">Platform Verification via Screenshot</h3>
        <p>Please upload a screenshot of your Airbnb or VRBO profile page to verify your account.</p>
        
        <div 
          class="screenshot-container" 
          id="screenshot-dropzone"
          ondragover="this.getRootNode().host.handleDragOver(event)"
          ondragleave="this.getRootNode().host.handleDragLeave(event)"
          ondrop="this.getRootNode().host.handleDrop(event)"
          aria-describedby="screenshot-instructions"
        >
          ${screenshotData ? `
            <p id="screenshot-instructions">Screenshot Preview:</p>
            <img 
              src="${screenshotData}" 
              class="screenshot-preview" 
              alt="Uploaded profile screenshot" 
            />
            <button 
              onclick="this.getRootNode().host.clearScreenshot()" 
              class="neutral"
              aria-label="Remove uploaded screenshot"
            >
              Remove Screenshot
            </button>
          ` : `
            <p id="screenshot-instructions">Drag a screenshot here or click to select a file</p>
            <input 
              type="file" 
              accept="image/*" 
              id="screenshot-input" 
              class="file-input"
              aria-label="Upload profile screenshot"
              onchange="this.getRootNode().host.handleScreenshotUpload(event)" 
              aria-describedby="screenshot-instructions"
            />
          `}
        </div>
        
        ${verificationStatus === VERIFICATION_STATUSES.PROCESSING ? `
          <div 
            class="alert alert-info" 
            role="status" 
            aria-live="polite"
          >
            <p>Your screenshot is being processed. This may take a minute...</p>
            <div class="spinner-visual" aria-hidden="true"></div>
          </div>
        ` : verificationStatus === VERIFICATION_STATUSES.VERIFIED ? `
          <div 
            class="alert alert-success" 
            role="status" 
            aria-live="polite"
          >
            <p><span aria-hidden="true">✅</span> Your account has been verified successfully!</p>
          </div>
        ` : verificationStatus === VERIFICATION_STATUSES.MANUAL_REVIEW ? `
          <div 
            class="alert alert-warning" 
            role="status" 
            aria-live="polite"
          >
            <p><span aria-hidden="true">👀</span> Your screenshot has been submitted for manual review. We'll notify you once it's verified.</p>
          </div>
        ` : verificationStatus === VERIFICATION_STATUSES.REJECTED ? `
          <div 
            class="alert alert-error" 
            role="alert" 
            aria-live="assertive"
          >
            <p><span aria-hidden="true">❌</span> We couldn't verify your account from this screenshot. Please try again with a clearer image.</p>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  // Check if we need to show the background check consent
  const needsBackgroundCheck = !formData.airbnbProfile && 
                            !formData.vrboProfile && 
                            !formData.otherPlatformProfile &&
                            !userIdentification.isVerified &&
                            verificationStatus !== VERIFICATION_STATUSES.VERIFIED &&
                            verificationStatus !== VERIFICATION_STATUSES.MANUAL_REVIEW;
  
  return `
    <div 
      id="step-content-0"
      class="form-section" 
      role="form" 
      aria-labelledby="user-id-heading"
    >
      <h2 id="user-id-heading">User Identification</h2>
      
      <div class="sr-only" id="form-instructions">
        This form has multiple steps. Required fields are marked with an asterisk (*).
        Use the Next and Previous buttons to navigate between steps.
      </div>
      
      ${userIdentification.error ? `
        <div 
          class="alert alert-error" 
          role="alert" 
          aria-live="assertive"
        >
          ${userIdentification.error}
        </div>
      ` : ''}
      
      ${userIdentification.caslKeyId && userIdentification.isExistingUser ? `
        <div 
          class="alert alert-success" 
          role="status" 
          aria-live="polite"
        >
          Welcome back! We found your existing CASL Key ID: ${userIdentification.caslKeyId}
        </div>
      ` : ''}
      
      <div class="form-group">
        <label for="name-input" class="required">Full Name</label>
        <input 
          type="text" 
          id="name-input"
          name="name" 
          value="${formData.name}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.name ? 'true' : 'false'}"
          aria-describedby="${errors.name ? 'name-error' : ''}"
          autocomplete="name"
          required
        />
        ${errors.name ? `<div id="name-error" class="error" role="alert">${errors.name}</div>` : ''}
      </div>
      
      <div class="form-group">
        <label for="email-input" class="required">Email Address</label>
        <input 
          type="email" 
          id="email-input"
          name="email" 
          value="${formData.email}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.email ? 'true' : 'false'}"
          aria-describedby="${errors.email ? 'email-error' : ''}"
          autocomplete="email"
          required
        />
        ${errors.email ? `<div id="email-error" class="error" role="alert">${errors.email}</div>` : ''}
      </div>
      
      <div class="form-group">
        <label for="phone-input" class="required">Phone Number</label>
        <input 
          type="tel" 
          id="phone-input"
          name="phone" 
          value="${formData.phone}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.phone ? 'true' : 'false'}"
          aria-describedby="${errors.phone ? 'phone-error' : ''}"
          autocomplete="tel"
          required
        />
        ${errors.phone ? `<div id="phone-error" class="error" role="alert">${errors.phone}</div>` : ''}
      </div>
      
      <div class="form-group">
        <label for="address-input" class="required">Address</label>
        <input 
          type="text" 
          id="address-input"
          name="address" 
          value="${formData.address}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.address ? 'true' : 'false'}"
          aria-describedby="${errors.address ? 'address-error' : ''}"
          autocomplete="street-address"
          required
        />
        ${errors.address ? `<div id="address-error" class="error" role="alert">${errors.address}</div>` : ''}
      </div>
      
      <h3 id="platform-verification-heading">
        Platform Verification
        ${renderTooltip("Providing a platform profile helps verify your identity and may improve your trust score.")}
      </h3>
      
      <div 
        class="platform-verification-section" 
        aria-labelledby="platform-verification-heading"
      >
        <div class="form-group">
          <label for="airbnb-input">Airbnb Profile Link (Optional)</label>
          <input 
            type="url" 
            id="airbnb-input"
            name="airbnbProfile" 
            value="${formData.airbnbProfile}" 
            placeholder="https://www.airbnb.com/users/show/123456789"
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-describedby="airbnb-desc"
          />
          <div id="airbnb-desc" class="field-description">
            Providing a profile helps with verification
          </div>
        </div>
  
        <div class="form-group">
          <label for="vrbo-input">Vrbo Profile Link (Optional)</label>
          <input 
            type="url" 
            id="vrbo-input"
            name="vrboProfile" 
            value="${formData.vrboProfile}" 
            placeholder="https://www.vrbo.com/user/12345abcde"
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-describedby="vrbo-desc"
          />
          <div id="vrbo-desc" class="field-description">
            You can provide Vrbo profile instead of Airbnb
          </div>
        </div>
  
        <div class="form-group">
          <label for="other-platform-select">Other Platform Profile (Optional)</label>
          <div 
            class="input-group" 
            style="display: flex; gap: 10px;"
          >
            <select
              id="other-platform-select"
              name="otherPlatformType"
              value="${formData.otherPlatformType}"
              onchange="this.getRootNode().host.handleInputChange(event)"
              style="flex: 1"
              aria-label="Select other platform type"
            >
              <option value="">Select platform</option>
              <option value="booking" ${formData.otherPlatformType === 'booking' ? 'selected' : ''}>Booking.com</option>
              <option value="tripadvisor" ${formData.otherPlatformType === 'tripadvisor' ? 'selected' : ''}>TripAdvisor</option>
              <option value="homeaway" ${formData.otherPlatformType === 'homeaway' ? 'selected' : ''}>HomeAway</option>
              <option value="other" ${formData.otherPlatformType === 'other' ? 'selected' : ''}>Other</option>
            </select>
            
            <input
              type="url"
              id="other-platform-input"
              name="otherPlatformProfile"
              value="${formData.otherPlatformProfile}"
              placeholder="https://example.com/profile/123"
              onchange="this.getRootNode().host.handleInputChange(event)"
              style="flex: 2"
              aria-label="Other platform profile URL"
            />
          </div>
          <div id="other-platform-desc" class="field-description">
            You can provide a profile from any other travel platform
          </div>
        </div>
      </div>
      
      ${!formData.airbnbProfile && !formData.vrboProfile && !formData.otherPlatformProfile ? `
        <div class="verification-options">
          <button 
            onclick="this.getRootNode().host.toggleScreenshotUpload(true)" 
            class="success"
            style="margin-bottom: 15px"
            aria-expanded="${showScreenshotUpload ? 'true' : 'false'}"
            aria-controls="screenshot-section"
          >
            Verify with Account Screenshot
          </button>
          
          ${renderBackgroundCheckNotification(needsBackgroundCheck)}
          
          <div class="checkbox-container">
            <input 
              type="checkbox" 
              id="bg-check-consent"
              name="consentToBackgroundCheck" 
              ${formData.consentToBackgroundCheck ? 'checked' : ''} 
              onchange="this.getRootNode().host.handleInputChange(event)"
              aria-describedby="bg-check-desc"
            />
            <label for="bg-check-consent" class="checkbox-label">
              I consent to a background check to verify my identity. 
              This is necessary if you don't provide any platform profile links.
              ${renderTooltip("Background checks only verify your identity. Only a pass/fail result is stored, never your personal details.")}
            </label>
            <div id="bg-check-desc" class="field-description sr-only">
              Check this box to consent to a background check for identity verification
            </div>
          </div>
        </div>
      ` : ''}
      
      ${errors.verification ? `<div class="error" role="alert">${errors.verification}</div>` : ''}
      
      ${platformVerificationHtml}
    </div>
  `;
}
