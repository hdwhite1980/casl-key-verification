// src/components/common/ProgressSteps.js
import { FORM_STEPS } from './constants.js';

/**
 * Renders progress steps indicator with improved accessibility
 * @param {number} currentStep - Current step index
 * @returns {string} HTML string for progress steps
 */
export function renderProgressSteps(currentStep) {
  const progressPercentage = ((currentStep + 1) / FORM_STEPS.length) * 100;
  
  let stepsHtml = '';
  
  FORM_STEPS.forEach((step, index) => {
    const isActive = index === currentStep;
    const isCompleted = index < currentStep;
    const color = index <= currentStep ? 'var(--primary-color)' : '#999';
    const bgColor = isCompleted ? 'var(--primary-color)' : (isActive ? 'white' : '#ddd');
    const textColor = isCompleted ? 'white' : (isActive ? 'var(--primary-color)' : '#666');
    const borderStyle = isActive ? '2px solid var(--primary-color)' : 'none';
    
    // Enhanced aria attributes for better screen reader experience
    stepsHtml += `
      <div 
        class="step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
        style="color: ${color}" 
        role="tab" 
        id="step-${index}"
        aria-selected="${isActive ? 'true' : 'false'}" 
        aria-label="Step ${index + 1}: ${step} ${isCompleted ? '(completed)' : isActive ? '(current)' : ''}"
        aria-controls="step-content-${index}"
      >
        <div 
          class="step-indicator" 
          style="background-color: ${bgColor}; color: ${textColor}; border: ${borderStyle}"
          aria-hidden="true"
        >
          ${isCompleted ? '✓' : index + 1}
        </div>
        <span class="step-label">${step}</span>
      </div>
    `;
  });
  
  return `
    <div class="progress-container" role="navigation" aria-label="Form progress">
      <div 
        class="progress-steps" 
        role="tablist" 
        aria-orientation="horizontal"
      >
        ${stepsHtml}
      </div>
      
      <div 
        class="progress-bar" 
        role="progressbar" 
        aria-valuenow="${currentStep + 1}" 
        aria-valuemin="1" 
        aria-valuemax="${FORM_STEPS.length}"
        aria-valuetext="Step ${currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[currentStep]}"
      >
        <div 
          class="progress-indicator" 
          style="width: ${progressPercentage}%"
          aria-hidden="true"
        ></div>
      </div>
      
      <div class="sr-only">
        You are on step ${currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[currentStep]}
      </div>
    </div>
    
    <div 
      class="mobile-step-indicator" 
      style="text-align: center; margin-bottom: 20px; display: none"
      aria-hidden="true" 
    >
      <span style="font-weight: bold">Step ${currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[currentStep]}</span>
    </div>
  `;
}
