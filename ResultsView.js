// src/components/ResultsView.js
import { TRUST_LEVEL_DISPLAY } from './constants.js';

/**
 * Renders the verification results view with enhanced accessibility
 * @param {Object} userIdentification - User identification data
 * @param {string} trustLevel - Trust level identifier
 * @param {number} score - Calculated trust score
 * @param {string} message - Result message
 * @param {Array} adjustments - Score adjustments (bonuses/deductions)
 * @returns {string} HTML string for results view
 */
export function renderResults(userIdentification, trustLevel, score, message, adjustments) {
  // Get display data for the trust level
  const trustLevelData = TRUST_LEVEL_DISPLAY[trustLevel] || {
    badgeColor: '#4CAF50',
    icon: '✅',
    label: 'Verified'
  };

  return `
    <div class="results-container" role="region" aria-labelledby="results-heading">
      <h1 id="results-heading">CASL Key Verification Result</h1>
      
      <div 
        class="result-card" 
        aria-live="polite"
      >
        <div class="result-header">
          <h2>CASL Key ID: ${userIdentification.caslKeyId || 'Not Assigned'}</h2>
        </div>
        
        <div 
          class="trust-badge" 
          style="background-color: ${trustLevelData.badgeColor}"
          aria-label="Trust level: ${trustLevelData.label}"
        >
          <span aria-hidden="true">${trustLevelData.icon} ${trustLevelData.label}</span>
        </div>
        
        <div 
          class="score-display" 
          aria-label="Trust score: ${score} out of 100"
        >
          <span class="score-number">${score}</span>
          <span class="score-max">/100</span>
        </div>
        
        <p 
          class="result-message" 
          aria-live="polite"
        >
          ${message}
        </p>
        
        <div 
          class="adjustments-list" 
          aria-labelledby="score-factors-heading"
        >
          <h3 id="score-factors-heading">Score Factors</h3>
          
          ${adjustments && adjustments.length > 0 ? `
            <div>
              ${adjustments.map(adj => `
                <div 
                  class="adjustment-item" 
                  aria-label="${adj.reason}: ${adj.points > 0 ? 'plus' : 'minus'} ${Math.abs(adj.points)} points"
                >
                  <span>${adj.reason}</span>
                  <span 
                    class="adjustment-points ${adj.points > 0 ? 'adjustment-positive' : 'adjustment-negative'}"
                    aria-hidden="true"
                  >
                    ${adj.points > 0 ? '+' : ''}${adj.points}
                  </span>
                </div>
              `).join('')}
            </div>
          ` : `
            <p style="color: #666">No score adjustments applied.</p>
          `}
        </div>
        
        <div class="trust-badge-info" style="margin-top: 30px;">
          <h3>Trust Badge Information</h3>
          <p>
            Your trust badge is valid for 12 months. Future hosts will see your verification status, 
            but never your personal details.
          </p>
        </div>
        
        <div class="action-buttons" style="display: flex; justify-content: center; gap: 15px; margin-top: 30px">
          <button 
            onclick="this.getRootNode().host.handleReset()" 
            aria-label="Start over with a new verification"
          >
            Start Over
          </button>
          
          <button 
            onclick="this.getRootNode().host.printResults()" 
            aria-label="Print verification results"
            class="neutral"
          >
            Print Results
          </button>
        </div>
      </div>
    </div>
  `;
}
