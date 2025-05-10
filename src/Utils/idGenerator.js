// src/utils/idGenerator.js

/**
 * Generates a unique CASL Key ID with format 'CKxxxxx'
 * @returns {string} A unique CASL Key ID
 */
export function generateCASLKeyId() {
  // Use only easily distinguishable characters (no O/0, I/l, etc.)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  // Start with CK prefix
  let id = 'CK';
  
  // Add 5 random characters
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return id;
}
