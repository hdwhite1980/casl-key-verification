// src/utils/EventManager.js

/**
 * Event Manager for Web Components
 * Provides a centralized way to handle events without inline handlers
 */
class EventManager {
  constructor() {
    // Map to store event handlers by component ID and event type
    this.handlers = new Map();
    
    // Map to store event listeners by component ID
    this.listeners = new Map();
    
    // Counter for generating unique component IDs
    this.componentCounter = 0;
  }
  
  /**
   * Generate a unique component ID
   * @returns {string} Unique component ID
   */
  generateComponentId() {
    return `component_${Date.now()}_${this.componentCounter++}`;
  }
  
  /**
   * Initialize a component with event delegation
   * @param {HTMLElement} component - Web component instance
   * @param {string} [componentId] - Optional component ID
   * @returns {string} Component ID
   */
  initComponent(component, componentId = null) {
    // Generate component ID if not provided
    const id = componentId || this.generateComponentId();
    
    // Store component ID on element for reference
    component.setAttribute('data-component-id', id);
    
    // Initialize handler map for this component
    if (!this.handlers.has(id)) {
      this.handlers.set(id, new Map());
    }
    
    // Set up event delegation on component's shadow root if available
    if (component.shadowRoot) {
      this.setupEventDelegation(component, id);
    }
    
    return id;
  }
  
  /**
   * Set up event delegation for a component
   * @param {HTMLElement} component - Web component instance
   * @param {string} componentId - Component ID
   */
  setupEventDelegation(component, componentId) {
    // Get shadow root
    const shadowRoot = component.shadowRoot;
    
    // Create a root level listener for common events
    const delegatedEvents = [
      'click', 'change', 'input', 'submit', 'focus', 'blur',
      'dragstart', 'dragover', 'dragleave', 'drop'
    ];
    
    // Store listeners for cleanup
    const componentListeners = [];
    
    // Add event listeners for each event type
    delegatedEvents.forEach(eventType => {
      const listener = (event) => {
        // Find the element with a data-event attribute
        let target = event.target;
        while (target && target !== shadowRoot) {
          // Check for data-event attribute
          const eventAction = target.getAttribute(`data-event-${eventType}`);
          if (eventAction) {
            // Look up the handler
            const handlers = this.handlers.get(componentId);
            if (handlers && handlers.has(eventAction)) {
              const handler = handlers.get(eventAction);
              // Call the handler
              handler(event, target);
            }
            break;
          }
          target = target.parentNode;
        }
      };
      
      // Add listener
      shadowRoot.addEventListener(eventType, listener);
      
      // Store for cleanup
      componentListeners.push({ eventType, listener });
    });
    
    // Store listeners for this component
    this.listeners.set(componentId, componentListeners);
  }
  
  /**
   * Register an event handler for a component
   * @param {string} componentId - Component ID
   * @param {string} eventName - Event handler name
   * @param {Function} handler - Event handler function
   */
  registerHandler(componentId, eventName, handler) {
    if (!this.handlers.has(componentId)) {
      this.handlers.set(componentId, new Map());
    }
    
    const componentHandlers = this.handlers.get(componentId);
    componentHandlers.set(eventName, handler);
  }
  
  /**
   * Unregister an event handler
   * @param {string} componentId - Component ID
   * @param {string} eventName - Event handler name
   */
  unregisterHandler(componentId, eventName) {
    if (this.handlers.has(componentId)) {
      const componentHandlers = this.handlers.get(componentId);
      if (componentHandlers.has(eventName)) {
        componentHandlers.delete(eventName);
      }
    }
  }
  
  /**
   * Clean up all handlers and listeners for a component
   * @param {string} componentId - Component ID
   */
  cleanupComponent(componentId) {
    // Remove handlers
    if (this.handlers.has(componentId)) {
      this.handlers.delete(componentId);
    }
    
    // Remove listeners
    if (this.listeners.has(componentId)) {
      const componentListeners = this.listeners.get(componentId);
      const component = document.querySelector(`[data-component-id="${componentId}"]`);
      
      if (component && component.shadowRoot) {
        componentListeners.forEach(({ eventType, listener }) => {
          component.shadowRoot.removeEventListener(eventType, listener);
        });
      }
      
      this.listeners.delete(componentId);
    }
  }
  
  /**
   * Create HTML with data-event attributes instead of inline handlers
   * @param {string} html - Original HTML string
   * @returns {string} HTML with data-event attributes
   */
  replaceInlineHandlers(html) {
    // Replace onclick with data-event-click
    html = html.replace(/onclick="([^"]+)"/g, 'data-event-click="$1"');
    
    // Replace onchange with data-event-change
    html = html.replace(/onchange="([^"]+)"/g, 'data-event-change="$1"');
    
    // Replace oninput with data-event-input
    html = html.replace(/oninput="([^"]+)"/g, 'data-event-input="$1"');
    
    // Replace onsubmit with data-event-submit
    html = html.replace(/onsubmit="([^"]+)"/g, 'data-event-submit="$1"');
    
    // Replace onfocus with data-event-focus
    html = html.replace(/onfocus="([^"]+)"/g, 'data-event-focus="$1"');
    
    // Replace onblur with data-event-blur
    html = html.replace(/onblur="([^"]+)"/g, 'data-event-blur="$1"');
    
    // Replace drag events
    html = html.replace(/ondragstart="([^"]+)"/g, 'data-event-dragstart="$1"');
    html = html.replace(/ondragover="([^"]+)"/g, 'data-event-dragover="$1"');
    html = html.replace(/ondragleave="([^"]+)"/g, 'data-event-dragleave="$1"');
    html = html.replace(/ondrop="([^"]+)"/g, 'data-event-drop="$1"');
    
    return html;
  }
  
  /**
   * Create a render helper that automatically replaces inline handlers
   * @param {Function} renderFunction - Original render function
   * @param {HTMLElement} component - Web component instance
   * @returns {Function} New render function
   */
  createSecureRender(renderFunction, component) {
    return (...args) => {
      // Call original render function
      let html = renderFunction.apply(component, args);
      
      // Replace inline handlers
      html = this.replaceInlineHandlers(html);
      
      return html;
    };
  }
}

// Export singleton instance
export const eventManager = new EventManager();
