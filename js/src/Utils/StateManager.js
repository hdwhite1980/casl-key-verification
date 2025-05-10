// src/utils/StateManager.js

/**
 * Global state management for CASL Verification System
 * Provides a centralized store with subscriptions for components
 */
class StateManager {
  constructor() {
    // Internal state storage
    this._state = {
      // Authentication state
      auth: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      },
      
      // User verification data
      verification: {
        caslKeyId: null,
        isExistingUser: false,
        isVerified: false,
        verificationType: null,
        loading: false,
        error: null,
        platformData: null,
        idVerificationData: null,
        backgroundCheckStatus: null
      },
      
      // Form data
      formData: {
        currentStep: 0,
        userData: {},
        bookingInfo: {},
        stayIntent: {},
        agreement: {},
        isValid: false,
        isDirty: false,
        lastSaved: null
      },
      
      // UI state
      ui: {
        theme: 'light',
        language: 'en',
        notifications: [],
        modal: null,
        alert: null,
        loading: false
      },
      
      // Verification results
      results: {
        score: 0,
        trustLevel: '',
        message: '',
        adjustments: [],
        isSubmitted: false,
        hostSummary: null
      }
    };
    
    // Subscribers for state changes
    this._subscribers = {
      auth: new Set(),
      verification: new Set(),
      formData: new Set(),
      ui: new Set(),
      results: new Set(),
      // Special key for subscribing to all state changes
      all: new Set()
    };
  }
  
  /**
   * Get the entire state or a section
   * @param {string} [section] - Optional section to retrieve
   * @returns {Object} State or section
   */
  getState(section = null) {
    if (section) {
      return this._state[section] ? { ...this._state[section] } : null;
    }
    return { ...this._state };
  }
  
  /**
   * Update a state section
   * @param {string} section - State section to update
   * @param {Object|Function} update - New state or updater function
   */
  updateState(section, update) {
    if (!this._state[section]) {
      console.warn(`StateManager: Unknown section "${section}"`);
      return;
    }
    
    const oldSectionState = { ...this._state[section] };
    let newSectionState;
    
    if (typeof update === 'function') {
      // Allow functional updates that receive previous state
      newSectionState = update(oldSectionState);
    } else {
      // Merge objects for partial updates
      newSectionState = { ...oldSectionState, ...update };
    }
    
    // Only update if something changed
    if (JSON.stringify(oldSectionState) !== JSON.stringify(newSectionState)) {
      this._state[section] = newSectionState;
      this._notifySubscribers(section);
    }
  }
  
  /**
   * Notify subscribers of state change
   * @param {string} section - Section that changed
   */
  _notifySubscribers(section) {
    // Clone state to prevent modifications
    const sectionState = { ...this._state[section] };
    
    // Notify section subscribers
    if (this._subscribers[section]) {
      this._subscribers[section].forEach(callback => {
        try {
          callback(sectionState);
        } catch (error) {
          console.error(`Error in state subscriber for ${section}:`, error);
        }
      });
    }
    
    // Notify 'all' subscribers
    this._subscribers.all.forEach(callback => {
      try {
        callback({ ...this._state });
      } catch (error) {
        console.error('Error in global state subscriber:', error);
      }
    });
    
    // Persist state if needed
    this._persistState(section);
  }
  
  /**
   * Persist state to storage if needed
   * @param {string} section - Section to persist
   */
  _persistState(section) {
    // Only persist certain sections
    const persistSections = ['formData', 'ui'];
    
    if (persistSections.includes(section)) {
      try {
        localStorage.setItem(
          `casl_state_${section}`, 
          JSON.stringify(this._state[section])
        );
      } catch (error) {
        console.warn(`Failed to persist state section ${section}:`, error);
      }
    }
  }
  
  /**
   * Load persisted state from storage
   */
  loadPersistedState() {
    const persistSections = ['formData', 'ui'];
    
    persistSections.forEach(section => {
      try {
        const storedState = localStorage.getItem(`casl_state_${section}`);
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          this._state[section] = { ...this._state[section], ...parsedState };
        }
      } catch (error) {
        console.warn(`Failed to load persisted state for ${section}:`, error);
      }
    });
  }
  
  /**
   * Subscribe to state changes
   * @param {string} section - Section to subscribe to
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(section, callback) {
    if (!this._subscribers[section]) {
      console.warn(`StateManager: Unknown section "${section}"`);
      return () => {};
    }
    
    if (typeof callback !== 'function') {
      console.warn('StateManager: Subscriber callback is not a function');
      return () => {};
    }
    
    this._subscribers[section].add(callback);
    
    // Immediately notify with current state
    if (section === 'all') {
      callback({ ...this._state });
    } else {
      callback({ ...this._state[section] });
    }
    
    // Return unsubscribe function
    return () => {
      this._subscribers[section].delete(callback);
    };
  }
  
  /**
   * Reset a section to its initial state
   * @param {string} section - Section to reset
   */
  resetSection(section) {
    if (!this._state[section]) {
      console.warn(`StateManager: Unknown section "${section}"`);
      return;
    }
    
    // Create fresh state section
    const freshState = this._getInitialState()[section];
    this._state[section] = { ...freshState };
    
    // Notify subscribers
    this._notifySubscribers(section);
    
    // Remove persisted state if applicable
    try {
      localStorage.removeItem(`casl_state_${section}`);
    } catch (error) {
      console.warn(`Failed to remove persisted state for ${section}:`, error);
    }
  }
  
  /**
   * Reset all state to initial values
   */
  resetAll() {
    // Reset to initial state
    this._state = this._getInitialState();
    
    // Notify all subscribers
    Object.keys(this._subscribers).forEach(section => {
      if (section !== 'all') {
        this._notifySubscribers(section);
      }
    });
    
    // Clear all persisted state
    try {
      localStorage.removeItem('casl_state_formData');
      localStorage.removeItem('casl_state_ui');
    } catch (error) {
      console.warn('Failed to clear persisted state:', error);
    }
  }
  
  /**
   * Get initial state
   * @returns {Object} Initial state
   */
  _getInitialState() {
    return {
      auth: {
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null
      },
      
      verification: {
        caslKeyId: null,
        isExistingUser: false,
        isVerified: false,
        verificationType: null,
        loading: false,
        error: null,
        platformData: null,
        idVerificationData: null,
        backgroundCheckStatus: null
      },
      
      formData: {
        currentStep: 0,
        userData: {},
        bookingInfo: {},
        stayIntent: {},
        agreement: {},
        isValid: false,
        isDirty: false,
        lastSaved: null
      },
      
      ui: {
        theme: 'light',
        language: 'en',
        notifications: [],
        modal: null,
        alert: null,
        loading: false
      },
      
      results: {
        score: 0,
        trustLevel: '',
        message: '',
        adjustments: [],
        isSubmitted: false,
        hostSummary: null
      }
    };
  }
  
  /**
   * Set authentication state
   * @param {Object} authState - Authentication state
   */
  setAuth(authState) {
    this.updateState('auth', authState);
  }
  
  /**
   * Set verification state
   * @param {Object} verificationState - Verification state
   */
  setVerification(verificationState) {
    this.updateState('verification', verificationState);
  }
  
  /**
   * Update form data
   * @param {Object} formData - Form data updates
   */
  updateFormData(formData) {
    this.updateState('formData', currentState => {
      // Combine existing data with new data
      const newState = { ...currentState, ...formData };
      
      // Mark as dirty and set last saved time
      newState.isDirty = true;
      newState.lastSaved = new Date().toISOString();
      
      return newState;
    });
  }
  
  /**
   * Add a UI notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, info, warning)
   * @param {number} [timeout] - Auto-dismiss timeout in ms (0 for no auto-dismiss)
   */
  addNotification(message, type = 'info', timeout = 5000) {
    const notification = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: new Date().toISOString(),
      timeout
    };
    
    this.updateState('ui', currentState => {
      return {
        ...currentState,
        notifications: [...currentState.notifications, notification]
      };
    });
    
    // Auto-dismiss if timeout is set
    if (timeout > 0) {
      setTimeout(() => {
        this.removeNotification(notification.id);
      }, timeout);
    }
    
    return notification.id;
  }
  
  /**
   * Remove a UI notification
   * @param {string} notificationId - Notification ID
   */
  removeNotification(notificationId) {
    this.updateState('ui', currentState => {
      return {
        ...currentState,
        notifications: currentState.notifications.filter(
          n => n.id !== notificationId
        )
      };
    });
  }
  
  /**
   * Show a modal dialog
   * @param {Object} modalConfig - Modal configuration
   */
  showModal(modalConfig) {
    this.updateState('ui', { modal: modalConfig });
  }
  
  /**
   * Hide the modal dialog
   */
  hideModal() {
    this.updateState('ui', { modal: null });
  }
  
  /**
   * Show an alert
   * @param {Object} alertConfig - Alert configuration
   */
  showAlert(alertConfig) {
    this.updateState('ui', { alert: alertConfig });
  }
  
  /**
   * Hide the alert
   */
  hideAlert() {
    this.updateState('ui', { alert: null });
  }
  
  /**
   * Set the UI loading state
   * @param {boolean} isLoading - Whether UI is loading
   */
  setLoading(isLoading) {
    this.updateState('ui', { loading: isLoading });
  }
  
  /**
   * Set the results data
   * @param {Object} resultsData - Verification results data
   */
  setResults(resultsData) {
    this.updateState('results', resultsData);
  }
  
  /**
   * Get debug info
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      stateSize: JSON.stringify(this._state).length,
      subscribers: {
        auth: this._subscribers.auth.size,
        verification: this._subscribers.verification.size,
        formData: this._subscribers.formData.size,
        ui: this._subscribers.ui.size,
        results: this._subscribers.results.size,
        all: this._subscribers.all.size
      },
      persistedSections: {
        formData: !!localStorage.getItem('casl_state_formData'),
        ui: !!localStorage.getItem('casl_state_ui')
      }
    };
  }
}
