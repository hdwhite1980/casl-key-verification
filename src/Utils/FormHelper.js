// src/utils/FormHelper.js
import { stateManager } from './StateManager.js';
import { eventManager } from './EventManager.js';
import { errorHandler } from './ErrorHandler.js';
import { configManager } from './ConfigManager.js';
import { accessibilityHelper } from './AccessibilityHelper.js';

/**
 * Form Helper utility
 * Manages form state and event handling without inline event handlers
 */
class FormHelper {
  constructor() {
    // Map to track forms by ID
    this.forms = new Map();
    
    // Counter for generating unique form IDs
    this.formCounter = 0;
  }
  
  /**
   * Initialize a form
   * @param {HTMLElement} component - Web component that contains the form
   * @param {string} formId - ID of the form element
   * @param {Object} initialState - Initial form state
   * @param {Object} handlers - Form event handlers
   * @returns {Object} Form controller
   */
  initForm(component, formId, initialState = {}, handlers = {}) {
    // Generate unique ID for form tracking
    const uniqueId = `form_${Date.now()}_${this.formCounter++}`;
    
    // Initialize event handling for component if needed
    const componentId = component.getAttribute('data-component-id') || 
                      eventManager.initComponent(component);
    
    // Create form controller
    const formController = {
      id: uniqueId,
      formId,
      componentId,
      component,
      state: { ...initialState },
      originalState: { ...initialState },
      handlers: { ...handlers },
      errors: {},
      touched: {},
      isDirty: false,
      isSubmitting: false,
      isValid: true
    };
    
    // Store in forms map
    this.forms.set(uniqueId, formController);
    
    // Register event handlers with event manager
    this.registerFormHandlers(formController);
    
    // Set up form auto-save if enabled
    if (configManager.get('FORM_AUTO_SAVE', true)) {
      this.setupAutoSave(formController);
    }
    
    return formController;
  }
  
  /**
   * Register form event handlers
   * @param {Object} formController - Form controller
   */
  registerFormHandlers(formController) {
    const { componentId, handlers } = formController;
    
    // Register submit handler
    if (handlers.onSubmit) {
      eventManager.registerHandler(
        componentId,
        `submit_${formController.formId}`,
        (event) => this.handleSubmit(event, formController)
      );
    }
    
    // Register change handlers for specific fields
    if (handlers.onChange) {
      eventManager.registerHandler(
        componentId,
        `change_${formController.formId}`,
        (event) => this.handleChange(event, formController)
      );
    }
    
    // Register blur handlers for validation
    if (handlers.onBlur) {
      eventManager.registerHandler(
        componentId,
        `blur_${formController.formId}`,
        (event) => this.handleBlur(event, formController)
      );
    }
    
    // Register reset handler
    if (handlers.onReset) {
      eventManager.registerHandler(
        componentId,
        `reset_${formController.formId}`,
        (event) => this.handleReset(event, formController)
      );
    }
  }
  
  /**
   * Handle form submission
   * @param {Event} event - Form submit event
   * @param {Object} formController - Form controller
   */
  async handleSubmit(event, formController) {
    // Prevent default form submission
    event.preventDefault();
    
    // Extract form data
    const formData = this.getFormData(event.target);
    
    // Update form state
    formController.state = { ...formController.state, ...formData };
    
    // Validate form
    const errors = this.validateForm(formController);
    formController.errors = errors;
    formController.isValid = Object.keys(errors).length === 0;
    
    // If not valid, focus first error field
    if (!formController.isValid) {
      this.focusFirstError(event.target, errors);
      
      // Call onError handler if defined
      if (typeof formController.handlers.onError === 'function') {
        formController.handlers.onError(errors, formController.state);
      }
      
      // Update UI
      this.updateFormUI(formController);
      return;
    }
    
    // Set submitting state
    formController.isSubmitting = true;
    this.updateFormUI(formController);
    
    try {
      // Call onSubmit handler
      if (typeof formController.handlers.onSubmit === 'function') {
        await formController.handlers.onSubmit(formController.state, event);
      }
      
      // Mark all fields as untouched after successful submission
      formController.touched = {};
      formController.isDirty = false;
      
      // Update original state to match current state
      formController.originalState = { ...formController.state };
    } catch (error) {
      // Handle submission error
      errorHandler.handleError(error);
      
      // Map API errors to form fields if possible
      if (error.fieldErrors) {
        formController.errors = { ...formController.errors, ...error.fieldErrors };
        formController.isValid = false;
      } else {
        // Set global form error
        formController.errors._form = error.message || 'Form submission failed';
      }
      
      // Call onError handler if defined
      if (typeof formController.handlers.onError === 'function') {
        formController.handlers.onError(
          formController.errors,
          formController.state,
          error
        );
      }
    } finally {
      // Reset submitting state
      formController.isSubmitting = false;
      this.updateFormUI(formController);
    }
  }
  
