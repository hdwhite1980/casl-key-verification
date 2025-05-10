// src/services/i18n.js

/**
 * Internationalization (i18n) service for CASL Verification
 * Handles localization and translations
 */
class I18nService {
  constructor() {
    // Default language
    this.currentLanguage = 'en';
    
    // Available languages
    this.availableLanguages = [
      { code: 'en', name: 'English', direction: 'ltr' },
      { code: 'es', name: 'Español', direction: 'ltr' },
      { code: 'fr', name: 'Français', direction: 'ltr' },
      { code: 'de', name: 'Deutsch', direction: 'ltr' },
      { code: 'zh', name: '中文', direction: 'ltr' },
      { code: 'ja', name: '日本語', direction: 'ltr' },
      { code: 'ar', name: 'العربية', direction: 'rtl' },
      { code: 'ru', name: 'Русский', direction: 'ltr' },
      { code: 'pt', name: 'Português', direction: 'ltr' },
      { code: 'hi', name: 'हिन्दी', direction: 'ltr' }
    ];
    
    // Translations for each language
    this.translations = {};
    
    // Initialize
    this.init();
  }
  
  /**
   * Initialize the service
   */
  async init() {
    // Detect user's preferred language
    this.detectLanguage();
    
    // Load translations for current language
    await this.loadTranslations(this.currentLanguage);
    
    // Add language selector and direction attributes
    this.updateDocumentLanguage();
  }
  
  /**
   * Detect user's preferred language
   */
  detectLanguage() {
    // First check if user has a saved preference
    const savedLanguage = localStorage.getItem('casl_language');
    if (savedLanguage && this.isLanguageSupported(savedLanguage)) {
      this.currentLanguage = savedLanguage;
      return;
    }
    
    // Otherwise detect from browser
    const browserLang = navigator.language.split('-')[0];
    if (this.isLanguageSupported(browserLang)) {
      this.currentLanguage = browserLang;
    }
  }
  
  /**
   * Check if a language is supported
   * @param {string} langCode - Language code to check
   * @returns {boolean} Whether language is supported
   */
  isLanguageSupported(langCode) {
    return this.availableLanguages.some(lang => lang.code === langCode);
  }
  
