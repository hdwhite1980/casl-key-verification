// Updated Password Reset Handler for CASL System Integration
// This handles the NEW_PASSWORD_REQUIRED challenge from Cognito

class PasswordResetHandler {
    constructor() {
        this.apiBaseUrl = 'https://2mez9qoyt6.execute-api.us-east-2.amazonaws.com/prod';
        this.currentSession = null;
        this.currentUsername = null;
        this.setupEventListeners();
        this.createPasswordResetModal();
    }

    // Listen for CASL authentication events
    setupEventListeners() {
        // 🚨 NEW: Listen for the specific event from userService
        document.addEventListener('casl-password-reset-required', (event) => {
            console.log('🔄 Password reset required event received:', event.detail);
            this.showPasswordResetScreen(event.detail.session, event.detail.username);
        });

        // Keep existing listeners as backup
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                const authComponents = document.querySelectorAll('casl-authentication, casl-app');
                authComponents.forEach(component => {
                    component.addEventListener('casl-auth', (event) => {
                        this.handleAuthEvent(event.detail);
                    });
                });
            }, 1000);
        });

        document.addEventListener('casl-login-response', (event) => {
            this.handleAuthEvent(event.detail);
        });
    }

    // Handle authentication events from CASL
    handleAuthEvent(eventDetail) {
        console.log('Auth event received:', eventDetail);
        
        // Check if this is a NEW_PASSWORD_REQUIRED challenge
        if (eventDetail && eventDetail.challenge === 'NEW_PASSWORD_REQUIRED') {
            this.showPasswordResetScreen(eventDetail.session, eventDetail.username);
        } else if (eventDetail && eventDetail.success === false && eventDetail.message && eventDetail.message.includes('New password required')) {
            this.showPasswordResetScreen(eventDetail.session, eventDetail.username);
        }
    }

    // Create the password reset modal
    createPasswordResetModal() {
        const modalHTML = `
            <div id="password-reset-modal" class="password-reset-modal" style="display: none;">
                <div class="password-reset-overlay"></div>
                <div class="password-reset-container">
                    <div class="password-reset-header">
                        <h2>Password Reset Required</h2>
                        <p>You need to set a new password before you can continue.</p>
                    </div>
                    
                    <form id="password-reset-form" class="password-reset-form">
                        <div class="form-group">
                            <label for="new-password">New Password:</label>
                            <input 
                                type="password" 
                                id="new-password" 
                                name="newPassword" 
                                required
                                minlength="8"
                                placeholder="Enter new password"
                            >
                            <div class="password-requirements">
                                <p>Password must contain:</p>
                                <ul>
                                    <li id="req-length">At least 8 characters</li>
                                    <li id="req-uppercase">1 uppercase letter (A-Z)</li>
                                    <li id="req-lowercase">1 lowercase letter (a-z)</li>
                                    <li id="req-number">1 number (0-9)</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="confirm-password">Confirm New Password:</label>
                            <input 
                                type="password" 
                                id="confirm-password" 
                                name="confirmPassword" 
                                required
                                placeholder="Confirm new password"
                            >
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" id="reset-password-btn" class="btn-primary">
                                Set New Password
                            </button>
                            <button type="button" id="cancel-reset-btn" class="btn-secondary">
                                Cancel
                            </button>
                        </div>
                        
                        <div id="reset-error-message" class="error-message" style="display: none;"></div>
                        <div id="reset-success-message" class="success-message" style="display: none;"></div>
                    </form>
                </div>
            </div>
        `;

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add CSS styles
        this.addStyles();
        
        // Setup form handlers
        this.setupFormHandlers();
    }

    // Add CSS styles for the modal
    addStyles() {
        const styles = `
            <style>
                .password-reset-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .password-reset-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.8);
                }
                
                .password-reset-container {
                    position: relative;
                    background: white;
                    border-radius: 8px;
                    padding: 30px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                    z-index: 100000;
                }
                
                .password-reset-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .password-reset-header h2 {
                    color: #333;
                    margin-bottom: 10px;
                }
                
                .password-reset-header p {
                    color: #666;
                    margin: 0;
                }
                
                .password-reset-form .form-group {
                    margin-bottom: 20px;
                }
                
                .password-reset-form label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                    color: #333;
                }
                
                .password-reset-form input {
                    width: 100%;
                    padding: 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 16px;
                    box-sizing: border-box;
                }
                
                .password-reset-form input:focus {
                    outline: none;
                    border-color: #007cba;
                    box-shadow: 0 0 5px rgba(0, 124, 186, 0.3);
                }
                
                .password-requirements {
                    margin-top: 10px;
                    padding: 10px;
                    background-color: #f8f9fa;
                    border-radius: 4px;
                    font-size: 14px;
                }
                
                .password-requirements p {
                    margin: 0 0 5px 0;
                    font-weight: bold;
                }
                
                .password-requirements ul {
                    margin: 0;
                    padding-left: 20px;
                }
                
                .password-requirements li {
                    margin-bottom: 3px;
                    color: #666;
                }
                
                .password-requirements li.valid {
                    color: #28a745;
                }
                
                .form-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 30px;
                }
                
                .btn-primary, .btn-secondary {
                    flex: 1;
                    padding: 12px 20px;
                    border: none;
                    border-radius: 4px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }
                
                .btn-primary {
                    background-color: #007cba;
                    color: white;
                }
                
                .btn-primary:hover {
                    background-color: #005a87;
                }
                
                .btn-primary:disabled {
                    background-color: #ccc;
                    cursor: not-allowed;
                }
                
                .btn-secondary {
                    background-color: #6c757d;
                    color: white;
                }
                
                .btn-secondary:hover {
                    background-color: #545b62;
                }
                
                .error-message {
                    background-color: #f8d7da;
                    color: #721c24;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 15px;
                    border: 1px solid #f5c6cb;
                }
                
                .success-message {
                    background-color: #d4edda;
                    color: #155724;
                    padding: 10px;
                    border-radius: 4px;
                    margin-top: 15px;
                    border: 1px solid #c3e6cb;
                }
                
                .loading {
                    opacity: 0.7;
                    pointer-events: none;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }

    // Setup form event handlers
    setupFormHandlers() {
        const form = document.getElementById('password-reset-form');
        const newPasswordInput = document.getElementById('new-password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const cancelBtn = document.getElementById('cancel-reset-btn');
        
        // Password validation on input
        newPasswordInput.addEventListener('input', () => {
            this.validatePassword(newPasswordInput.value);
        });
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordReset();
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', () => {
            this.hidePasswordResetScreen();
        });
        
        // Close on overlay click
        document.querySelector('.password-reset-overlay').addEventListener('click', () => {
            this.hidePasswordResetScreen();
        });
    }

    // Validate password requirements
    validatePassword(password) {
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /\d/.test(password)
        };
        
        // Update requirement indicators
        document.getElementById('req-length').className = requirements.length ? 'valid' : '';
        document.getElementById('req-uppercase').className = requirements.uppercase ? 'valid' : '';
        document.getElementById('req-lowercase').className = requirements.lowercase ? 'valid' : '';
        document.getElementById('req-number').className = requirements.number ? 'valid' : '';
        
        return Object.values(requirements).every(req => req);
    }

    // Show password reset screen
    showPasswordResetScreen(session, username) {
        this.currentSession = session;
        this.currentUsername = username;
        
        console.log('Showing password reset screen for:', username);
        
        const modal = document.getElementById('password-reset-modal');
        modal.style.display = 'flex';
        
        // Focus on password input
        setTimeout(() => {
            document.getElementById('new-password').focus();
        }, 100);
    }

    // Hide password reset screen
    hidePasswordResetScreen() {
        const modal = document.getElementById('password-reset-modal');
        modal.style.display = 'none';
        
        // Clear form
        document.getElementById('password-reset-form').reset();
        this.clearMessages();
    }

    // Handle password reset form submission
    async handlePasswordReset() {
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const submitBtn = document.getElementById('reset-password-btn');
        
        // Clear previous messages
        this.clearMessages();
        
        // Validate passwords match
        if (newPassword !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        // Validate password requirements
        if (!this.validatePassword(newPassword)) {
            this.showError('Password does not meet requirements');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.textContent = 'Setting Password...';
        document.querySelector('.password-reset-container').classList.add('loading');
        
        try {
            // 🚨 NEW: Use userService method instead of direct fetch
            if (window.userService) {
                const user = await window.userService.setNewPassword(
                    this.currentSession,
                    this.currentUsername,
                    newPassword
                );
                
                this.showSuccess('Password updated successfully! Logging you in...');
                
                // Notify CASL that authentication is complete
                this.notifyAuthenticationComplete({ user, success: true });
                
                // Close modal after delay
                setTimeout(() => {
                    this.hidePasswordResetScreen();
                    // Refresh CASL to show dashboard
                    this.refreshCASLComponents();
                }, 2000);
                
            } else {
                // Fallback to direct API call
                const response = await fetch(`${this.apiBaseUrl}/set-new-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        session: this.currentSession,
                        newPassword: newPassword,
                        username: this.currentUsername
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    this.showSuccess('Password updated successfully! Logging you in...');
                    
                    // Store the tokens manually
                    if (result.accessToken) {
                        localStorage.setItem('casl_access_token', result.accessToken);
                    }
                    if (result.refreshToken) {
                        localStorage.setItem('casl_refresh_token', result.refreshToken);
                    }
                    if (result.user) {
                        localStorage.setItem('casl_user_data', JSON.stringify(result.user));
                    }
                    
                    // Notify CASL that authentication is complete
                    this.notifyAuthenticationComplete(result);
                    
                    // Close modal after delay
                    setTimeout(() => {
                        this.hidePasswordResetScreen();
                        this.refreshCASLComponents();
                    }, 2000);
                    
                } else {
                    this.showError(result.error || 'Password reset failed');
                }
            }
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.showError('Password reset failed: ' + error.message);
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = 'Set New Password';
            document.querySelector('.password-reset-container').classList.remove('loading');
        }
    }

    // Notify CASL that authentication is complete
    notifyAuthenticationComplete(authResult) {
        // Dispatch custom event for CASL to pick up
        const event = new CustomEvent('casl-auth-complete', {
            detail: authResult,
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(event);
        
        // Also dispatch regular auth event
        const authEvent = new CustomEvent('casl-auth', {
            detail: {
                type: 'authenticated',
                data: authResult.user
            },
            bubbles: true,
            composed: true
        });
        document.dispatchEvent(authEvent);
    }

    // Refresh CASL components
    refreshCASLComponents() {
        // Try to trigger CASL refresh
        const caslComponents = document.querySelectorAll('casl-authentication, casl-app, casl-user-dashboard');
        caslComponents.forEach(component => {
            if (component.checkAuthentication) {
                component.checkAuthentication();
            }
            if (component.refresh) {
                component.refresh();
            }
        });
        
        // Also try to reload the page if components don't refresh
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }

    // Show error message
    showError(message) {
        const errorDiv = document.getElementById('reset-error-message');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    // Show success message
    showSuccess(message) {
        const successDiv = document.getElementById('reset-success-message');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }

    // Clear all messages
    clearMessages() {
        document.getElementById('reset-error-message').style.display = 'none';
        document.getElementById('reset-success-message').style.display = 'none';
    }
}

// Initialize the password reset handler when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.passwordResetHandler = new PasswordResetHandler();
});

// Also provide a global function to manually trigger password reset
window.showPasswordReset = (session, username) => {
    if (window.passwordResetHandler) {
        window.passwordResetHandler.showPasswordResetScreen(session, username);
    }
};