// Fixed CASLApp.js - No ES6 imports, uses global variables instead

/**
 * Main CASL App component that manages authentication, dashboard, and verification
 */
class CASLApp extends HTMLElement {
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
    
    // Check for authentication (with delay to ensure services are ready)
    setTimeout(() => {
      this.checkAuthentication();
    }, 100);
    
    // Check for pending payments
    setTimeout(() => {
      this.checkPendingPayment();
    }, 200);
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
   * Get global services (fallback if services don't exist)
   */
  getServices() {
    return {
      userService: window.userService || this.createFallbackUserService(),
      paymentService: window.paymentService || this.createFallbackPaymentService(),
      i18nService: window.i18nService || this.createFallbackI18nService(),
      getStyles: window.getStyles || this.createFallbackStyles
    };
  }
  
  /**
   * Create fallback user service if not available
   */
  createFallbackUserService() {
    return {
      async getCurrentUser() {
        console.log('Using fallback userService');
        return {
          isAuthenticated: false,
          user: null,
          token: null
        };
      },
      async login(email, password) {
        return { success: true, user: { email }, token: 'demo' };
      },
      async register(userData) {
        return { success: true, message: 'Registration successful (demo)' };
      },
      async logout() {
        return { success: true };
      }
    };
  }
  
  /**
   * Create fallback payment service if not available
   */
  createFallbackPaymentService() {
    return {
      async checkPendingPayment() {
        return null;
      },
      async startPayment(packageData, userId) {
        return { success: true, message: 'Payment demo' };
      }
    };
  }
  
  /**
   * Create fallback i18n service if not available
   */
  createFallbackI18nService() {
    return {
      currentLanguage: 'en',
      translate: (key) => key.split('.').pop() || key,
      formatDate: (date) => date.toLocaleDateString(),
      renderLanguageSelector: () => '<select><option value="en">English</option></select>',
      getLanguageInfo: () => ({ direction: 'ltr' })
    };
  }
  
  /**
   * Create fallback styles if not available
   */
  createFallbackStyles() {
    return `
      .app-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f8f9fa;
        min-height: 100vh;
      }
      
      .app-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 1rem 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      }
      
      .branding h1 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 600;
      }
      
      .app-content {
        min-height: calc(100vh - 120px);
        padding: 2rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 60vh;
      }
      
      .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e9ecef;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-bottom: 1rem;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .error-container {
        text-align: center;
        padding: 2rem;
      }
      
      .alert {
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
      }
      
      .alert-error {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }
      
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      
      .app-footer {
        background-color: #343a40;
        color: #adb5bd;
        text-align: center;
        padding: 1rem;
        margin-top: auto;
      }
      
      .auth-container {
        max-width: 400px;
        margin: 2rem auto;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      
      .dashboard-container {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
    `;
  }
  
  /**
   * Translation helper
   */
  t(key) {
    const services = this.getServices();
    return services.i18nService.translate(key);
  }
  
  /**
   * Check for authentication
   */
  async checkAuthentication() {
    try {
      console.log('🔐 Checking authentication...');
      const services = this.getServices();
      const authState = await services.userService.getCurrentUser();
      
      if (authState.isAuthenticated) {
        this.user = authState.user;
        this.currentView = 'dashboard';
        console.log('✅ User authenticated:', this.user);
      } else {
        this.currentView = 'auth';
        console.log('👤 User not authenticated, showing auth screen');
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
      const services = this.getServices();
      const paymentResult = await services.paymentService.checkPendingPayment();
      
      if (paymentResult && paymentResult.success) {
        this.showNotification('Payment successful! Your package has been activated.');
      } else if (paymentResult && !paymentResult.success) {
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
    const services = this.getServices();
    
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
      <style>${services.getStyles()}</style>
      <div class="app-container" dir="${services.i18nService.getLanguageInfo(services.i18nService.currentLanguage)?.direction || 'ltr'}">
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
    const services = this.getServices();
    return `
      <header class="app-header">
        <div class="branding">
          <h1>CASL Key Verification</h1>
        </div>
        <div class="language-selector">
          ${services.i18nService.renderLanguageSelector()}
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
        <p>${this.t('app.loading') || 'Loading...'}</p>
      </div>
    `;
  }
  
  /**
   * Render authentication view
   */
  renderAuth() {
    return `
      <div class="auth-container">
        <h2>Welcome to CASL Key</h2>
        <p>Please sign in to continue</p>
        
        <form onsubmit="this.getRootNode().host.handleLogin(event)">
          <div style="margin-bottom: 1rem;">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
          </div>
          
          <div style="margin-bottom: 1rem;">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required style="width: 100%; padding: 0.5rem; margin-top: 0.25rem;">
          </div>
          
          <button type="submit" class="btn-primary" style="width: 100%;">Sign In</button>
        </form>
        
        <p style="text-align: center; margin-top: 1rem;">
          <a href="#" onclick="this.getRootNode().host.showRegister()">Don't have an account? Register</a>
        </p>
      </div>
    `;
  }
  
  /**
   * Render dashboard view
   */
  renderDashboard() {
    return `
      <div class="dashboard-container">
        <h2>Dashboard</h2>
        <p>Welcome${this.user ? ', ' + (this.user.email || this.user.name) : ''}!</p>
        
        <div style="margin: 2rem 0;">
          <h3>Quick Actions</h3>
          <button class="btn-primary" onclick="this.getRootNode().host.startVerification()">
            Start New Verification
          </button>
          
          <button class="btn-primary" onclick="this.getRootNode().host.viewHistory()" style="margin-left: 1rem;">
            View History
          </button>
        </div>
        
        <div style="margin-top: 2rem;">
          <button onclick="this.getRootNode().host.handleLogout()">Logout</button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render verification view
   */
  renderVerification() {
    return `
      <div class="verification-container">
        <h2>Verification Process</h2>
        <p>Verification functionality coming soon...</p>
        <button class="btn-primary" onclick="this.getRootNode().host.navigateTo('dashboard')">
          Back to Dashboard
        </button>
      </div>
    `;
  }
  
  /**
   * Render verification details view
   */
  renderVerificationDetails() {
    return `
      <div class="verification-details">
        <h2>Verification Details</h2>
        <p>Details functionality coming soon...</p>
        <button class="btn-primary" onclick="this.getRootNode().host.navigateTo('dashboard')">
          Back to Dashboard
        </button>
      </div>
    `;
  }
  
  /**
   * Render error state
   */
  renderError(message) {
    return `
      <div class="error-container">
        <div class="alert alert-error" role="alert">
          ${message || this.error || 'An error occurred'}
        </div>
        <button class="btn-primary" onclick="this.getRootNode().host.navigateTo('auth')">
          Back to Login
        </button>
      </div>
    `;
  }
  
  /**
   * Show notification
   */
  showNotification(message, type = 'success') {
    console.log(`📢 Notification (${type}):`, message);
    // For now, just log. Could implement toast notifications later.
  }
  
  /**
   * Navigate to a view
   */
  navigateTo(view, data = null) {
    console.log('🧭 Navigating to:', view);
    this.currentView = view;
    
    if (view === 'verification-details' && data) {
      this.selectedVerification = data.verification;
    }
    
    this.render();
  }
  
  /**
   * Handle login form submission
   */
  async handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    try {
      console.log('🔑 Attempting login for:', email);
      const services = this.getServices();
      const result = await services.userService.login(email, password);
      
      if (result.success) {
        this.user = result.user;
        this.navigateTo('dashboard');
        console.log('✅ Login successful');
      } else {
        this.showNotification('Login failed: ' + (result.message || 'Unknown error'), 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification('Login error: ' + error.message, 'error');
    }
  }
  
  /**
   * Handle logout
   */
  async handleLogout() {
    try {
      const services = this.getServices();
      await services.userService.logout();
      this.user = null;
      this.navigateTo('auth');
      console.log('👋 Logged out');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
  
  /**
   * Show register form
   */
  showRegister() {
    console.log('📝 Show register form (not implemented yet)');
    this.showNotification('Registration form coming soon!', 'info');
  }
  
  /**
   * Start verification process
   */
  startVerification() {
    console.log('🔍 Starting verification process');
    this.navigateTo('verification');
  }
  
  /**
   * View verification history
   */
  viewHistory() {
    console.log('📋 Viewing verification history');
    this.showNotification('History view coming soon!', 'info');
  }
  
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for language changes
    document.addEventListener('caslLanguageChanged', () => {
      this.render();
    });
  }
}

// Register the custom element
if (!customElements.get('casl-app')) {
  customElements.define('casl-app', CASLApp);
  console.log('✅ Custom element <casl-app> registered successfully');
} else {
  console.log('⚠️ Custom element <casl-app> already registered');
}