  /**
   * Load translations for a language
   * @param {string} langCode - Language code
   * @returns {Promise<void>}
   */
  async loadTranslations(langCode) {
    // If translations are already loaded
    if (this.translations[langCode]) {
      return;
    }
    
    try {
      // In a real app, this would load from a server or local file
      // For this demo, we'll include translations for demo languages
      
      if (langCode === 'en') {
        this.translations.en = {
          // General
          'app.title': 'CASL Key Verification',
          'app.submit': 'Submit',
          'app.next': 'Next',
          'app.previous': 'Previous',
          'app.loading': 'Loading...',
          'app.submitting': 'Submitting...',
          'app.required': 'Required',
          'app.optional': 'Optional',
          'app.error': 'Error',
          'app.success': 'Success',
          
          // Step titles
          'steps.userIdentification': 'User Identification',
          'steps.bookingInfo': 'Booking Information',
          'steps.stayIntent': 'Stay Intent',
          'steps.agreement': 'Agreement',
          
          // User Identification
          'userIdentification.name': 'Full Name',
          'userIdentification.email': 'Email Address',
          'userIdentification.phone': 'Phone Number',
          'userIdentification.address': 'Address',
          'userIdentification.airbnbProfile': 'Airbnb Profile Link',
          'userIdentification.vrboProfile': 'Vrbo Profile Link',
          'userIdentification.otherPlatformProfile': 'Other Platform Profile',
          'userIdentification.selectPlatform': 'Select platform',
          'userIdentification.verifyWithScreenshot': 'Verify with Account Screenshot',
          'userIdentification.bgCheckConsent': 'I consent to a background check to verify my identity.',
          'userIdentification.checkingStatus': 'Checking user status...',
          'userIdentification.welcomeBack': 'Welcome back! We found your existing CASL Key ID:',
          'userIdentification.uploadScreenshot': 'Please upload a screenshot of your Airbnb or VRBO profile page to verify your account.',
          'userIdentification.dragScreenshot': 'Drag a screenshot here or click to select a file',
          'userIdentification.processing': 'Your screenshot is being processed. This may take a minute...',
          'userIdentification.verified': 'Your account has been verified successfully!',
          'userIdentification.manualReview': 'Your screenshot has been submitted for manual review. We\'ll notify you once it\'s verified.',
          'userIdentification.rejected': 'We couldn\'t verify your account from this screenshot. Please try again with a clearer image.',
          
          // Booking Info
          'bookingInfo.platform': 'Platform used',
          'bookingInfo.listingLink': 'STR Listing Link',
          'bookingInfo.checkInDate': 'Check-in Date',
          'bookingInfo.checkOutDate': 'Check-out Date',
          
          // Stay Intent
          'stayIntent.purpose': 'What is the primary purpose of your stay?',
          'stayIntent.otherPurpose': 'Please specify',
          'stayIntent.totalGuests': 'How many total guests will stay?',
          'stayIntent.childrenUnder12': 'Are there any children under 12?',
          'stayIntent.nonOvernightGuests': 'Will any guests not be staying overnight?',
          'stayIntent.travelingNearHome': 'Are you traveling within 20 miles of your home?',
          'stayIntent.zipCode': 'ZIP code',
          'stayIntent.usedSTRBefore': 'Have you used STRs before?',
          'stayIntent.previousStayLinks': 'Optional: Previous stay links',
          
          // Agreement
          'agreement.agreeToRules': 'I agree to follow quiet hours and property rules',
          'agreement.agreeNoParties': 'I agree not to host parties or events without host approval',
          'agreement.understandFlagging': 'I understand that violation of these terms may result in being flagged in CASL Key\'s network',
          
          // Results
          'results.title': 'CASL Key Verification Result',
          'results.caslKeyId': 'CASL Key ID:',
          'results.scoreFactors': 'Score Factors',
          'results.noAdjustments': 'No score adjustments applied.',
          'results.trustBadgeInfo': 'Trust Badge Information',
          'results.trustBadgeDescription': 'Your trust badge is valid for 12 months. Future hosts will see your verification status, but never your personal details.',
          'results.startOver': 'Start Over',
          
          // Trust levels
          'trustLevel.verified': 'Verified – Low Risk',
          'trustLevel.review': 'Verified – Review Recommended',
          'trustLevel.manualReview': 'Manual Review Pending',
          'trustLevel.notEligible': 'Not Eligible at This Time',
          
          // Messages
          'message.verified': 'You\'re officially CASL Key Verified! Your trust badge is valid for 12 months and can be shared with any CASL Key host. Keep your badge active by booking responsibly.',
          'message.review': 'You\'re almost there! While you\'re verified, your Trust Score indicates a few flags (e.g., local booking or large group). Hosts may ask additional questions.',
          'message.manualReview': 'We\'re completing a review of your profile. This typically takes 24-48 hours. We\'ll notify you once your profile has been reviewed.',
          'message.notEligible': 'We\'re unable to approve your CASL Key at this time. You may reapply in 90 days or contact support to resolve outstanding concerns.',
          
          // Tooltips
          'tooltip.profileHelp': 'Providing a platform profile helps verify your identity and may improve your trust score.',
          'tooltip.listingLink': 'Provide the exact URL of your booking to verify it\'s legitimate.',
          'tooltip.stayPurpose': 'This helps hosts understand why you\'re traveling.',
          'tooltip.childrenUnder12': 'Having children in your group may positively affect your trust score.',
          'tooltip.nonOvernightGuests': 'This helps hosts understand if additional visitors may be present during the day.',
          'tooltip.travelingNearHome': 'Local bookings may require additional context for verification.',
          'tooltip.previousStayLinks': 'Prior rental experience may positively impact your trust score.',
          'tooltip.rules': 'Following property-specific rules helps maintain great relationships with hosts and neighbors.',
          'tooltip.noParties': 'Always discuss any gathering plans with your host in advance.',
          'tooltip.understandFlagging': 'CASL Key aims to create a trusted network of verified guests and hosts. Complying with platform standards keeps your verification active.',
          
          // Language selector
          'language.select': 'Select Language',
          'language.current': 'Current: English'
        };
        
      } else if (langCode === 'es') {
        this.translations.es = {
          // General
          'app.title': 'Verificación CASL Key',
          'app.submit': 'Enviar',
          'app.next': 'Siguiente',
          'app.previous': 'Anterior',
          'app.loading': 'Cargando...',
          'app.submitting': 'Enviando...',
          'app.required': 'Obligatorio',
          'app.optional': 'Opcional',
          'app.error': 'Error',
          'app.success': 'Éxito',
          
          // Step titles
          'steps.userIdentification': 'Identificación de Usuario',
          'steps.bookingInfo': 'Información de Reserva',
          'steps.stayIntent': 'Propósito de Estancia',
          'steps.agreement': 'Acuerdo',
          
          // User Identification
          'userIdentification.name': 'Nombre Completo',
          'userIdentification.email': 'Correo Electrónico',
          'userIdentification.phone': 'Número de Teléfono',
          'userIdentification.address': 'Dirección',
          'userIdentification.airbnbProfile': 'Enlace de Perfil de Airbnb',
          'userIdentification.vrboProfile': 'Enlace de Perfil de Vrbo',
          'userIdentification.otherPlatformProfile': 'Perfil de Otra Plataforma',
          'userIdentification.selectPlatform': 'Seleccionar plataforma',
          'userIdentification.verifyWithScreenshot': 'Verificar con Captura de Pantalla',
          'userIdentification.bgCheckConsent': 'Consiento a una verificación de antecedentes para verificar mi identidad.',
          'userIdentification.checkingStatus': 'Comprobando estado del usuario...',
          'userIdentification.welcomeBack': '¡Bienvenido de nuevo! Encontramos tu CASL Key ID existente:',
          
          // More translations for Spanish...
          
          // Language selector
          'language.select': 'Seleccionar Idioma',
          'language.current': 'Actual: Español'
        };
      }
      
      // Add more languages as needed
      
    } catch (error) {
      console.error(`Failed to load translations for ${langCode}:`, error);
      // Fall back to English if translation loading fails
      this.currentLanguage = 'en';
      await this.loadTranslations('en');
    }
  }
  
