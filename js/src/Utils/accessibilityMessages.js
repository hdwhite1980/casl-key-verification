// src/utils/accessibilityMessages.js
import { FORM_STEPS } from './constants.js';

/**
 * Provides standardized accessibility messages for screen reader announcements
 */
export const accessibilityMessages = {
  // Form navigation
  stepChange: (step, totalSteps) => `Moving to step ${step} of ${totalSteps}: ${FORM_STEPS[step - 1]}`,
  
  formInstructions: "This form has multiple steps. Required fields are marked with an asterisk. Use the Next and Previous buttons to navigate between steps.",
  
  // Form validation
  formError: (count) => {
    if (count === 1) return "1 form field has an error. Please correct it before proceeding.";
    return `${count} form fields have errors. Please correct them before proceeding.`;
  },
  
  fieldError: (fieldName) => `${fieldName} field has an error that needs to be corrected.`,
  
  // Loading states
  loading: (operation) => `Loading ${operation || 'content'}. Please wait.`,
  processingScreenshot: "Processing your screenshot. This may take a minute.",
  verifying: "Verifying your information. Please wait.",
  
  // Success messages
  submissionComplete: (caslKeyId, score, level) => 
    `Verification complete! Your CASL Key ID is ${caslKeyId} with a trust score of ${score} out of 100. Trust level: ${level}.`,
  
  verificationSuccess: "Your account has been successfully verified!",
  
  backgroundCheckComplete: "Background check completed successfully.",
  
  // Method-specific messages
  verificationMethod: {
    success: (method) => `${method} verification successful! This will improve your trust score.`,
    failed: (method) => `${method} verification could not be completed. You can try again or use a different verification method.`,
    inProgress: (method) => `${method} verification in progress. Please wait.`
  },
  
  // Screenshot upload
  screenshotUploaded: "Screenshot uploaded successfully. Processing for verification.",
  screenshotRemoved: "Screenshot has been removed.",
  
  // Dialog announcements
  dialogOpened: (title) => `Dialog opened: ${title}`,
  dialogClosed: "Dialog closed",
  
  // Error recovery
  tryPrevious: "Try going back to the previous step to fix the issue.",
  tryAgain: "Please try again.",
  
  // Reset and navigation
  resetForm: "Form has been reset. Starting over.",
  returnToDashboard: "Returning to dashboard."
};
