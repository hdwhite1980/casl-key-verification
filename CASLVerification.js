// src/components/CASLVerification.js
import { getStyles } from './styles.js';
import { renderProgressSteps } from './progressSteps.js';
import { renderAlerts, renderTrustPreview, renderScreenReaderAnnouncement } from './alerts.js';
import { renderNavigationButtons } from './navigationButtons.js';
import { renderUserIdentification } from './userIdentification.js';
import { renderBookingInfo } from './bookingInfo.js';
import { renderStayIntent } from './stayIntent.js';
import { renderAgreement } from './agreement.js';
import { renderResults } from './resultsView.js';

import { 
  validateUserIdentification, 
  validateBookingInfo, 
  validateStayIntent, 
  validateAgreement,
  isStepValid
} from './validation.js';

import { stateManager } from './StateManager.js';
import { eventManager } from './eventManager.js';
import { errorHandler } from './errorHandler.js';
import { configManager } from './configManager.js';
import { accessibilityHelper } from './accessibilityHelper.js';
import { formHelper } from './formHelper.js';
import { accessibilityMessages } from './accessibilityMessages.js';

import { apiService } from './api.js';
import { apiSecurity } from './apiSecurity.js';
import { i18nService, t } from './i18n.js';
import { governmentIdVerification } from './governmentIdVerification.js';
import { phoneVerification } from './phoneVerification.js';
import { socialVerification } from './socialVerification.js';
import { backgroundCheckService } from './backgroundCheck.js';

import {
  calculateScore,
  getTrustLevel,
  getResultMessage,
  generateHostSummary
} from './scoreCalculator.js';

import {
  renderVerificationMethodSelector,
  renderVerificationMethod,
  getVerificationBonus
} from './verificationMethods.js';

import { VERIFICATION_STATUSES, FORM_STEPS } from './constants.js';

