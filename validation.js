// src/utils/validation.js
import { VERIFICATION_STATUSES } from './constants.js';

/**
 * Enhanced validation utilities for CASL Verification System
 * UPDATED: Added safe property access for all formData fields
 */

/**
 * Safely get string value from formData field
 * @param {Object} formData - Form data object
 * @param {string} field - Field name
 * @returns {string} Field value or empty string
 */
function getFieldValue(formData, field) {
  return (formData && formData[field]) ? String(formData[field]) : '';
}

/**
 * Safely get boolean value from formData field
 * @param {Object} formData - Form data object
 * @param {string} field - Field name
 * @returns {boolean} Field value or false
 */
function getBooleanValue(formData, field) {
  return !!(formData && formData[field]);
}

/**
 * Safely get number value from formData field
 * @param {Object} formData - Form data object
 * @param {string} field - Field name
 * @param {number} defaultValue - Default value if field is missing
 * @returns {number} Field value or default
 */
function getNumberValue(formData, field, defaultValue = 0) {
  if (!formData || formData[field] === undefined || formData[field] === null) {
    return defaultValue;
  }
  const value = Number(formData[field]);
  return isNaN(value) ? defaultValue : value;
}

/**
 * Validates the User Identification step fields
 * @param {Object} formData - Form data with user identification fields
 * @param {Object} userIdentification - User identification status
 * @param {string} verificationStatus - Current verification status
 * @returns {Object} Object with field errors
 */
export function validateUserIdentification(formData, userIdentification, verificationStatus) {
  const errors = {
    name: '',
    email: '',
    phone: '',
    address: '',
    verification: ''
  };
  
  // Safe field access with validation
  const name = getFieldValue(formData, 'name').trim();
  const email = getFieldValue(formData, 'email').trim();
  const phone = getFieldValue(formData, 'phone').trim();
  const address = getFieldValue(formData, 'address').trim();
  
  // Required fields validation
  if (!name) {
    errors.name = "Name is required";
  } else if (name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (name.length > 100) {
    errors.name = "Name must be less than 100 characters";
  }
  
  if (!email) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Please enter a valid email address";
  } else if (email.length > 254) {
    errors.email = "Email address is too long";
  }
  
  if (!phone) {
    errors.phone = "Phone number is required";
  } else {
    // Clean phone number for validation (remove spaces, dashes, parentheses)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!/^[\d\+]{10,15}$/.test(cleanPhone)) {
      errors.phone = "Please enter a valid phone number (10-15 digits)";
    }
  }
  
  if (!address) {
    errors.address = "Address is required";
  } else if (address.length < 10) {
    errors.address = "Please enter a complete address";
  } else if (address.length > 200) {
    errors.address = "Address must be less than 200 characters";
  }
  
  // FIXED: Safe platform profile validation with proper null checking
  const airbnbProfile = getFieldValue(formData, 'airbnbProfile').trim();
  const vrboProfile = getFieldValue(formData, 'vrboProfile').trim();
  const otherPlatformProfile = getFieldValue(formData, 'otherPlatformProfile').trim();
  const consentToBackgroundCheck = getBooleanValue(formData, 'consentToBackgroundCheck');
  
  const hasProfileLink = !!(airbnbProfile || vrboProfile || otherPlatformProfile);
  
  // Check if user is already verified through various methods
  const isVerified = (userIdentification && userIdentification.isVerified) || 
                     verificationStatus === VERIFICATION_STATUSES.VERIFIED || 
                     verificationStatus === VERIFICATION_STATUSES.MANUAL_REVIEW;
  
  // Validation logic: User needs at least one verification method
  if (!hasProfileLink && !consentToBackgroundCheck && !isVerified) {
    errors.verification = "Please provide at least one verification method: platform profile link, screenshot verification, or consent to background check";
  }
  
  // Validate profile URLs if provided
  if (airbnbProfile && !isValidUrl(airbnbProfile)) {
    errors.verification = "Airbnb profile must be a valid URL";
  }
  
  if (vrboProfile && !isValidUrl(vrboProfile)) {
    errors.verification = "VRBO profile must be a valid URL";
  }
  
  if (otherPlatformProfile && !isValidUrl(otherPlatformProfile)) {
    errors.verification = "Platform profile must be a valid URL";
  }
  
  return errors;
}

/**
 * Validates the Booking Info step fields
 * @param {Object} formData - Form data with booking info fields
 * @returns {Object} Object with field errors
 */
