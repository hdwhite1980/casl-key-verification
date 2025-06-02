// Fixed CASLVerification.js - Constructor uses literal values to avoid import timing issues
import { getStyles } from './styles.js';
import { renderProgressSteps } from './ProgressSteps.js';
import { renderAlerts, renderTrustPreview, renderScreenReaderAnnouncement } from './alerts.js';
import { renderNavigationButtons } from './NavigationButtons.js';
import { renderUserIdentification } from './UserIdentification.js';
import { renderBookingInfo } from './BookingInfo.js';
import { renderStayIntent } from './StayIntent.js';
import { renderAgreement } from './Agreement.js';
import { renderResults } from './ResultsView.js';

import { 
  validateUserIdentification, 
  validateBookingInfo, 
  validateStayIntent, 
  validateAgreement,
  isStepValid
} from './validation.js';

import { stateManager } from './StateManager.js';
import { eventManager } from './EventManager.js';
import { errorHandler } from './ErrorHandler.js';
import { configManager } from './ConfigManager.js';
import { accessibilityHelper } from './AccessibilityHelper.js';
import { formHelper } from './FormHelper.js';
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
} from './VerificationMethods.js';

// ✅ REMOVED: import { VERIFICATION_STATUSES, FORM_STEPS } from './constants.js';

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
  
  startTimer(operation) {
    if (!this.metrics[operation]) {
      this.metrics[operation] = {};
    }
    this.metrics[operation].startTime = performance.now();
  }
  
  endTimer(operation) {
    if (this.metrics[operation]?.startTime) {
      const duration = performance.now() - this.metrics[operation].startTime;
      
      if (!this.metrics[operation].durations) {
        this.metrics[operation].durations = [];
        this.metrics[operation].total = 0;
        this.metrics[operation].count = 0;
      }
      
      this.metrics[operation].durations.push(duration);
      this.metrics[operation].total += duration;
      this.metrics[operation].count++;
      
      if (this.metrics[operation].durations.length > 100) {
        const oldestValue = this.metrics[operation].durations.shift();
        this.metrics[operation].total -= oldestValue;
        this.metrics[operation].count--;
      }
      
      const threshold = this.thresholds[operation] || 100;
      if (duration > threshold) {
        console.warn(`Performance warning: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`);
      }
      
      return duration;
    }
    return 0;
  }
  
  checkMemoryUsage() {
    if (this.supportsMemoryAPI) {
      const memory = {
        total: performance.memory.totalJSHeapSize / (1024 * 1024),
        used: performance.memory.usedJSHeapSize / (1024 * 1024),
        limit: performance.memory.jsHeapSizeLimit / (1024 * 1024)
      };
      
      if (memory.used > this.thresholds.memory) {
        console.warn(`Memory usage warning: ${memory.used.toFixed(2)}MB used (threshold: ${this.thresholds.memory}MB)`);
      }
      
      return memory;
    }
    return null;
  }
  
  getAllMetrics() {
    const result = {};
    
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
 * Enhanced CASL Key Verification component
 * FIXED: Constructor uses literal values instead of imported constants to avoid timing issues
 */
export class CASLVerification extends HTMLElement {
  /**
   * Constructor - FIXED: Uses only literal values, no imported constants
   * This prevents "NotSupportedError: A newly constructed custom element must not have attributes"
   */
  constructor() {
    super();
    
    // ✅ ONLY attach shadow root and basic properties with LITERAL values
    this.attachShadow({ mode: 'open' });
    
    // Initialize basic state properties - ALL LITERAL VALUES
    this.currentStep = 0;
    this.formData = {
      // Meta fields
      currentStep: 0,
      isValid: false,
      isDirty: false,
      lastSaved: null,
      
      // User Identification fields
      name: '',
      email: '',
      phone: '',
      address: '',
      
      // Platform profiles
      airbnbProfile: '',
      vrboProfile: '',
      otherPlatformProfile: '',
      
      // Booking Info fields
      platform: '',
      listingLink: '',
      checkInDate: '',
      checkOutDate: '',
      
      // Stay Intent fields
      stayPurpose: '',
      otherPurpose: '',
      totalGuests: 1,
      childrenUnder12: 0,
      nonOvernightGuests: 0,
      travelingNearHome: false,
      zipCode: '',
      usedSTRBefore: false,
      previousStayLinks: '',
      
      // Agreement fields
      agreeToRules: false,
      agreeNoParties: false,
      understandFlagging: false,
      consentToBackgroundCheck: false
    };
    
    // Component state - ALL LITERAL VALUES
    this.errors = {};
    this.showScreenshotUpload = false;
    this.screenshotData = null;
    this.verificationStatus = 'NOT_SUBMITTED'; // ✅ FIXED: Literal instead of VERIFICATION_STATUSES.NOT_SUBMITTED
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
    
    // Performance monitoring
    this._renderCount = 0;
    this._validationTimer = null;
    this._verificationPollInterval = null;
    this._prevRenderState = null;
    this._trustPreviewCache = {};
    
    // Component lifecycle
    this.firstRender = true;
    this.uxMetrics = {
      formStarted: false,
      stepsCompleted: new Set(),
      startTime: performance.now()
    };
    
    // Prevent multiple initialization
    this._initialized = false;
  }
  
  /**
   * Connected callback - ALL heavy initialization happens here
   * Called when element is added to DOM
   */
  connectedCallback() {
    console.log('Enhanced CASL Verification Element connected');
    
    // Prevent multiple initialization
    if (this._initialized) return;
    this._initialized = true;
    
    try {
      // Initialize component ID for event handling
      this.componentId = eventManager.initComponent(this);
      
      // Create live region for accessibility announcements
      this.liveRegion = accessibilityHelper.createLiveRegion('polite', 'verification-status');
      document.body.appendChild(this.liveRegion);
      
      // Initialize services
      this.initializeServices();
      
      // Initialize state manager subscriptions
      this.initializeState();
      
      // Setup event listeners - ✅ CRITICAL: This sets up shadow root event delegation
      this.setupEventListeners();
      
      // Add skip link for keyboard users
      this.addSkipLink();
      
      // Enable debug mode in development
      if (process.env.NODE_ENV === 'development' || 
          window.location.search.includes('debug=true')) {
        this.enableDebugMode();
      }
      
      // Finally render the component
      this.render();
      
    } catch (error) {
      console.error('Error initializing CASL Verification:', error);
      errorHandler.handleError(error);
      
      // Fallback render
      this.shadowRoot.innerHTML = `
        <div style="padding: 20px; color: red; border: 1px solid red; font-family: Arial, sans-serif;">
          <h2>CASL Verification Error</h2>
          <p>Failed to initialize component: ${error.message}</p>
          <details>
            <summary>Error Details</summary>
            <pre>${error.stack}</pre>
          </details>
        </div>
      `;
    }
  }
  
  /**
   * Disconnected callback - cleanup
   */
  disconnectedCallback() {
    // Log performance before cleanup
    this.logPerformanceReport();
    
    // Remove state subscriptions
    if (this.unsubscribeHandlers) {
      this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
    }
    
    // Clean up event handling
    if (this.componentId) {
      eventManager.cleanupComponent(this.componentId);
    }
    
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
    if (this.liveRegion && this.liveRegion.parentNode) {
      this.liveRegion.parentNode.removeChild(this.liveRegion);
    }
    
    // Force a garbage collection hint
    this._prevRenderState = null;
    this._trustPreviewCache = null;
    
    // Reset initialization flag
    this._initialized = false;
  }
  
  /**
   * Initialize component state with optimized state subscriptions
   */
  initializeState() {
    this.unsubscribeHandlers = [];
    
    // Subscribe to form data state
    this.unsubscribeHandlers.push(
      stateManager.subscribe('formData', state => {
        const prevFormData = this.formData;
        this.formData = { ...this.formData, ...state };
        
        const fieldsChanged = this.hasImportantFieldsChanged(prevFormData, this.formData);
        if (fieldsChanged) {
          this.validateForm();
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
    
    // Get initial state from state manager
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
    
    // Load trust preview
    this.loadTrustPreview();
  }
  
  /**
   * Initialize services
   */
  async initializeServices() {
    performanceMonitor.startTimer('services_init');
    try {
      await apiSecurity.initialize();
      await i18nService.init();
      this.loadSavedData();
    } catch (error) {
      errorHandler.handleError(error);
    } finally {
      performanceMonitor.endTimer('services_init');
    }
  }
  
  /**
   * Check if important fields changed
   */
  hasImportantFieldsChanged(oldData, newData) {
    if (!oldData) return true;
    
    if (oldData.currentStep !== newData.currentStep) return true;
    
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
    
    return fieldsToCheck.some(field => oldData[field] !== newData[field]);
  }
  
  /**
   * Check if render is necessary
   */
  shouldUpdateRender() {
    if (!this._prevRenderState) {
      this._prevRenderState = {};
    }
    
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
    
    const shouldUpdate = !this._prevRenderState.currentState || 
      JSON.stringify(currentState) !== JSON.stringify(this._prevRenderState.currentState);
    
    this._prevRenderState.currentState = currentState;
    
    return shouldUpdate;
  }
  
  /**
   * Render the component
   */
  render() {
    if (!this.shouldUpdateRender()) {
      return;
    }
    
    this._renderCount = (this._renderCount || 0) + 1;
    
    performanceMonitor.startTimer('render');
    performance.mark('render_start');
    
    try {
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
      
      html = eventManager.replaceInlineHandlers(html);
      html = accessibilityHelper.enhanceHtml(html);
      
      this.shadowRoot.innerHTML = html;
      
      // ✅ CRITICAL: Set up direct event listeners after render
      this.setupDirectEventListeners();
      
      this.announceStatusChanges();
      
      if (this.firstRender) {
        this.firstRender = false;
      }
      
    } catch (error) {
      console.error('Render error:', error);
      this.shadowRoot.innerHTML = `
        <div style="padding: 20px; color: red;">
          Render error: ${error.message}
        </div>
      `;
    } finally {
      performanceMonitor.endTimer('render');
      performance.mark('render_end');
      performance.measure('render', 'render_start', 'render_end');
      
      if (this._renderCount % 10 === 0) {
        performanceMonitor.checkMemoryUsage();
      }
    }
  }
  
  /**
   * Render form content
   */
  renderForm() {
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
    
    return `
      ${renderProgressSteps(this.currentStep)}
      ${renderAlerts(this.showRestoredMessage, this.apiError)}
      ${this.renderCurrentStep()}
      ${this.trustPreview ? renderTrustPreview(this.trustPreview) : ''}
      ${renderNavigationButtons(this.currentStep, this.isFormValid, this.isLoading)}
    `;
  }
  
  /**
   * Render current step content
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
   * Render results
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
   * Announce status changes for accessibility
   */
  announceStatusChanges() {
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
          this.trustLevel || 'Unknown' // ✅ FIXED: Direct string instead of FORM_STEPS lookup
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
   * Validate form
   */
  validateForm() {
    if (!this.formData || typeof this.formData.name !== 'string') {
      return;
    }
    
    performanceMonitor.startTimer('validation');
    let stepErrors = {};
    
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
    
    if (JSON.stringify(this.errors) !== JSON.stringify(stepErrors)) {
      this.errors = stepErrors;
      this.isFormValid = isStepValid(stepErrors);
    }
    
    performanceMonitor.endTimer('validation');
  }
  
  /**
   * Handle input changes - ✅ FIXED: Proper input binding
   */
  handleInputChange(event) {
    performance.mark('input_change_start');
    const { name, value, type, checked } = event.target;
    
    const inputValue = type === 'checkbox' ? checked : value;
    
    const updatedFormData = { ...this.formData };
    updatedFormData[name] = inputValue;
    
    if (name === 'stayPurpose' && value !== 'Other') {
      updatedFormData.otherPurpose = '';
    }
    
    if (name === 'travelingNearHome' && !checked) {
      updatedFormData.zipCode = '';
    }
    
    stateManager.updateFormData(updatedFormData);
    
    if (type === 'text' || type === 'email' || type === 'tel' || type === 'url') {
      clearTimeout(this._validationTimer);
      this._validationTimer = setTimeout(() => {
        this.validateForm();
        this.render();
      }, 300);
    } else {
      this.validateForm();
    }
    
    if (name === 'consentToBackgroundCheck' && checked) {
      this.updateTrustPreview();
      accessibilityHelper.announce('Background check consent provided. This will be used for identity verification.', 'polite');
    }
    
    performance.mark('input_change_end');
    performance.measure('input_change', 'input_change_start', 'input_change_end');
  }
  
  /**
   * Handle next step
   */
  async handleNextStep() {
    if (!this.isFormValid) {
      accessibilityHelper.announce(accessibilityMessages.formError(Object.keys(this.errors).length), 'assertive');
      this.focusFirstError();
      return;
    }
    
    if (this.currentStep === 0) {
      const userVerified = await this.handleCheckUser();
      if (!userVerified) return;
      
      if (this.formData.consentToBackgroundCheck && 
          !this.userIdentification.backgroundCheckStatus) {
        await this.initiateBackgroundCheck();
      }
      
      this.updateTrustPreview();
    }
    
    if (this.currentStep < 3) { // ✅ FIXED: Using literal 3 instead of FORM_STEPS.length - 1
      this.currentStep += 1;
      
      stateManager.updateFormData({
        ...this.formData,
        currentStep: this.currentStep
      });
      
      this.validateForm();
      
      accessibilityHelper.announce(
        accessibilityMessages.stepChange(this.currentStep + 1, 4), // ✅ FIXED: Using literal 4 instead of FORM_STEPS.length
        'polite'
      );
    } else {
      this.handleSubmit();
    }
  }
  
  /**
   * Handle previous step
   */
  handlePreviousStep() {
    if (this.currentStep > 0) {
      this.currentStep -= 1;
      
      stateManager.updateFormData({
        ...this.formData,
        currentStep: this.currentStep
      });
      
      this.validateForm();
      
      accessibilityHelper.announce(
        accessibilityMessages.stepChange(this.currentStep + 1, 4), // ✅ FIXED: Using literal 4 instead of FORM_STEPS.length
        'polite'
      );
    }
  }
  
  /**
   * Focus first error
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
   * Handle form submission
   */
  async handleSubmit() {
    if (!this.isFormValid) {
      accessibilityHelper.announce(accessibilityMessages.formError(Object.keys(this.errors).length), 'assertive');
      return;
    }

    stateManager.setLoading(true);
    
    accessibilityHelper.announce("Submitting verification information. Please wait.", 'polite');
    
    try {
      const result = calculateScore(this.formData, this.userIdentification);
      const trustLevel = getTrustLevel(result.score);
      const message = getResultMessage(trustLevel);
      
      stateManager.setResults({
        score: result.score,
        trustLevel,
        message,
        adjustments: result.adjustments,
        isSubmitted: false
      });
      
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
      
      const hostSummary = generateHostSummary(verificationData);
      
      await apiService.submitVerification({
        ...verificationData,
        hostSummary
      });
      
      stateManager.setResults({
        score: result.score,
        trustLevel,
        message,
        adjustments: result.adjustments,
        isSubmitted: true,
        hostSummary
      });
      
      this.clearSavedData();
      
      accessibilityHelper.announce(
        accessibilityMessages.submissionComplete(
          this.userIdentification.caslKeyId,
          result.score,
          trustLevel || 'Unknown' // ✅ FIXED: Direct string instead of FORM_STEPS lookup
        ), 
        'polite'
      );
      
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
      accessibilityHelper.announce(`Submission error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
    }
  }
  
  /**
   * Handle check user
   */
  async handleCheckUser() {
    if (!this.formData.email) {
      stateManager.showAlert(t('errors.emailRequired'));
      accessibilityHelper.announce(t('errors.emailRequired'), 'assertive');
      return false;
    }
    
    stateManager.setLoading(true);
    accessibilityHelper.announce(accessibilityMessages.verifying, 'polite');
    
    try {
      const userData = {
        email: this.formData.email,
        name: this.formData.name,
        phone: this.formData.phone,
        address: this.formData.address
      };
      
      stateManager.setVerification({
        ...this.userIdentification,
        isChecking: true,
        error: null
      });
      
      const userIdentification = await apiService.checkUserStatus(userData);
      
      const isVerified = this.verificationStatus === 'VERIFIED' || // ✅ FIXED: Using literal instead of VERIFICATION_STATUSES.VERIFIED
                         this.verificationStatus === 'MANUAL_REVIEW'; // ✅ FIXED: Using literal instead of VERIFICATION_STATUSES.MANUAL_REVIEW
      
      if (isVerified && !userIdentification.isVerified) {
        userIdentification.isVerified = true;
        userIdentification.verificationType = 'screenshot';
      }
      
      stateManager.setVerification({
        ...userIdentification,
        isChecking: false
      });
      
      if (userIdentification.isExistingUser) {
        accessibilityHelper.announce(`Welcome back! We found your existing CASL Key ID: ${userIdentification.caslKeyId}`, 'polite');
      } else {
        accessibilityHelper.announce('User verification completed successfully.', 'polite');
      }
      
      return true;
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      
      stateManager.setVerification({
        ...this.userIdentification,
        isChecking: false,
        error: error.message || t('errors.userCheckFailed')
      });
      
      accessibilityHelper.announce(`Error checking user: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
      return false;
    } finally {
      stateManager.setLoading(false);
    }
  }
  
  /**
   * Initiate background check
   */
  async initiateBackgroundCheck() {
    if (!this.formData.consentToBackgroundCheck) return;
    
    stateManager.setLoading(true);
    accessibilityHelper.announce("Initiating background check. This may take a moment.", 'polite');
    
    try {
      const userData = {
        caslKeyId: this.userIdentification.caslKeyId,
        name: this.formData.name,
        email: this.formData.email,
        phone: this.formData.phone,
        address: this.formData.address
      };
      
      const result = await backgroundCheckService.initiateBackgroundCheck(userData);
      
      stateManager.setVerification({
        ...this.userIdentification,
        backgroundCheckStatus: result.passed ? 'passed' : 'failed',
        isVerified: this.userIdentification.isVerified || result.passed
      });
      
      if (result.passed) {
        accessibilityHelper.announce(accessibilityMessages.backgroundCheckComplete, 'polite');
      } else {
        accessibilityHelper.announce('Background check could not be completed. You may try another verification method.', 'assertive');
      }
    } catch (error) {
      errorHandler.handleError(error);
      stateManager.showAlert(errorHandler.getUserFriendlyMessage(error));
      accessibilityHelper.announce(`Background check error: ${errorHandler.getUserFriendlyMessage(error)}`, 'assertive');
    } finally {
      stateManager.setLoading(false);
    }
  }
  
  /**
   * Update trust preview
   */
  updateTrustPreview() {
    const cacheKey = `${this.formData.travelingNearHome}_${this.formData.totalGuests}_${this.formData.usedSTRBefore}_${!!this.userIdentification.backgroundCheckStatus}`;
    
    if (this._trustPreviewCache && this._trustPreviewCache[cacheKey]) {
      this.trustPreview = this._trustPreviewCache[cacheKey];
      return;
    }
    
    const result = calculateScore(this.formData, this.userIdentification);
    const trustLevel = getTrustLevel(result.score);
    
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
        lastMinuteBooking: false
      }
    };
    
    if (!this._trustPreviewCache) this._trustPreviewCache = {};
    this._trustPreviewCache[cacheKey] = previewData;
    
    this.saveTrustPreview(previewData);
    this.trustPreview = previewData;
  }
  
  /**
   * Load trust preview
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
   * Save trust preview
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
   * Debounced save form data
   */
  debounceSaveFormData() {
    clearTimeout(this._saveFormDataTimer);
    this._saveFormDataTimer = setTimeout(() => {
      this.saveFormData();
    }, 300);
  }
  
  /**
   * Save form data
   */
  saveFormData() {
    if (this.submitted) return;
    
    try {
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      const data = {
        formData: this.formData,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`${prefix}saved_form_data`, JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving form data:', error);
    }
  }
  
  /**
   * Load saved data
   */
  loadSavedData() {
    try {
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      const dataStr = localStorage.getItem(`${prefix}saved_form_data`);
      if (!dataStr) return;
      
      const data = JSON.parse(dataStr);
      const maxAge = configManager.get('FORM_STATE_MAX_AGE', 24 * 60 * 60 * 1000);
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - timestamp > maxAge) {
        localStorage.removeItem(`${prefix}saved_form_data`);
        return;
      }
      
      if (data.formData) {
        stateManager.updateFormData({
          ...data.formData,
          currentStep: data.currentStep || 0
        });
        
        this.currentStep = data.currentStep || 0;
        this.formData = data.formData;
        this.showRestoredMessage = true;
        
        setTimeout(() => {
          this.showRestoredMessage = false;
          this.render();
        }, 5000);
        
        this.validateForm();
        accessibilityHelper.announce("Your previous form data has been restored.", 'polite');
      }
    } catch (error) {
      console.warn('Error loading saved form data:', error);
    }
  }
  
  /**
   * Clear saved data
   */
  clearSavedData() {
    try {
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      localStorage.removeItem(`${prefix}saved_form_data`);
      this.showRestoredMessage = false;
      accessibilityHelper.announce("Saved form data has been cleared.", 'polite');
    } catch (error) {
      console.warn('Error clearing saved data:', error);
    }
  }
  
  /**
   * Add skip link
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
    console.log('Memory usage:', metrics.memory?.used.toFixed(2) + 'MB');
    console.log('Render count:', this._renderCount);
    console.groupEnd();
  }
  
  /**
   * Enable debug mode
   */
  enableDebugMode() {
    if (!window._CASLDebugTools) {
      window._CASLDebugTools = {
        getState: () => ({
          formData: this.formData,
          userIdentification: this.userIdentification,
          currentStep: this.currentStep,
          errors: this.errors,
          verificationStatus: this.verificationStatus
        }),
        
        getPerformanceMetrics: () => performanceMonitor.getAllMetrics(),
        forceRender: () => this.render(),
        reset: () => this.handleReset(),
        
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
   * ✅ FIXED: Setup proper event listeners for shadow root
   */
  setupEventListeners() {
    this.registerEventHandlers();
    
    document.addEventListener('caslLanguageChanged', () => {
      this.render();
      const langInfo = i18nService.getLanguageInfo(i18nService.currentLanguage);
      if (langInfo) {
        accessibilityHelper.announce(`Language changed to ${langInfo.name}`, 'polite');
      }
    });
    
    document.addEventListener('phoneVerificationTimerExpired', () => {
      this.render();
      accessibilityHelper.announce("Verification code has expired. You can request a new code.", 'polite');
    });
    
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMediaQuery) {
      motionMediaQuery.addEventListener('change', () => {
        this.render();
      });
    }
  }

  /**
   * ✅ NEW: Setup direct event listeners in shadow root (called after each render)
   */
  setupDirectEventListeners() {
    const shadowRoot = this.shadowRoot;
    
    // Input change delegation
    const handleInputDelegate = (e) => {
      if (e.target.matches('input, select, textarea')) {
        this.handleInputChange(e);
      }
    };
    
    // Button click delegation
    const handleButtonDelegate = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      e.preventDefault();
      
      if (button.textContent.includes('Next') || button.classList.contains('btn-next')) {
        this.handleNextStep();
      } else if (button.textContent.includes('Previous') || button.classList.contains('btn-previous')) {
        this.handlePreviousStep();
      } else if (button.type === 'submit') {
        this.handleSubmit();
      }
    };
    
    // Remove old listeners to prevent duplicates
    shadowRoot.removeEventListener('input', handleInputDelegate);
    shadowRoot.removeEventListener('change', handleInputDelegate);
    shadowRoot.removeEventListener('click', handleButtonDelegate);
    
    // Add new listeners
    shadowRoot.addEventListener('input', handleInputDelegate);
    shadowRoot.addEventListener('change', handleInputDelegate);
    shadowRoot.addEventListener('click', handleButtonDelegate);
  }
  
  /**
   * Register event handlers
   */
  registerEventHandlers() {
    eventManager.registerHandler(
      this.componentId,
      'handleInputChange',
      this.handleInputChange.bind(this)
    );
    
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
  }
}

// Register the custom element
customElements.define('casl-verification', CASLVerification);