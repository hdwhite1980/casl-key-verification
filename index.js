// Frontend entry point for CASL Key Verification System
import { CASLApp } from './CASLApp.js';
import { Authentication } from './Authentication.js';
import { UserDashboard } from './UserDashboard.js';
import { userService } from './userService.js';

// Import accessibility helper if it exists
let accessibilityHelper = null;
try {
  const { accessibilityHelper: ah } = await import('./AccessibilityHelper.js');
  accessibilityHelper = ah;
} catch (error) {
  console.log('AccessibilityHelper not found, continuing without it');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing CASL Key Verification System...');
  
  // Initialize accessibility features if available
  if (accessibilityHelper) {
    try {
      accessibilityHelper.addSkipLink('main-content');
      
      // Set language attribute on html element
      document.documentElement.lang = document.documentElement.lang || 'en';
      
      // Check if high contrast mode is active
      if (window.matchMedia('(forced-colors: active)').matches) {
        document.body.classList.add('high-contrast-mode');
      }
      
      // Listen for reduced motion preference
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.body.classList.add('reduced-motion');
      }
      
      // Listen for preference changes
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        if (e.matches) {
          document.body.classList.add('reduced-motion');
        } else {
          document.body.classList.remove('reduced-motion');
        }
      });
    } catch (error) {
      console.warn('Accessibility features failed to initialize:', error);
    }
  }
  
  // Register custom elements (if not already registered)
  if (!customElements.get('casl-app')) {
    console.log('✅ CASL components registered');
  }
  
  console.log('✅ CASL Key Verification System initialized');
});

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  
  // Show user-friendly error message
  const errorDiv = document.getElementById('error-message');
  if (errorDiv) {
    errorDiv.textContent = 'An error occurred loading the application. Please refresh the page.';
    errorDiv.style.display = 'block';
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault(); // Prevent default browser error handling
<<<<<<< HEAD
});
=======
});
>>>>>>> be87dbfe8268f937616d3c36d0e17f84d9b6a6d6