export function validateBookingInfo(formData) {
  const errors = {
    platform: '',
    listingLink: '',
    checkInDate: '',
    checkOutDate: ''
  };
  
  // Safe field access
  const platform = getFieldValue(formData, 'platform');
  const listingLink = getFieldValue(formData, 'listingLink').trim();
  const checkInDate = getFieldValue(formData, 'checkInDate');
  const checkOutDate = getFieldValue(formData, 'checkOutDate');
  
  // Platform validation
  if (!platform) {
    errors.platform = "Please select a booking platform";
  }
  
  // Listing link validation
  if (!listingLink) {
    errors.listingLink = "Listing link is required";
  } else if (!isValidUrl(listingLink)) {
    errors.listingLink = "Please enter a valid URL beginning with http:// or https://";
  } else if (listingLink.length > 500) {
    errors.listingLink = "URL is too long";
  }
  
  // Date validation
  if (!checkInDate) {
    errors.checkInDate = "Check-in date is required";
  } else if (!isValidDate(checkInDate)) {
    errors.checkInDate = "Please enter a valid check-in date";
  }
  
  if (!checkOutDate) {
    errors.checkOutDate = "Check-out date is required";
  } else if (!isValidDate(checkOutDate)) {
    errors.checkOutDate = "Please enter a valid check-out date";
  }
  
  // Validate check-out date is after check-in date
  if (checkInDate && checkOutDate && isValidDate(checkInDate) && isValidDate(checkOutDate)) {
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    if (checkOut <= checkIn) {
      errors.checkOutDate = "Check-out date must be after check-in date";
    }
    
    // Check if dates are not too far in the past
    if (checkIn < today) {
      const daysDiff = Math.floor((today - checkIn) / (1000 * 60 * 60 * 24));
      if (daysDiff > 30) {
        errors.checkInDate = "Check-in date cannot be more than 30 days in the past";
      }
    }
    
    // Check if dates are not too far in the future
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (checkIn > oneYearFromNow) {
      errors.checkInDate = "Check-in date cannot be more than 1 year in the future";
    }
    
    // Check stay duration
    const stayDuration = Math.floor((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    if (stayDuration > 365) {
      errors.checkOutDate = "Stay duration cannot exceed 365 days";
    }
  }
  
  return errors;
}

/**
 * Validates the Stay Intent step fields
 * @param {Object} formData - Form data with stay intent fields
 * @returns {Object} Object with field errors
 */
export function validateStayIntent(formData) {
  const errors = {
    stayPurpose: '',
    otherPurpose: '',
    totalGuests: '',
    childrenUnder12: '',
    nonOvernightGuests: '',
    zipCode: '',
    previousStayLinks: ''
  };
  
  // Safe field access
  const stayPurpose = getFieldValue(formData, 'stayPurpose');
  const otherPurpose = getFieldValue(formData, 'otherPurpose').trim();
  const totalGuests = getNumberValue(formData, 'totalGuests', 1);
  const childrenUnder12 = getNumberValue(formData, 'childrenUnder12', 0);
  const nonOvernightGuests = getNumberValue(formData, 'nonOvernightGuests', 0);
  const travelingNearHome = getBooleanValue(formData, 'travelingNearHome');
  const zipCode = getFieldValue(formData, 'zipCode').trim();
  const usedSTRBefore = getBooleanValue(formData, 'usedSTRBefore');
  const previousStayLinks = getFieldValue(formData, 'previousStayLinks').trim();
  
  // Stay purpose validation
  if (!stayPurpose) {
    errors.stayPurpose = "Please select a purpose for your stay";
  }
  
  if (stayPurpose === 'Other' && !otherPurpose) {
    errors.otherPurpose = "Please specify your purpose";
  } else if (stayPurpose === 'Other' && otherPurpose.length < 3) {
    errors.otherPurpose = "Purpose description must be at least 3 characters";
  } else if (stayPurpose === 'Other' && otherPurpose.length > 200) {
    errors.otherPurpose = "Purpose description must be less than 200 characters";
  }
  
  // Guest count validation
  if (totalGuests < 1) {
    errors.totalGuests = "At least 1 guest is required";
  } else if (totalGuests > 20) {
    errors.totalGuests = "Maximum 20 guests allowed";
  } else if (!Number.isInteger(totalGuests)) {
    errors.totalGuests = "Number of guests must be a whole number";
  }
  
  // Children validation
  if (childrenUnder12 < 0) {
    errors.childrenUnder12 = "Number of children cannot be negative";
  } else if (childrenUnder12 > totalGuests) {
    errors.childrenUnder12 = "Number of children cannot exceed total guests";
  } else if (!Number.isInteger(childrenUnder12)) {
    errors.childrenUnder12 = "Number of children must be a whole number";
  }
  
  // Non-overnight guests validation
  if (nonOvernightGuests < 0) {
    errors.nonOvernightGuests = "Number of non-overnight guests cannot be negative";
  } else if (nonOvernightGuests > 50) {
    errors.nonOvernightGuests = "Maximum 50 non-overnight guests allowed";
  } else if (!Number.isInteger(nonOvernightGuests)) {
    errors.nonOvernightGuests = "Number of non-overnight guests must be a whole number";
  }
  
  // ZIP code validation for local bookings
  if (travelingNearHome && !zipCode) {
    errors.zipCode = "ZIP code is required when staying near home";
  } else if (zipCode && !/^\d{5}(-\d{4})?$/.test(zipCode)) {
    errors.zipCode = "Please enter a valid ZIP code (e.g., 12345 or 12345-6789)";
  }
  
  // Previous stay links validation
  if (usedSTRBefore && previousStayLinks) {
    // Split by common delimiters and validate each URL
    const links = previousStayLinks.split(/[,;\n\r]+/).map(link => link.trim()).filter(link => link);
    const invalidLinks = links.filter(link => !isValidUrl(link));
    
    if (invalidLinks.length > 0) {
      errors.previousStayLinks = "Please provide valid URLs for previous stays";
    } else if (links.length > 10) {
      errors.previousStayLinks = "Please provide no more than 10 previous stay links";
    }
  }
  
  return errors;
}

/**
 * Validates the Agreement step fields
 * @param {Object} formData - Form data with agreement fields
 * @returns {Object} Object with field errors
 */
export function validateAgreement(formData) {
  const errors = {
    agreeToRules: '',
    agreeNoParties: '',
    understandFlagging: ''
  };
  
  // Safe field access
  const agreeToRules = getBooleanValue(formData, 'agreeToRules');
  const agreeNoParties = getBooleanValue(formData, 'agreeNoParties');
  const understandFlagging = getBooleanValue(formData, 'understandFlagging');
  
  // All agreements are required
  if (!agreeToRules) {
    errors.agreeToRules = "You must agree to follow property rules and regulations";
  }
  
  if (!agreeNoParties) {
    errors.agreeNoParties = "You must agree to the no unauthorized parties or events policy";
  }
  
  if (!understandFlagging) {
    errors.understandFlagging = "You must acknowledge understanding of the terms and flagging policy";
  }
  
  return errors;
}

/**
 * Checks if a step is valid (has no errors)
 * @param {Object} errors - The error object for validation
 * @returns {boolean} True if valid, false otherwise
 */
export function isStepValid(errors) {
  if (!errors || typeof errors !== 'object') {
    return false;
  }
  
  return Object.values(errors).every(error => !error || error.trim() === '');
}

/**
 * Validates all form steps and returns combined errors
 * @param {Object} formData - Complete form data
 * @param {Object} userIdentification - User identification data
 * @param {string} verificationStatus - Current verification status
 * @returns {Object} Combined errors from all steps
 */
export function validateAllSteps(formData, userIdentification, verificationStatus) {
  const allErrors = {
    userIdentification: validateUserIdentification(formData, userIdentification, verificationStatus),
    bookingInfo: validateBookingInfo(formData),
    stayIntent: validateStayIntent(formData),
    agreement: validateAgreement(formData)
  };
  
  // Calculate overall validity
  const isValid = Object.values(allErrors).every(stepErrors => isStepValid(stepErrors));
  
  return {
    errors: allErrors,
    isValid,
    errorCount: Object.values(allErrors).reduce((count, stepErrors) => {
      return count + Object.values(stepErrors).filter(error => error && error.trim()).length;
    }, 0)
  };
}

/**
 * Helper function to validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (error) {
    // Fallback regex validation
    return /^https?:\/\/.+\..+/.test(url);
  }
}

/**
 * Helper function to validate date format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid date
 */
function isValidDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Get validation summary for debugging
 * @param {Object} formData - Form data to validate
 * @param {Object} userIdentification - User identification data
 * @param {string} verificationStatus - Verification status
 * @returns {Object} Validation summary
 */
export function getValidationSummary(formData, userIdentification, verificationStatus) {
  const validation = validateAllSteps(formData, userIdentification, verificationStatus);
  
  return {
    isValid: validation.isValid,
    errorCount: validation.errorCount,
    stepErrors: Object.keys(validation.errors).map(step => ({
      step,
      errors: Object.keys(validation.errors[step]).filter(
        field => validation.errors[step][field]
      ).length,
      isValid: isStepValid(validation.errors[step])
    })),
    allErrors: validation.errors
  };
}