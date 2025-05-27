// src/components/CASLApp.js
import { getStyles } from './styles.js';
import { i18nService, t } from './i18n.js';
import { userService } from './userService.js';
import { paymentService } from './paymentService.js';

/**
 * Main CASL App component that manages authentication, dashboard, and verification
 */
export class CASLApp extends HTMLElement {
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
    
    // Check for authentication
    this.checkAuthentication();
    
    // Check for pending payments
    this.checkPendingPayment();
  }
  
  /**
   * Initialize component state
   */
  initializeState() {
    this.currentView = 'loading'; // loading, auth, dashboard, verification
    this.error = null;
    this.user = null;
    this.selectedVerification = null;
  }
  
  /**
   * When the element is added to the DOM
   */
  connectedCallback() {
    console.log('CASL App component connected');
  }
  
  /**
   * Check for authentication
   */
  async checkAuthentication() {
    try {
      const authState = await userService.getCurrentUser();
      
      if (authState.isAuthenticated) {
        this.user = authState.user;
        this.currentView = 'dashboard';
      } else {
        this.currentView = 'auth';
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      this.error = error.message;
      this.currentView = 'auth';
    }
    
    this.render();
  }
  
  /**
   * Check for pending payment after redirect
   */
  async checkPendingPayment() {
    try {
      const paymentResult = await paymentService.checkPendingPayment();
      
      if (paymentResult && paymentResult.success) {
        // Show success message
        this.showNotification('Payment successful! Your package has been activated.');
      } else if (paymentResult && !paymentResult.success) {
        // Show error message
        this.showNotification(paymentResult.error || 'Payment was not completed', 'error');
      }
    } catch (error) {
      console.error('Error checking pending payment:', error);
    }
  }
  
  /**
   * Render the component
   */
  render() {
    let content;
    
    switch (this.currentView) {
      case 'loading':
        content = this.renderLoading();
        break;
      case 'auth':
        content = this.renderAuth();
        break;
      case 'dashboard':
        content = this.renderDashboard();
        break;
      case 'verification':
        content = this.renderVerification();
        break;
      case 'verification-details':
        content = this.renderVerificationDetails();
        break;
      default:
        content = this.renderError('Invalid view');
    }
    
    this.shadowRoot.innerHTML = `
      <style>${getStyles()}</style>
      <div class="app-container" dir="${i18nService.getLanguageInfo(i18nService.currentLanguage)?.direction || 'ltr'}">
        ${this.renderHeader()}
        <div class="app-content">
          ${content}
        </div>
        ${this.renderFooter()}
      </div>
    `;
  }
  
  /**
   * Render header
   */
  renderHeader() {
    return `
      <header class="app-header">
        <div class="branding">
          <h1>CASL Key Verification</h1>
        </div>
        <div class="language-selector">
          ${i18nService.renderLanguageSelector()}
        </div>
      </header>
    `;
  }
  
  /**
   * Render footer
   */
  renderFooter() {
    return `
      <footer class="app-footer">
        <p>© ${new Date().getFullYear()} CASL Key Verification. All rights reserved.</p>
      </footer>
    `;
  }
  
  /**
   * Render loading state
   */
  renderLoading() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>${t('app.loading')}</p>
      </div>
    `;
  }
  
  /**
   * Render authentication view
   */
  renderAuth() {
    return `<casl-authentication></casl-authentication>`;
  }
  
  /**
   * Render dashboard view
   */
  renderDashboard() {
    return `<casl-user-dashboard></casl-user-dashboard>`;
  }
  
  /**
   * Render verification view
   */
  renderVerification() {
    return `
      <div class="verification-container">
        <casl-verification></casl-verification>
      </div>
    `;
  }
  
  /**
   * Render verification details view
   */
  renderVerificationDetails() {
    if (!this.selectedVerification) {
      return this.renderError('No verification selected');
    }
    
    // Format date
    const date = new Date(this.selectedVerification.verificationDate);
    const formattedDate = i18nService.formatDate(date);
    
    // Get trust level display data
    const trustLevelLabel = t(`trustLevel.${this.selectedVerification.trustLevel}`) || this.selectedVerification.trustLevel;
    
    return `
      <div class="verification-details">
        <div class="back-button">
          <button onclick="this.getRootNode().host.navigateTo('dashboard')">
            ← ${t('app.backToDashboard')}
          </button>
        </div>
        
        <h2>${t('app.verificationDetails')}</h2>
        
        <div class="details-card">
          <div class="detail-header">
            <h3>CASL Key ID: ${this.selectedVerification.caslKeyId}</h3>
            <p class="verification-date">${formattedDate}</p>
          </div>
          
          <div class="detail-body">
            <div class="trust-level-section">
              <h4>${t('app.trustLevel')}</h4>
              <div class="trust-badge">${trustLevelLabel}</div>
              <div class="score">
                <span class="score-number">${this.selectedVerification.score}</span>
                <span class="score-max">/100</span>
              </div>
            </div>
            
            <div class="verification-methods">
              <h4>${t('app.verificationMethods')}</h4>
              <ul>
                ${this.selectedVerification.verification.verificationType ? 
                  `<li>${t('app.' + this.selectedVerification.verification.verificationType)}</li>` : ''}
                ${this.selectedVerification.verification.backgroundCheckStatus ? 
                  `<li>${t('app.backgroundCheck')}</li>` : ''}
                ${this.selectedVerification.verification.idVerificationStatus ? 
                  `<li>${t('app.idVerification')}</li>` : ''}
                ${this.selectedVerification.verification.phoneVerificationStatus ? 
                  `<li>${t('app.phoneVerification')}</li>` : ''}
                ${this.selectedVerification.verification.socialVerificationStatus ? 
                  `<li>${t('app.socialVerification')}</li>` : ''}
              </ul>
            </div>
            
            <div class="booking-details">
              <h4>${t('app.bookingDetails')}</h4>
              <table>
                <tr>
                  <th>${t('app.platform')}</th>
                  <td>${this.selectedVerification.booking?.platform || '-'}</td>
                </tr>
                <tr>
                  <th>${t('app.checkInDate')}</th>
                  <td>${this.selectedVerification.booking?.checkInDate ? 
                    i18nService.formatDate(new Date(this.selectedVerification.booking.checkInDate)) : '-'}</td>
                </tr>
                <tr>
                  <th>${t('app.checkOutDate')}</th>
                  <td>${this.selectedVerification.booking?.checkOutDate ? 
                    i18nService.formatDate(new Date(this.selectedVerification.booking.checkOutDate)) : '-'}</td>
                </tr>
              </table>
            </div>
            
            <div class="score-factors">
              <h4>${t('app.scoreFactors')}</h4>
              ${this.selectedVerification.verification.adjustments && 
                this.selectedVerification.verification.adjustments.length > 0 ? `
                <ul>
                  ${this.selectedVerification.verification.adjustments.map(adj => `
                    <li class="${adj.points > 0 ? 'positive' : 'negative'}">
                      ${adj.reason} (${adj.points > 0 ? '+' : ''}${adj.points})
                    </li>
                  `).join('')}
                </ul>
              ` : `
                <p>${t('app.noScoreFactors')}</p>
              `}
            </div>
          </div>
          
          <div class="detail-actions">
            <button 
              class="btn-primary" 
              onclick="this.getRootNode().host.printVerification('${this.selectedVerification.caslKeyId}')"
            >
              ${t('app.printVerification')}
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Render error state
   * @param {string} message - Error message
   */
  renderError(message) {
    return `
      <div class="error-container">
        <div class="alert alert-error" role="alert">
          ${message || this.error || t('app.genericError')}
        </div>
        <button 
          class="btn-primary" 
          onclick="this.getRootNode().host.navigateTo('dashboard')"
        >
          ${t('app.retry')}
        </button>
      </div>
    `;
  }
  
  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info)
   */
  showNotification(message, type = 'success') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);
    
    // Add to shadow root
    this.shadowRoot.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }
  
  /**
   * Navigate to a view
   * @param {string} view - View name
   * @param {Object} data - View data
   */
  navigateTo(view, data = null) {
    this.currentView = view;
    
    if (view === 'verification-details' && data) {
      this.selectedVerification = data.verification;
    }
    
    this.render();
  }
  
  /**
   * Print verification
   * @param {string} caslKeyId - CASL Key ID
   */
  printVerification(caslKeyId) {
    // Create a printable version of the verification
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      this.showNotification('Please allow pop-ups to print verification', 'error');
      return;
    }
    
    // Format verification data for printing
    const verification = this.selectedVerification;
    const date = new Date(verification.verificationDate);
    const formattedDate = i18nService.formatDate(date);
    const trustLevelLabel = t(`trustLevel.${verification.trustLevel}`) || verification.trustLevel;
    
    // Create print content
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>CASL Key Verification - ${verification.caslKeyId}</title>
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
          <div class="logo">CASL Key Verification</div>
          <div class="verification-id">ID: ${verification.caslKeyId}</div>
          <div class="verification-date">Verified on ${formattedDate}</div>
        </div>
        
        <div class="section">
          <h2>Trust Level</h2>
          <div class="trust-badge">${trustLevelLabel}</div>
          <div class="score">
            <span class="score-number">${verification.score}</span>
            <span class="score-max">/100</span>
          </div>
        </div>
        
        <div class="section">
          <h2>Verification Methods</h2>
          <table>
            <tr>
              <th>Primary Method</th>
              <td>${t('app.' + (verification.verification.verificationType || 'notSpecified'))}</td>
            </tr>
            ${verification.verification.backgroundCheckStatus ? `
              <tr>
                <th>Background Check</th>
                <td>${t('app.completed')}</td>
              </tr>
            ` : ''}
            ${verification.verification.idVerificationStatus ? `
              <tr>
                <th>ID Verification</th>
                <td>${t('app.completed')}</td>
              </tr>
            ` : ''}
            ${verification.verification.phoneVerificationStatus ? `
              <tr>
                <th>Phone Verification</th>
                <td>${t('app.completed')}</td>
              </tr>
            ` : ''}
            ${verification.verification.socialVerificationStatus ? `
              <tr>
                <th>Social Media Verification</th>
                <td>${t('app.completed')}</td>
              </tr>
            ` : ''}
          </table>
        </div>
        
        <div class="section">
          <h2>Booking Information</h2>
          <table>
            <tr>
              <th>Platform</th>
              <td>${verification.booking?.platform || '-'}</td>
            </tr>
            <tr>
              <th>Check-in Date</th>
              <td>${verification.booking?.checkInDate ? 
                i18nService.formatDate(new Date(verification.booking.checkInDate)) : '-'}</td>
            </tr>
            <tr>
              <th>Check-out Date</th>
              <td>${verification.booking?.checkOutDate ? 
                i18nService.formatDate(new Date(verification.booking.checkOutDate)) : '-'}</td>
            </tr>
          </table>
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
  }
  
  /**
   * Handle authentication events
   * @param {CustomEvent} event - Authentication event
   */
  handleAuthEvent(event) {
    const { type, data } = event.detail;
    
    switch (type) {
      case 'authenticated':
        this.user = data;
        this.navigateTo('dashboard');
        break;
      
      case 'logged-out':
        this.user = null;
        this.navigateTo('auth');
        break;
      
      case 'registration-pending':
        this.showNotification(`Registration successful! Please check your email to confirm your account.`);
        break;
    }
  }
  
  /**
   * Handle dashboard events
   * @param {CustomEvent} event - Dashboard event
   */
  handleDashboardEvent(event) {
    const { type, data } = event.detail;
    
    switch (type) {
      case 'new-verification':
        this.navigateTo('verification');
        break;
      
      case 'view-verification':
        this.navigateTo('verification-details', data);
        break;
      
      case 'purchase-package':
        this.handlePackagePurchase(data);
        break;
      
      case 'logout':
        this.user = null;
        this.navigateTo('auth');
        break;
    }
  }
  
  /**
   * Handle verification events
   * @param {CustomEvent} event - Verification event
   */
  handleVerificationEvent(event) {
    const { caslKeyId, trustLevel, verificationData } = event.detail;
    
    // Add to user's verification history (this would normally be done by the server)
    this.showNotification(`Verification complete! Your CASL Key ID is ${caslKeyId}`);
    
    // Navigate to dashboard
    setTimeout(() => {
      this.navigateTo('dashboard');
    }, 2000);
  }
  
  /**
   * Handle package purchase
   * @param {Object} data - Package data
   */
  async handlePackagePurchase(data) {
    try {
      // Start payment process
      const result = await paymentService.startPayment(data.package, data.userId);
      
      if (result && result.success) {
        // Show success message
        this.showNotification('Payment successful! Your package has been activated.');
        
        // Navigate to dashboard
        this.navigateTo('dashboard');
      }
    } catch (error) {
      console.error('Payment error:', error);
      this.showNotification(error.message || 'Payment processing error', 'error');
    }
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for authentication events
    this.addEventListener('casl-auth', this.handleAuthEvent.bind(this));
    
    // Listen for dashboard events
    this.addEventListener('casl-dashboard', this.handleDashboardEvent.bind(this));
    
    // Listen for verification events
    this.addEventListener('verificationComplete', this.handleVerificationEvent.bind(this));
    
    // Listen for language changes
    document.addEventListener('caslLanguageChanged', () => {
      this.render();
    });
  }
    /**
   * Handle language change from selector
   */
  handleLanguageChange(event) {
    const selectedLang = event.target.value;
    if (!selectedLang) return;

    i18nService.changeLanguage(selectedLang).then(() => {
      this.render();
    });
  }

}

// Register the custom element
customElements.define('casl-app', CASLApp);
