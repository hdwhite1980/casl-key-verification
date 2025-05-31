// src/components/FormSteps/Agreement.js
import { renderTooltip } from './alerts.js';

/**
 * Renders the Agreement form step
 * @param {Object} formData - Form data values
 * @param {Object} errors - Validation errors
 * @returns {string} HTML string for agreement step
 */
export function renderAgreement(formData, errors) {
  return `
    <div class="form-section" role="form" aria-labelledby="agreement-heading">
      <h2 id="agreement-heading">Agreement Acknowledgement</h2>
      
      <div class="alert alert-info">
        <p>
          These acknowledgements help ensure positive experiences for both guests and hosts.
          Your agreement to these terms is part of the CASL Key trust verification process.
        </p>
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="rules-checkbox"
          name="agreeToRules" 
          ${formData.agreeToRules ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.agreeToRules ? 'true' : 'false'}"
          aria-describedby="${errors.agreeToRules ? 'rules-error' : ''}"
        />
        <label for="rules-checkbox" class="checkbox-label">
          I agree to follow quiet hours and property rules*
          ${renderTooltip("Following property-specific rules helps maintain great relationships with hosts and neighbors.")}
        </label>
        ${errors.agreeToRules ? `<p id="rules-error" class="error" role="alert">${errors.agreeToRules}</p>` : ''}
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="parties-checkbox"
          name="agreeNoParties" 
          ${formData.agreeNoParties ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.agreeNoParties ? 'true' : 'false'}"
          aria-describedby="${errors.agreeNoParties ? 'parties-error' : ''}"
        />
        <label for="parties-checkbox" class="checkbox-label">
          I agree not to host unauthorized gatherings or events*
          ${renderTooltip("Always discuss any gathering plans with your host in advance.")}
        </label>
        ${errors.agreeNoParties ? `<p id="parties-error" class="error" role="alert">${errors.agreeNoParties}</p>` : ''}
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="flagging-checkbox"
          name="understandFlagging" 
          ${formData.understandFlagging ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.understandFlagging ? 'true' : 'false'}"
          aria-describedby="${errors.understandFlagging ? 'flagging-error' : ''}"
        />
        <label for="flagging-checkbox" class="checkbox-label">
          I understand that following the community standards helps maintain my CASL Key verification status*
          ${renderTooltip("CASL Key aims to create a trusted network of verified guests and hosts. Complying with platform standards keeps your verification active.")}
        </label>
        ${errors.understandFlagging ? `<p id="flagging-error" class="error" role="alert">${errors.understandFlagging}</p>` : ''}
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
        <h3>Privacy & Fair Housing Statement</h3>
        <p>
          CASL Key is committed to equal opportunity housing. We do not discriminate based on race, color, 
          national origin, religion, sex, familial status, disability, or any other protected characteristic.
        </p>
        <p>
          Your verification information is used solely to establish trust. Hosts will only see your 
          verification status - never your personal details.
        </p>
      </div>
    </div>
  `;
}
