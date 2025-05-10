// src/components/UserDashboard.js
import { getStyles } from './common/Styles.js';
import { userService } from '../services/userService.js';
import { i18nService, t } from '../services/i18n.js';
import { API_BASE_URL } from '../utils/constants.js';

/**
 * User Dashboard component for CASL Key Verification
 * Shows verification history and allows purchasing new verifications
 */
export class UserDashboard extends HTMLElement {
  /**
   * Constructor initializes the component
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Initialize state
    this.initializeState();
    
    // Render and setup
    this.render();
    this.setupEventListeners();
  }
  
  /**
   * Initialize component state
   */
  initializeState() {
    this.isLoading = false;
    this.error = null;
    this.user = null;
    this.verificationHistory = [];
    this.packages = [];
    
    // Load data
    this.loadDashboardData();
  }
  
  /**
   * When the element is added to the DOM
   */
  connectedCallback() {
    console.log('UserDashboard component connected');
    
    // Listen for authentication events
    document.addEventListener('casl-auth', this.handleAuthEvent.bind(this));
  }
  
  /**
   * When the element is removed from the DOM
   */
  disconnectedCallback() {
    // Remove event listeners
    document.removeEventListener('casl-auth', this.handleAuthEvent.bind(this));
  }
  
  /**
   * Handle authentication events
   * @param {CustomEvent} event - Authentication event
   */
  handleAuthEvent(event) {
    const { type, data } = event.detail;
    
    if (type === 'authenticated') {
      this.user = data;
      this.loadDashboardData();
    } else if (type === 'logged-out') {
      // Redirect back to authentication
      this.dispatchDashboardEvent('logout');
    }
  }
  
