// src/components/Authentication.js
import { getStyles } from './common/Styles.js';
import { apiSecurity } from '../services/apiSecurity.js';
import { userService } from '../services/userService.js';
import { i18nService, t } from '../services/i18n.js';

/**
 * Authentication component for CASL Key Verification
 * Handles user registration, login, and authentication state
 */
export class Authentication extends HTMLElement {
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
    this.isAuthenticated = false;
    this.isRegistering = false;
    this.error = null;
    this.user = null;
    
    // Check if user is already authenticated
    this.checkAuthentication();
  }
  
  /**
   * Check if user is already authenticated
   */
  async checkAuthentication() {
    try {
      const authState = await userService.getCurrentUser();
      if (authState.isAuthenticated) {
        this.isAuthenticated = true;
        this.user = authState.user;
      }
    } catch (error) {
      console.error('Authentication check failed:', error);
    }
    
    this.render();
  }
  
  /**
   * When the element is added to the DOM
   */
  connectedCallback() {
    console.log('Authentication component connected');
  }
  
  /**
   * Render the component
   */
  render() {
    // Determine which screen to show
    let content;
    if (this.isAuthenticated) {
      // User is logged in, dispatch event to show dashboard
      this.dispatchAuthEvent('authenticated', this.user);
      content = this.renderAuthenticatedState();
    } else if (this.isRegistering) {
      content = this.renderRegistrationForm();
    } else {
      content = this.renderLoginForm();
    }
    
    this.shadowRoot.innerHTML = `
      <style>${getStyles()}</style>
      <div class="container" dir="${i18nService.getLanguageInfo(i18nService.currentLanguage)?.direction || 'ltr'}">
        ${content}
      </div>
    `;
  }
  
  /**
   * Render the welcome screen
   */
  renderWelcomeScreen() {
    return `
      <div class="welcome-screen">
        <h1>${t('auth.welcome')}</h1>
        <p>${t('auth.welcomeDescription')}</p>
        
        <div class="welcome-options">
          <button 
            class="btn-primary" 
            onclick="this.getRootNode().host.handleFirstTimeUser(true)"
          >
            ${t('auth.firstTime')}
          </button>
          
          <button 
            class="btn-secondary" 
            onclick="this.getRootNode().host.handleFirstTimeUser(false)"
          >
            ${t('auth.returningUser')}
          </button>
        </div>
      </div>
    `;
  }
  
  /**
   * Render the login form
   */
  renderLoginForm() {
    return `
      <div class="auth-form">
        <h2>${t('auth.loginTitle')}</h2>
        
        ${this.error ? `
          <div class="alert alert-error" role="alert">
            ${this.error}
          </div>
        ` : ''}
        
        <form id="login-form">
          <div class="form-group">
            <label for="username">${t('auth.username')}</label>
            <input type="text" id="username" name="username" required />
          </div>
          
          <div class="form-group">
            <label for="password">${t('auth.password')}</label>
            <input type="password" id="password" name="password" required />
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn-primary" 
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? t('auth.loggingIn') : t('auth.login')}
            </button>
            
            <button 
              type="button" 
              class="btn-link" 
              onclick="this.getRootNode().host.toggleRegistration(true)"
            >
              ${t('auth.needAccount')}
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Render the registration form
   */
  renderRegistrationForm() {
    return `
      <div class="auth-form">
        <h2>${t('auth.registerTitle')}</h2>
        
        ${this.error ? `
          <div class="alert alert-error" role="alert">
            ${this.error}
          </div>
        ` : ''}
        
        <form id="registration-form">
          <div class="form-group">
            <label for="reg-email">${t('auth.email')}</label>
            <input type="email" id="reg-email" name="email" required />
          </div>
          
          <div class="form-group">
            <label for="reg-username">${t('auth.username')}</label>
            <input type="text" id="reg-username" name="username" required />
          </div>
          
          <div class="form-group">
            <label for="reg-password">${t('auth.password')}</label>
            <input type="password" id="reg-password" name="password" required />
            <div class="password-requirements">
              <small>${t('auth.passwordRequirements')}</small>
            </div>
          </div>
          
          <div class="form-group">
            <label for="reg-confirm-password">${t('auth.confirmPassword')}</label>
            <input type="password" id="reg-confirm-password" name="confirmPassword" required />
          </div>
          
          <div class="form-actions">
            <button 
              type="submit" 
              class="btn-primary" 
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? t('auth.registering') : t('auth.register')}
            </button>
            
            <button 
              type="button" 
              class="btn-link" 
              onclick="this.getRootNode().host.toggleRegistration(false)"
            >
              ${t('auth.haveAccount')}
            </button>
          </div>
        </form>
      </div>
    `;
  }
  
  /**
   * Render authenticated state
   */
  renderAuthenticatedState() {
    return `
      <div class="auth-status">
        <p>${t('auth.loggedInAs', { username: this.user?.username || 'User' })}</p>
        <button 
          class="btn-secondary" 
          onclick="this.getRootNode().host.handleLogout()"
        >
          ${t('auth.logout')}
        </button>
      </div>
    `;
  }
  
  /**
   * Toggle between login and registration forms
   * @param {boolean} isRegistering - Whether to show registration form
   */
  toggleRegistration(isRegistering) {
    this.isRegistering = isRegistering;
    this.error = null;
    this.render();
  }
  
  /**
   * Handle form submissions
   * @param {Event} event - Form submission event
   */
  async handleSubmit(event) {
    event.preventDefault();
    
    this.isLoading = true;
    this.error = null;
    this.render();
    
    const form = event.target;
    const formData = new FormData(form);
    
    try {
      if (this.isRegistering) {
        await this.handleRegistration(formData);
      } else {
        await this.handleLogin(formData);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      this.error = error.message || t('auth.genericError');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }
  
  /**
   * Handle user registration
   * @param {FormData} formData - Form data
   */
  async handleRegistration(formData) {
    const email = formData.get('email');
    const username = formData.get('username');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate passwords match
    if (password !== confirmPassword) {
      throw new Error(t('auth.passwordsDoNotMatch'));
    }
    
    // Register user with Cognito
    const result = await userService.registerUser({
      email,
      username,
      password
    });
    
    if (result.requiresConfirmation) {
      // If email confirmation is required, show confirmation message
      this.dispatchAuthEvent('registration-pending', { username, email });
    } else {
      // Otherwise, log in the user
      await this.handleLogin(formData);
    }
  }
  
  /**
   * Handle user login
   * @param {FormData} formData - Form data
   */
  async handleLogin(formData) {
    const username = formData.get('username');
    const password = formData.get('password');
    
    // Log in user with Cognito
    const user = await userService.loginUser(username, password);
    
    // Update state
    this.isAuthenticated = true;
    this.user = user;
    
    // Dispatch authentication event
    this.dispatchAuthEvent('authenticated', user);
    
    // Render authenticated state
    this.render();
  }
  
  /**
   * Handle user logout
   */
  async handleLogout() {
    try {
      await userService.logoutUser();
      
      // Update state
      this.isAuthenticated = false;
      this.user = null;
      
      // Dispatch logout event
      this.dispatchAuthEvent('logged-out');
      
      // Render login form
      this.render();
    } catch (error) {
      console.error('Logout error:', error);
      this.error = error.message || t('auth.logoutError');
      this.render();
    }
  }
  
  /**
   * Handle first-time user selection
   * @param {boolean} isFirstTime - Whether user is new
   */
  handleFirstTimeUser(isFirstTime) {
    if (isFirstTime) {
      // Show registration form
      this.isRegistering = true;
    } else {
      // Show login form
      this.isRegistering = false;
    }
    
    this.render();
  }
  
  /**
   * Dispatch authentication event
   * @param {string} type - Event type
   * @param {Object} data - Event data
   */
  dispatchAuthEvent(type, data = null) {
    const event = new CustomEvent('casl-auth', {
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
    // Add form submission handlers after render
    setTimeout(() => {
      const loginForm = this.shadowRoot.getElementById('login-form');
      if (loginForm) {
        loginForm.addEventListener('submit', this.handleSubmit.bind(this));
      }
      
      const registrationForm = this.shadowRoot.getElementById('registration-form');
      if (registrationForm) {
        registrationForm.addEventListener('submit', this.handleSubmit.bind(this));
      }
    }, 0);
  }
}

// Register the custom element
customElements.define('casl-authentication', Authentication);
