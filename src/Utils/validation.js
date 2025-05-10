// src/utils/validation.js
import { VERIFICATION_STATUSES } from './constants.js';

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
  
  // Required fields validation
  if (!formData.name.trim()) errors.name = "Name is required";
  
  if (!formData.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
    errors.email = "Please enter a valid email address";
  }
  
  if (!formData.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (!/^[\d\s\+\-\(\)]{10,15}$/.test(formData.phone.replace(/\s/g, ''))) {
    errors.phone = "Please enter a valid phone number";
  }
  
  if (!formData.address.trim()) errors.address = "Address is required";
  
  // Verification options validation
  const hasProfileLink = !!(
    formData.airbnbProfile.trim() || 
    formData.vrboProfile.trim() || 
    formData.otherPlatformProfile.trim()
  );
  
  const isVerified = userIdentification.isVerified || 
                     verificationStatus === VERIFICATION_STATUSES.VERIFIED || 
                     verificationStatus === VERIFICATION_STATUSES.MANUAL_REVIEW;
                     
  if (!hasProfileLink && !formData.consentToBackgroundCheck && !isVerified) {
    errors.verification = "Either a platform profile, screenshot verification, or consent to background check is required";
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
  
  if (!formData.platform) errors.platform = "Please select a platform";
  
  if (!formData.listingLink.trim()) {
    errors.listingLink = "Listing link is required";
  } else if (!/^https?:\/\/.+/.test(formData.listingLink)) {
    errors.listingLink = "Please enter a valid URL beginning with http:// or https://";
  }
  
  if (!formData.checkInDate) errors.checkInDate = "Check-in date is required";
  if (!formData.checkOutDate) errors.checkOutDate = "Check-out date is required";
  
  // Validate check-out date is after check-in date
  if (formData.checkInDate && formData.checkOutDate) {
    const checkIn = new Date(formData.checkInDate);
    const checkOut = new Date(formData.checkOutDate);
    
    if (checkOut <= checkIn) {
      errors.checkOutDate = "Check-out date must be after check-in date";
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
    zipCode: ''
  };
  
  if (!formData.stayPurpose) errors.stayPurpose = "Please select a purpose";
  
  if (formData.stayPurpose === 'Other' && !formData.otherPurpose.trim()) {
    errors.otherPurpose = "Please specify your purpose";
  }
  
  if (formData.totalGuests < 1) {
    errors.totalGuests = "At least 1 guest is required";
  } else if (formData.totalGuests > 20) {
    errors.totalGuests = "Maximum 20 guests allowed";
  }
  
  if (formData.travelingNearHome && !formData.zipCode.trim()) {
    errors.zipCode = "ZIP code is required when staying near home";
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
  
  if (!formData.agreeToRules) {
    errors.agreeToRules = "You must agree to follow property rules";
  }
  
  if (!formData.agreeNoParties) {
    errors.agreeNoParties = "You must agree to the no unauthorized parties policy";
  }
  
  if (!formData.understandFlagging) {
    errors.understandFlagging = "You must acknowledge the terms policy";
  }
  
  return errors;
}

/**
 * Checks if a step is valid (has no errors)
 * @param {Object} errors - The error object for validation
 * @returns {boolean} True if valid, false otherwise
 */
export function isStepValid(errors) {
  return Object.values(errors).every(error => !error);
}
