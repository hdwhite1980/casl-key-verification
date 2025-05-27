// src/components/CASLApp.js
import { getStyles } from './styles.js';
import { i18nService, t } from './i18n.js';
import { userService } from './userService.js';
import { paymentService } from './paymentService.js';

export class CASLApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.initializeState();
    this.render();
    this.setupEventListeners();
    this.checkAuthentication();
    this.checkPendingPayment();
  }

  initializeState() {
    this.currentView = 'loading';
    this.error = null;
    this.user = null;
    this.selectedVerification = null;
  }

  connectedCallback() {
    console.log('CASL App component connected');
  }

  async checkAuthentication() {
    try {
      await userService.whenReady();
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

  async checkPendingPayment() {
    try {
      const paymentResult = await paymentService.checkPendingPayment();
      if (paymentResult?.success) {
        this.showNotification('Payment successful! Your package has been activated.');
      } else if (paymentResult && !paymentResult.success) {
        this.showNotification(paymentResult.error || 'Payment was not completed', 'error');
      }
    } catch (error) {
      console.error('Error checking pending payment:', error);
    }
  }

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

  renderFooter() {
    return `
      <footer class="app-footer">
        <p>© ${new Date().getFullYear()} CASL Key Verification. All rights reserved.</p>
      </footer>
    `;
  }

  renderLoading() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>${t('app.loading')}</p>
      </div>
    `;
  }

  renderAuth() {
    return `<casl-authentication></casl-authentication>`;
  }

  renderDashboard() {
    return `<casl-user-dashboard></casl-user-dashboard>`;
  }

  renderVerification() {
    return `
      <div class="verification-container">
        <casl-verification></casl-verification>
      </div>
    `;
  }

  renderVerificationDetails() {
    if (!this.selectedVerification) return this.renderError('No verification selected');
    const date = new Date(this.selectedVerification.verificationDate);
    const formattedDate = i18nService.formatDate(date);
    const trustLevelLabel = t(`trustLevel.${this.selectedVerification.trustLevel}`) || this.selectedVerification.trustLevel;

    return `
      <div class="verification-details">
        <div class="back-button">
          <button onclick="this.getRootNode().host.navigateTo('dashboard')">← ${t('app.backToDashboard')}</button>
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
          </div>
        </div>
      </div>
    `;
  }

  renderError(message) {
    return `
      <div class="error-container">
        <div class="alert alert-error" role="alert">
          ${message || this.error || t('app.genericError')}
        </div>
        <button class="btn-primary" onclick="this.getRootNode().host.navigateTo('dashboard')">
          ${t('app.retry')}
        </button>
      </div>
    `;
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    const closeButton = document.createElement('button');
    closeButton.className = 'notification-close';
    closeButton.innerHTML = '&times;';
    closeButton.onclick = () => notification.remove();
    notification.appendChild(closeButton);

    this.shadowRoot.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
  }

  navigateTo(view, data = null) {
    this.currentView = view;
    if (view === 'verification-details' && data) {
      this.selectedVerification = data.verification;
    }
    this.render();
  }

  setupEventListeners() {
    this.addEventListener('casl-auth', this.handleAuthEvent.bind(this));
    this.addEventListener('casl-dashboard', this.handleDashboardEvent.bind(this));
    this.addEventListener('verificationComplete', this.handleVerificationEvent.bind(this));
    document.addEventListener('caslLanguageChanged', () => this.render());
  }

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
        this.showNotification('Registration successful! Please check your email to confirm your account.');
        break;
    }
  }

  handleDashboardEvent(event) {
    const { type, data } = event.detail;
    switch (type) {
      case 'new-verification':
        this.navigateTo('verification');
        break;
      case 'view-verification':
        this.navigateTo('verification-details', data);
        break;
      case 'logout':
        this.user = null;
        this.navigateTo('auth');
        break;
    }
  }

  handleVerificationEvent(event) {
    const { caslKeyId } = event.detail;
    this.showNotification(`Verification complete! Your CASL Key ID is ${caslKeyId}`);
    setTimeout(() => this.navigateTo('dashboard'), 2000);
  }
}

customElements.define('casl-app', CASLApp);
