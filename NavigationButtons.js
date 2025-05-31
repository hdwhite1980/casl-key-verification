// src/components/common/NavigationButtons.js
import { FORM_STEPS } from './constants.js';

/**
 * Renders navigation buttons for form steps with enhanced accessibility
 * @param {number} currentStep - Current step index
 * @param {boolean} isFormValid - Whether current form step is valid
 * @param {boolean} isLoading - Whether a request is in progress
 * @returns {string} HTML string for navigation buttons
 */
export function renderNavigationButtons(currentStep, isFormValid, isLoading) {
  const isLastStep = currentStep === FORM_STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  
  const prevButtonDisabled = isFirstStep;
  const nextButtonDisabled = !isFormValid || isLoading;
  
  const nextButtonText = isLastStep ? 'Submit' : 'Next';
  const loadingText = isLastStep ? 'Submitting...' : 'Loading...';
  
  // Enhanced ARIA attributes
  return `
    <div 
      class="navigation-buttons" 
      role="group" 
      aria-label="Form navigation"
    >
      <button 
        type="button"
        class="btn-previous"
        onclick="this.getRootNode().host.handlePreviousStep()"
        ${prevButtonDisabled ? 'disabled' : ''}
        aria-disabled="${prevButtonDisabled}"
        aria-label="${prevButtonDisabled ? 'Previous step (disabled, this is the first step)' : 'Go to previous step'}"
      >
        <span aria-hidden="true">← </span>Previous
      </button>
      
      <button 
        type="button"
        class="btn-next ${isLastStep ? 'btn-submit' : ''}"
        onclick="this.getRootNode().host.handleNextStep()"
        ${nextButtonDisabled ? 'disabled' : ''}
        aria-disabled="${nextButtonDisabled}"
        aria-label="${nextButtonDisabled ? 
          (isFormValid ? 'Please wait' : 'Please fix form errors before continuing') : 
          (isLastStep ? 'Submit form' : 'Go to next step')}"
      >
        ${isLoading ? `
          <span class="spinner" aria-hidden="true">
            <!-- Loading indicator SVG -->
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="4" opacity="0.25" />
              <circle 
                cx="12" 
                cy="12" 
                r="10" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="4" 
                stroke-dasharray="30 100" 
                style="animation: spin 1s linear infinite" 
              />
            </svg>
            <style>
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
              
              @media (prefers-reduced-motion: reduce) {
                .spinner svg circle {
                  animation: none !important;
                }
              }
            </style>
          </span>
          <span aria-live="polite">${loadingText}</span>
        ` : `${nextButtonText}${isLastStep ? '' : ' <span aria-hidden="true">→</span>'}`}
      </button>
    </div>
  `;
}