  /**
   * Handle form field change
   * @param {Event} event - Input change event
   * @param {Object} formController - Form controller
   */
  handleChange(event, formController) {
    const { name, value, type, checked } = event.target;
    
    // Skip if field doesn't have a name
    if (!name) return;
    
    // Get field value based on input type
    const fieldValue = type === 'checkbox' ? checked : value;
    
    // Update form state
    const newState = { ...formController.state };
    newState[name] = fieldValue;
    formController.state = newState;
    
    // Mark field as touched
    formController.touched[name] = true;
    
    // Check if form is dirty (changed from original state)
    formController.isDirty = this.checkIsDirty(formController);
    
    // Validate field if configured for real-time validation
    if (formController.handlers.validateOnChange) {
      this.validateField(name, fieldValue, formController);
    }
    
    // Call onChange handler
    if (typeof formController.handlers.onChange === 'function') {
      formController.handlers.onChange(name, fieldValue, formController.state, event);
    }
    
    // Update UI
    this.updateFormUI(formController);
  }
  
  /**
   * Handle input blur for validation
   * @param {Event} event - Input blur event
   * @param {Object} formController - Form controller
   */
  handleBlur(event, formController) {
    const { name, value } = event.target;
    
    // Skip if field doesn't have a name
    if (!name) return;
    
    // Mark field as touched
    formController.touched[name] = true;
    
    // Validate field
    this.validateField(name, value, formController);
    
    // Call onBlur handler
    if (typeof formController.handlers.onBlur === 'function') {
      formController.handlers.onBlur(name, value, formController.state, event);
    }
    
    // Update UI
    this.updateFormUI(formController);
  }
  
  /**
   * Handle form reset
   * @param {Event} event - Form reset event
   * @param {Object} formController - Form controller
   */
  handleReset(event, formController) {
    // Reset form state to original state
    formController.state = { ...formController.originalState };
    formController.errors = {};
    formController.touched = {};
    formController.isDirty = false;
    formController.isValid = true;
    
    // Call onReset handler
    if (typeof formController.handlers.onReset === 'function') {
      formController.handlers.onReset(formController.state, event);
    }
    
    // Update UI
    this.updateFormUI(formController);
  }
  
  /**
   * Setup form auto-save
   * @param {Object} formController - Form controller
   */
  setupAutoSave(formController) {
    // Create auto-save handler
    const autoSaveHandler = () => {
      // Only save if form is dirty
      if (formController.isDirty) {
        this.saveFormState(formController);
      }
    };
    
    // Set up interval for auto-saving
    const autoSaveInterval = setInterval(
      autoSaveHandler, 
      configManager.get('FORM_AUTO_SAVE_INTERVAL', 30000)
    );
    
    // Also save on component detachment
    formController.component.addEventListener('disconnected', autoSaveHandler);
    
    // Store cleanup function in form controller
    formController.cleanupAutoSave = () => {
      clearInterval(autoSaveInterval);
      formController.component.removeEventListener('disconnected', autoSaveHandler);
    };
  }
  
  /**
   * Validate the entire form
   * @param {Object} formController - Form controller
   * @returns {Object} Validation errors
   */
  validateForm(formController) {
    const { state, handlers } = formController;
    const errors = {};
    
    // Call validate handler if exists
    if (typeof handlers.validate === 'function') {
      const validationErrors = handlers.validate(state);
      Object.assign(errors, validationErrors);
    }
    
    // Set isValid based on errors
    formController.isValid = Object.keys(errors).length === 0;
    
    return errors;
  }
  
