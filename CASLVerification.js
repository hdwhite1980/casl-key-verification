// src/components/CASLVerification.js
import { getStyles } from './styles.js';  // ✅ Fixed: lowercase
import { renderProgressSteps } from './ProgressSteps.js';
import { renderAlerts, renderTrustPreview, renderScreenReaderAnnouncement } from './alerts.js';  // ✅ Fixed: lowercase
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
import { backgroundCheckService } from './backgroundcheck.js';  // ✅ Fixed: lowercase

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
    
    // Initialize simple state to avoid dependency issues
    this.currentStep = 0;
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
    this.errors = {};
    this.isLoading = false;
    this.apiError = null;
    this.submitted = false;
    this.score = 0;
    this.trustLevel = '';
    this.message = '';
    this.adjustments = [];
    this.userIdentification = {};
    this.isFormValid = false;
    
    // Initialize optional features as disabled by default
    this.showScreenshotUpload = false;
    this.screenshotData = null;
    this.verificationStatus = 'NOT_SUBMITTED';
    this.showRestoredMessage = false;
    this.showVerificationMethods = false;
    this.selectedVerificationMethod = null;
    this.trustPreview = null;
    
    // Track render count for performance monitoring
    this._renderCount = 0;
    this._validationTimer = null;
    this._verificationPollInterval = null;
    this._prevRenderState = null;
    this._trustPreviewCache = {};
    
    // Track first render for initial instructions
    this.firstRender = true;
    
    // Track UX metrics
    this.uxMetrics = {
      formStarted: false,
      stepsCompleted: new Set(),
      startTime: performance.now()
    };
    
    // Initialize services carefully with fallbacks
    this.initializeServices();
    
    // Render and setup
    this.render();
    this.setupEventListeners();
  }
  
  /**
   * Initialize services with error handling
   */
  async initializeServices() {
    try {
      // Try to initialize complex state management
      if (typeof stateManager !== 'undefined') {
        this.initializeState();
      }
      
      // Initialize API security if available
      if (typeof apiSecurity !== 'undefined') {
        await apiSecurity.initialize();
      }
      
      // Initialize i18n service if available
      if (typeof i18nService !== 'undefined') {
        await i18nService.init();
      }
      
      // Check for saved form data if configManager is available
      if (typeof configManager !== 'undefined') {
        this.loadSavedData();
      }
    } catch (error) {
      console.warn('Some services failed to initialize, using fallback mode:', error);
      // Continue with basic functionality
    }
  }
  
  /**
   * Initialize component state with optimized state subscriptions (if state manager available)
   */
  initializeState() {
    if (typeof stateManager === 'undefined') return;
    
    try {
      // Subscribe to global state sections with optimized update handling
      this.unsubscribeHandlers = [];
      
      // Subscribe to form data state
      this.unsubscribeHandlers.push(
        stateManager.subscribe('formData', state => {
          const prevFormData = this.formData;
          this.formData = state;
          
          // Only validate if important data has changed
          const fieldsChanged = this.hasImportantFieldsChanged(prevFormData, state);
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
          this.userIdentification = state;
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
      
      // Get initial state from state manager
      this.currentStep = stateManager.getState('formData').currentStep || 0;
      this.formData = stateManager.getState('formData');
      this.userIdentification = stateManager.getState('verification');
      
      const uiState = stateManager.getState('ui');
      this.isLoading = uiState.loading;
      this.apiError = uiState.alert;
      
      const resultsState = stateManager.getState('results');
      this.submitted = resultsState.isSubmitted;
      this.score = resultsState.score;
      this.trustLevel = resultsState.trustLevel;
      this.message = resultsState.message;
      this.adjustments = resultsState.adjustments;
    } catch (error) {
      console.warn('State manager initialization failed, using local state:', error);
    }
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
   * When the element is added to the DOM
   */
  connectedCallback() {
    console.log('Enhanced CASL Verification Element connected');
  }
  
  /**
   * When the element is removed from the DOM
   */
  disconnectedCallback() {
    // Clean up subscriptions if they exist
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
   * Render the component with accessibility enhancements and performance optimizations
   */
  render() {
    // Increment render count for monitoring
    this._renderCount = (this._renderCount || 0) + 1;
    
    // Start performance timer
    performanceMonitor.startTimer('render');
    
    const content = this.submitted ? this.renderResults() : this.renderForm();
    
    let html = `
      <style>${getStyles()}</style>
      <div class="container">
        <div class="header">
          <h1 id="page-title">CASL Key Verification</h1>
        </div>
        
        <main id="verification-main-content" tabindex="-1">
          ${content}
        </main>
      </div>
    `;
    
    this.shadowRoot.innerHTML = html;
    
    // Set first render to false after first render
    if (this.firstRender) {
      this.firstRender = false;
    }
    
    // End performance timer
    performanceMonitor.endTimer('render');
  }
  
  /**
   * Render the form based on current step
   */
  renderForm() {
    return `
      ${this.renderProgressSteps()}
      ${this.renderAlerts()}
      ${this.renderCurrentStep()}
      ${this.renderNavigationButtons()}
    `;
  }
  
  /**
   * Render progress steps
   */
  renderProgressSteps() {
    if (typeof renderProgressSteps !== 'undefined') {
      return renderProgressSteps(this.currentStep);
    }
    
    // Fallback progress display
    const steps = ['User Info', 'Booking', 'Stay Details', 'Agreement'];
    return `
      <div class="progress-steps">
        <div class="progress-bar">
          <div class="progress-indicator" style="width: ${((this.currentStep + 1) / steps.length) * 100}%"></div>
        </div>
        <p>Step ${this.currentStep + 1} of ${steps.length}: ${steps[this.currentStep]}</p>
      </div>
    `;
  }
  
  /**
   * Render alerts
   */
  renderAlerts() {
    if (typeof renderAlerts !== 'undefined') {
      return renderAlerts(this.showRestoredMessage, this.apiError);
    }
    
    // Fallback alert display
    if (!this.apiError) return '';
    
    return `
      <div class="alert alert-error" role="alert">
        <span>${this.apiError}</span>
        <button onclick="this.getRootNode().host.clearError()" aria-label="Dismiss error">×</button>
      </div>
    `;
  }
  
  /**
   * Render the current step content
   */
  renderCurrentStep() {
    // Try to use imported render functions first
    try {
      switch(this.currentStep) {
        case 0:
          if (typeof renderUserIdentification !== 'undefined') {
            return renderUserIdentification(
              this.formData, 
              this.errors, 
              this.userIdentification, 
              this.showScreenshotUpload, 
              this.screenshotData, 
              this.verificationStatus
            );
          }
          return this.renderUserIdentificationFallback();
        case 1:
          if (typeof renderBookingInfo !== 'undefined') {
            return renderBookingInfo(this.formData, this.errors);
          }
          return this.renderBookingInfoFallback();
        case 2:
          if (typeof renderStayIntent !== 'undefined') {
            return renderStayIntent(this.formData, this.errors);
          }
          return this.renderStayIntentFallback();
        case 3:
          if (typeof renderAgreement !== 'undefined') {
            return renderAgreement(this.formData, this.errors);
          }
          return this.renderAgreementFallback();
        default:
          return '';
      }
    } catch (error) {
      console.warn('Render function failed, using fallback:', error);
      // Use fallback methods
      switch(this.currentStep) {
        case 0: return this.renderUserIdentificationFallback();
        case 1: return this.renderBookingInfoFallback();
        case 2: return this.renderStayIntentFallback();
        case 3: return this.renderAgreementFallback();
        default: return '';
      }
    }
  }
  
  /**
   * Fallback render methods
   */
  renderUserIdentificationFallback() {
    return `
      <div class="form-section">
        <h2>User Identification</h2>
        
        <label for="name">Full Name *</label>
        <input type="text" id="name" name="name" value="${this.formData.name || ''}" required>
        ${this.errors.name ? `<div class="error">${this.errors.name}</div>` : ''}
        
        <label for="email">Email Address *</label>
        <input type="email" id="email" name="email" value="${this.formData.email || ''}" required>
        ${this.errors.email ? `<div class="error">${this.errors.email}</div>` : ''}
        
        <label for="phone">Phone Number *</label>
        <input type="tel" id="phone" name="phone" value="${this.formData.phone || ''}" required>
        ${this.errors.phone ? `<div class="error">${this.errors.phone}</div>` : ''}
        
        <label for="address">Address *</label>
        <textarea id="address" name="address" required>${this.formData.address || ''}</textarea>
        ${this.errors.address ? `<div class="error">${this.errors.address}</div>` : ''}
        
        <div class="checkbox-container">
          <input type="checkbox" id="consentToBackgroundCheck" name="consentToBackgroundCheck" ${this.formData.consentToBackgroundCheck ? 'checked' : ''}>
          <label for="consentToBackgroundCheck" class="checkbox-label">
            I consent to a background check for verification purposes
          </label>
        </div>
      </div>
    `;
  }
  
  renderBookingInfoFallback() {
    return `
      <div class="form-section">
        <h2>Booking Information</h2>
        
        <label for="platform">Booking Platform *</label>
        <select id="platform" name="platform" required>
          <option value="">Select platform</option>
          <option value="Airbnb" ${this.formData.platform === 'Airbnb' ? 'selected' : ''}>Airbnb</option>
          <option value="VRBO" ${this.formData.platform === 'VRBO' ? 'selected' : ''}>VRBO</option>
          <option value="Other" ${this.formData.platform === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        ${this.errors.platform ? `<div class="error">${this.errors.platform}</div>` : ''}
        
        <label for="listingLink">Listing URL *</label>
        <input type="url" id="listingLink" name="listingLink" value="${this.formData.listingLink || ''}" required>
        ${this.errors.listingLink ? `<div class="error">${this.errors.listingLink}</div>` : ''}
        
        <label for="checkInDate">Check-in Date *</label>
        <input type="date" id="checkInDate" name="checkInDate" value="${this.formData.checkInDate || ''}" required>
        ${this.errors.checkInDate ? `<div class="error">${this.errors.checkInDate}</div>` : ''}
        
        <label for="checkOutDate">Check-out Date *</label>
        <input type="date" id="checkOutDate" name="checkOutDate" value="${this.formData.checkOutDate || ''}" required>
        ${this.errors.checkOutDate ? `<div class="error">${this.errors.checkOutDate}</div>` : ''}
      </div>
    `;
  }
  
  renderStayIntentFallback() {
    return `
      <div class="form-section">
        <h2>Stay Details</h2>
        
        <label for="stayPurpose">Purpose of Stay *</label>
        <select id="stayPurpose" name="stayPurpose" required>
          <option value="">Select purpose</option>
          <option value="Vacation" ${this.formData.stayPurpose === 'Vacation' ? 'selected' : ''}>Vacation</option>
          <option value="Business" ${this.formData.stayPurpose === 'Business' ? 'selected' : ''}>Business</option>
          <option value="Family Visit" ${this.formData.stayPurpose === 'Family Visit' ? 'selected' : ''}>Family Visit</option>
          <option value="Other" ${this.formData.stayPurpose === 'Other' ? 'selected' : ''}>Other</option>
        </select>
        ${this.errors.stayPurpose ? `<div class="error">${this.errors.stayPurpose}</div>` : ''}
        
        <label for="totalGuests">Total Number of Guests *</label>
        <input type="number" id="totalGuests" name="totalGuests" value="${this.formData.totalGuests || 1}" min="1" max="20" required>
        ${this.errors.totalGuests ? `<div class="error">${this.errors.totalGuests}</div>` : ''}
        
        <div class="checkbox-container">
          <input type="checkbox" id="travelingNearHome" name="travelingNearHome" ${this.formData.travelingNearHome ? 'checked' : ''}>
          <label for="travelingNearHome" class="checkbox-label">
            I am traveling near my home area (within 100 miles)
          </label>
        </div>
        
        <div class="checkbox-container">
          <input type="checkbox" id="usedSTRBefore" name="usedSTRBefore" ${this.formData.usedSTRBefore ? 'checked' : ''}>
          <label for="usedSTRBefore" class="checkbox-label">
            I have used short-term rentals before
          </label>
        </div>
      </div>
    `;
  }
  
  renderAgreementFallback() {
    return `
      <div class="form-section">
        <h2>Agreement</h2>
        
        <div class="checkbox-container">
          <input type="checkbox" id="agreeToRules" name="agreeToRules" ${this.formData.agreeToRules ? 'checked' : ''} required>
          <label for="agreeToRules" class="checkbox-label">
            I agree to follow all house rules and property guidelines *
          </label>
        </div>
        ${this.errors.agreeToRules ? `<div class="error">${this.errors.agreeToRules}</div>` : ''}
        
        <div class="checkbox-container">
          <input type="checkbox" id="agreeNoParties" name="agreeNoParties" ${this.formData.agreeNoParties ? 'checked' : ''} required>
          <label for="agreeNoParties" class="checkbox-label">
            I agree not to host parties or large gatherings *
          </label>
        </div>
        ${this.errors.agreeNoParties ? `<div class="error">${this.errors.agreeNoParties}</div>` : ''}
        
        <div class="checkbox-container">
          <input type="checkbox" id="understandFlagging" name="understandFlagging" ${this.formData.understandFlagging ? 'checked' : ''} required>
          <label for="understandFlagging" class="checkbox-label">
            I understand that inappropriate behavior may result in flags on my verification *
          </label>
        </div>
        ${this.errors.understandFlagging ? `<div class="error">${this.errors.understandFlagging}</div>` : ''}
      </div>
    `;
  }
  
  /**
   * Render navigation buttons
   */
  renderNavigationButtons() {
    if (typeof renderNavigationButtons !== 'undefined') {
      return renderNavigationButtons(this.currentStep, this.isFormValid, this.isLoading);
    }
    
    // Fallback navigation
    return `
      <div class="navigation-buttons">
        ${this.currentStep > 0 ? `
          <button onclick="this.getRootNode().host.previousStep()">
            Previous
          </button>
        ` : ''}
        
        <button onclick="this.getRootNode().host.nextStep()" ${this.isLoading ? 'disabled' : ''}>
          ${this.isLoading ? 'Loading...' : (this.currentStep < 3 ? 'Next' : 'Submit')}
        </button>
      </div>
    `;
  }
  
  /**
   * Render verification results
   */
  renderResults() {
    if (typeof renderResults !== 'undefined') {
      return renderResults(
        this.userIdentification,
        this.trustLevel,
        this.score,
        this.message,
        this.adjustments
      );
    }
    
    // Fallback results display
    return `
      <div class="result-card">
        <h2>Verification Complete!</h2>
        
        <div class="trust-badge" style="background-color: #4CAF50;">
          ${this.trustLevel || 'Verified'}
        </div>
        
        <div class="score-display">
          <span class="score-number">${this.score}</span>
          <span class="score-max">/100</span>
        </div>
        
        <div class="result-message">
          ${this.message || 'Your CASL Key verification has been completed successfully.'}
        </div>
        
        <button onclick="this.getRootNode().host.reset()">
          Start New Verification
        </button>
      </div>
    `;
  }
  
  /**
   * Handle input changes
   */
  handleInputChange(event) {
    const { name, value, type, checked } = event.target;
    const inputValue = type === 'checkbox' ? checked : value;
    
    this.formData[name] = inputValue;
    this.validateCurrentStep();
    this.render();
  }
  
  /**
   * Validate current step
   */
  validateCurrentStep() {
    this.errors = {};
    
    switch(this.currentStep) {
      case 0:
        if (!this.formData.name) this.errors.name = 'Name is required';
        if (!this.formData.email) this.errors.email = 'Email is required';
        if (!this.formData.phone) this.errors.phone = 'Phone is required';
        if (!this.formData.address) this.errors.address = 'Address is required';
        break;
      case 1:
        if (!this.formData.platform) this.errors.platform = 'Platform is required';
        if (!this.formData.listingLink) this.errors.listingLink = 'Listing URL is required';
        if (!this.formData.checkInDate) this.errors.checkInDate = 'Check-in date is required';
        if (!this.formData.checkOutDate) this.errors.checkOutDate = 'Check-out date is required';
        break;
      case 2:
        if (!this.formData.stayPurpose) this.errors.stayPurpose = 'Purpose is required';
        if (!this.formData.totalGuests || this.formData.totalGuests < 1) this.errors.totalGuests = 'Valid guest count is required';
        break;
      case 3:
        if (!this.formData.agreeToRules) this.errors.agreeToRules = 'Must agree to rules';
        if (!this.formData.agreeNoParties) this.errors.agreeNoParties = 'Must agree to no parties';
        if (!this.formData.understandFlagging) this.errors.understandFlagging = 'Must understand flagging policy';
        break;
    }
    
    this.isFormValid = Object.keys(this.errors).length === 0;
  }
  
  /**
   * Validate form based on current step
   */
  validateForm() {
    if (typeof validateUserIdentification !== 'undefined') {
      // Use imported validation functions
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
      
      this.errors = stepErrors;
      this.isFormValid = typeof isStepValid !== 'undefined' ? isStepValid(stepErrors) : Object.keys(stepErrors).length === 0;
    } else {
      // Use fallback validation
      this.validateCurrentStep();
    }
  }
  
  /**
   * Go to next step
   */
  nextStep() {
    this.validateForm();
    
    if (!this.isFormValid) {
      this.render();
      return;
    }
    
    if (this.currentStep < 3) {
      this.currentStep++;
      this.formData.currentStep = this.currentStep;
      this.render();
    } else {
      this.submit();
    }
  }
  
  /**
   * Go to previous step
   */
  previousStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.formData.currentStep = this.currentStep;
      this.render();
    }
  }
  
  /**
   * Submit verification
   */
  async submit() {
    this.isLoading = true;
    this.render();
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Calculate a simple score
      let score = 70;
      if (this.formData.consentToBackgroundCheck) score += 15;
      if (this.formData.usedSTRBefore) score += 10;
      if (!this.formData.travelingNearHome) score += 5;
      
      this.score = score;
      this.trustLevel = score >= 85 ? 'Verified' : score >= 70 ? 'Review' : 'Manual Review';
      this.message = `Verification completed with a score of ${score}/100.`;
      this.submitted = true;
      
      // Dispatch completion event
      const event = new CustomEvent('verificationComplete', {
        detail: {
          caslKeyId: `CASL-${Date.now()}`,
          trustLevel: this.trustLevel,
          verificationData: this.formData
        },
        bubbles: true,
        composed: true
      });
      this.dispatchEvent(event);
      
    } catch (error) {
      this.apiError = 'Submission failed. Please try again.';
    } finally {
      this.isLoading = false;
      this.render();
    }
  }
  
  /**
   * Reset form
   */
  reset() {
    this.currentStep = 0;
    this.formData = {
      name: '', email: '', phone: '', address: '', platform: '', listingLink: '',
      checkInDate: '', checkOutDate: '', stayPurpose: '', totalGuests: 1,
      travelingNearHome: false, usedSTRBefore: false, agreeToRules: false,
      agreeNoParties: false, understandFlagging: false, consentToBackgroundCheck: false,
      currentStep: 0
    };
    this.errors = {};
    this.submitted = false;
    this.apiError = null;
    this.render();
  }
  
  /**
   * Clear error
   */
  clearError() {
    this.apiError = null;
    this.render();
  }
  
  /**
   * Save form data to storage with performance optimization
   */
  saveFormData() {
    if (this.submitted) return;
    
    try {
      const data = {
        formData: this.formData,
        currentStep: this.currentStep,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('casl_saved_form_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Error saving form data:', error);
    }
  }
  
  /**
   * Load saved form data from storage
   */
  loadSavedData() {
    try {
      const dataStr = localStorage.getItem('casl_saved_form_data');
      if (!dataStr) return;
      
      const data = JSON.parse(dataStr);
      
      // Check if data is expired (24 hours)
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - timestamp > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('casl_saved_form_data');
        return;
      }
      
      // Restore data
      if (data.formData) {
        this.currentStep = data.currentStep || 0;
        this.formData = { ...this.formData, ...data.formData };
        this.showRestoredMessage = true;
        
        // Auto-hide restored message after 5 seconds
        setTimeout(() => {
          this.showRestoredMessage = false;
          this.render();
        }, 5000);
        
        this.validateForm();
      }
    } catch (error) {
      console.warn('Error loading saved form data:', error);
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    this.addEventListener('change', this.handleInputChange.bind(this));
    this.addEventListener('input', this.handleInputChange.bind(this));
  }
}

// Register the custom element
customElements.define('casl-verification', CASLVerification);