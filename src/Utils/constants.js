// src/utils/constants.js
export const API_BASE_URL = 'https://tn25108ywk.execute-api.us-east-2.amazonaws.com/prod';

export const VERIFICATION_STATUSES = {
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  PROCESSING: 'PROCESSING',
  VERIFIED: 'VERIFIED',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
  REJECTED: 'REJECTED'
};

export const TRUST_LEVELS = {
  VERIFIED: 'verified',    // Score 85-100: Verified, meets recommended trust standards
  REVIEW: 'review',        // Score 70-84: Additional context needed
  MANUAL_REVIEW: 'manual_review', // Score 50-69: Manual review required
  NOT_ELIGIBLE: 'not_eligible'   // Score below 50: Not eligible at this time
};

// Score ranges for different trust levels
export const SCORE_RANGES = {
  [TRUST_LEVELS.VERIFIED]: '85-100',
  [TRUST_LEVELS.REVIEW]: '70-84',
  [TRUST_LEVELS.MANUAL_REVIEW]: '50-69',
  [TRUST_LEVELS.NOT_ELIGIBLE]: 'Below 50'
};

// Trust level display data (badge color, icon, message)
export const TRUST_LEVEL_DISPLAY = {
  [TRUST_LEVELS.VERIFIED]: {
    badgeColor: '#4CAF50',
    icon: '✅',
    label: 'Verified',
    description: 'Verified guest. Meets CASL Key\'s recommended trust standards.'
  },
  [TRUST_LEVELS.REVIEW]: {
    badgeColor: '#FFC107',
    icon: '⚠️',
    label: 'Additional Context Needed',
    description: 'Some traits require review. We recommend reviewing booking context.'
  },
  [TRUST_LEVELS.MANUAL_REVIEW]: {
    badgeColor: '#9E9E9E',
    icon: '🕵️',
    label: 'Manual Review Pending',
    description: 'We\'re completing a review of this guest\'s profile. You\'ll be notified soon.'
  },
  [TRUST_LEVELS.NOT_ELIGIBLE]: {
    badgeColor: '#757575',
    icon: '🔒',
    label: 'Not Eligible at This Time',
    description: 'This guest does not currently meet platform-wide trust requirements.'
  }
};

export const FORM_STEPS = [
  'User Identification',
  'Booking Info',
  'Stay Intent',
  'Agreement'
];
