// src/utils/AccessibilityHelper.js

/**
 * Accessibility Helper utility
 * Provides accessibility enhancements for CASL Verification System
 */
class AccessibilityHelper {
  constructor() {
    // ARIA role descriptions
    this.ariaRoleDescriptions = {
      form: 'form',
      button: 'button',
      link: 'link',
      checkbox: 'checkbox',
      radio: 'radio',
      tab: 'tab',
      tabpanel: 'tabpanel',
      textbox: 'textbox',
      combobox: 'combobox',
      alert: 'alert',
      alertdialog: 'alertdialog',
      dialog: 'dialog',
      progressbar: 'progressbar',
      status: 'status',
      tooltip: 'tooltip',
      navigation: 'navigation',
      main: 'main',
      region: 'region'
    };
    
    // Common live regions configurations
    this.liveRegions = {
      polite: { 'aria-live': 'polite', 'aria-atomic': 'true' },
      assertive: { 'aria-live': 'assertive', 'aria-atomic': 'true' }
    };
    
    // Track focus trap elements
    this.focusTrapElements = new Set();
    
    // Initialize global keyboard navigation management
    this.initKeyboardNavigation();
  }
  
  /**
   * Set up global keyboard navigation
   */
  initKeyboardNavigation() {
    // Detect keyboard navigation
    let isUsingKeyboard = false;
    
    document.addEventListener('keydown', event => {
      // Tab key indicates keyboard navigation
      if (event.key === 'Tab') {
        isUsingKeyboard = true;
        document.body.classList.add('keyboard-navigation');
      }
      
      // Handle focus traps for modals
      if (event.key === 'Tab' && this.focusTrapElements.size > 0) {
        this.manageFocusTrap(event);
      }
      
      // Handle escape key for modals
      if (event.key === 'Escape' && this.focusTrapElements.size > 0) {
        // Find the most recently added focus trap
        const lastTrap = Array.from(this.focusTrapElements).pop();
        if (lastTrap && typeof lastTrap.onEscape === 'function') {
          lastTrap.onEscape(event);
        }
      }
    });
    
    // Reset keyboard navigation on mouse use
    document.addEventListener('mousedown', () => {
      isUsingKeyboard = false;
      document.body.classList.remove('keyboard-navigation');
    });
    
    // Add CSS for keyboard focus styles
    this.addFocusStyles();
  }
  
