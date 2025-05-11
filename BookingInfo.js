// src/components/FormSteps/BookingInfo.js
import { renderTooltip } from './Alerts.js';

/**
 * Renders the Booking Information form step
 * @param {Object} formData - Form data values
 * @param {Object} errors - Validation errors
 * @returns {string} HTML string for booking info step
 */
export function renderBookingInfo(formData, errors) {
  return `
    <div class="form-section" role="form" aria-labelledby="booking-info-heading">
      <h2 id="booking-info-heading">Booking Information</h2>
      
      <div style="margin-bottom: 15px;">
        <label for="platform-select">Platform used*</label>
        <select 
          id="platform-select"
          name="platform" 
          value="${formData.platform}" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.platform ? 'true' : 'false'}"
          aria-describedby="${errors.platform ? 'platform-error' : ''}"
        >
          <option value="">Select platform</option>
          <option value="Airbnb" ${formData.platform === 'Airbnb' ? 'selected' : ''}>Airbnb</option>
          <option value="Vrbo" ${formData.platform === 'Vrbo' ? 'selected' : ''}>Vrbo</option>
          <option value="Booking.com" ${formData.platform === 'Booking.com' ? 'selected' : ''}>Booking.com</option>
          <option value="Other" ${formData.platform === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        ${errors.platform ? `<p id="platform-error" class="error" role="alert">${errors.platform}</p>` : ''}
      </div>
      
      <div style="margin-bottom: 15px;">
        <label for="listing-input">STR Listing Link*
          ${renderTooltip("Provide the exact URL of your booking to verify it's legitimate.")}
        </label>
        <input 
          type="url" 
          id="listing-input"
          name="listingLink" 
          value="${formData.listingLink}" 
          placeholder="https://www.example.com/listing/123" 
          onchange="this.getRootNode().host.handleInputChange(event)"
          aria-required="true"
          aria-invalid="${errors.listingLink ? 'true' : 'false'}"
          aria-describedby="${errors.listingLink ? 'listing-error' : ''}"
        />
        ${errors.listingLink ? `<p id="listing-error" class="error" role="alert">${errors.listingLink}</p>` : ''}
        <p style="font-size: 12px; color: #666;">This link verifies your booking is real</p>
      </div>
      
      <div style="display: flex; gap: 15px; margin-bottom: 15px;">
        <div style="flex: 1;">
          <label for="checkin-input">Check-in Date*</label>
          <input 
            type="date" 
            id="checkin-input"
            name="checkInDate" 
            value="${formData.checkInDate}" 
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${errors.checkInDate ? 'true' : 'false'}"
            aria-describedby="${errors.checkInDate ? 'checkin-error' : ''}"
          />
          ${errors.checkInDate ? `<p id="checkin-error" class="error" role="alert">${errors.checkInDate}</p>` : ''}
        </div>
        
        <div style="flex: 1;">
          <label for="checkout-input">Check-out Date*</label>
          <input 
            type="date" 
            id="checkout-input"
            name="checkOutDate" 
            value="${formData.checkOutDate}" 
            onchange="this.getRootNode().host.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${errors.checkOutDate ? 'true' : 'false'}"
            aria-describedby="${errors.checkOutDate ? 'checkout-error' : ''}"
          />
          ${errors.checkOutDate ? `<p id="checkout-error" class="error" role="alert">${errors.checkOutDate}</p>` : ''}
        </div>
      </div>
    </div>
  `;
}
