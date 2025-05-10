// src/components/common/Styles.js

/**
 * Returns CSS styles for the CASL Verification component
 * @returns {string} CSS styles as a string
 */
export function getStyles() {
  return `
    :host {
      display: block;
      font-family: Arial, sans-serif;
      
      /* Primary colors with contrast-safe text colors */
      --primary-color: #4285F4;
      --primary-color-dark: #1a5dd4;
      --on-primary-color: #ffffff;
      
      --success-color: #4CAF50;
      --on-success-color: #ffffff;
      
      --warning-color: #EC9F05; /* Darkened for better contrast */
      --on-warning-color: #000000;
      
      --error-color: #c62828;
      --on-error-color: #ffffff;
      
      --neutral-color: #5C5C5C; /* Darkened for better contrast */
      --on-neutral-color: #ffffff;
      
      --surface-color: #ffffff;
      --on-surface-color: #212121;
      
      --disabled-color: #9E9E9E;
      --on-disabled-color: #212121;
      
      --border-radius: 8px;
      --box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      --focus-ring-color: #4285F4;
      --focus-ring-width: 3px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .form-section {
      background-color: var(--surface-color);
      padding: 20px;
      border-radius: var(--border-radius);
      margin-bottom: 20px;
      box-shadow: var(--box-shadow);
    }
    
    button {
      padding: 10px 20px;
      background-color: var(--primary-color);
      color: var(--on-primary-color);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin: 5px;
      transition: background-color 0.2s, opacity 0.2s;
      min-height: 44px;
    }
    
    button:hover {
      background-color: var(--primary-color-dark);
    }
    
    button:focus {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 2px;
    }
    
    button:disabled {
      background-color: var(--disabled-color);
      color: var(--on-disabled-color);
      cursor: not-allowed;
    }
    
    button.success {
      background-color: var(--success-color);
      color: var(--on-success-color);
    }
    
    button.success:hover {
      background-color: #3d8b40;
    }
    
    button.warning {
      background-color: var(--warning-color);
      color: var(--on-warning-color);
    }
    
    button.warning:hover {
      background-color: #c78500;
    }
    
    button.neutral {
      background-color: var(--neutral-color);
      color: var(--on-neutral-color);
    }
    
    button.neutral:hover {
      background-color: #3d3d3d;
    }
    
    input, select, textarea {
      width: 100%;
      padding: 12px;
      margin-bottom: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 16px;
      transition: border-color 0.2s;
      min-height: 44px;
    }
    
    input:focus, select:focus, textarea:focus {
      border-color: var(--primary-color);
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: 0;
    }
    
    textarea {
      resize: vertical;
      min-height: 80px;
    }
    
    label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
    }
    
    .error {
      color: var(--error-color);
      font-size: 14px;
      margin-top: -5px;
      margin-bottom: 10px;
    }
    
    .navigation-buttons {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }
    
    .alert {
      padding: 12px 15px;
      border-radius: 4px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    .alert-success {
      background-color: #e8f5e9;
      color: #2e7d32;
      border-left: 4px solid var(--success-color);
    }
    
    .alert-error {
      background-color: #ffebee;
      color: var(--error-color);
      border-left: 4px solid var(--error-color);
    }
    
    .alert-info {
      background-color: #e3f2fd;
      color: #0d47a1;
      border-left: 4px solid var(--primary-color);
    }
    
    .alert-warning {
      background-color: #fff8e1;
      color: #f57f17;
      border-left: 4px solid var(--warning-color);
    }
    
    .progress-steps {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .step {
      text-align: center;
      position: relative;
      width: 25%;
    }
    
    .step-indicator {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 5px;
      z-index: 2;
      position: relative;
    }
    
    .progress-bar {
      height: 8px;
      background-color: #eee;
      border-radius: 4px;
      margin-bottom: 25px;
      position: relative;
      overflow: hidden;
    }
    
    .progress-indicator {
      position: absolute;
      left: 0;
      top: 0;
      height: 100%;
      background-color: var(--primary-color);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .screenshot-container {
      border: 2px dashed #ccc;
      padding: 20px;
      text-align: center;
      margin-bottom: 20px;
      border-radius: 4px;
      transition: border-color 0.2s;
      position: relative;
      min-height: 150px;
    }
    
    .screenshot-container:hover {
      border-color: var(--primary-color);
    }
    
    .screenshot-container.drag-over {
      background-color: #f0f7ff;
      border-color: var(--primary-color);
    }
    
    .screenshot-preview {
      max-width: 100%;
      max-height: 300px;
      margin-top: 10px;
      border-radius: 4px;
    }
    
   .file-input {
     position: absolute;
     width: 100%;
     height: 100%;
     top: 0;
     left: 0;
     opacity: 0;
     cursor: pointer;
   }
   
   .result-card {
     background-color: white;
     padding: 30px;
     border-radius: var(--border-radius);
     box-shadow: var(--box-shadow);
     text-align: center;
     margin-bottom: 20px;
   }
   
   .trust-badge {
     display: inline-block;
     padding: 10px 20px;
     border-radius: 4px;
     font-weight: bold;
     color: white;
     margin: 15px 0;
   }
   
   .score-display {
     margin: 20px 0;
   }
   
   .score-number {
     font-size: 48px;
     font-weight: bold;
   }
   
   .score-max {
     color: #666;
   }
   
   .result-message {
     padding: 15px;
     background-color: #f5f5f5;
     border-radius: 8px;
     font-size: 18px;
     margin: 20px 0;
   }
   
   .adjustments-list {
     margin-top: 30px;
     text-align: left;
   }
   
   .adjustment-item {
     display: flex;
     justify-content: space-between;
     padding: 10px;
     border-bottom: 1px solid #eee;
   }
   
   .adjustment-points {
     font-weight: bold;
   }
   
   .adjustment-positive {
     color: var(--success-color);
   }
   
   .adjustment-negative {
     color: var(--error-color);
   }
   
   .tooltip {
     position: relative;
     display: inline-block;
     margin-left: 5px;
     cursor: help;
   }
   
   .tooltip .tooltip-icon {
     background-color: #ddd;
     color: #333;
     width: 24px;
     height: 24px;
     border-radius: 50%;
     display: inline-flex;
     align-items: center;
     justify-content: center;
     font-size: 14px;
     font-weight: bold;
   }
   
   .tooltip .tooltip-text {
     visibility: hidden;
     width: 250px;
     background-color: #333;
     color: #fff;
     text-align: center;
     border-radius: 6px;
     padding: 8px;
     position: absolute;
     z-index: 1;
     bottom: 125%;
     left: 50%;
     transform: translateX(-50%);
     opacity: 0;
     transition: opacity 0.3s;
     font-size: 14px;
     font-weight: normal;
   }
   
   .tooltip:hover .tooltip-text {
     visibility: visible;
     opacity: 1;
   }
   
   .checkbox-container {
     display: flex;
     align-items: flex-start;
     margin-bottom: 10px;
     min-height: 44px;
   }
   
   .checkbox-container input[type="checkbox"] {
     width: auto;
     min-width: 24px;
     min-height: 24px;
     margin-right: 10px;
     margin-top: 3px;
   }
   
   .checkbox-label {
     font-weight: normal;
     flex: 1;
   }
   
   .trust-preview {
     background-color: #f5f5f5;
     border: 1px solid #ddd;
     border-radius: var(--border-radius);
     padding: 15px;
     margin-top: 20px;
   }
   
   .trust-preview h3 {
     margin-top: 0;
     font-size: 16px;
     color: #333;
   }
   
   .preview-badge {
     display: inline-block;
     padding: 6px 12px;
     border-radius: 4px;
     font-size: 14px;
     color: white;
     margin-right: 10px;
   }
   
   /* Mobile accessibility styles */
   @media (max-width: 768px) {
     .container {
       padding: 10px;
     }
     
     .form-section {
       padding: 15px;
     }
     
     .progress-steps {
       display: none;
     }
     
     .mobile-step-indicator {
       display: block !important;
       text-align: center;
       margin-bottom: 20px;
     }
     
     /* Ensure touch targets are at least 44x44px */
     button, 
     [role="button"], 
     a,
     .checkbox-container,
     input[type="checkbox"],
     input[type="radio"],
     input[type="submit"],
     select,
     .tooltip {
       min-height: 44px;
       min-width: 44px;
     }
     
     /* Improve touch target sizes on mobile */
     button {
       padding: 12px 20px;
       width: 100%;
       margin: 8px 0;
       font-size: 16px;
     }
     
     .navigation-buttons {
       flex-direction: column-reverse;
       gap: 10px;
     }
     
     /* Adjust form layouts for better touch interaction */
     .form-section {
       padding: 20px 16px;
     }
     
     /* Improve checkbox touch targets */
     .checkbox-container {
       padding: 8px 0;
       margin: 8px 0;
     }
     
     .checkbox-container input[type="checkbox"] {
       transform: scale(1.25);
       margin-right: 12px;
       margin-top: 6px;
     }
     
     /* Larger tap target for tooltip */
     .tooltip .tooltip-icon {
       width: 30px;
       height: 30px;
       font-size: 16px;
     }
     
     /* Adjust spacing between elements */
     label {
       margin-bottom: 8px;
       display: block;
     }
     
     input, select, textarea {
       padding: 14px;
       font-size: 16px; /* Prevents iOS zoom on focus */
       margin-bottom: 16px;
     }
     
     /* Improved error display */
     .error {
       padding: 8px 0;
       font-size: 14px;
     }
   }
   
   /* Reduced motion preferences */
   @media (prefers-reduced-motion: reduce) {
     /* Remove all animations and transitions */
     *, *::before, *::after {
       animation-duration: 0.001ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.001ms !important;
       scroll-behavior: auto !important;
     }
     
     /* Specific elements that need animation removal */
     .progress-indicator {
       transition: none !important;
     }
     
     .tooltip .tooltip-text {
       transition: none !important;
     }
     
     /* Replace animations with immediate state changes */
     .tooltip:hover .tooltip-text {
       visibility: visible;
       opacity: 1;
       transition: none !important;
     }
   }
   
   /* Focus styles and accessibility support */
   :focus-visible {
     outline: var(--focus-ring-width) solid var(--focus-ring-color);
     outline-offset: 2px;
     border-radius: 2px;
   }
   
   /* High contrast mode support */
   @media (forced-colors: active) {
     .progress-indicator {
       background-color: SelectedItem;
     }
     
     button {
       border: 1px solid ButtonText;
     }
     
     :focus-visible {
       outline: 3px solid CanvasText !important;
       outline-offset: 3px;
     }
   }
   
   /* Skip link for keyboard users */
   .skip-to-content {
     position: absolute;
     top: -5rem;
     left: 0;
     padding: 1rem;
     background: var(--primary-color);
     color: white;
     z-index: 100;
     opacity: 0;
     transition: top 0.2s, opacity 0.2s;
   }
   
   .skip-to-content:focus {
     top: 0;
     opacity: 1;
   }
   
   /* Screen reader only text */
   .sr-only {
     position: absolute;
     width: 1px;
     height: 1px;
     padding: 0;
     margin: -1px;
     overflow: hidden;
     clip: rect(0, 0, 0, 0);
     white-space: nowrap;
     border-width: 0;
   }
   
   /* Form validation visual cues */
   input:invalid,
   select:invalid,
   textarea:invalid {
     border-color: var(--error-color);
   }
   
   /* Required fields indicator */
   label.required::after {
     content: "*";
     color: var(--error-color);
     margin-left: 2px;
   }
 `;
}