/**
 * Performance monitoring utility
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.thresholds = {
      render: 50, // ms
      api: 1000,  // ms
      memory: 50  // MB
    };
    
    // Initialize memory monitoring if available
    this.supportsMemoryAPI = !!(
      performance && 
      performance.memory && 
      performance.memory.usedJSHeapSize
    );
  }
  
  /**
   * Start timing an operation
   * @param {string} operation - Name of operation to time
   */
  startTimer(operation) {
    if (!this.metrics[operation]) {
      this.metrics[operation] = {};
    }
    this.metrics[operation].startTime = performance.now();
  }
  
  /**
   * End timing an operation
   * @param {string} operation - Name of operation to time
   * @returns {number} Duration in milliseconds
   */
  endTimer(operation) {
    if (this.metrics[operation]?.startTime) {
      const duration = performance.now() - this.metrics[operation].startTime;
      
      // Store statistics
      if (!this.metrics[operation].durations) {
        this.metrics[operation].durations = [];
        this.metrics[operation].total = 0;
        this.metrics[operation].count = 0;
      }
      
      this.metrics[operation].durations.push(duration);
      this.metrics[operation].total += duration;
      this.metrics[operation].count++;
      
      // Cap stored durations
      if (this.metrics[operation].durations.length > 100) {
        const oldestValue = this.metrics[operation].durations.shift();
        this.metrics[operation].total -= oldestValue;
        this.metrics[operation].count--;
      }
      
      // Check if this exceeds threshold
      const threshold = this.thresholds[operation] || 100;
      if (duration > threshold) {
        console.warn(`Performance warning: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
      
      return duration;
    }
    return 0;
  }
  
  /**
   * Measure memory usage
   * @returns {Object|null} Memory info or null if not supported
   */
  checkMemoryUsage() {
    if (this.supportsMemoryAPI) {
      const memory = {
        total: performance.memory.totalJSHeapSize / (1024 * 1024),
        used: performance.memory.usedJSHeapSize / (1024 * 1024),
        limit: performance.memory.jsHeapSizeLimit / (1024 * 1024)
      };
      
      // Check for high memory usage
      if (memory.used > this.thresholds.memory) {
        console.warn(`Memory usage warning: ${memory.used.toFixed(2)}MB used (threshold: ${this.thresholds.memory}MB)`);
      }
      
      return memory;
    }
    return null;
  }
  
  /**
   * Get all metrics for debugging
   * @returns {Object} All collected metrics
   */
  getAllMetrics() {
    const result = {};
    
    // Calculate averages for all operations
    Object.keys(this.metrics).forEach(op => {
      if (this.metrics[op].count) {
        result[op] = {
          average: this.metrics[op].total / this.metrics[op].count,
          count: this.metrics[op].count,
          max: Math.max(...(this.metrics[op].durations || [0])),
          latest: this.metrics[op].durations?.slice(-1)[0] || 0
        };
      }
    });
    
    // Add memory if available
    const memory = this.checkMemoryUsage();
    if (memory) {
      result.memory = memory;
    }
    
    return result;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

/**
 * Enhanced CASL Key Verification component with comprehensive accessibility features
 * Optimized for production performance
 */
export class CASLVerification extends HTMLElement {
  /**
   * Constructor initializes the component
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // ✅ Initialize state FIRST (including formData)
    this.currentStep = 0;
    this.formData = {
      name: '',           // ← Make sure this is a string, not undefined
      email: '',
      phone: '',
      address: '',
      platform: '',
      listingLink: '',
      checkInDate: '',
      checkOutDate: '',
      stayPurpose: '',
      totalGuests: 1,
      travelingNearHome: false,
      usedSTRBefore: false,
      agreeToRules: false,
      agreeNoParties: false,
      understandFlagging: false,
      consentToBackgroundCheck: false,
      currentStep: 0
    };
    this.errors = {};
    
    // Initialize other component state
    this.showScreenshotUpload = false;
    this.screenshotData = null;
    this.verificationStatus = VERIFICATION_STATUSES.NOT_SUBMITTED;
    this.showRestoredMessage = false;
    this.showVerificationMethods = false;
    this.selectedVerificationMethod = null;
    this.userIdentification = {};
    this.isLoading = false;
    this.apiError = null;
    this.submitted = false;
    this.score = 0;
    this.trustLevel = null;
    this.message = '';
    this.adjustments = [];
    this.trustPreview = null;
    
    // Track render count for performance monitoring
    this._renderCount = 0;
    this._validationTimer = null;
    this._verificationPollInterval = null;
    this._prevRenderState = null;
    this._trustPreviewCache = {};
    
    // Initialize component ID for event handling
    this.componentId = eventManager.initComponent(this);
    
    // Create live region for accessibility announcements
    this.liveRegion = accessibilityHelper.createLiveRegion('polite', 'verification-status');
    
    // Track first render for initial instructions
    this.firstRender = true;
    
    // Track UX metrics
    this.uxMetrics = {
      formStarted: false,
      stepsCompleted: new Set(),
      startTime: performance.now()
    };
    
    // ✅ THEN initialize services (which might call validation)
    this.initializeServices();
    
    // Initialize state by subscribing to state manager
    this.initializeState();
    
    // ✅ Finally render and setup
    this.render();
    this.setupEventListeners();
    
    // Add skip link for keyboard users
    this.addSkipLink();
    
    // Enable debug mode in development or with debug parameter
    if (process.env.NODE_ENV === 'development' || 
        window.location.search.includes('debug=true')) {
      this.enableDebugMode();
    }
  }
  
  /**
   * Initialize component state with optimized state subscriptions
   */
  initializeState() {
    // Subscribe to global state sections with optimized update handling
    this.unsubscribeHandlers = [];
    
    // Subscribe to form data state
    this.unsubscribeHandlers.push(
      stateManager.subscribe('formData', state => {
        const prevFormData = this.formData;
        this.formData = { ...this.formData, ...state }; // Merge with defaults
        
        // Only validate if important data has changed
        const fieldsChanged = this.hasImportantFieldsChanged(prevFormData, this.formData);
        if (fieldsChanged) {
          this.validateForm();
          // Save form data with debounce
          this.debounceSaveFormData();
        }
        
        this.render();
      })
    );
    
    // Subscribe to verification state
    this.unsubscribeHandlers.push(
      stateManager.subscribe('verification', state => {
        this.userIdentification = state || {};
        this.validateForm();
        this.render();
      })
    );
    
    // Subscribe to UI state
    this.unsubscribeHandlers.push(
      stateManager.subscribe('ui', state => {
        // Only update if loading or alert status changed
        if (this.isLoading !== state.loading || this.apiError !== state.alert) {
          this.isLoading = state.loading;
          this.apiError = state.alert;
          this.render();
        }
      })
    );
    
    // Subscribe to results state
    this.unsubscribeHandlers.push(
      stateManager.subscribe('results', state => {
        // Only update if submission status changed
        if (this.submitted !== state.isSubmitted) {
          this.submitted = state.isSubmitted;
          this.score = state.score;
          this.trustLevel = state.trustLevel;
          this.message = state.message;
          this.adjustments = state.adjustments;
          this.render();
        }
      })
    );
    
    // Get initial state from state manager and merge with defaults
    const initialFormData = stateManager.getState('formData');
    this.formData = { ...this.formData, ...initialFormData };
    this.currentStep = this.formData.currentStep || 0;
    
    // Get verification data
    this.userIdentification = stateManager.getState('verification') || {};
    
    // Get UI state
    const uiState = stateManager.getState('ui');
    this.isLoading = uiState.loading;
    this.apiError = uiState.alert;
    
    // Get results state
    const resultsState = stateManager.getState('results');
    this.submitted = resultsState.isSubmitted;
    this.score = resultsState.score;
    this.trustLevel = resultsState.trustLevel;
    this.message = resultsState.message;
    this.adjustments = resultsState.adjustments;
    
    // Get trust preview from storage
    this.loadTrustPreview();
  }
  
  /**
   * Compare two form data objects to see if important fields changed
   * @param {Object} oldData - Previous form data
   * @param {Object} newData - New form data
   * @returns {boolean} Whether important fields changed
   */
  hasImportantFieldsChanged(oldData, newData) {
    if (!oldData) return true;
    
    // Check if current step changed
    if (oldData.currentStep !== newData.currentStep) return true;
    
    // Only check fields for current step
    const fieldsToCheck = [];
    
    switch (this.currentStep) {
      case 0: // User Identification
        fieldsToCheck.push('name', 'email', 'phone', 'address', 'consentToBackgroundCheck');
        break;
      case 1: // Booking Info
        fieldsToCheck.push('platform', 'listingLink', 'checkInDate', 'checkOutDate');
        break;
      case 2: // Stay Intent
        fieldsToCheck.push('stayPurpose', 'totalGuests', 'travelingNearHome', 'usedSTRBefore');
        break;
      case 3: // Agreement
        fieldsToCheck.push('agreeToRules', 'agreeNoParties', 'understandFlagging');
        break;
    }
    
    // Check if any important field changed
    return fieldsToCheck.some(field => oldData[field] !== newData[field]);
  }
  
  /**
   * Check if render is necessary based on state changes
   * @returns {boolean} Whether render is needed
   */
  shouldUpdateRender() {
    // Store previous values to compare
    if (!this._prevRenderState) {
      this._prevRenderState = {};
    }
    
    // Key state values that affect rendering
    const currentState = {
      currentStep: this.currentStep,
      isLoading: this.isLoading,
      apiError: this.apiError !== null,
      submitted: this.submitted,
      showScreenshotUpload: this.showScreenshotUpload,
      verificationStatus: this.verificationStatus,
      errorCount: Object.keys(this.errors).length,
      showVerificationMethods: this.showVerificationMethods
    };
    
    // Simple deep comparison of previous and current state
    const shouldUpdate = !this._prevRenderState.currentState || 
      JSON.stringify(currentState) !== JSON.stringify(this._prevRenderState.currentState);
    
    // Store current state for next comparison
    this._prevRenderState.currentState = currentState;
    
    return shouldUpdate;
  }
  
  /**
   * Initialize services
   */
  async initializeServices() {
    performanceMonitor.startTimer('services_init');
    try {
      // Initialize API security
      await apiSecurity.initialize();
      
      // Initialize i18n service
      await i18nService.init();
      
      // Check for saved form data
      this.loadSavedData();
    } catch (error) {
      errorHandler.handleError(error);
    } finally {
      performanceMonitor.endTimer('services_init');
    }
  }
  
  /**
   * Debounced form data saving
   */
  debounceSaveFormData() {
    clearTimeout(this._saveFormDataTimer);
    this._saveFormDataTimer = setTimeout(() => {
      this.saveFormData();
    }, 300);
  }
  
  /**
   * When the element is added to the DOM
   */
  connectedCallback() {
    console.log('Enhanced CASL Verification Element connected');
    
    // Add live region to document
    document.body.appendChild(this.liveRegion);
  }
  
  /**
   * When the element is removed from the DOM
   */
  disconnectedCallback() {
    // Log performance before cleanup
    this.logPerformanceReport();
    
    // Remove state subscriptions
    this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    
    // Clean up event handling
    eventManager.cleanupComponent(this.componentId);
    
    // Clear any pending timers
    clearTimeout(this._validationTimer);
    clearTimeout(this._saveFormDataTimer);
    
    // Clear polling intervals if any are active
    if (this._verificationPollInterval) {
      clearInterval(this._verificationPollInterval);
      this._verificationPollInterval = null;
    }
    
    // Clear any other resources
    this.screenshotData = null;
    
    // Remove live region
    if (this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    
    // Force a garbage collection hint
    this._prevRenderState = null;
    this._trustPreviewCache = null;
  }
  
  /**
   * Add skip link for keyboard navigation
   */
  addSkipLink() {
    accessibilityHelper.addSkipLink('verification-main-content');
  }
  
  /**
   * Log performance report
   */
  logPerformanceReport() {
    const metrics = performanceMonitor.getAllMetrics();
    console.group('CASL Verification Performance Report');
    console.log('Render time (avg):', metrics.render?.average.toFixed(2) + 'ms');
    console.log('API calls (avg):', Object.keys(metrics)
      .filter(k => k.startsWith('api_'))
      .map(k => `${k}: ${metrics[k].average.toFixed(2)}ms`)
      .join(', '));
    console.log('Memory usage:', metrics.memory?.used.toFixed(2) + 'MB');
    console.log('Steps completed:', Array.from(this.uxMetrics.stepsCompleted).join(', '));
    console.log('Render count:', this._renderCount);
    console.groupEnd();
  }
  
  /**
   * Enable debug mode
   */
  enableDebugMode() {
    if (!window._CASLDebugTools) {
      window._CASLDebugTools = {
        // Get component state
        getState: () => ({
          formData: this.formData,
          userIdentification: this.userIdentification,
          currentStep: this.currentStep,
          errors: this.errors,
          verificationStatus: this.verificationStatus
        }),
        
        // Get performance metrics
        getPerformanceMetrics: () => performanceMonitor.getAllMetrics(),
        
        // Force render
        forceRender: () => this.render(),
        
        // Reset component
        reset: () => this.handleReset(),
        
        // Show component info
        info: () => console.table({
          componentId: this.componentId,
          renderCount: this._renderCount || 0,
          memoryUsage: performanceMonitor.checkMemoryUsage()?.used + 'MB',
          currentStep: this.currentStep,
          errorCount: Object.keys(this.errors).length
        })
      };
      
      console.info('CASL Debug Tools enabled. Access via window._CASLDebugTools');
    }
    
    return window._CASLDebugTools;
  }
  
  /**
   * Render the component with accessibility enhancements and performance optimizations
   */
  render() {
    // Skip re-render if nothing important changed
    if (!this.shouldUpdateRender()) {
      return;
    }
    
    // Increment render count for monitoring
    this._renderCount = (this._renderCount || 0) + 1;
    
    // Start performance timer
    performanceMonitor.startTimer('render');
    performance.mark('render_start');
    
    const content = this.submitted ? this.renderResults() : this.renderForm();
    
    let html = `
      <style>${getStyles()}</style>
      <div 
        class="container" 
        dir="${i18nService.getLanguageInfo(i18nService.currentLanguage)?.direction || 'ltr'}"
      >
        <div class="header">
          <h1 id="page-title">CASL Key Verification</h1>
          ${i18nService.renderLanguageSelector()}
        </div>
        
        <main id="verification-main-content" tabindex="-1">
          ${content}
        </main>
      </div>
    `;
    
    // Replace inline handlers with data attributes for event delegation
    html = eventManager.replaceInlineHandlers(html);
    
    // Enhance with accessibility attributes
    html = accessibilityHelper.enhanceHtml(html);
    
    this.shadowRoot.innerHTML = html;
    
    // Announce status changes to screen readers
    this.announceStatusChanges();
    
    // Set first render to false after first render
    if (this.firstRender) {
      this.firstRender = false;
    }
    
    // End performance timer
    performanceMonitor.endTimer('render');
    performance.mark('render_end');
    performance.measure('render', 'render_start', 'render_end');
    
    // Check memory usage periodically
    if (this._renderCount % 10 === 0) {
      performanceMonitor.checkMemoryUsage();
    }
  }
  
  /**
   * Render the form based on current step
   */
  renderForm() {
    // If additional verification methods are shown, render those
    if (this.showVerificationMethods) {
      return `
        ${renderAlerts(this.showRestoredMessage, this.apiError)}
        ${this.selectedVerificationMethod 
          ? renderVerificationMethod(this.selectedVerificationMethod, this.userIdentification.caslKeyId)
          : renderVerificationMethodSelector(this.userIdentification)}
        <div class="navigation-buttons">
          <button 
            data-event-click="toggleVerificationMethods"
            class="neutral"
            aria-label="Return to main form"
          >
            <span aria-hidden="true">←</span> Return to Main Form
          </button>
        </div>
      `;
    }
    
    // Otherwise render the main form steps
    return `
      ${renderProgressSteps(this.currentStep)}
      ${renderAlerts(this.showRestoredMessage, this.apiError)}
      ${this.renderCurrentStep()}
      ${this.trustPreview ? renderTrustPreview(this.trustPreview) : ''}
      ${renderNavigationButtons(this.currentStep, this.isFormValid, this.isLoading)}
    `;
  }
  
  /**
   * Render the current step content
   */
  renderCurrentStep() {
    switch(this.currentStep) {
      case 0:
        return renderUserIdentification(
          this.formData, 
          this.errors, 
          this.userIdentification, 
          this.showScreenshotUpload, 
          this.screenshotData, 
          this.verificationStatus
        );
      case 1:
        return renderBookingInfo(this.formData, this.errors);
      case 2:
        return renderStayIntent(this.formData, this.errors);
      case 3:
        return renderAgreement(this.formData, this.errors);
      default:
        return '';
    }
  }
  
  /**
   * Render verification results
   */
  renderResults() {
    return renderResults(
      this.userIdentification,
      this.trustLevel,
      this.score,
      this.message,
      this.adjustments
    );
  }
  
  /**
   * Announce status changes to screen readers
   */
  announceStatusChanges() {
    // On first render, announce instructions
    if (this.firstRender) {
      accessibilityHelper.announce(accessibilityMessages.formInstructions, 'polite');
      return;
    }

    if (this.isLoading) {
      const operation = this.currentStep === 0 ? 'verification status' : 
                      this.currentStep === 3 ? 'submission' : 'data';
      accessibilityHelper.announce(accessibilityMessages.loading(operation), 'polite');
    } else if (this.apiError) {
      accessibilityHelper.announce(this.apiError, 'assertive');
    } else if (this.submitted) {
      accessibilityHelper.announce(
        accessibilityMessages.submissionComplete(
          this.userIdentification.caslKeyId,
          this.score,
          this.trustLevel ? FORM_STEPS[this.trustLevel] : 'Unknown'
        ), 
        'polite'
      );
    } else if (this.errors && Object.keys(this.errors).length > 0) {
      accessibilityHelper.announce(
        accessibilityMessages.formError(Object.keys(this.errors).length),
        'assertive'
      );
    }
  }
  
  /**
   * Handle input changes with accessibility enhancements and debounced validation
   * @param {Event} event - Input change event
   */
  handleInputChange(event) {
    performance.mark('input_change_start');
    const { name, value, type, checked } = event.target;
    
    // Handle different input types
    const inputValue = type === 'checkbox' ? checked : value;
    
    // Create updated form data
    const updatedFormData = { ...this.formData };
    updatedFormData[name] = inputValue;
    
    // Extra logic for dependent fields
    if (name === 'stayPurpose' && value !== 'Other') {
      updatedFormData.otherPurpose = '';
    }
    
    if (name === 'travelingNearHome' && !checked) {
      updatedFormData.zipCode = '';
    }
    
    // Update global state
    stateManager.updateFormData(updatedFormData);
    
    // Debounce validation for text inputs
    if (type === 'text' || type === 'email' || type === 'tel' || type === 'url') {
      clearTimeout(this._validationTimer);
      this._validationTimer = setTimeout(() => {
        this.validateForm();
        this.render();
      }, 300); // 300ms debounce
    } else {
      // For checkboxes, selects, etc., validate immediately
      this.validateForm();
    }
    
    // If background check consent changes, we may need to update preview
    if (name === 'consentToBackgroundCheck' && checked) {
      this.updateTrustPreview();
      
      // Announce to screen readers
      accessibilityHelper.announce('Background check consent provided. This will be used for identity verification.', 'polite');
    }
    
    performance.mark('input_change_end');
    performance.measure('input_change', 'input_change_start', 'input_change_end');
  }
  
  /**
   * Handle language change
   * @param {Event} event - Language change event
   */
  handleLanguageChange(event) {
    const langCode = event.target.value;
    i18nService.changeLanguage(langCode);
    
    // Announce language change to screen readers
    const langInfo = i18nService.getLanguageInfo(langCode);
    if (langInfo) {
      accessibilityHelper.announce(`Language changed to ${langInfo.name}`, 'polite');
    }
  }
  
  /**
   * Toggle screenshot upload section
   * @param {boolean} show - Whether to show the screenshot upload section
   */
  toggleScreenshotUpload(show) {
    this.showScreenshotUpload = show;
    
    // Announce to screen readers
    if (show) {
      accessibilityHelper.announce('Screenshot upload section opened. You can upload a profile screenshot for verification.', 'polite');
    }
    
    this.render();
  }
  
  /**
   * Toggle verification methods section
   * @param {boolean} show - Whether to show verification methods
   */
  toggleVerificationMethods(show = false) {
    this.showVerificationMethods = show;
    this.selectedVerificationMethod = null;
    
    // Announce to screen readers
    if (show) {
      accessibilityHelper.announce('Additional verification methods available. Choose a method to continue.', 'polite');
    } else {
      accessibilityHelper.announce('Returning to main verification form.', 'polite');
    }
    
    this.render();
  }
  
  /**
   * Select a verification method
   * @param {string} method - Verification method to select
   */
  selectVerificationMethod(method) {
    // Reset verification services
    governmentIdVerification.reset();
    phoneVerification.reset();
    socialVerification.reset();
    
    // Set selected method
    this.selectedVerificationMethod = method;
    
    // Announce to screen readers
    accessibilityHelper.announce(`Selected ${method} verification method. Follow the instructions to complete verification.`, 'polite');
    
    // Update state and re-render
    this.render();
  }
  
  /**
   * Compress image before upload
   * @param {string} dataUrl - Image data URL
   * @param {number} maxWidth - Maximum width in pixels
   * @param {number} quality - JPEG quality (0-1)
   * @returns {Promise<string>} Compressed image data URL
   */
  async compressImage(dataUrl, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      // Skip compression for small images
      if (dataUrl.length < 100000) { // ~100KB
        resolve(dataUrl);
        return;
      }
      
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed JPEG
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      
      img.onerror = reject;
      img.src = dataUrl;
    });
  }
  
  /**
   * Handle screenshot upload with accessibility enhancements
   * @param {Event} event - File input change event
   */
  async handleScreenshotUpload(event) {
    performance.mark('screenshot_upload_start');
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Validate file type
      const allowedTypes = configManager.getAllowedImageTypes();
      if (!allowedTypes.includes(file.type)) {
        throw errorHandler.createValidationError(t('errors.invalidImageType'));
      }
      
      // Validate file size
      const maxSize = configManager.get('MAX_SCREENSHOT_SIZE');
      if (file.size > maxSize) {
        throw errorHandler.createValidationError(
          t('errors.imageTooLarge', { size: Math.floor(maxSize / (1024 * 1024)) })
        );
      }
      
      // Read the file as data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Compress image before storing
        try {
          const compressedImage = await this.compressImage(e.target.result);
          this.screenshotData = compressedImage;
          
          // Announce to screen readers
          accessibilityHelper.announce(accessibilityMessages.screenshotUploaded, 'polite');
          
          this.render();
        } catch (compressionError) {
          // Fallback to original if compression fails
          console.warn('Image compression failed, using original:', compressionError);
          this.screenshotData = e.target.result;
          this.render();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Error uploading screenshot: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    }
    
    performance.mark('screenshot_upload_end');
    performance.measure('screenshot_upload', 'screenshot_upload_start', 'screenshot_upload_end');
  }
  
  /**
   * Handle drag over event for screenshot drop zone
   * @param {Event} event - Drag over event
   */
  handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = this.shadowRoot.getElementById('screenshot-dropzone');
    if (dropzone) {
      dropzone.classList.add('drag-over');
      dropzone.setAttribute('aria-dropeffect', 'copy');
    }
  }
  
  /**
   * Handle drag leave event for screenshot drop zone
   * @param {Event} event - Drag leave event
   */
  handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    const dropzone = this.shadowRoot.getElementById('screenshot-dropzone');
    if (dropzone) {
      dropzone.classList.remove('drag-over');
      dropzone.setAttribute('aria-dropeffect', 'none');
    }
  }
  
  /**
   * Handle drop event for screenshot drop zone
   * @param {Event} event - Drop event
   */
  handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropzone = this.shadowRoot.getElementById('screenshot-dropzone');
    if (dropzone) {
      dropzone.classList.remove('drag-over');
      dropzone.setAttribute('aria-dropeffect', 'none');
    }
    
    const file = event.dataTransfer.files[0];
    if (!file) return;
    
    // Use the same upload handler for dropped files
    this.handleScreenshotUpload({ target: { files: [file] } });
  }
  
  /**
   * Clear uploaded screenshot
   */
  clearScreenshot() {
    this.screenshotData = null;
    
    // Announce to screen readers
    accessibilityHelper.announce(accessibilityMessages.screenshotRemoved, 'polite');
    
    this.render();
  }
  
  /**
   * Upload screenshot to API with performance monitoring
   * @returns {Promise<boolean>} Success status
   */
  async uploadScreenshot() {
    performance.mark('screenshot_api_start');
    performanceMonitor.startTimer('api_screenshot_upload');
    
    if (!this.screenshotData) {
      stateManager.showAlert(t('errors.noScreenshot'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.noScreenshot'), 'assertive');
      
      return false;
    }
    
    stateManager.setLoading(true);
    this.verificationStatus = VERIFICATION_STATUSES.PROCESSING;
    
    // Announce to screen readers
    accessibilityHelper.announce(accessibilityMessages.processingScreenshot, 'polite');
    
    this.render();
    
    try {
      // Generate a unique user ID if not exists
      const userId = this.userIdentification.caslKeyId || `user_${Date.now()}`;
      
      // Call API to upload screenshot
      const result = await apiService.uploadScreenshot(this.screenshotData, userId);
      
      // Start polling for verification status
      this.startVerificationStatusPolling(userId);
      
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Error uploading screenshot: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
      
      stateManager.setLoading(false);
      return false;
    } finally {
      performanceMonitor.endTimer('api_screenshot_upload');
      performance.mark('screenshot_api_end');
      performance.measure('screenshot_api', 'screenshot_api_start', 'screenshot_api_end');
    }
  }
  
  /**
   * Start polling for verification status
   * @param {string} userId - User ID for verification
   */
  startVerificationStatusPolling(userId) {
    // Clear any existing polling interval
    if (this._verificationPollInterval) {
      clearInterval(this._verificationPollInterval);
    }
    
    // Poll interval from config
    const pollInterval = configManager.get('VERIFICATION_POLL_INTERVAL', 3000);
    
    // Create interval for polling
    this._verificationPollInterval = setInterval(async () => {
      performanceMonitor.startTimer('api_status_check');
      try {
        const result = await apiService.checkVerificationStatus(userId);
        
        // Update the verification status
        this.verificationStatus = result.status;
        
        // If verification is complete (not processing), stop polling
        if (result.status !== VERIFICATION_STATUSES.PROCESSING) {
          clearInterval(this._verificationPollInterval);
          this._verificationPollInterval = null;
          stateManager.setLoading(false);
          
          // If verified, update user identification
          if (result.status === VERIFICATION_STATUSES.VERIFIED) {
            stateManager.setVerification({
              ...this.userIdentification,
              isVerified: true,
              verificationType: 'screenshot',
              platformData: result.verificationDetails || null
            });
            
            // Update trust preview
            this.updateTrustPreview();
            
            // Announce success to screen readers
            accessibilityHelper.announce(accessibilityMessages.verificationSuccess, 'polite');
          } else {
            // Announce failure or review status
            if (result.status === VERIFICATION_STATUSES.MANUAL_REVIEW) {
              accessibilityHelper.announce(t('accessibility.manualReviewRequired'), 'polite');
            } else {
              accessibilityHelper.announce(t('accessibility.verificationFailed'), 'assertive');
            }
          }
        }
      } catch (error) {
        errorHandler.handleError(error);
        clearInterval(this._verificationPollInterval);
        this._verificationPollInterval = null;
        stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
        
        // Announce error to screen readers
        accessibilityHelper.announce(`Error checking verification status: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
        
        stateManager.setLoading(false);
      } finally {
        performanceMonitor.endTimer('api_status_check');
      }
    }, pollInterval);
  }
  
  /**
   * Update the trust preview with caching
   */
  updateTrustPreview() {
    // Generate cache key from relevant form & user data
    const cacheKey = `${this.formData.travelingNearHome}_${this.formData.totalGuests}_${this.formData.usedSTRBefore}_${!!this.userIdentification.backgroundCheckStatus}`;
    
    // Return cached result if available
    if (this._trustPreviewCache && this._trustPreviewCache[cacheKey]) {
      this.trustPreview = this._trustPreviewCache[cacheKey];
      return;
    }
    
    // Calculate initial score based on current data
    const result = calculateScore(this.formData, this.userIdentification);
    const trustLevel = getTrustLevel(result.score);
    
    // Generate a host-facing summary
    const previewData = {
      caslKeyId: this.userIdentification.caslKeyId || 'Pending',
      trustLevel,
      scoreRange: result.score >= 85 ? '85-100' : 
                 result.score >= 70 ? '70-84' : 
                 result.score >= 50 ? '50-69' : 'Below 50',
      flags: {
        localBooking: this.formData.travelingNearHome || false,
        highGuestCount: this.formData.totalGuests > 5 || false,
        noSTRHistory: !this.formData.usedSTRBefore || false,
        lastMinuteBooking: false // Calculated elsewhere
      }
    };
    
    // Cache the result
    if (!this._trustPreviewCache) this._trustPreviewCache = {};
    this._trustPreviewCache[cacheKey] = previewData;
    
    // Save preview
    this.saveTrustPreview(previewData);
    this.trustPreview = previewData;
  }
  
  /**
   * Load trust preview from storage
   */
  loadTrustPreview() {
    try {
      const storageKey = `${configManager.get('STORAGE_PREFIX', 'casl_')}trust_preview`;
      const previewStr = localStorage.getItem(storageKey);
      
      if (previewStr) {
        this.trustPreview = JSON.parse(previewStr);
      }
      
      return this.trustPreview;
    } catch (error) {
      console.error('Error loading trust preview:', error);
      return null;
    }
  }
  
  /**
   * Save trust preview to storage
   * @param {Object} previewData - Trust preview data
   */
  saveTrustPreview(previewData) {
    try {
      const storageKey = `${configManager.get('STORAGE_PREFIX', 'casl_')}trust_preview`;
      localStorage.setItem(storageKey, JSON.stringify(previewData));
      this.trustPreview = previewData;
    } catch (error) {
      console.error('Error saving trust preview:', error);
    }
  }
  
  /**
   * Validate form based on current step with performance optimization
   */
  validateForm() {
    // ✅ Safety check - don't validate if formData isn't ready
    if (!this.formData || typeof this.formData.name !== 'string') {
      return;
    }
    
    performanceMonitor.startTimer('validation');
    let stepErrors = {};
    
    // Validate current step
    switch (this.currentStep) {
      case 0:
        stepErrors = validateUserIdentification(
          this.formData, 
          this.userIdentification, 
          this.verificationStatus
        );
        break;
      case 1:
        stepErrors = validateBookingInfo(this.formData);
        break;
      case 2:
        stepErrors = validateStayIntent(this.formData);
        break;
      case 3:
        stepErrors = validateAgreement(this.formData);
        break;
    }
    
    // Only update if errors changed
    if (JSON.stringify(this.errors) !== JSON.stringify(stepErrors)) {
      this.errors = stepErrors;
      this.isFormValid = isStepValid(stepErrors);
    }
    
    performanceMonitor.endTimer('validation');
  }
  
  /**
   * Handle next step button click with enhanced accessibility
   */
  async handleNextStep() {
    performance.mark('navigation_next_start');
    performanceMonitor.startTimer('next_step');
    
    if (!this.isFormValid) {
      // Announce errors to screen readers
      accessibilityHelper.announce(accessibilityMessages.formError(Object.keys(this.errors).length), 'assertive');
      
      // Focus the first input with an error
      this.focusFirstError();
      
      performanceMonitor.endTimer('next_step');
      return;
    }
    
    // Track UX metrics
    if (!this.uxMetrics.formStarted) {
      this.uxMetrics.formStarted = true;
    }
    
    // Track step completion (0-based index)
    if (!this.uxMetrics.stepsCompleted.has(this.currentStep)) {
      this.uxMetrics.stepsCompleted.add(this.currentStep);
      
      // Calculate time spent on this step
      const timeOnStep = performance.now() - (this.uxMetrics.lastStepTime || this.uxMetrics.startTime);
      console.info(`Step ${this.currentStep} completion time: ${timeOnStep.toFixed(2)}ms`);
    }
    
    // Update last step time
    this.uxMetrics.lastStepTime = performance.now();
    
    // Special handling for first step (user identification)
    if (this.currentStep === 0) {
      // If screenshot verification is shown and there's data, upload it first
      if (this.showScreenshotUpload && this.screenshotData && 
          this.verificationStatus !== VERIFICATION_STATUSES.VERIFIED && 
          this.verificationStatus !== VERIFICATION_STATUSES.MANUAL_REVIEW) {
        const uploadSuccess = await this.uploadScreenshot();
        if (!uploadSuccess) {
          performanceMonitor.endTimer('next_step');
          return;
        }
      }
      
      // Check user status
      const userVerified = await this.handleCheckUser();
      if (!userVerified) {
        performanceMonitor.endTimer('next_step');
        return;
      }
      
      // Handle background check if needed
      if (this.formData.consentToBackgroundCheck && 
          !this.userIdentification.backgroundCheckStatus) {
        await this.initiateBackgroundCheck();
      }
      
      // Update trust preview
      this.updateTrustPreview();
    }
    
    if (this.currentStep < FORM_STEPS.length - 1) {
      // Move to next step
      this.currentStep += 1;
      
      // Update form data state
      stateManager.updateFormData({
        ...this.formData,
        currentStep: this.currentStep
      });
      
      // Validate the new step
      this.validateForm();
      
      // Announce step change to screen readers
      accessibilityHelper.announce(
        accessibilityMessages.stepChange(this.currentStep + 1, FORM_STEPS.length),
        'polite'
      );
    } else {
      // Submit form
      this.handleSubmit();
    }
    
    performanceMonitor.endTimer('next_step');
    performance.mark('navigation_next_end');
    performance.measure('navigation_next', 'navigation_next_start', 'navigation_next_end');
  }
  
  /**
   * Focus the first input with an error
   */
  focusFirstError() {
    setTimeout(() => {
      const errorKeys = Object.keys(this.errors);
      if (errorKeys.length > 0) {
        const firstErrorKey = errorKeys[0];
        const errorField = this.shadowRoot.querySelector(`[name="${firstErrorKey}"]`);
        if (errorField) {
          errorField.focus();
        }
      }
    }, 100);
  }
  
  /**
   * Handle previous step button click with enhanced accessibility
   */
  handlePreviousStep() {
    performance.mark('navigation_prev_start');
    
    if (this.currentStep > 0) {
      this.currentStep -= 1;
      
      // Update form data state
      stateManager.updateFormData({
        ...this.formData,
        currentStep: this.currentStep
      });
      
      // Validate the new step
      this.validateForm();
      
      // Announce step change to screen readers
      accessibilityHelper.announce(
        accessibilityMessages.stepChange(this.currentStep + 1, FORM_STEPS.length),
        'polite'
      );
    }
    
    performance.mark('navigation_prev_end');
    performance.measure('navigation_prev', 'navigation_prev_start', 'navigation_prev_end');
  }
  
  /**
   * Check user verification with API
   * @returns {Promise<boolean>} Success status
   */
  async handleCheckUser() {
    performance.mark('api_user_check_start');
    performanceMonitor.startTimer('api_user_check');
    
    if (!this.formData.email) {
      stateManager.showAlert(t('errors.emailRequired'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.emailRequired'), 'assertive');
      
      return false;
    }
    
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce(accessibilityMessages.verifying, 'polite');
    
    try {
      const userData = {
        email: this.formData.email,
        name: this.formData.name,
        phone: this.formData.phone,
        address: this.formData.address
      };
      
      // Update verification state to checking
      stateManager.setVerification({
        ...this.userIdentification,
        isChecking: true,
        error: null
      });
      
      // Check user status with API
      const userIdentification = await apiService.checkUserStatus(userData);
      
      // Update with verification status from screenshot if we already verified them
      const isVerified = this.verificationStatus === VERIFICATION_STATUSES.VERIFIED || 
                         this.verificationStatus === VERIFICATION_STATUSES.MANUAL_REVIEW;
      
      if (isVerified && !userIdentification.isVerified) {
        userIdentification.isVerified = true;
        userIdentification.verificationType = 'screenshot';
      }
      
      // Update global state
      stateManager.setVerification({
        ...userIdentification,
        isChecking: false
      });
      
      // Announce to screen readers
      if (userIdentification.isExistingUser) {
        accessibilityHelper.announce(`Welcome back! We found your existing CASL Key ID: ${userIdentification.caslKeyId}`, 'polite');
      } else {
        accessibilityHelper.announce('User verification completed successfully.', 'polite');
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      
      // Update UI state with error
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Update verification state with error
      stateManager.setVerification({
        ...this.userIdentification,
        isChecking: false,
        error: error.message || t('errors.userCheckFailed')
      });
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Error checking user: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
      
      return false;
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_user_check');
      performance.mark('api_user_check_end');
      performance.measure('api_user_check', 'api_user_check_start', 'api_user_check_end');
    }
  }
  
  /**
   * Initiate background check if user consented
   */
  async initiateBackgroundCheck() {
    if (!this.formData.consentToBackgroundCheck) return;
    
    performance.mark('api_bg_check_start');
    performanceMonitor.startTimer('api_bg_check');
    
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce("Initiating background check. This may take a moment.", 'polite');
    
    try {
      const userData = {
        caslKeyId: this.userIdentification.caslKeyId,
        name: this.formData.name,
        email: this.formData.email,
        phone: this.formData.phone,
        address: this.formData.address
      };
      
      // Call background check service
      const result = await backgroundCheckService.initiateBackgroundCheck(userData);
      
      // Update user identification with background check status
      stateManager.setVerification({
        ...this.userIdentification,
        backgroundCheckStatus: result.passed ? 'passed' : 'failed',
        isVerified: this.userIdentification.isVerified || result.passed
      });
      
      // Announce result to screen readers
      if (result.passed) {
        accessibilityHelper.announce(accessibilityMessages.backgroundCheckComplete, 'polite');
      } else {
        accessibilityHelper.announce('Background check could not be completed. You may try another verification method.', 'assertive');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Background check error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_bg_check');
      performance.mark('api_bg_check_end');
      performance.measure('api_bg_check', 'api_bg_check_start', 'api_bg_check_end');
    }
  }
  
  /**
   * Handle Government ID verification
   * @param {Event} event - File input event
   */
  async handleIdImageUpload(event) {
    performanceMonitor.startTimer('id_image_upload');
    
    const file = event.target.files[0];
    if (!file) return;
    
    const success = await governmentIdVerification.uploadIdImage(file);
    if (!success) {
      stateManager.showAlert(governmentIdVerification.error);
      
      // Announce error to screen readers
      accessibilityHelper.announce(`ID upload error: ${governmentIdVerification.error}`, 'assertive');
    } else {
      // Announce success to screen readers
      accessibilityHelper.announce("ID image uploaded successfully.", 'polite');
    }
    
    performanceMonitor.endTimer('id_image_upload');
    this.render();
  }
  
  /**
   * Handle Selfie image upload
   * @param {Event} event - File input event
   */
  async handleSelfieImageUpload(event) {
    performanceMonitor.startTimer('selfie_image_upload');
    
    const file = event.target.files[0];
    if (!file) return;
    
    const success = await governmentIdVerification.uploadSelfieImage(file);
    if (!success) {
      stateManager.showAlert(governmentIdVerification.error);
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Selfie upload error: ${governmentIdVerification.error}`, 'assertive');
    } else {
      // Announce success to screen readers
      accessibilityHelper.announce("Selfie image uploaded successfully.", 'polite');
    }
    
    performanceMonitor.endTimer('selfie_image_upload');
    this.render();
  }
  
  /**
   * Clear ID image
   */
  clearIdImage() {
    governmentIdVerification.idImageData = null;
    
    // Announce to screen readers
    accessibilityHelper.announce("ID image removed.", 'polite');
    
    this.render();
  }
  
  /**
   * Clear selfie image
   */
  clearSelfieImage() {
    governmentIdVerification.selfieImageData = null;
    
    // Announce to screen readers
    accessibilityHelper.announce("Selfie image removed.", 'polite');
    
    this.render();
  }
  
  /**
   * Verify Government ID
   * @param {string} userId - User ID
   */
  async verifyGovId(userId) {
    performanceMonitor.startTimer('api_verify_gov_id');
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce(accessibilityMessages.verificationMethod.inProgress('government ID'), 'polite');
    
    try {
      const result = await governmentIdVerification.verifyId(userId);
      
      if (result && result.status === 'verified') {
        // Update user identification
        stateManager.setVerification({
          ...this.userIdentification,
          idVerificationData: {
            verified: true,
            method: 'government-id',
            timestamp: new Date().toISOString()
          }
        });
        
        // Update trust preview
        this.updateTrustPreview();
        
        // Announce success to screen readers
        accessibilityHelper.announce(accessibilityMessages.verificationMethod.success('government ID'), 'polite');
      } else {
        // Announce failure to screen readers
        accessibilityHelper.announce(accessibilityMessages.verificationMethod.failed('government ID'), 'assertive');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Government ID verification error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_verify_gov_id');
    }
  }
  
  /**
   * Request phone verification
   * @param {string} userId - User ID
   */
  async requestPhoneVerification(userId) {
    performanceMonitor.startTimer('api_request_phone_verification');
    
    const phoneInput = this.shadowRoot.getElementById('phone-input');
    if (!phoneInput) return;
    
    const phoneNumber = phoneInput.value;
    if (!phoneNumber) {
      stateManager.showAlert(t('errors.phoneRequired'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.phoneRequired'), 'assertive');
      
      return;
    }
    
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce("Sending verification code to your phone. Please wait.", 'polite');
    
    try {
      const success = await phoneVerification.requestVerificationCode(phoneNumber, userId);
      
      if (!success) {
        stateManager.showAlert(phoneVerification.error);
        
        // Announce error to screen readers
        accessibilityHelper.announce(`Phone verification error: ${phoneVerification.error}`, 'assertive');
      } else {
        // Announce to screen readers
        accessibilityHelper.announce("Verification code sent to your phone. Please check your messages.", 'polite');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Phone verification error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_request_phone_verification');
      this.render();
    }
  }
  
  /**
   * Verify phone code
   * @param {string} userId - User ID
   */
  async verifyPhoneCode(userId) {
    performanceMonitor.startTimer('api_verify_phone_code');
    
    const codeInput = this.shadowRoot.getElementById('verification-code');
    if (!codeInput) return;
    
    const code = codeInput.value;
    if (!code) {
      stateManager.showAlert(t('errors.codeRequired'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.codeRequired'), 'assertive');
      
      return;
    }
    
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce("Verifying code. Please wait.", 'polite');
    
    try {
      const result = await phoneVerification.verifyCode(code, userId);
      
      if (result && result.verified) {
        // Update user identification
        stateManager.setVerification({
          ...this.userIdentification,
          phoneVerificationData: {
            verified: true,
            phoneNumber: phoneVerification.phoneNumber,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update trust preview
        this.updateTrustPreview();
        
        // Announce success
        accessibilityHelper.announce(accessibilityMessages.verificationMethod.success('phone'), 'polite');
      } else if (phoneVerification.error) {
        stateManager.showAlert(phoneVerification.error);
        
        // Announce error to screen readers
        accessibilityHelper.announce(`Phone verification error: ${phoneVerification.error}`, 'assertive');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Phone verification error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_verify_phone_code');
      this.render();
    }
  }
  
  /**
   * Resend verification code
   * @param {string} userId - User ID
   */
  async resendVerificationCode(userId) {
    // Clear previous timer
    phoneVerification.clearTimer();
    
    // Announce to screen readers
    accessibilityHelper.announce("Resending verification code. Please wait.", 'polite');
    
    // Request new code
    await this.requestPhoneVerification(userId);
  }
  
  /**
   * Handle social platform change
   * @param {Event} event - Change event
   */
  handleSocialPlatformChange(event) {
    const platform = event.target.value;
    socialVerification.platform = platform;
    
    // Announce to screen readers
    if (platform) {
      accessibilityHelper.announce(`Selected platform: ${platform}`, 'polite');
    }
    
    this.render();
  }
  
  /**
   * Verify social profile
   * @param {string} userId - User ID
   */
  async verifySocialProfile(userId) {
    performanceMonitor.startTimer('api_verify_social_profile');
    
    const platformSelect = this.shadowRoot.getElementById('social-platform');
    const profileUrlInput = this.shadowRoot.getElementById('profile-url');
    
    if (!platformSelect || !profileUrlInput) return;
    
    const platform = platformSelect.value;
    const profileUrl = profileUrlInput.value;
    
    if (!platform) {
      stateManager.showAlert(t('errors.platformRequired'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.platformRequired'), 'assertive');
      
      return;
    }
    
    if (!profileUrl) {
      stateManager.showAlert(t('errors.profileUrlRequired'));
      
      // Announce error to screen readers
      accessibilityHelper.announce(t('errors.profileUrlRequired'), 'assertive');
      
      return;
    }
    
    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce(accessibilityMessages.verificationMethod.inProgress('social media'), 'polite');
    
    try {
      const result = await socialVerification.verifySocialProfile(platform, profileUrl, userId);
      
      if (result && result.status === 'verified') {
        // Update user identification
        stateManager.setVerification({
          ...this.userIdentification,
          socialVerificationData: {
            verified: true,
            platform,
            profileUrl,
            timestamp: new Date().toISOString()
          }
        });
        
        // Update trust preview
        this.updateTrustPreview();
        
        // Announce success
        accessibilityHelper.announce(accessibilityMessages.verificationMethod.success('social media'), 'polite');
      } else if (socialVerification.error) {
        stateManager.showAlert(socialVerification.error);
        
        // Announce error to screen readers
        accessibilityHelper.announce(`Social verification error: ${socialVerification.error}`, 'assertive');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Social verification error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('api_verify_social_profile');
      this.render();
    }
  }
  
  /**
   * Handle form submission with enhanced accessibility and performance monitoring
   */
  async handleSubmit() {
    performance.mark('form_submit_start');
    performanceMonitor.startTimer('form_submission');
    performanceMonitor.checkMemoryUsage(); // Check memory before submission
    
    if (!this.isFormValid) {
      // Announce errors to screen readers
      accessibilityHelper.announce(accessibilityMessages.formError(Object.keys(this.errors).length), 'assertive');
      
      performanceMonitor.endTimer('form_submission');
      return;
    }

    stateManager.setLoading(true);
    
    // Announce to screen readers
    accessibilityHelper.announce("Submitting verification information. Please wait.", 'polite');
    
    // Calculate total time for UX metrics
    const totalTime = (performance.now() - this.uxMetrics.startTime) / 1000;
    const completionRate = this.uxMetrics.stepsCompleted.size / FORM_STEPS.length;
    
    console.info('Form completion time:', totalTime.toFixed(2) + 's', 
                 'Completion rate:', completionRate);
    
    try {
      // Calculate score and get trust level results
      performanceMonitor.startTimer('score_calculation');
      const result = calculateScore(this.formData, this.userIdentification);
      const trustLevel = getTrustLevel(result.score);
      const message = getResultMessage(trustLevel);
      performanceMonitor.endTimer('score_calculation');
      
      // Update results state
      stateManager.setResults({
        score: result.score,
        trustLevel,
        message,
        adjustments: result.adjustments,
        isSubmitted: false // Will be set to true after API call
      });
      
      // Prepare verification data for API submission
      const verificationData = {
        caslKeyId: this.userIdentification.caslKeyId,
        user: {
          name: this.formData.name,
          email: this.formData.email,
          phone: this.formData.phone,
          address: this.formData.address
        },
        verification: {
          score: result.score,
          trustLevel: trustLevel,
          verificationType: this.userIdentification.verificationType,
          backgroundCheckStatus: this.userIdentification.backgroundCheckStatus,
          idVerificationStatus: this.userIdentification.idVerificationData?.verified || false,
          phoneVerificationStatus: this.userIdentification.phoneVerificationData?.verified || false,
          socialVerificationStatus: this.userIdentification.socialVerificationData?.verified || false,
          adjustments: result.adjustments,
          verificationDate: new Date().toISOString()
        },
        booking: {
          platform: this.formData.platform,
          listingLink: this.formData.listingLink,
          checkInDate: this.formData.checkInDate,
          checkOutDate: this.formData.checkOutDate
        },
        stayDetails: {
          purpose: this.formData.stayPurpose,
          totalGuests: this.formData.totalGuests,
          childrenUnder12: this.formData.childrenUnder12,
          nonOvernightGuests: this.formData.nonOvernightGuests,
          travelingNearHome: this.formData.travelingNearHome,
          zipCode: this.formData.zipCode,
          previousExperience: this.formData.usedSTRBefore,
          previousStayLinks: this.formData.previousStayLinks
        }
      };
      
      // Generate host summary
      performanceMonitor.startTimer('host_summary');
      const hostSummary = generateHostSummary(verificationData);
      performanceMonitor.endTimer('host_summary');
      
      // Submit verification data to API
      performanceMonitor.startTimer('api_submit_verification');
      await apiService.submitVerification({
        ...verificationData,
        hostSummary
      });
      performanceMonitor.endTimer('api_submit_verification');
      
      // Mark as submitted
      stateManager.setResults({
        score: result.score,
        trustLevel,
        message,
        adjustments: result.adjustments,
        isSubmitted: true,
        hostSummary
      });
      
      // Clear saved form data
      this.clearSavedData();
      
      // Announce completion to screen readers
      accessibilityHelper.announce(
        accessibilityMessages.submissionComplete(
          this.userIdentification.caslKeyId,
          result.score,
          trustLevel ? FORM_STEPS[trustLevel] : 'Unknown'
        ), 
        'polite'
      );
      
      // Dispatch event for external listeners
      const event = new CustomEvent('verificationComplete', {
        detail: {
          caslKeyId: this.userIdentification.caslKeyId,
          score: result.score,
          trustLevel,
          verificationData,
          hostSummary
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      // Announce error to screen readers
      accessibilityHelper.announce(`Submission error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
      performanceMonitor.endTimer('form_submission');
      performance.mark('form_submit_end');
      performance.measure('form_submission', 'form_submit_start', 'form_submit_end');
      performanceMonitor.checkMemoryUsage(); // Check memory after submission
    }
  }
  
  /**
   * Print verification results
   */
  printResults() {
    performanceMonitor.startTimer('print_results');
    
    // Create a printable version of the verification
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      stateManager.showAlert('Please allow pop-ups to print verification');
      
      // Announce error to screen readers
      accessibilityHelper.announce("Print failed. Please allow pop-ups in your browser.", 'assertive');
      
      performanceMonitor.endTimer('print_results');
      return;
    }
    
    // Format verification data for printing
    const verification = {
      caslKeyId: this.userIdentification.caslKeyId,
      score: this.score,
      trustLevel: this.trustLevel,
      message: this.message,
      adjustments: this.adjustments,
      verificationDate: new Date().toISOString()
    };
    
    const formattedDate = new Date().toLocaleDateString();
    
    // Get display data for the trust level
    const trustLevelData = this.trustLevel ? FORM_STEPS[this.trustLevel] : 'Unknown';
    
    // Create print content with accessibility
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="${i18nService.currentLanguage}">
      <head>
        <title>CASL Key Verification - ${verification.caslKeyId}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 2cm;
            color: #333;
            line-height: 1.5;
          }
          
          h1, h2, h3, h4 {
            color: #2c3e50;
          }
          
          .header {
            text-align: center;
            margin-bottom: 2em;
            border-bottom: 1px solid #eee;
            padding-bottom: 1em;
          }
          
          .logo {
            font-size: 24px;
            font-weight: bold;
          }
          
          .verification-id {
            font-size: 18px;
            margin: 1em 0;
          }
          
          .verification-date {
            color: #7f8c8d;
          }
          
          .trust-badge {
            display: inline-block;
            padding: 0.5em 1em;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            margin: 1em 0;
            background-color: ${
              verification.trustLevel === 'verified' ? '#4CAF50' : 
              verification.trustLevel === 'review' ? '#FFC107' : 
              verification.trustLevel === 'manual_review' ? '#9E9E9E' : 
              '#757575'
            };
          }
          
          .score {
            font-size: 24px;
            margin: 1em 0;
          }
          
          .section {
            margin: 1.5em 0;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
          }
          
          th, td {
            padding: 0.5em;
            text-align: left;
            border-bottom: 1px solid #eee;
          }
          
          th {
            width: 30%;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 2em;
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
          }
          
          .verification-link {
            margin-top: 1em;
            font-size: 12px;
          }
          
          @media print {
            body {
              font-size: 12pt;
            }
            
            button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo" role="heading" aria-level="1">CASL Key Verification</div>
          <div class="verification-id">ID: ${verification.caslKeyId}</div>
          <div class="verification-date">Verified on ${formattedDate}</div>
        </div>
        
        <div class="section" role="region" aria-labelledby="trust-level-heading">
          <h2 id="trust-level-heading">Trust Level</h2>
          <div class="trust-badge">${trustLevelData}</div>
          <div class="score">
            <span class="score-number">${verification.score}</span>
            <span class="score-max">/100</span>
          </div>
          <p>${verification.message}</p>
        </div>
        
        <div class="section" role="region" aria-labelledby="verification-methods-heading">
          <h2 id="verification-methods-heading">Verification Methods</h2>
          <ul>
            ${this.userIdentification.verificationType ? 
              `<li>${this.userIdentification.verificationType} verification</li>` : ''}
            ${this.userIdentification.backgroundCheckStatus ? 
              `<li>Background check</li>` : ''}
            ${this.userIdentification.idVerificationData?.verified ? 
              `<li>Government ID verification</li>` : ''}
            ${this.userIdentification.phoneVerificationData?.verified ? 
              `<li>Phone verification</li>` : ''}
            ${this.userIdentification.socialVerificationData?.verified ? 
              `<li>Social media verification</li>` : ''}
          </ul>
        </div>
        
        <div class="section" role="region" aria-labelledby="score-factors-heading">
          <h2 id="score-factors-heading">Score Factors</h2>
          ${verification.adjustments && verification.adjustments.length > 0 ? `
            <ul>
              ${verification.adjustments.map(adj => `
                <li class="${adj.points > 0 ? 'positive' : 'negative'}">
                  ${adj.reason} (${adj.points > 0 ? '+' : ''}${adj.points})
                </li>
              `).join('')}
            </ul>
          ` : `
            <p>No score adjustments applied.</p>
          `}
        </div>
        
        <div class="footer">
          <p>This verification certificate was generated by CASL Key Verification System.</p>
          <p>© ${new Date().getFullYear()} CASL Key Verification</p>
          <div class="verification-link">
            Verify this certificate online at: https://casl-key.example.com/verify/${verification.caslKeyId}
          </div>
        </div>
        
        <script>
          // Auto-print
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Announce to screen readers
    accessibilityHelper.announce("Verification details opened in new window for printing.", 'polite');
    
    performanceMonitor.endTimer('print_results');
  }
  
  /**
   * Reset the form with enhanced accessibility and performance monitoring
   */
  handleReset() {
    performance.mark('form_reset_start');
    performanceMonitor.startTimer('form_reset');
    
    // Reset state
    stateManager.resetSection('formData');
    stateManager.resetSection('verification');
    stateManager.resetSection('results');
    stateManager.hideAlert();
    
    // Reset services
    governmentIdVerification.reset();
    phoneVerification.reset();
    socialVerification.reset();
    
    // Reset local state
    this.currentStep = 0;
    this.showScreenshotUpload = false;
    this.screenshotData = null;
    this.verificationStatus = VERIFICATION_STATUSES.NOT_SUBMITTED;
    this.showRestoredMessage = false;
    this.showVerificationMethods = false;
    this.selectedVerificationMethod = null;
    
    // Reset formData to defaults
    this.formData = {
      name: '',
      email: '',
      phone: '',
      address: '',
      platform: '',
      listingLink: '',
      checkInDate: '',
      checkOutDate: '',
      stayPurpose: '',
      totalGuests: 1,
      travelingNearHome: false,
      usedSTRBefore: false,
      agreeToRules: false,
      agreeNoParties: false,
      understandFlagging: false,
      consentToBackgroundCheck: false,
      currentStep: 0
    };
    
    // Reset trust preview
    this.trustPreview = null;
    localStorage.removeItem(`${configManager.get('STORAGE_PREFIX', 'casl_')}trust_preview`);
    
    // Clear saved data
    this.clearSavedData();
    
    // Reset caches
    this._trustPreviewCache = {};
    
    // Reset UX metrics
    this.uxMetrics = {
      formStarted: false,
      stepsCompleted: new Set(),
      startTime: performance.now()
    };
    
    // Validate form
    this.validateForm();
    
    // Announce reset to screen readers
    accessibilityHelper.announce(accessibilityMessages.resetForm, 'polite');
    
    // Force render
    this._prevRenderState = null;
    this.render();
    
    performanceMonitor.endTimer('form_reset');
    performance.mark('form_reset_end');
    performance.measure('form_reset', 'form_reset_start', 'form_reset_end');
  }
  
  /**
   * Save form data to storage with performance optimization
   */
  saveFormData() {
    if (this.submitted) return;
    
    performanceMonitor.startTimer('save_form_data');
    
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Save data
      const data = {
        formData: this.formData,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`${prefix}saved_form_data`, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving form data:', error);
    } finally {
      performanceMonitor.endTimer('save_form_data');
    }
  }
  
  /**
   * Load saved form data from storage
   */
  loadSavedData() {
    performanceMonitor.startTimer('load_saved_data');
    
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Get saved data
      const dataStr = localStorage.getItem(`${prefix}saved_form_data`);
      if (!dataStr) return;
      
      // Parse data
      const data = JSON.parse(dataStr);
      
      // Check if data is expired
      const maxAge = configManager.get('FORM_STATE_MAX_AGE', 24 * 60 * 60 * 1000); // 24 hours
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - timestamp > maxAge) {
        // Remove expired data
        localStorage.removeItem(`${prefix}saved_form_data`);
        return;
      }
      
      // Update state
      if (data.formData) {
        // Merge with defaults to ensure all fields are strings
        const mergedFormData = { ...this.formData, ...data.formData };
        
        // Update state manager
        stateManager.updateFormData({
          ...mergedFormData,
          currentStep: data.currentStep || 0
        });
        
        // Update local state
        this.currentStep = data.currentStep || 0;
        this.formData = mergedFormData;
        this.showRestoredMessage = true;
        
        // Auto-hide restored message after 5 seconds
        setTimeout(() => {
          this.showRestoredMessage = false;
          this.render();
        }, 5000);
        
        // Validate form
        this.validateForm();
        
        // Announce to screen readers
        accessibilityHelper.announce("Your previous form data has been restored.", 'polite');
      }
    } catch (error) {
      console.warn('Error loading saved form data:', error);
    } finally {
      performanceMonitor.endTimer('load_saved_data');
    }
  }
  
  /**
   * Clear saved data from storage
   */
  clearSavedData() {
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Remove saved data
      localStorage.removeItem(`${prefix}saved_form_data`);
      
      // Update UI
      this.showRestoredMessage = false;
      
      // Announce to screen readers
      accessibilityHelper.announce("Saved form data has been cleared.", 'polite');
    } catch (error) {
      console.warn('Error clearing saved data:', error);
    }
  }
  
  /**
   * Clear API error message
   */
  clearApiError() {
    stateManager.hideAlert();
    
    // Announce to screen readers
    accessibilityHelper.announce("Error message dismissed.", 'polite');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Register event handlers with event manager
    this.registerEventHandlers();
    
    // Listen for language changes
    document.addEventListener('caslLanguageChanged', () => {
      this.render();
      
      // Announce language change
      const langInfo = i18nService.getLanguageInfo(i18nService.currentLanguage);
      if (langInfo) {
        accessibilityHelper.announce(`Language changed to ${langInfo.name}`, 'polite');
      }
    });
    
    // Listen for phone verification timer expiration
    document.addEventListener('phoneVerificationTimerExpired', () => {
      this.render();
      
      // Announce to screen readers
      accessibilityHelper.announce("Verification code has expired. You can request a new code.", 'polite');
    });
    
    // Listen for reduced motion preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMediaQuery) {
      motionMediaQuery.addEventListener('change', () => {
        this.render(); // Re-render when preference changes
      });
    }
  }
  
  /**
   * Register event handlers with event manager
   */
  registerEventHandlers() {
    // Register input change handler
    eventManager.registerHandler(
      this.componentId,
      'handleInputChange',
      this.handleInputChange.bind(this)
    );
    
    // Register language change handler
    eventManager.registerHandler(
      this.componentId,
      'handleLanguageChange',
      this.handleLanguageChange.bind(this)
    );
    
    // Register navigation handlers
    eventManager.registerHandler(
      this.componentId,
      'handleNextStep',
      this.handleNextStep.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handlePreviousStep',
      this.handlePreviousStep.bind(this)
    );
    
    // Register screenshot upload handlers
    eventManager.registerHandler(
      this.componentId,
      'toggleScreenshotUpload',
      (_, target) => this.toggleScreenshotUpload(true)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handleScreenshotUpload',
      this.handleScreenshotUpload.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'clearScreenshot',
      this.clearScreenshot.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handleDragOver',
      this.handleDragOver.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handleDragLeave',
      this.handleDragLeave.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handleDrop',
      this.handleDrop.bind(this)
    );
    
    // Register verification methods handlers
    eventManager.registerHandler(
      this.componentId,
      'toggleVerificationMethods',
      (_, target) => this.toggleVerificationMethods(target?.getAttribute('data-show') === 'true')
    );
    
    eventManager.registerHandler(
      this.componentId,
      'selectVerificationMethod',
      (_, target) => this.selectVerificationMethod(target.getAttribute('data-method'))
    );
    
    // Register ID verification handlers
    eventManager.registerHandler(
      this.componentId,
      'handleIdImageUpload',
      this.handleIdImageUpload.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'handleSelfieImageUpload',
      this.handleSelfieImageUpload.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'clearIdImage',
      this.clearIdImage.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'clearSelfieImage',
      this.clearSelfieImage.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'verifyGovId',
      (_, target) => this.verifyGovId(target.getAttribute('data-user-id'))
    );
    
    // Register phone verification handlers
    eventManager.registerHandler(
      this.componentId,
      'requestPhoneVerification',
      (_, target) => this.requestPhoneVerification(target.getAttribute('data-user-id'))
    );
    
    eventManager.registerHandler(
      this.componentId,
      'verifyPhoneCode',
      (_, target) => this.verifyPhoneCode(target.getAttribute('data-user-id'))
    );
    
    eventManager.registerHandler(
      this.componentId,
      'resendVerificationCode',
      (_, target) => this.resendVerificationCode(target.getAttribute('data-user-id'))
    );
    
    // Register social verification handlers
    eventManager.registerHandler(
      this.componentId,
      'handleSocialPlatformChange',
      this.handleSocialPlatformChange.bind(this)
    );
    
    eventManager.registerHandler(
      this.componentId,
      'verifySocialProfile',
      (_, target) => this.verifySocialProfile(target.getAttribute('data-user-id'))
    );
    
    // Register print handler
    eventManager.registerHandler(
      this.componentId,
      'printResults',
      this.printResults.bind(this)
    );
    
    // Register reset handler
    eventManager.registerHandler(
      this.componentId,
      'handleReset',
      this.handleReset.bind(this)
    );
    
    // Register error clearing handler
    eventManager.registerHandler(
      this.componentId,
      'clearApiError',
      this.clearApiError.bind(this)
    );
  }
}

// Register the custom element
customElements.define('casl-verification', CASLVerification);