  /**
   * Validate a single field
   * @param {string} fieldName - Field name
   * @param {any} value - Field value
   * @param {Object} formController - Form controller
   * @returns {string|null} Validation error or null
   */
  validateField(fieldName, value, formController) {
    const { state, handlers } = formController;
    
    // Skip if no validateField handler
    if (typeof handlers.validateField !== 'function') {
      return null;
    }
    
    // Call field validation handler
    const fieldError = handlers.validateField(fieldName, value, state);
    
    // Update errors object
    if (fieldError) {
      formController.errors[fieldName] = fieldError;
    } else {
      delete formController.errors[fieldName];
    }
    
    // Update isValid
    formController.isValid = Object.keys(formController.errors).length === 0;
    
    return fieldError;
  }
  
  /**
   * Get form data from a form element
   * @param {HTMLFormElement} formElement - Form element
   * @returns {Object} Form data as object
   */
  getFormData(formElement) {
    const formData = new FormData(formElement);
    const data = {};
    
    // Convert FormData to object
    for (const [key, value] of formData.entries()) {
      // Handle arrays (multiple values with same name)
      if (key.endsWith('[]')) {
        const cleanKey = key.slice(0, -2);
        if (!data[cleanKey]) {
          data[cleanKey] = [];
        }
        data[cleanKey].push(value);
      } else {
        data[key] = value;
      }
    }
    
    // Handle checkboxes (checked checkboxes are included, unchecked are not)
    const checkboxes = formElement.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (!checkbox.name) return;
      
      // For checkbox groups (name ends with [])
      if (checkbox.name.endsWith('[]')) {
        return; // These are handled properly by FormData
      }
      
      // For single checkboxes, explicitly set boolean value
      data[checkbox.name] = checkbox.checked;
    });
    
    return data;
  }
  
  /**
   * Check if form state is different from original state
   * @param {Object} formController - Form controller
   * @returns {boolean} True if form is dirty
   */
  checkIsDirty(formController) {
    const { state, originalState } = formController;
    
    // Compare each key in the state
    for (const key in state) {
      if (state[key] !== originalState[key]) {
        return true;
      }
    }
    
    // Check for keys in original state that aren't in current state
    for (const key in originalState) {
      if (!(key in state)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Focus the first field with an error
   * @param {HTMLFormElement} formElement - Form element
   * @param {Object} errors - Validation errors
   */
  focusFirstError(formElement, errors) {
    // Get first error field name
    const firstErrorField = Object.keys(errors)[0];
    
    // Skip if no errors
    if (!firstErrorField || firstErrorField === '_form') return;
    
    // Find the field in the form
    const errorField = formElement.querySelector(`[name="${firstErrorField}"]`);
    
    // Focus the field if found
    if (errorField && typeof errorField.focus === 'function') {
      errorField.focus();
    }
  }
  
  /**
   * Update form UI based on current state
   * @param {Object} formController - Form controller
   */
  updateFormUI(formController) {
    const { component, formId, state, errors, touched, isSubmitting } = formController;
    
    // Get the form element
    const formElement = component.shadowRoot 
      ? component.shadowRoot.getElementById(formId)
      : component.querySelector(`#${formId}`);
    
    if (!formElement) return;
    
    // Update form fields with current values
    this.updateFormFields(formElement, state);
    
    // Update error messages
    this.updateErrorMessages(formElement, errors, touched);
    
    // Update submit button state
    this.updateSubmitButton(formElement, isSubmitting);
    
    // Call render handler if exists
    if (typeof formController.handlers.onRender === 'function') {
      formController.handlers.onRender(formController);
    }
  }
  
  /**
   * Update form fields with current values
   * @param {HTMLFormElement} formElement - Form element
   * @param {Object} state - Form state
   */
  updateFormFields(formElement, state) {
    // Update each field with its value from state
    for (const [key, value] of Object.entries(state)) {
      const field = formElement.querySelector(`[name="${key}"]`);
      
      if (!field) continue;
      
      // Handle different input types
      if (field.type === 'checkbox') {
        field.checked = !!value;
      } else if (field.type === 'radio') {
        const radio = formElement.querySelector(`[name="${key}"][value="${value}"]`);
        if (radio) {
          radio.checked = true;
        }
      } else {
        field.value = value;
      }
    }
  }
  
  /**
   * Update error messages in the form
   * @param {HTMLFormElement} formElement - Form element
   * @param {Object} errors - Validation errors
   * @param {Object} touched - Touched fields
   */
  updateErrorMessages(formElement, errors, touched) {
    // Clear existing error messages
    const existingErrors = formElement.querySelectorAll('.error-message');
    existingErrors.forEach(el => el.remove());
    
    // Remove error classes
    const errorFields = formElement.querySelectorAll('.error');
    errorFields.forEach(field => {
      field.classList.remove('error');
      field.removeAttribute('aria-invalid');
    });
    
    // Add new error messages
    for (const [field, message] of Object.entries(errors)) {
      // Skip untouched fields unless it's a form-level error
      if (field !== '_form' && !touched[field]) continue;
      
      if (field === '_form') {
        // Form-level error
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message form-error';
        errorDiv.setAttribute('role', 'alert');
        errorDiv.textContent = message;
        
        // Insert at the top of the form
        formElement.insertBefore(errorDiv, formElement.firstChild);
      } else {
        // Field-level error
        const fieldElement = formElement.querySelector(`[name="${field}"]`);
        if (!fieldElement) continue;
        
        // Add error class to field
        fieldElement.classList.add('error');
        fieldElement.setAttribute('aria-invalid', 'true');
        
        // Create error message element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.id = `${field}-error`;
        errorDiv.setAttribute('role', 'alert');
        errorDiv.textContent = message;
        
        // Set aria-describedby on the field
        fieldElement.setAttribute('aria-describedby', errorDiv.id);
        
        // Insert after the field
        fieldElement.parentNode.insertBefore(errorDiv, fieldElement.nextSibling);
      }
    }
  }
  
  /**
   * Update submit button state
   * @param {HTMLFormElement} formElement - Form element
   * @param {boolean} isSubmitting - Whether form is submitting
   */
  updateSubmitButton(formElement, isSubmitting) {
    const submitButton = formElement.querySelector('button[type="submit"]');
    
    if (!submitButton) return;
    
    // Update disabled state
    submitButton.disabled = isSubmitting;
    
    // Update text
    if (isSubmitting) {
      submitButton.setAttribute('data-original-text', submitButton.textContent);
      submitButton.textContent = 'Submitting...';
    } else if (submitButton.hasAttribute('data-original-text')) {
      submitButton.textContent = submitButton.getAttribute('data-original-text');
      submitButton.removeAttribute('data-original-text');
    }
  }
  
  /**
   * Save form state to storage
   * @param {Object} formController - Form controller
   */
  saveFormState(formController) {
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Create storage key
      const storageKey = `${prefix}form_${formController.formId}`;
      
      // Save to local storage
      const data = {
        state: formController.state,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(storageKey, JSON.stringify(data));
      
      // Call onSave handler if exists
      if (typeof formController.handlers.onSave === 'function') {
        formController.handlers.onSave(formController.state);
      }
    } catch (error) {
      console.warn('Error saving form state:', error);
    }
  }
  
  /**
   * Load form state from storage
   * @param {string} formId - Form ID
   * @returns {Object|null} Saved form state or null
   */
  loadFormState(formId) {
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Create storage key
      const storageKey = `${prefix}form_${formId}`;
      
      // Load from local storage
      const dataStr = localStorage.getItem(storageKey);
      if (!dataStr) return null;
      
      // Parse data
      const data = JSON.parse(dataStr);
      
      // Check if data is expired
      const maxAge = configManager.get('FORM_STATE_MAX_AGE', 24 * 60 * 60 * 1000); // 24 hours
      const timestamp = new Date(data.timestamp).getTime();
      const now = Date.now();
      
      if (now - timestamp > maxAge) {
        // Remove expired data
        localStorage.removeItem(storageKey);
        return null;
      }
      
      return data.state;
    } catch (error) {
      console.warn('Error loading form state:', error);
      return null;
    }
  }
  
  /**
   * Clear saved form state
   * @param {string} formId - Form ID
   */
  clearSavedFormState(formId) {
    try {
      // Get storage prefix
      const prefix = configManager.get('STORAGE_PREFIX', 'casl_');
      
      // Create storage key
      const storageKey = `${prefix}form_${formId}`;
      
      // Remove from local storage
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('Error clearing form state:', error);
    }
  }
  
  /**
   * Clean up a form controller (remove event listeners, etc.)
   * @param {Object} formController - Form controller
   */
  cleanupForm(formController) {
    // Run auto-save cleanup if exists
    if (typeof formController.cleanupAutoSave === 'function') {
      formController.cleanupAutoSave();
    }
    
    // Remove from forms map
    this.forms.delete(formController.id);
  }
}

// Export singleton instance
export const formHelper = new FormHelper();