  /**
   * Get a translated string
   * @param {string} key - Translation key
   * @param {Object} [params] - Parameters to replace in string
   * @returns {string} Translated string
   */
  translate(key, params = {}) {
    // Get the translations for current language
    const translations = this.translations[this.currentLanguage] || {};
    
    // Get the string or fallback to English or key
    let translatedString = translations[key] || 
                         (this.translations.en && this.translations.en[key]) || 
                         key;
    
    // Replace parameters
    Object.entries(params).forEach(([param, value]) => {
      translatedString = translatedString.replace(`{${param}}`, value);
    });
    
    return translatedString;
  }
  
  /**
   * Change the current language
   * @param {string} langCode - Language code
   * @returns {Promise<void>}
   */
  async changeLanguage(langCode) {
    if (!this.isLanguageSupported(langCode)) {
      console.error(`Language ${langCode} is not supported`);
      return;
    }
    
    // Set new language
    this.currentLanguage = langCode;
    
    // Save preference
    localStorage.setItem('casl_language', langCode);
    
    // Load translations if needed
    await this.loadTranslations(langCode);
    
    // Update document language
    this.updateDocumentLanguage();
    
    // Dispatch event for language change
    const event = new CustomEvent('caslLanguageChanged', {
      detail: {
        language: langCode,
        languageInfo: this.getLanguageInfo(langCode)
      },
      bubbles: true,
      composed: true
    });
    document.dispatchEvent(event);
  }
  
  /**
   * Get information about a language
   * @param {string} langCode - Language code
   * @returns {Object|null} Language information
   */
  getLanguageInfo(langCode) {
    return this.availableLanguages.find(lang => lang.code === langCode) || null;
  }
  
  /**
   * Update document language and direction
   */
  updateDocumentLanguage() {
    const langInfo = this.getLanguageInfo(this.currentLanguage);
    if (langInfo) {
      // Set HTML dir attribute for RTL languages
      document.documentElement.dir = langInfo.direction;
      document.documentElement.lang = langInfo.code;
    }
  }
  
  /**
   * Render a language selector dropdown
   * @returns {string} HTML for language selector
   */
  renderLanguageSelector() {
    const currentLang = this.getLanguageInfo(this.currentLanguage);
    
    let options = '';
    this.availableLanguages.forEach(lang => {
      options += `
        <option value="${lang.code}" ${lang.code === this.currentLanguage ? 'selected' : ''}>
          ${lang.name}
        </option>
      `;
    });
    
    return `
      <div class="language-selector">
        <label for="language-select">${this.translate('language.select')}</label>
        <select id="language-select" onchange="this.getRootNode().host.handleLanguageChange(event)">
          ${options}
        </select>
        <p class="current-language">${this.translate('language.current')}</p>
      </div>
    `;
  }
  
  /**
   * Format date according to current locale
   * @param {Date|string} date - Date to format
   * @param {Object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date
   */
  formatDate(date, options = { dateStyle: 'medium' }) {
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(this.currentLanguage, options).format(dateObj);
  }
  
  /**
   * Format number according to current locale
   * @param {number} number - Number to format
   * @param {Object} options - Intl.NumberFormat options
   * @returns {string} Formatted number
   */
  formatNumber(number, options = {}) {
    return new Intl.NumberFormat(this.currentLanguage, options).format(number);
  }
  
  /**
   * Format currency according to current locale
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (e.g., USD)
   * @returns {string} Formatted currency
   */
  formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat(this.currentLanguage, {
      style: 'currency',
      currency
    }).format(amount);
  }
}

// Shorthand function for translation
export const t = (key, params = {}) => i18nService.translate(key, params);

// Export singleton instance
export const i18nService = new I18nService();