  /**
   * Add CSS for keyboard focus styles
   */
  addFocusStyles() {
    // Only add once
    if (document.getElementById('a11y-focus-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'a11y-focus-styles';
    style.textContent = `
      /* Base focus styles for all browsers */
      :focus {
        outline: 2px solid transparent;
        outline-offset: 2px;
      }
      
      /* Enhanced focus styles for keyboard navigation */
      .keyboard-navigation *:focus-visible,
      .keyboard-navigation *:focus {
        outline: 3px solid #4285F4 !important;
        outline-offset: 3px !important;
        border-radius: 3px;
        box-shadow: 0 0 0 2px white;
      }
      
      /* High contrast mode focus styles */
      @media (forced-colors: active) {
        .keyboard-navigation *:focus-visible,
        .keyboard-navigation *:focus {
          outline: 3px solid CanvasText !important; 
          outline-offset: 3px !important;
        }
      }
      
      /* Focus styles for form elements */
      .keyboard-navigation button:focus,
      .keyboard-navigation [role="button"]:focus,
      .keyboard-navigation a:focus,
      .keyboard-navigation input:focus,
      .keyboard-navigation select:focus,
      .keyboard-navigation textarea:focus {
        border-color: #4285F4 !important;
        box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.4) !important;
      }
      
      /* Enhanced focus styles for checkboxes and radios */
      .keyboard-navigation .checkbox-container input:focus + label,
      .keyboard-navigation input[type="checkbox"]:focus + label,
      .keyboard-navigation input[type="radio"]:focus + label {
        outline: 2px solid #4285F4 !important;
        outline-offset: 2px;
        border-radius: 2px;
      }
      
      /* Skip link styles */
      .skip-to-content {
        position: absolute;
        top: -5rem;
        left: 0;
        padding: 1rem;
        background: #4285F4;
        color: white;
        z-index: 100;
        opacity: 0;
        text-decoration: none;
        font-weight: bold;
        transition: top 0.2s;
      }
      
      .skip-to-content:focus {
        top: 0;
        opacity: 1;
      }
      
      @media (prefers-reduced-motion: reduce) {
        .skip-to-content {
          transition: none;
        }
        
        /* Remove all animations and transitions */
        *, *::before, *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.001ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
  
  /**
   * Enhance HTML with accessibility attributes
   * @param {string} html - HTML to enhance
   * @returns {string} Enhanced HTML
   */
  enhanceHtml(html) {
    // Add missing ARIA attributes to form elements
    html = this.enhanceFormElements(html);
    
    // Add missing roles
    html = this.enhanceRoles(html);
    
    // Add missing labels
    html = this.enhanceLabels(html);
    
    // Add autocomplete attributes to appropriate inputs
    html = this.enhanceAutocomplete(html);
    
    return html;
  }
  
  /**
   * Enhance form elements with accessibility attributes
   * @param {string} html - HTML to enhance
   * @returns {string} Enhanced HTML
   */
  enhanceFormElements(html) {
    // Add required aria-required attribute to required inputs
    html = html.replace(/<input([^>]*) required([^>]*)>/g, '<input$1 required$2 aria-required="true">');
    
    // Add aria-invalid to inputs with the error class
    html = html.replace(/<input([^>]*) class="([^"]*error[^"]*)"([^>]*)>/g, 
                      '<input$1 class="$2"$3 aria-invalid="true">');
    
    // Add aria-describedby for inputs that reference error messages
    html = html.replace(/aria-describedby="([^"]+)"/g, (match, id) => {
      // Check if id exists in the HTML
      if (html.includes(`id="${id}"`)) {
        return match;
      }
      return '';
    });
    
    return html;
  }
  
  /**
   * Enhance elements with appropriate ARIA roles
   * @param {string} html - HTML to enhance
   * @returns {string} Enhanced HTML
   */
  enhanceRoles(html) {
    // Add role="alert" to error messages
    html = html.replace(/<div([^>]*) class="([^"]*error[^"]*)"([^>]*)>/g, 
                      '<div$1 class="$2"$3 role="alert">');
    
    // Add role="status" to success messages
    html = html.replace(/<div([^>]*) class="([^"]*success[^"]*)"([^>]*)>/g, 
                      '<div$1 class="$2"$3 role="status">');
    
    return html;
  }
  
  /**
   * Enhance elements with appropriate labels
   * @param {string} html - HTML to enhance
   * @returns {string} Enhanced HTML
   */
  enhanceLabels(html) {
    // Add aria-label to buttons without text content
    html = html.replace(/<button([^>]*)>\s*<\/button>/g, (match, attrs) => {
      if (!attrs.includes('aria-label')) {
        return `<button${attrs} aria-label="Button"></button>`;
      }
      return match;
    });
    
    return html;
  }
  
  /**
   * Enhance inputs with appropriate autocomplete attributes
   * @param {string} html - HTML to enhance
   * @returns {string} Enhanced HTML
   */
  enhanceAutocomplete(html) {
    // Add autocomplete attribute to common input types
    const autocompleteRules = [
      { selector: 'name="name"', value: 'name' },
      { selector: 'name="email"', value: 'email' },
      { selector: 'name="phone"', value: 'tel' },
      { selector: 'name="address"', value: 'street-address' },
      { selector: 'name="zipCode"', value: 'postal-code' }
    ];
    
    autocompleteRules.forEach(rule => {
      const regex = new RegExp(`<input([^>]*) ${rule.selector}([^>]*)>`, 'g');
      html = html.replace(regex, (match, before, after) => {
        if (match.includes('autocomplete=')) {
          return match; // Already has autocomplete attribute
        }
        return `<input${before} ${rule.selector}${after} autocomplete="${rule.value}">`;
      });
    });
    
    return html;
  }
  
  /**
   * Check color contrast between two colors
   * @param {string} foreground - Foreground color (hex, rgb, or rgba)
   * @param {string} background - Background color (hex, rgb, or rgba)
   * @returns {Object|null} Contrast check result or null if invalid colors
   */
  checkColorContrast(foreground, background) {
    // Calculate relative luminance based on the WCAG formula
    const getLuminance = (color) => {
      // Parse color to RGB
      let r, g, b;
      
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        const len = hex.length;
        
        if (len === 3) {
          r = parseInt(hex[0] + hex[0], 16) / 255;
          g = parseInt(hex[1] + hex[1], 16) / 255;
          b = parseInt(hex[2] + hex[2], 16) / 255;
        } else if (len === 6) {
          r = parseInt(hex.substring(0, 2), 16) / 255;
          g = parseInt(hex.substring(2, 4), 16) / 255;
          b = parseInt(hex.substring(4, 6), 16) / 255;
        } else {
          return null; // Invalid hex color
        }
      } else if (color.startsWith('rgb')) {
        const match = color.match(/\d+/g);
        if (!match || match.length < 3) return null;
        
        [r, g, b] = match.map(c => parseInt(c, 10) / 255).slice(0, 3);
      } else {
        return null; // Unsupported color format
      }
      
      // Calculate luminance
      const toLinear = (c) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      r = toLinear(r);
      g = toLinear(g);
      b = toLinear(b);
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    // Get luminance values
    const luminance1 = getLuminance(foreground);
    const luminance2 = getLuminance(background);
    
    if (luminance1 === null || luminance2 === null) {
      return null;
    }
    
    // Calculate contrast ratio
    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);
    const contrastRatio = (brightest + 0.05) / (darkest + 0.05);
    
    return {
      ratio: contrastRatio,
      isLargeText: false,
      meetsAA: contrastRatio >= 4.5,
      meetsAALarge: contrastRatio >= 3,
      meetsAAA: contrastRatio >= 7,
      meetsAAALarge: contrastRatio >= 4.5
    };
  }
  
  /**
   * Create a focus trap for modal dialogs
   * @param {HTMLElement} element - Element to trap focus within
   * @param {Function} onEscape - Function to call when Escape is pressed
   * @returns {Object} Focus trap controller
   */
  createFocusTrap(element, onEscape) {
    // Get all focusable elements
    const focusableElements = this.getFocusableElements(element);
    
    if (focusableElements.length === 0) {
      console.warn('No focusable elements found for focus trap');
      return null;
    }
    
    // Store element's previous focus state
    const previouslyFocused = document.activeElement;
    
    // Focus the first element
    focusableElements[0].focus();
    
    // Create trap controller
    const trapController = {
      element,
      focusableElements,
      previouslyFocused,
      onEscape,
      
      // Release the focus trap
      release: () => {
        this.focusTrapElements.delete(trapController);
        
        // Restore focus
        if (previouslyFocused && previouslyFocused.focus) {
          previouslyFocused.focus();
        }
      }
    };
    
    // Add to active traps
    this.focusTrapElements.add(trapController);
    
    return trapController;
  }
  
  /**
   * Handle tab key navigation for focus traps
   * @param {KeyboardEvent} event - Keyboard event
   */
  manageFocusTrap(event) {
    // Get the most recently added trap
    const trapController = Array.from(this.focusTrapElements).pop();
    
    if (!trapController) return;
    
    const { element, focusableElements } = trapController;
    
    // Skip if event doesn't belong to the trapped element
    if (!element.contains(event.target)) return;
    
    // Handle tabbing
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey && document.activeElement === firstFocusable) {
      // Shift+Tab on first element - wrap to last
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      // Tab on last element - wrap to first
      event.preventDefault();
      firstFocusable.focus();
    }
  }
  
  /**
   * Get all focusable elements within a container
   * @param {HTMLElement} container - Container element
   * @returns {Array} Array of focusable elements
   */
  getFocusableElements(container) {
    // Find all potentially focusable elements
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(',');
    
    // Use querySelectorAll for shadow DOM
    if (container.shadowRoot) {
      return Array.from(container.shadowRoot.querySelectorAll(selector));
    }
    
    return Array.from(container.querySelectorAll(selector));
  }
  
  /**
   * Create a live region for announcing dynamic content
   * @param {string} type - Type of live region ('polite' or 'assertive')
   * @param {string} id - ID for the live region
   * @returns {HTMLElement} Live region element
   */
  createLiveRegion(type = 'polite', id = null) {
    const liveRegion = document.createElement('div');
    
    if (id) {
      liveRegion.id = id;
    } else {
      liveRegion.id = `live-region-${Date.now()}`;
    }
    
    // Set appropriate ARIA attributes
    liveRegion.setAttribute('aria-live', type);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('aria-relevant', 'additions text');
    
    // Hide visually but keep available to screen readers
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.margin = '-1px';
    liveRegion.style.padding = '0';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    
    return liveRegion;
  }
  
  /**
   * Announce a message to screen readers
   * @param {string} message - Message to announce
   * @param {string} type - Type of announcement ('polite' or 'assertive')
   */
  announce(message, type = 'polite') {
    // Create or get live region
    let liveRegion = document.getElementById(`a11y-live-${type}`);
    
    if (!liveRegion) {
      liveRegion = this.createLiveRegion(type, `a11y-live-${type}`);
      document.body.appendChild(liveRegion);
    }
    
    // Clear existing content
    liveRegion.textContent = '';
    
    // Set new content (after a small delay to ensure announcement)
    setTimeout(() => {
      liveRegion.textContent = message;
    }, 50);
  }
  
  /**
   * Add a skip link to the page
   * @param {string} targetId - ID of the main content
   * @returns {HTMLElement} The skip link element
   */
  addSkipLink(targetId = 'main-content') {
    // Check if skip link already exists
    let skipLink = document.querySelector('.skip-to-content');
    if (skipLink) {
      return skipLink;
    }
    
    // Create skip link
    skipLink = document.createElement('a');
    skipLink.href = `#${targetId}`;
    skipLink.className = 'skip-to-content';
    skipLink.textContent = 'Skip to main content';
    
    // Add to the beginning of the body
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    // Ensure target element has an ID and is focusable
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      if (!targetElement.getAttribute('tabindex')) {
        targetElement.setAttribute('tabindex', '-1');
      }
    } else {
      console.warn(`Skip link target #${targetId} not found`);
    }
    
    return skipLink;
  }
  
  /**
   * Check if an element is properly accessible
   * @param {HTMLElement} element - Element to check
   * @returns {Object} Accessibility issues
   */
  checkAccessibility(element) {
    const issues = [];
    
    // Check form controls for labels
    const formControls = element.querySelectorAll('input, select, textarea');
    formControls.forEach(control => {
      const id = control.id;
      if (!id) {
        issues.push({
          element: control,
          issue: 'Form control missing ID attribute'
        });
      } else {
        const label = element.querySelector(`label[for="${id}"]`);
        if (!label && !control.hasAttribute('aria-label') && !control.hasAttribute('aria-labelledby')) {
          issues.push({
            element: control,
            issue: 'Form control missing associated label'
          });
        }
      }
      
      // Check for autocomplete attribute on appropriate inputs
      const name = control.getAttribute('name');
      if (control.type === 'text' || control.type === 'email' || control.type === 'tel') {
        if (!control.hasAttribute('autocomplete') && name) {
          issues.push({
            element: control,
            issue: `Input field "${name}" missing autocomplete attribute`
          });
        }
      }
    });
    
    // Check images for alt text
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        issues.push({
          element: img,
          issue: 'Image missing alt attribute'
        });
      }
    });
    
    // Check buttons for accessible names
    const buttons = element.querySelectorAll('button, [role="button"]');
    buttons.forEach(button => {
      if (!button.textContent.trim() && 
          !button.hasAttribute('aria-label') && 
          !button.hasAttribute('aria-labelledby')) {
        issues.push({
          element: button,
          issue: 'Button missing accessible name'
        });
      }
    });
    
    // Check color contrast
    const contrastCheckElements = element.querySelectorAll('*:not(img):not(svg):not(canvas)');
    contrastCheckElements.forEach(el => {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      
      // Only check if bgColor is not transparent
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        const contrast = this.checkColorContrast(color, bgColor);
        if (contrast && !contrast.meetsAA) {
          issues.push({
            element: el,
            issue: `Insufficient color contrast ratio (${contrast.ratio.toFixed(2)}:1)`
          });
        }
      }
    });
    
    // Check for properly structured headings
    const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1), 10);
      
      // Check for skipped heading levels
      if (index > 0 && level > lastLevel + 1) {
        issues.push({
          element: heading,
          issue: `Heading level skipped from h${lastLevel} to h${level}`
        });
      }
      
      lastLevel = level;
    });
    
    return {
      element,
      issues,
      hasIssues: issues.length > 0
    };
  }
}

// Export singleton instance
export const accessibilityHelper = new AccessibilityHelper();