  /**
   * Load dashboard data
   */
  async loadDashboardData() {
    if (!this.user) {
      const authState = await userService.getCurrentUser();
      if (!authState.isAuthenticated) {
        // Redirect to authentication if not logged in
        this.dispatchDashboardEvent('auth-required');
        return;
      }
      
      this.user = authState.user;
    }
    
    this.isLoading = true;
    this.error = null;
    this.render();
    
    try {
      // Load verification history
      await this.loadVerificationHistory();
      
      // Load available packages
      await this.loadPackages();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.error = error.message || t('dashboard.loadError');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }
  
  /**
   * Load user's verification history
   */
  async loadVerificationHistory() {
    const headers = {
      'Content-Type': 'application/json',
      ...userService.getAuthHeaders()
    };
    
    const response = await fetch(`${API_BASE_URL}/verification-history`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(t('dashboard.historyLoadError'));
    }
    
    const result = await response.json();
    this.verificationHistory = result.verifications || [];
  }
  
  /**
   * Load available packages
   */
  async loadPackages() {
    const response = await fetch(`${API_BASE_URL}/packages`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(t('dashboard.packagesLoadError'));
    }
    
    const result = await response.json();
    this.packages = result.packages || [];
  }
  
  /**
   * Render the component
   */
  render() {
    let content;
    
    if (this.isLoading) {
      content = this.renderLoading();
    } else if (this.error) {
      content = this.renderError();
    } else {
      content = this.renderDashboard();
    }
    
    this.shadowRoot.innerHTML = `
      <style>${getStyles()}</style>
      <div class="container" dir="${i18nService.getLanguageInfo(i18nService.currentLanguage)?.direction || 'ltr'}">
        ${content}
      </div>
    `;
  }
  
  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>${t('dashboard.loading')}</p>
      </div>
    `;
  }
  
  /**
   * Render error state
   */
  renderError() {
    return `
      <div class="error-container">
        <div class="alert alert-error" role="alert">
          ${this.error}
        </div>
        <button 
          class="btn-primary" 
          onclick="this.getRootNode().host.loadDashboardData()"
        >
          ${t('dashboard.retry')}
        </button>
      </div>
    `;
  }
  
  /**
   * Render dashboard content
   */
  renderDashboard() {
    return `
      <div class="dashboard">
        <div class="dashboard-header">
          <h1>${t('dashboard.welcome', { username: this.user?.username || 'User' })}</h1>
          <button 
            class="btn-secondary" 
            onclick="this.getRootNode().host.handleLogout()"
          >
            ${t('dashboard.logout')}
          </button>
        </div>
        
        <div class="dashboard-content">
          ${this.renderVerificationHistory()}
          ${this.renderPackages()}
        </div>
        
        <div class="dashboard-actions">
          <button 
            class="btn-primary" 
            onclick="this.getRootNode().host.startNewVerification()"
          >
            ${t('dashboard.newVerification')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render verification history
   */
  renderVerificationHistory() {
    if (this.verificationHistory.length === 0) {
      return `
        <div class="verification-history">
          <h2>${t('dashboard.verificationHistory')}</h2>
          <div class="empty-state">
            <p>${t('dashboard.noHistory')}</p>
          </div>
        </div>
      `;
    }
    
    return `
      <div class="verification-history">
        <h2>${t('dashboard.verificationHistory')}</h2>
        <div class="verification-cards">
          ${this.verificationHistory.map(verification => this.renderVerificationCard(verification)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render a verification card
   * @param {Object} verification - Verification data
   */
  renderVerificationCard(verification) {
    // Format date
    const date = new Date(verification.verificationDate);
    const formattedDate = i18nService.formatDate(date);
    
    // Get trust level display data
    const trustLevelLabel = t(`trustLevel.${verification.trustLevel}`) || verification.trustLevel;
    const score = verification.score || 0;
    
    // Determine badge color based on trust level
    let badgeColor = '#4CAF50'; // Default green
    if (verification.trustLevel === 'review') {
      badgeColor = '#FFC107'; // Yellow
    } else if (verification.trustLevel === 'manual_review') {
      badgeColor = '#9E9E9E'; // Gray
    } else if (verification.trustLevel === 'not_eligible') {
      badgeColor = '#757575'; // Dark gray
    }
    
    return `
      <div class="verification-card">
        <div class="verification-header">
          <div class="trust-badge" style="background-color: ${badgeColor}">
            ${trustLevelLabel}
          </div>
          <div class="verification-date">
            ${formattedDate}
          </div>
        </div>
        
        <div class="verification-body">
          <div class="verification-score">
            <span class="score-number">${score}</span>
            <span class="score-max">/100</span>
          </div>
          
          <div class="verification-details">
            <p class="casl-key-id">CASL Key ID: ${verification.caslKeyId}</p>
            <p class="booking-info">
              ${verification.booking?.platform ? `${verification.booking.platform}` : ''}
              ${verification.booking?.checkInDate ? ` | Check-in: ${i18nService.formatDate(new Date(verification.booking.checkInDate))}` : ''}
            </p>
          </div>
        </div>
        
        <div class="verification-actions">
          <button 
            class="btn-link" 
            onclick="this.getRootNode().host.viewVerificationDetails('${verification.caslKeyId}')"
          >
            ${t('dashboard.viewDetails')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render available packages
   */
  renderPackages() {
    if (this.packages.length === 0) {
      return '';
    }
    
    return `
      <div class="packages-section">
        <h2>${t('dashboard.availablePackages')}</h2>
        <div class="package-cards">
          ${this.packages.map(pkg => this.renderPackageCard(pkg)).join('')}
        </div>
      </div>
    `;
  }
  
  /**
   * Render a package card
   * @param {Object} pkg - Package data
   */
  renderPackageCard(pkg) {
    return `
      <div class="package-card">
        <div class="package-header">
          <h3>${pkg.name}</h3>
          <div class="package-price">
            ${i18nService.formatCurrency(pkg.price, pkg.currency)}
          </div>
        </div>
        
        <div class="package-body">
          <p class="package-description">${pkg.description}</p>
          <ul class="package-features">
            ${pkg.features.map(feature => `<li>${feature}</li>`).join('')}
          </ul>
        </div>
        
        <div class="package-actions">
          <button 
            class="btn-primary" 
            onclick="this.getRootNode().host.purchasePackage('${pkg.id}')"
            data-package-id="${pkg.id}"
          >
            ${t('dashboard.purchase')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * View verification details
   * @param {string} caslKeyId - CASL Key ID
   */
  async viewVerificationDetails(caslKeyId) {
    try {
      // Find verification in history
      const verification = this.verificationHistory.find(v => v.caslKeyId === caslKeyId);
      
      if (!verification) {
        throw new Error(t('dashboard.verificationNotFound'));
      }
      
      // Dispatch event to show verification details
      this.dispatchDashboardEvent('view-verification', { verification });
    } catch (error) {
      console.error('Error viewing verification details:', error);
      this.error = error.message;
      this.render();
    }
  }
  
  /**
   * Start a new verification
   */
  startNewVerification() {
    // Check if user has available verifications
    const hasAvailableVerifications = this.verificationHistory.length === 0 || 
                                     this.hasUnusedVerificationSlots();
    
    if (hasAvailableVerifications) {
      // Dispatch event to start new verification
      this.dispatchDashboardEvent('new-verification');
    } else {
      // Show package purchase dialog
      this.dispatchDashboardEvent('show-packages');
    }
  }
  
  /**
   * Check if user has unused verification slots
   * @returns {boolean} Whether user has unused slots
   */
  hasUnusedVerificationSlots() {
    // This would check against the user's purchased packages
    // For demo purposes, we'll return true if they've purchased any packages
    return this.user?.purchasedPackages?.some(pkg => pkg.remainingVerifications > 0) || false;
  }
  
  /**
   * Purchase a package
   * @param {string} packageId - Package ID
   */
  purchasePackage(packageId) {
    // Find package
    const pkg = this.packages.find(p => p.id === packageId);
    
    if (!pkg) {
      this.error = t('dashboard.packageNotFound');
      this.render();
      return;
    }
    
    // Launch Wix payment flow
    this.dispatchDashboardEvent('purchase-package', { 
      package: pkg,
      userId: this.user.id
    });
  }
  
  /**
   * Handle package purchase success
   * @param {Object} packageData - Purchased package data
   */
  handlePackagePurchased(packageData) {
    // Update user data
    if (!this.user.purchasedPackages) {
      this.user.purchasedPackages = [];
    }
    
    this.user.purchasedPackages.push({
      packageId: packageData.id,
      purchaseDate: new Date().toISOString(),
      remainingVerifications: packageData.verificationCount,
      expiryDate: packageData.expiryDate
    });
    
    // Reload dashboard data
    this.loadDashboardData();
  }
  
  /**
   * Handle logout
   */
  handleLogout() {
    userService.logoutUser().then(() => {
      // Dispatch logout event
      this.dispatchDashboardEvent('logout');
    });
  }
  
  /**
   * Dispatch dashboard event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  dispatchDashboardEvent(type, data = null) {
    const event = new CustomEvent('casl-dashboard', {
      detail: {
        type,
        data
      },
      bubbles: true,
      composed: true
    });
    
    this.dispatchEvent(event);
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for package purchase success
    window.addEventListener('casl-package-purchased', (event) => {
      this.handlePackagePurchased(event.detail);
    });
  }
}

// Register the custom element
customElements.define('casl-user-dashboard', UserDashboard);
