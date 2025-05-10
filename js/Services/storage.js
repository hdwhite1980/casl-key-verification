// src/services/storage.js

const STORAGE_KEYS = {
  FORM_DATA: 'caslVerificationForm',
  CURRENT_STEP: 'caslVerificationStep',
  TIMESTAMP: 'caslVerificationFormSaved',
  TRUST_PREVIEW: 'caslTrustPreview'
};

/**
 * Save form data to local storage
 * @param {Object} formData - The form data to save
 * @param {number} currentStep - Current form step
 */
export function saveFormData(formData, currentStep) {
  try {
    localStorage.setItem(STORAGE_KEYS.FORM_DATA, JSON.stringify(formData));
    localStorage.setItem(STORAGE_KEYS.CURRENT_STEP, currentStep.toString());
    localStorage.setItem(STORAGE_KEYS.TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('Error saving form data:', error);
  }
}

/**
 * Load saved form data from local storage
 * @param {number} expirationHours - Hours before saved data expires (default: 24)
 * @returns {Object|null} The saved data or null if none exists or it's expired
 */
export function loadSavedData(expirationHours = 24) {
  try {
    const savedForm = localStorage.getItem(STORAGE_KEYS.FORM_DATA);
    if (!savedForm) return null;
    
    const parsedForm = JSON.parse(savedForm);
    const savedTime = localStorage.getItem(STORAGE_KEYS.TIMESTAMP);
    
    if (savedTime) {
      const hoursSinceSaved = (Date.now() - parseInt(savedTime)) / (1000 * 60 * 60);
      if (hoursSinceSaved < expirationHours) {
        const currentStep = parseInt(localStorage.getItem(STORAGE_KEYS.CURRENT_STEP) || '0');
        return { 
          formData: parsedForm, 
          currentStep 
        };
      }
    }
    
    // Data is expired, clear it
    clearSavedData();
    return null;
  } catch (error) {
    console.error('Error loading saved form data:', error);
    clearSavedData();
    return null;
  }
}

/**
 * Clear all saved form data from local storage
 */
export function clearSavedData() {
  try {
    localStorage.removeItem(STORAGE_KEYS.FORM_DATA);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_STEP);
    localStorage.removeItem(STORAGE_KEYS.TIMESTAMP);
    localStorage.removeItem(STORAGE_KEYS.TRUST_PREVIEW);
  } catch (error) {
    console.error('Error clearing saved data:', error);
  }
}

/**
 * Save the trust preview data to show the user what hosts will see
 * @param {Object} trustData - Trust data including score, level, etc.
 */
export function saveTrustPreview(trustData) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRUST_PREVIEW, JSON.stringify(trustData));
  } catch (error) {
    console.error('Error saving trust preview:', error);
  }
}

/**
 * Get the trust preview data if available
 * @returns {Object|null} The trust preview data or null
 */
export function getTrustPreview() {
  try {
    const previewData = localStorage.getItem(STORAGE_KEYS.TRUST_PREVIEW);
    return previewData ? JSON.parse(previewData) : null;
  } catch (error) {
    console.error('Error getting trust preview:', error);
    return null;
  }
}
