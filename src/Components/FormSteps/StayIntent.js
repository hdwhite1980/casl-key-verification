// src/components/FormSteps/StayIntent.js
import { renderTooltip } from '../common/Alerts.js';

/**
 * Renders the Stay Intent form step with enhanced accessibility
 * @param {Object} formData - Form data values
 * @param {Object} errors - Validation errors
 * @returns {string} HTML string for stay intent step
 */
export function renderStayIntent(formData, errors) {
  // Define proper autocomplete attributes for inputs
  return `
    <div 
      id="step-content-2"
      class="form-section" 
      role="form" 
      aria-labelledby="stay-intent-heading"
    >
      <h2 id="stay-intent-heading">Stay Intent & Group Profile</h2>
      
      <div class="form-group">
        <label for="purpose-select" class="required">
          What is the primary purpose of your stay?
          ${renderTooltip("This helps hosts understand why you're traveling.")}
        </label>
        <select 
          id="purpose-select"
          name="stayPurpose" 
          value="${formData.stayPurpose}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.stayPurpose ? 'true' : 'false'}"
          aria-describedby="${errors.stayPurpose ? 'purpose-error' : 'purpose-desc'}"
          required
        >
          <option value="">Select purpose</option>
          <option value="Business" ${formData.stayPurpose === 'Business' ? 'selected' : ''}>Business</option>
          <option value="Family Visit" ${formData.stayPurpose === 'Family Visit' ? 'selected' : ''}>Family Visit</option>
          <option value="Vacation" ${formData.stayPurpose === 'Vacation' ? 'selected' : ''}>Vacation</option>
          <option value="Special Occasion" ${formData.stayPurpose === 'Special Occasion' ? 'selected' : ''}>Special Occasion</option>
          <option value="Relocation" ${formData.stayPurpose === 'Relocation' ? 'selected' : ''}>Relocation</option>
          <option value="Medical Stay" ${formData.stayPurpose === 'Medical Stay' ? 'selected' : ''}>Medical Stay</option>
          <option value="Other" ${formData.stayPurpose === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        <div id="purpose-desc" class="field-description sr-only">
          Select the main reason for your stay from the options
        </div>
        ${errors.stayPurpose ? `<div id="purpose-error" class="error" role="alert">${errors.stayPurpose}</div>` : ''}
      </div>
      
      ${formData.stayPurpose === 'Other' ? `
        <div class="form-group">
          <label for="other-purpose-input" class="required">Please specify</label>
          <input 
            type="text" 
            id="other-purpose-input"
            name="otherPurpose" 
            value="${formData.otherPurpose}" 
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${errors.otherPurpose ? 'true' : 'false'}"
            aria-describedby="${errors.otherPurpose ? 'other-purpose-error' : ''}"
            required
          />
          ${errors.otherPurpose ? `<div id="other-purpose-error" class="error" role="alert">${errors.otherPurpose}</div>` : ''}
        </div>
      ` : ''}
      
      <div class="form-group">
        <label for="guests-input" class="required">How many total guests will stay?</label>
        <input 
          type="number" 
          id="guests-input"
          name="totalGuests" 
          value="${formData.totalGuests}" 
          min="1" 
          max="20" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.totalGuests ? 'true' : 'false'}"
          aria-describedby="${errors.totalGuests ? 'guests-error' : 'guests-desc'}"
          required
        />
        <div id="guests-desc" class="field-description sr-only">
          Enter a number between 1 and 20
        </div>
        ${errors.totalGuests ? `<div id="guests-error" class="error" role="alert">${errors.totalGuests}</div>` : ''}
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="children-checkbox"
          name="childrenUnder12" 
          ${formData.childrenUnder12 ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-describedby="children-desc"
        />
        <label for="children-checkbox" class="checkbox-label">
          Are there any children under 12?
          ${renderTooltip("Having children in your group may positively affect your trust score.")}
        </label>
        <div id="children-desc" class="field-description sr-only">
          Check this box if your group includes children under 12 years old
        </div>
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="non-overnight-checkbox"
          name="nonOvernightGuests" 
          ${formData.nonOvernightGuests ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-describedby="non-overnight-desc"
        />
        <label for="non-overnight-checkbox" class="checkbox-label">
          Will any guests not be staying overnight?
          ${renderTooltip("This helps hosts understand if additional visitors may be present during the day.")}
        </label>
        <div id="non-overnight-desc" class="field-description sr-only">
          Check this box if additional people will visit but not stay overnight
        </div>
      </div>
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="local-travel-checkbox"
          name="travelingNearHome" 
          ${formData.travelingNearHome ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-describedby="local-travel-desc"
        />
        <label for="local-travel-checkbox" class="checkbox-label">
          Are you traveling within 20 miles of your home?
          ${renderTooltip("Local bookings may require additional context for verification.")}
        </label>
        <div id="local-travel-desc" class="field-description sr-only">
          Check this box if your stay is within 20 miles of your primary residence
        </div>
      </div>
      
      ${formData.travelingNearHome ? `
        <div class="form-group nested-field">
          <label for="zipcode-input" class="required">ZIP code</label>
          <input 
            type="text" 
            id="zipcode-input"
            name="zipCode" 
            value="${formData.zipCode}" 
            placeholder="Enter your ZIP code" 
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-required="${formData.travelingNearHome ? 'true' : 'false'}"
            aria-invalid="${errors.zipCode ? 'true' : 'false'}"
            aria-describedby="${errors.zipCode ? 'zipcode-error' : ''}"
            autocomplete="postal-code"
            pattern="[0-9]{5}(-[0-9]{4})?"
            ${formData.travelingNearHome ? 'required' : ''}
          />
          ${errors.zipCode ? `<div id="zipcode-error" class="error" role="alert">${errors.zipCode}</div>` : ''}
        </div>
      ` : ''}
      
      <div class="checkbox-container">
        <input 
          type="checkbox" 
          id="used-str-checkbox"
          name="usedSTRBefore" 
          ${formData.usedSTRBefore ? 'checked' : ''} 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-describedby="used-str-desc"
        />
        <label for="used-str-checkbox" class="checkbox-label">
          Have you used short-term rentals before?
          ${renderTooltip("Prior rental experience may positively impact your trust score.")}
        </label>
        <div id="used-str-desc" class="field-description sr-only">
          Check this box if you have previously stayed at a short-term rental
        </div>
      </div>
      
      ${formData.usedSTRBefore ? `
        <div class="form-group nested-field">
          <label for="previous-stays-input">Optional: Previous stay links</label>
          <textarea 
            id="previous-stays-input"
            name="previousStayLinks" 
            placeholder="Enter links to previous stays (optional)" 
            rows="2"
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-describedby="previous-stays-desc"
          >${formData.previousStayLinks}</textarea>
          <div id="previous-stays-desc" class="field-description">
            Providing links to previous stays can improve your trust score
          </div>
        </div>
      ` : ''}
    </div>
  `;
}
