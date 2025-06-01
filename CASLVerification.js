// Fixed CASLVerification.js with correct import paths and validation timing fix
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
import { backgroundCheckService } from './backgroundcheck.js';

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
    this.componentId = this.generateComponentId();
    
    // Create live region for accessibility announcements
    this.liveRegion = this.createLiveRegion();
    
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
   * Generate unique component ID
   * @returns {string} Component ID
   */
  generateComponentId() {
    return `casl-component-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Create live region for accessibility announcements
   * @returns {HTMLElement} Live region element
   */
  createLiveRegion() {
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.id = 'verification-status';
    return liveRegion;
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
      if (apiSecurity && apiSecurity.initialize) {
        await apiSecurity.initialize();
      }
      
      // Initialize i18n service
      if (i18nService && i18nService.init) {
        await i18nService.init();
      }
      
      // Check for saved form data
      this.loadSavedData();
    } catch (error) {
      console.error('Error initializing services:', error);
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
    if (this.unsubscribeHandlers) {
      this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
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
    // Skip link will be added by render method
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
        dir="ltr"
      >
        <div class="header">
          <h1 id="page-title">CASL Key Verification</h1>
        </div>
        
        <main id="verification-main-content" tabindex="-1">
          ${content}
        </main>
      </div>
    `;
    
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
        ${this.renderAlerts()}
        ${this.selectedVerificationMethod 
          ? this.renderVerificationMethod() 
          : this.renderVerificationMethodSelector()}
        <div class="navigation-buttons">
          <button 
            onclick="this.toggleVerificationMethods(false)"
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
      ${this.renderProgressSteps()}
      ${this.renderAlerts()}
      ${this.renderCurrentStep()}
      ${this.trustPreview ? this.renderTrustPreview() : ''}
      ${this.renderNavigationButtons()}
    `;
  }
  
  /**
   * Render progress steps
   */
  renderProgressSteps() {
    const progressPercentage = ((this.currentStep + 1) / FORM_STEPS.length) * 100;
    
    let stepsHtml = '';
    
    FORM_STEPS.forEach((step, index) => {
      const isActive = index === this.currentStep;
      const isCompleted = index < this.currentStep;
      const color = index <= this.currentStep ? 'var(--primary-color)' : '#999';
      const bgColor = isCompleted ? 'var(--primary-color)' : (isActive ? 'white' : '#ddd');
      const textColor = isCompleted ? 'white' : (isActive ? 'var(--primary-color)' : '#666');
      const borderStyle = isActive ? '2px solid var(--primary-color)' : 'none';
      
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
          aria-valuenow="${this.currentStep + 1}" 
          aria-valuemin="1" 
          aria-valuemax="${FORM_STEPS.length}"
          aria-valuetext="Step ${this.currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[this.currentStep]}"
        >
          <div 
            class="progress-indicator" 
            style="width: ${progressPercentage}%"
            aria-hidden="true"
          ></div>
        </div>
        
        <div class="sr-only">
          You are on step ${this.currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[this.currentStep]}
        </div>
      </div>
      
      <div 
        class="mobile-step-indicator" 
        style="text-align: center; margin-bottom: 20px; display: none"
        aria-hidden="true" 
      >
        <span style="font-weight: bold">Step ${this.currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[this.currentStep]}</span>
      </div>
    `;
  }
  
  /**
   * Render alerts
   */
  renderAlerts() {
    let alertsHtml = '';
    
    // Show saved data message
    if (this.showRestoredMessage) {
      alertsHtml += `
        <div 
          class="alert alert-info" 
          role="status" 
          aria-live="polite"
        >
          <span>Your previous form data has been restored.</span>
          <button 
            onclick="this.clearSavedData()" 
            aria-label="Clear saved data"
            class="alert-action"
          >
            Clear
          </button>
        </div>
      `;
    }
    
    // Show API error
    if (this.apiError) {
      alertsHtml += `
        <div 
          class="alert alert-error" 
          role="alert" 
          aria-live="assertive"
        >
          <span>${this.apiError}</span>
          <button 
            onclick="this.clearApiError()" 
            aria-label="Dismiss error message"
            class="alert-action"
          >
            <span aria-hidden="true">×</span>
            <span class="sr-only">Dismiss</span>
          </button>
        </div>
      `;
    }
    
    return alertsHtml;
  }
  
  /**
   * Render trust preview
   */
  renderTrustPreview() {
    if (!this.trustPreview) return '';
    
    const { trustLevel, scoreRange, flags } = this.trustPreview;
    
    let badgeColor = '#4CAF50'; // Default green
    let badgeText = 'Verified';
    
    if (trustLevel === 'review') {
      badgeColor = '#FFC107'; // Warning yellow
      badgeText = 'Context Needed';
    } else if (trustLevel === 'manual_review') {
      badgeColor = '#9E9E9E'; // Gray
      badgeText = 'Review Pending';
    } else if (trustLevel === 'not_eligible') {
      badgeColor = '#757575'; // Dark gray
      badgeText = 'Not Eligible';
    }
    
    // Build flags text
    const flagsList = [];
    if (flags) {
      if (flags.localBooking) flagsList.push('Local booking');
      if (flags.highGuestCount) flagsList.push('6+ guests');
      if (flags.noSTRHistory) flagsList.push('First-time STR user');
      if (flags.lastMinuteBooking) flagsList.push('Last-minute booking');
    }
    
    const flagsText = flagsList.length > 0 
      ? `Flags: ${flagsList.join(', ')}` 
      : 'No flags';
    
    return `
      <div 
        class="trust-preview" 
        role="region" 
        aria-labelledby="trust-preview-heading"
      >
        <h3 id="trust-preview-heading">Trust Preview (what hosts will see)</h3>
        <div>
          <span 
            class="preview-badge" 
            style="background-color: ${badgeColor};"
            aria-label="Trust badge: ${badgeText}"
          >
            ${badgeText}
          </span>
          <span>Score range: ${scoreRange}</span>
        </div>
        <p>${flagsText}</p>
        <p><small>Hosts will never see your personal details, only a verification status.</small></p>
      </div>
    `;
  }
  
  /**
   * Render navigation buttons
   */
  renderNavigationButtons() {
    return `
      <div class="navigation-buttons">
        ${this.currentStep > 0 ? `
          <button 
            onclick="this.handlePreviousStep()" 
            class="neutral"
            aria-label="Go to previous step"
          >
            <span aria-hidden="true">←</span> Previous
          </button>
        ` : '<span></span>'}
        
        <button 
          onclick="${this.currentStep < FORM_STEPS.length - 1 ? 'this.handleNextStep()' : 'this.handleSubmit()'}" 
          class="primary"
          ${!this.isFormValid ? 'disabled' : ''}
          ${this.isLoading ? 'disabled' : ''}
          aria-label="${this.currentStep < FORM_STEPS.length - 1 ? 'Continue to next step' : 'Submit verification'}"
        >
          ${this.isLoading ? 'Processing...' : 
            this.currentStep < FORM_STEPS.length - 1 ? 'Next →' : 'Submit Verification'}
        </button>
      </div>
    `;
  }
  
  /**
   * Render verification method selector
   */
  renderVerificationMethodSelector() {
    return `
      <div class="verification-methods">
        <h3>Additional Verification Methods</h3>
        <p>Choose a method to further verify your identity:</p>
        <div class="verification-options">
          <button onclick="this.selectVerificationMethod('government-id')" class="verification-method-btn">
            Government ID Verification
          </button>
          <button onclick="this.selectVerificationMethod('phone')" class="verification-method-btn">
            Phone Verification
          </button>
          <button onclick="this.selectVerificationMethod('social')" class="verification-method-btn">
            Social Media Verification
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render verification method
   */
  renderVerificationMethod() {
    return `
      <div class="verification-method">
        <h3>${this.selectedVerificationMethod} Verification</h3>
        <p>Please follow the instructions for ${this.selectedVerificationMethod} verification.</p>
      </div>
    `;
  }
  
  /**
   * Render the current step content
   */
  renderCurrentStep() {
    switch(this.currentStep) {
      case 0:
        return this.renderUserIdentification();
      case 1:
        return this.renderBookingInfo();
      case 2:
        return this.renderStayIntent();
      case 3:
        return this.renderAgreement();
      default:
        return '';
    }
  }
  
  /**
   * Render user identification step
   */
  renderUserIdentification() {
    if (this.userIdentification.isChecking) {
      return `
        <div 
          id="step-content-0"
          class="form-section loading-state" 
          style="text-align: center"
        >
          <h2>User Identification</h2>
          <p>Checking user status...</p>
          <div 
            class="loading-spinner" 
            role="status" 
            aria-live="polite"
          >
            <div class="spinner-visual" aria-hidden="true"></div>
            <span class="sr-only">Verifying your information. Please wait.</span>
          </div>
        </div>
      `;
    }
    
    return `
      <div 
        id="step-content-0"
        class="form-section" 
        role="form" 
        aria-labelledby="user-id-heading"
      >
        <h2 id="user-id-heading">User Identification</h2>
        
        ${this.userIdentification.error ? `
          <div 
            class="alert alert-error" 
            role="alert" 
            aria-live="assertive"
          >
            ${this.userIdentification.error}
          </div>
        ` : ''}
        
        ${this.userIdentification.caslKeyId && this.userIdentification.isExistingUser ? `
          <div 
            class="alert alert-success" 
            role="status" 
            aria-live="polite"
          >
            Welcome back! We found your existing CASL Key ID: ${this.userIdentification.caslKeyId}
          </div>
        ` : ''}
        
        <div class="form-group">
          <label for="name-input" class="required">Full Name</label>
          <input 
            type="text" 
            id="name-input"
            name="name" 
            value="${this.formData.name}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.name ? 'true' : 'false'}"
            aria-describedby="${this.errors.name ? 'name-error' : ''}"
            autocomplete="name"
            required
          />
          ${this.errors.name ? `<div id="name-error" class="error" role="alert">${this.errors.name}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="email-input" class="required">Email Address</label>
          <input 
            type="email" 
            id="email-input"
            name="email" 
            value="${this.formData.email}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.email ? 'true' : 'false'}"
            aria-describedby="${this.errors.email ? 'email-error' : ''}"
            autocomplete="email"
            required
          />
          ${this.errors.email ? `<div id="email-error" class="error" role="alert">${this.errors.email}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="phone-input" class="required">Phone Number</label>
          <input 
            type="tel" 
            id="phone-input"
            name="phone" 
            value="${this.formData.phone}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.phone ? 'true' : 'false'}"
            aria-describedby="${this.errors.phone ? 'phone-error' : ''}"
            autocomplete="tel"
            required
          />
          ${this.errors.phone ? `<div id="phone-error" class="error" role="alert">${this.errors.phone}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="address-input" class="required">Address</label>
          <input 
            type="text" 
            id="address-input"
            name="address" 
            value="${this.formData.address}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.address ? 'true' : 'false'}"
            aria-describedby="${this.errors.address ? 'address-error' : ''}"
            autocomplete="street-address"
            required
          />
          ${this.errors.address ? `<div id="address-error" class="error" role="alert">${this.errors.address}</div>` : ''}
        </div>
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="bg-check-consent"
            name="consentToBackgroundCheck" 
            ${this.formData.consentToBackgroundCheck ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
            aria-describedby="bg-check-desc"
          />
          <label for="bg-check-consent" class="checkbox-label">
            I consent to a background check to verify my identity.
          </label>
          <div id="bg-check-desc" class="field-description sr-only">
            Check this box to consent to a background check for identity verification
          </div>
        </div>
        
        ${this.errors.verification ? `<div class="error" role="alert">${this.errors.verification}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Render booking info step
   */
  renderBookingInfo() {
    return `
      <div 
        id="step-content-1"
        class="form-section" 
        role="form" 
        aria-labelledby="booking-info-heading"
      >
        <h2 id="booking-info-heading">Booking Information</h2>
        
        <div class="form-group">
          <label for="platform-select" class="required">Booking Platform</label>
          <select 
            id="platform-select"
            name="platform" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.platform ? 'true' : 'false'}"
            aria-describedby="${this.errors.platform ? 'platform-error' : ''}"
            required
          >
            <option value="">Select platform</option>
            <option value="airbnb" ${this.formData.platform === 'airbnb' ? 'selected' : ''}>Airbnb</option>
            <option value="vrbo" ${this.formData.platform === 'vrbo' ? 'selected' : ''}>VRBO</option>
            <option value="booking" ${this.formData.platform === 'booking' ? 'selected' : ''}>Booking.com</option>
            <option value="other" ${this.formData.platform === 'other' ? 'selected' : ''}>Other</option>
          </select>
          ${this.errors.platform ? `<div id="platform-error" class="error" role="alert">${this.errors.platform}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="listing-link-input" class="required">Listing Link</label>
          <input 
            type="url" 
            id="listing-link-input"
            name="listingLink" 
            value="${this.formData.listingLink}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.listingLink ? 'true' : 'false'}"
            aria-describedby="${this.errors.listingLink ? 'listing-link-error' : ''}"
            placeholder="https://example.com/listing/123"
            required
          />
          ${this.errors.listingLink ? `<div id="listing-link-error" class="error" role="alert">${this.errors.listingLink}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="checkin-date-input" class="required">Check-in Date</label>
          <input 
            type="date" 
            id="checkin-date-input"
            name="checkInDate" 
            value="${this.formData.checkInDate}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.checkInDate ? 'true' : 'false'}"
            aria-describedby="${this.errors.checkInDate ? 'checkin-date-error' : ''}"
            required
          />
          ${this.errors.checkInDate ? `<div id="checkin-date-error" class="error" role="alert">${this.errors.checkInDate}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="checkout-date-input" class="required">Check-out Date</label>
          <input 
            type="date" 
            id="checkout-date-input"
            name="checkOutDate" 
            value="${this.formData.checkOutDate}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.checkOutDate ? 'true' : 'false'}"
            aria-describedby="${this.errors.checkOutDate ? 'checkout-date-error' : ''}"
            required
          />
          ${this.errors.checkOutDate ? `<div id="checkout-date-error" class="error" role="alert">${this.errors.checkOutDate}</div>` : ''}
        </div>
      </div>
    `;
  }
  
  /**
   * Render stay intent step
   */
  renderStayIntent() {
    return `
      <div 
        id="step-content-2"
        class="form-section" 
        role="form" 
        aria-labelledby="stay-intent-heading"
      >
        <h2 id="stay-intent-heading">Stay Intent</h2>
        
        <div class="form-group">
          <label for="purpose-select" class="required">Purpose of Stay</label>
          <select 
            id="purpose-select"
            name="stayPurpose" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.stayPurpose ? 'true' : 'false'}"
            aria-describedby="${this.errors.stayPurpose ? 'purpose-error' : ''}"
            required
          >
            <option value="">Select purpose</option>
            <option value="vacation" ${this.formData.stayPurpose === 'vacation' ? 'selected' : ''}>Vacation</option>
            <option value="business" ${this.formData.stayPurpose === 'business' ? 'selected' : ''}>Business</option>
            <option value="family" ${this.formData.stayPurpose === 'family' ? 'selected' : ''}>Family Visit</option>
            <option value="medical" ${this.formData.stayPurpose === 'medical' ? 'selected' : ''}>Medical</option>
            <option value="relocation" ${this.formData.stayPurpose === 'relocation' ? 'selected' : ''}>Relocation</option>
            <option value="other" ${this.formData.stayPurpose === 'other' ? 'selected' : ''}>Other</option>
          </select>
          ${this.errors.stayPurpose ? `<div id="purpose-error" class="error" role="alert">${this.errors.stayPurpose}</div>` : ''}
        </div>
        
        <div class="form-group">
          <label for="guests-input" class="required">Total Number of Guests</label>
          <input 
            type="number" 
            id="guests-input"
            name="totalGuests" 
            value="${this.formData.totalGuests}" 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.totalGuests ? 'true' : 'false'}"
            aria-describedby="${this.errors.totalGuests ? 'guests-error' : ''}"
            min="1"
            max="20"
            required
          />
          ${this.errors.totalGuests ? `<div id="guests-error" class="error" role="alert">${this.errors.totalGuests}</div>` : ''}
        </div>
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="traveling-near-home"
            name="travelingNearHome" 
            ${this.formData.travelingNearHome ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
          />
          <label for="traveling-near-home" class="checkbox-label">
            I am traveling within 100 miles of my home address
          </label>
        </div>
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="used-str-before"
            name="usedSTRBefore" 
            ${this.formData.usedSTRBefore ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
          />
          <label for="used-str-before" class="checkbox-label">
            I have used short-term rentals before
          </label>
        </div>
      </div>
    `;
  }
  
  /**
   * Render agreement step
   */
  renderAgreement() {
    return `
      <div 
        id="step-content-3"
        class="form-section" 
        role="form" 
        aria-labelledby="agreement-heading"
      >
        <h2 id="agreement-heading">Agreement & Consent</h2>
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="agree-rules"
            name="agreeToRules" 
            ${this.formData.agreeToRules ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.agreeToRules ? 'true' : 'false'}"
            required
          />
          <label for="agree-rules" class="checkbox-label required">
            I agree to follow all house rules and property guidelines
          </label>
        </div>
        ${this.errors.agreeToRules ? `<div class="error" role="alert">${this.errors.agreeToRules}</div>` : ''}
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="agree-no-parties"
            name="agreeNoParties" 
            ${this.formData.agreeNoParties ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.agreeNoParties ? 'true' : 'false'}"
            required
          />
          <label for="agree-no-parties" class="checkbox-label required">
            I agree not to host parties or large gatherings
          </label>
        </div>
        ${this.errors.agreeNoParties ? `<div class="error" role="alert">${this.errors.agreeNoParties}</div>` : ''}
        
        <div class="checkbox-container">
          <input 
            type="checkbox" 
            id="understand-flagging"
            name="understandFlagging" 
            ${this.formData.understandFlagging ? 'checked' : ''} 
            onchange="this.handleInputChange(event)"
            aria-required="true"
            aria-invalid="${this.errors.understandFlagging ? 'true' : 'false'}"
            required
          />
          <label for="understand-flagging" class="checkbox-label required">
            I understand that violations may result in being flagged in the CASL Key system
          </label>
        </div>
        ${this.errors.understandFlagging ? `<div class="error" role="alert">${this.errors.understandFlagging}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Render verification results
   */
  renderResults() {
    return `
      <div class="result-card">
        <h2>Verification Complete</h2>
        <div class="trust-badge" style="background-color: #4CAF50;">
          Verified
        </div>
        <div class="score-display">
          <span class="score-number">${this.score}</span>
          <span class="score-max">/100</span>
        </div>
        <div class="result-message">${this.message}</div>
        <div class="navigation-buttons">
          <button onclick="this.printResults()" class="neutral">
            Print Results
          </button>
          <button onclick="this.handleReset()" class="neutral">
            Start Over
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Announce status changes to screen readers
   */
  announceStatusChanges() {
    // On first render, announce instructions
    if (this.firstRender) {
      this.liveRegion.textContent = 'CASL Key verification form loaded. Please fill out all required fields to continue.';
      return;
    }

    if (this.isLoading) {
      const operation = this.currentStep === 0 ? 'verification status' : 
                      this.currentStep === 3 ? 'submission' : 'data';
      this.liveRegion.textContent = `Loading ${operation}. Please wait.`;
    } else if (this.apiError) {
      this.liveRegion.textContent = this.apiError;
    } else if (this.submitted) {
      this.liveRegion.textContent = `Verification complete. Your CASL Key ID is ${this.userIdentification.caslKeyId}. Score: ${this.score} out of 100.`;
    } else if (this.errors && Object.keys(this.errors).length > 0) {
      this.liveRegion.textContent = `Form has ${Object.keys(this.errors).length} error${Object.keys(this.errors).length === 1 ? '' : 's'}. Please review and correct.`;
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
    
    // Update local state immediately
    this.formData = updatedFormData;
    
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
      this.render();
    }
    
    // If background check consent changes, we may need to update preview
    if (name === 'consentToBackgroundCheck' && checked) {
      this.updateTrustPreview();
      this.liveRegion.textContent = 'Background check consent provided. This will be used for identity verification.';
    }
    
    performance.mark('input_change_end');
    performance.measure('input_change', 'input_change_start', 'input_change_end');
  }
  
  /**
   * Toggle screenshot upload section
   * @param {boolean} show - Whether to show the screenshot upload section
   */
  toggleScreenshotUpload(show) {
    this.showScreenshotUpload = show;
    
    // Announce to screen readers
    if (show) {
      this.liveRegion.textContent = 'Screenshot upload section opened. You can upload a profile screenshot for verification.';
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
      this.liveRegion.textContent = 'Additional verification methods available. Choose a method to continue.';
    } else {
      this.liveRegion.textContent = 'Returning to main verification form.';
    }
    
    this.render();
  }
  
  /**
   * Select a verification method
   * @param {string} method - Verification method to select
   */
  selectVerificationMethod(method) {
    // Set selected method
    this.selectedVerificationMethod = method;
    
    // Announce to screen readers
    this.liveRegion.textContent = `Selected ${method} verification method. Follow the instructions to complete verification.`;
    
    // Update state and re-render
    this.render();
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
    
    // Simple score calculation based on current data
    let score = 70; // Base score
    
    if (this.formData.usedSTRBefore) score += 10;
    if (!this.formData.travelingNearHome) score += 5;
    if (this.formData.totalGuests <= 4) score += 10;
    if (this.formData.consentToBackgroundCheck) score += 5;
    
    const trustLevel = score >= 85 ? 'verified' : 
                     score >= 70 ? 'review' : 
                     score >= 50 ? 'manual_review' : 'not_eligible';
    
    // Generate a host-facing summary
    const previewData = {
      caslKeyId: this.userIdentification.caslKeyId || 'Pending',
      trustLevel,
      scoreRange: score >= 85 ? '85-100' : 
                 score >= 70 ? '70-84' : 
                 score >= 50 ? '50-69' : 'Below 50',
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
      const storageKey = 'casl_trust_preview';
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
      const storageKey = 'casl_trust_preview';
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
        stepErrors = this.validateUserIdentification();
        break;
      case 1:
        stepErrors = this.validateBookingInfo();
        break;
      case 2:
        stepErrors = this.validateStayIntent();
        break;
      case 3:
        stepErrors = this.validateAgreement();
        break;
    }
    
    // Only update if errors changed
    if (JSON.stringify(this.errors) !== JSON.stringify(stepErrors)) {
      this.errors = stepErrors;
      this.isFormValid = Object.keys(stepErrors).length === 0;
    }
    
    performanceMonitor.endTimer('validation');
  }
  
  /**
   * Validate user identification step
   */
  validateUserIdentification() {
    const errors = {};
    
    if (!this.formData.name || this.formData.name.trim() === '') {
      errors.name = 'Full name is required';
    }
    
    if (!this.formData.email || this.formData.email.trim() === '') {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!this.formData.phone || this.formData.phone.trim() === '') {
      errors.phone = 'Phone number is required';
    }
    
    if (!this.formData.address || this.formData.address.trim() === '') {
      errors.address = 'Address is required';
    }
    
    return errors;
  }
  
  /**
   * Validate booking info step
   */
  validateBookingInfo() {
    const errors = {};
    
    if (!this.formData.platform || this.formData.platform === '') {
      errors.platform = 'Please select a booking platform';
    }
    
    if (!this.formData.listingLink || this.formData.listingLink.trim() === '') {
      errors.listingLink = 'Listing link is required';
    } else if (!/^https?:\/\/.+/.test(this.formData.listingLink)) {
      errors.listingLink = 'Please enter a valid URL';
    }
    
    if (!this.formData.checkInDate) {
      errors.checkInDate = 'Check-in date is required';
    }
    
    if (!this.formData.checkOutDate) {
      errors.checkOutDate = 'Check-out date is required';
    } else if (this.formData.checkInDate && this.formData.checkOutDate) {
      const checkIn = new Date(this.formData.checkInDate);
      const checkOut = new Date(this.formData.checkOutDate);
      if (checkOut <= checkIn) {
        errors.checkOutDate = 'Check-out date must be after check-in date';
      }
    }
    
    return errors;
  }
  
  /**
   * Validate stay intent step
   */
  validateStayIntent() {
    const errors = {};
    
    if (!this.formData.stayPurpose || this.formData.stayPurpose === '') {
      errors.stayPurpose = 'Please select the purpose of your stay';
    }
    
    if (!this.formData.totalGuests || this.formData.totalGuests < 1) {
      errors.totalGuests = 'Please enter the number of guests';
    } else if (this.formData.totalGuests > 20) {
      errors.totalGuests = 'Maximum 20 guests allowed';
    }
    
    return errors;
  }
  
  /**
   * Validate agreement step
   */
  validateAgreement() {
    const errors = {};
    
    if (!this.formData.agreeToRules) {
      errors.agreeToRules = 'You must agree to follow house rules';
    }
    
    if (!this.formData.agreeNoParties) {
      errors.agreeNoParties = 'You must agree not to host parties';
    }
    
    if (!this.formData.understandFlagging) {
      errors.understandFlagging = 'You must acknowledge the flagging policy';
    }
    
    return errors;
  }
  
  /**
   * Handle next step button click with enhanced accessibility
   */
  async handleNextStep() {
    performance.mark('navigation_next_start');
    performanceMonitor.startTimer('next_step');
    
    if (!this.isFormValid) {
      // Announce errors to screen readers
      this.liveRegion.textContent = `Form has ${Object.keys(this.errors).length} error${Object.keys(this.errors).length === 1 ? '' : 's'}. Please review and correct.`;
      
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
      // Check user status
      const userVerified = await this.handleCheckUser();
      if (!userVerified) {
        performanceMonitor.endTimer('next_step');
        return;
      }
      
      // Update trust preview
      this.updateTrustPreview();
    }
    
    if (this.currentStep < FORM_STEPS.length - 1) {
      // Move to next step
      this.currentStep += 1;
      
      // Update form data state
      this.formData.currentStep = this.currentStep;
      stateManager.updateFormData(this.formData);
      
      // Validate the new step
      this.validateForm();
      
      // Announce step change to screen readers
      this.liveRegion.textContent = `Moved to step ${this.currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[this.currentStep]}`;
      
      this.render();
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
      this.formData.currentStep = this.currentStep;
      stateManager.updateFormData(this.formData);
      
      // Validate the new step
      this.validateForm();
      
      // Announce step change to screen readers
      this.liveRegion.textContent = `Moved to step ${this.currentStep + 1} of ${FORM_STEPS.length}: ${FORM_STEPS[this.currentStep]}`;
      
      this.render();
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
      this.apiError = 'Email is required';
      this.liveRegion.textContent = 'Email is required';
      return false;
    }
    
    this.isLoading = true;
    this.render();
    
    // Announce to screen readers
    this.liveRegion.textContent = 'Checking user verification status. Please wait.';
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful verification
      const userIdentification = {
        caslKeyId: `CASL-${Date.now()}`,
        isExistingUser: false,
        isVerified: this.formData.consentToBackgroundCheck,
        verificationType: this.formData.consentToBackgroundCheck ? 'background-check' : null,
        error: null
      };
      
      // Update verification state
      this.userIdentification = userIdentification;
      stateManager.setVerification(userIdentification);
      
      // Announce to screen readers
      if (userIdentification.isExistingUser) {
        this.liveRegion.textContent = `Welcome back! We found your existing CASL Key ID: ${userIdentification.caslKeyId}`;
      } else {
        this.liveRegion.textContent = 'User verification completed successfully.';
      }
      
      return true;
    } catch (error) {
      console.error('Error checking user:', error);
      
      // Update UI state with error
      this.apiError = 'Unable to verify user. Please try again.';
      
      // Update verification state with error
      this.userIdentification.error = 'User verification failed';
      
      // Announce error to screen readers
      this.liveRegion.textContent = 'Error checking user verification. Please try again.';
      
      return false;
    } finally {
      this.isLoading = false;
      performanceMonitor.endTimer('api_user_check');
      performance.mark('api_user_check_end');
      performance.measure('api_user_check', 'api_user_check_start', 'api_user_check_end');
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
      this.liveRegion.textContent = `Form has ${Object.keys(this.errors).length} error${Object.keys(this.errors).length === 1 ? '' : 's'}. Please review and correct.`;
      
      performanceMonitor.endTimer('form_submission');
      return;
    }

    this.isLoading = true;
    this.render();
    
    // Announce to screen readers
    this.liveRegion.textContent = 'Submitting verification information. Please wait.';
    
    // Calculate total time for UX metrics
    const totalTime = (performance.now() - this.uxMetrics.startTime) / 1000;
    const completionRate = this.uxMetrics.stepsCompleted.size / FORM_STEPS.length;
    
    console.info('Form completion time:', totalTime.toFixed(2) + 's', 
                 'Completion rate:', completionRate);
    
    try {
      // Simulate API submission delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate score and get trust level results
      performanceMonitor.startTimer('score_calculation');
      let score = 70; // Base score
      
      if (this.formData.usedSTRBefore) score += 10;
      if (!this.formData.travelingNearHome) score += 5;
      if (this.formData.totalGuests <= 4) score += 10;
      if (this.formData.consentToBackgroundCheck) score += 5;
      
      const trustLevel = score >= 85 ? 'verified' : 
                        score >= 70 ? 'review' : 
                        score >= 50 ? 'manual_review' : 'not_eligible';
      
      const message = score >= 85 ? 'Verification complete! You meet our recommended trust standards.' :
                     score >= 70 ? 'Verification complete! Some additional context may be needed for hosts.' :
                     score >= 50 ? 'Verification submitted for manual review.' :
                     'Unfortunately, you do not currently meet platform-wide trust requirements.';
      
      performanceMonitor.endTimer('score_calculation');
      
      // Update results state
      this.score = score;
      this.trustLevel = trustLevel;
      this.message = message;
      this.adjustments = [];
      this.submitted = true;
      
      stateManager.setResults({
        score,
        trustLevel,
        message,
        adjustments: [],
        isSubmitted: true
      });
      
      // Clear saved form data
      this.clearSavedData();
      
      // Announce completion to screen readers
      this.liveRegion.textContent = `Verification complete. Your CASL Key ID is ${this.userIdentification.caslKeyId}. Score: ${score} out of 100.`;
      
      // Dispatch event for external listeners
      const event = new CustomEvent('verificationComplete', {
        detail: {
          caslKeyId: this.userIdentification.caslKeyId,
          score,
          trustLevel,
          message
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
    } catch (error) {
      console.error('Submission error:', error);
      this.apiError = 'Unable to submit verification. Please try again.';
      
      // Announce error to screen readers
      this.liveRegion.textContent = 'Submission error. Please try again.';
    } finally {
      this.isLoading = false;
      performanceMonitor.endTimer('form_submission');
      performance.mark('form_submit_end');
      performance.measure('form_submission', 'form_submit_start', 'form_submit_end');
      performanceMonitor.checkMemoryUsage(); // Check memory after submission
      this.render();
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
      this.apiError = 'Please allow pop-ups to print verification';
      this.liveRegion.textContent = 'Print failed. Please allow pop-ups in your browser.';
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
    
    // Create print content with accessibility
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
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
            background-color: #4CAF50;
          }
          
          .score {
            font-size: 24px;
            margin: 1em 0;
          }
          
          .section {
            margin: 1.5em 0;
          }
          
          .footer {
            margin-top: 2em;
            text-align: center;
            font-size: 14px;
            color: #7f8c8d;
          }
          
          @media print {
            body {
              font-size: 12pt;
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
          <div class="trust-badge">Verified</div>
          <div class="score">
            <span class="score-number">${verification.score}</span>
            <span class="score-max">/100</span>
          </div>
          <p>${verification.message}</p>
        </div>
        
        <div class="footer">
          <p>This verification certificate was generated by CASL Key Verification System.</p>
          <p>© ${new Date().getFullYear()} CASL Key Verification</p>
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
    this.liveRegion.textContent = 'Verification details opened in new window for printing.';
    
    performanceMonitor.endTimer('print_results');
  }
  
  /**
   * Reset the form with enhanced accessibility and performance monitoring
   */
  handleReset() {
    performance.mark('form_reset_start');
    performanceMonitor.startTimer('form_reset');
    
    // Reset local state
    this.currentStep = 0;
    this.showScreenshotUpload = false;
    this.screenshotData = null;
    this.verificationStatus = VERIFICATION_STATUSES.NOT_SUBMITTED;
    this.showRestoredMessage = false;
    this.showVerificationMethods = false;
    this.selectedVerificationMethod = null;
    this.submitted = false;
    this.score = 0;
    this.trustLevel = null;
    this.message = '';
    this.adjustments = [];
    this.isLoading = false;
    this.apiError = null;
    
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
    
    // Reset verification state
    this.userIdentification = {};
    
    // Reset trust preview
    this.trustPreview = null;
    localStorage.removeItem('casl_trust_preview');
    
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
    
    // Reset state manager
    stateManager.resetSection('formData');
    stateManager.resetSection('verification');
    stateManager.resetSection('results');
    stateManager.hideAlert();
    
    // Validate form
    this.validateForm();
    
    // Announce reset to screen readers
    this.liveRegion.textContent = 'Form has been reset. You can start over with the verification process.';
    
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
      // Save data
      const data = {
        formData: this.formData,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('casl_saved_form_data', JSON.stringify(data));
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
      // Get saved data
      const dataStr = localStorage.getItem('casl_saved_form_data');
      if (!dataStr) return;
      
      // Parse data
      const data = JSON.parse(dataStr);
      
      // Check if data is expired
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - timestamp > maxAge) {
        // Remove expired data
        localStorage.removeItem('casl_saved_form_data');
        return;
      }
      
      // Update state
      if (data.formData) {
        // Merge with defaults to ensure all fields are strings
        const mergedFormData = { ...this.formData, ...data.formData };
        
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
        this.liveRegion.textContent = 'Your previous form data has been restored.';
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
      // Remove saved data
      localStorage.removeItem('casl_saved_form_data');
      
      // Update UI
      this.showRestoredMessage = false;
      
      // Announce to screen readers
      this.liveRegion.textContent = 'Saved form data has been cleared.';
    } catch (error) {
      console.warn('Error clearing saved data:', error);
    }
  }
  
  /**
   * Clear API error message
   */
  clearApiError() {
    this.apiError = null;
    
    // Announce to screen readers
    this.liveRegion.textContent = 'Error message dismissed.';
    
    this.render();
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for reduced motion preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionMediaQuery) {
      motionMediaQuery.addEventListener('change', () => {
        this.render(); // Re-render when preference changes
      });
    }
  }
}

// Register the custom element
customElements.define('casl-verification', CASLVerification);