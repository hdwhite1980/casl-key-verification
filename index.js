// src/index.js
import { CASLVerification } from './components/CASLVerification.js';
import { Authentication } from './components/Authentication.js';
import { UserDashboard } from './components/UserDashboard.js';
import { CASLApp } from './components/CASLApp.js';
import { accessibilityHelper } from './utils/AccessibilityHelper.js';

// Initialize accessibility features
document.addEventListener('DOMContentLoaded', () => {
  // Add skip link for keyboard navigation
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
  
  // Ensure body has a main element with an ID for skip link
  if (!document.getElementById('main-content')) {
    const mainElement = document.querySelector('main') || document.createElement('main');
    mainElement.id = 'main-content';
    mainElement.setAttribute('tabindex', '-1');
    
    if (!document.querySelector('main')) {
      // If there's no main element, wrap content in main
      const wrapper = document.createElement('div');
      Array.from(document.body.children).forEach(child => {
        if (child.tagName !== 'SCRIPT') {
          wrapper.appendChild(child);
        }
      });
      
      mainElement.appendChild(wrapper);
      document.body.appendChild(mainElement);
    }
  }
});

// Export all components
export { 
  CASLVerification,
  Authentication,
  UserDashboard,
  CASLApp
};

// Create documentation for usage
console.log(`
CASL Key Verification System v1.0.0

Usage Options:

1. Use all-in-one app component:
   <casl-app></casl-app>
   
   This component includes authentication, dashboard, and verification all in one.

2. Use individual components:

   a. For authentication alone:
      <casl-authentication></casl-authentication>
   
   b. For the user dashboard:
      <casl-user-dashboard></casl-user-dashboard>
   
   c. For the verification process:
      <casl-verification></casl-verification>

3. Listen for events:
   
   a. Authentication events:
      document.querySelector('casl-authentication').addEventListener('casl-auth', (event) => {
        console.log('Auth event:', event.detail);
      });
   
   b. Dashboard events:
      document.querySelector('casl-user-dashboard').addEventListener('casl-dashboard', (event) => {
        console.log('Dashboard event:', event.detail);
      });
   
   c. Verification events:
      document.querySelector('casl-verification').addEventListener('verificationComplete', (event) => {
        console.log('Verification completed:', event.detail);
      });

4. Accessibility Features:

   a. Keyboard Navigation:
      - Use Tab to navigate between interactive elements
      - Use Enter or Space to activate buttons and checkboxes
      - Use arrow keys for navigation within selects and radio groups
      - Press Escape to close dialogs or dismiss alerts
      - A skip link is available for keyboard users to bypass navigation
   
   b. Screen Reader Support:
      - All forms have proper labels and ARIA attributes
      - Live regions announce status changes
      - Error messages are properly associated with form controls
      - Progress steps have appropriate ARIA attributes
   
   c. Visual Accommodations:
      - Respects user's reduced motion preference
      - Supports high contrast mode
      - All interactive elements have visible focus indicators
      - Color combinations meet WCAG 2.1 AA contrast requirements
`);
