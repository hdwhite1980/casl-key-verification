const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({ region: 'us-east-2' });
const cognito = new AWS.CognitoIdentityServiceProvider();

// Cognito configuration
const COGNITO_CONFIG = {
    userPoolId: 'us-east-2_wxVzxzC7V',
    clientId: '6eihn0891v31dsovg33g2e1h90',
    region: 'us-east-2'
};

exports.handler = async (event) => {
    console.log('HTTP Method:', event.httpMethod);
    console.log('Path:', event.path);
    
    // CORS headers for ALL responses
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': '*',
        'Content-Type': 'application/json'
    };

    try {
        const path = event.path || '';
        
        // Handle preflight OPTIONS request for ALL endpoints
        if (event.httpMethod === 'OPTIONS') {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'CORS preflight successful' })
            };
        }
        
        // Handle POST requests
        if (event.httpMethod === 'POST') {
            let body = {};
            
            if (event.body) {
                try {
                    body = JSON.parse(event.body);
                } catch (parseError) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid JSON in request body'
                        })
                    };
                }
            }
            
            // COMPLETE NEW PASSWORD CHALLENGE
            if (path.includes('/set-new-password')) {
                const { session, newPassword, username } = body;
                
                if (!session || !newPassword || !username) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Session, new password, and username are required'
                        })
                    };
                }
                
                // Validate new password strength
                if (newPassword.length < 8) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Password must be at least 8 characters long'
                        })
                    };
                }
                
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
                        })
                    };
                }
                
                try {
                    const challengeResult = await cognito.adminRespondToAuthChallenge({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        ClientId: COGNITO_CONFIG.clientId,
                        ChallengeName: 'NEW_PASSWORD_REQUIRED',
                        Session: session,
                        ChallengeResponses: {
                            USERNAME: username,
                            NEW_PASSWORD: newPassword,
                            'userAttributes.name': `User ${username.split('@')[0]}` // Add required name attribute
                        }
                    }).promise();
                    
                    // Get user details after successful password change
                    const userResult = await cognito.adminGetUser({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        Username: username
                    }).promise();
                    
                    // Extract user attributes
                    const userAttributes = {};
                    userResult.UserAttributes.forEach(attr => {
                        userAttributes[attr.Name] = attr.Value;
                    });
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            message: 'Password updated successfully',
                            accessToken: challengeResult.AuthenticationResult.AccessToken,
                            refreshToken: challengeResult.AuthenticationResult.RefreshToken,
                            idToken: challengeResult.AuthenticationResult.IdToken,
                            tokenType: challengeResult.AuthenticationResult.TokenType,
                            expiresIn: challengeResult.AuthenticationResult.ExpiresIn,
                            user: {
                                username: userResult.Username,
                                email: userAttributes.email,
                                name: userAttributes.name,
                                emailVerified: userAttributes.email_verified === 'true',
                                status: userResult.UserStatus
                            }
                        })
                    };
                    
                } catch (error) {
                    console.error('Password update error:', error);
                    
                    let errorMessage = 'Password update failed';
                    if (error.name === 'InvalidPasswordException') {
                        errorMessage = 'Password does not meet requirements';
                    } else if (error.name === 'NotAuthorizedException') {
                        errorMessage = 'Invalid session or user';
                    } else if (error.name === 'ExpiredCodeException') {
                        errorMessage = 'Session expired. Please try logging in again.';
                    }
                    
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: errorMessage
                        })
                    };
                }
            }
            
            // CHANGE PASSWORD (for authenticated users)
            if (path.includes('/change-password')) {
                const { oldPassword, newPassword } = body;
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Authentication required'
                        })
                    };
                }
                
                if (!oldPassword || !newPassword) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Old password and new password are required'
                        })
                    };
                }
                
                // Validate new password strength
                if (newPassword.length < 8) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'New password must be at least 8 characters long'
                        })
                    };
                }
                
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'New password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
                        })
                    };
                }
                
                const accessToken = authHeader.substring(7);
                
                try {
                    await cognito.changePassword({
                        AccessToken: accessToken,
                        PreviousPassword: oldPassword,
                        ProposedPassword: newPassword
                    }).promise();
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            message: 'Password changed successfully'
                        })
                    };
                    
                } catch (error) {
                    console.error('Password change error:', error);
                    
                    let errorMessage = 'Password change failed';
                    if (error.name === 'InvalidPasswordException') {
                        errorMessage = 'New password does not meet requirements';
                    } else if (error.name === 'NotAuthorizedException') {
                        errorMessage = 'Current password is incorrect';
                    } else if (error.name === 'LimitExceededException') {
                        errorMessage = 'Too many password change attempts. Please try again later.';
                    }
                    
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: errorMessage
                        })
                    };
                }
            }
            
            // COGNITO LOGIN
            if (path.includes('/login')) {
                const { username, password } = body;
                
                if (!username || !password) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Email and password are required'
                        })
                    };
                }
                
                try {
                    const authResult = await cognito.adminInitiateAuth({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        ClientId: COGNITO_CONFIG.clientId,
                        AuthFlow: 'ADMIN_NO_SRP_AUTH',
                        AuthParameters: {
                            USERNAME: username,
                            PASSWORD: password
                        }
                    }).promise();
                    
                    if (authResult.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
                        return {
                            statusCode: 200,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                success: false,
                                challenge: 'NEW_PASSWORD_REQUIRED',
                                session: authResult.Session,
                                username: username,
                                message: 'New password required. Use /set-new-password endpoint to complete.'
                            })
                        };
                    }
                    
                    // Get user details
                    const userResult = await cognito.adminGetUser({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        Username: username
                    }).promise();
                    
                    // Extract user attributes
                    const userAttributes = {};
                    userResult.UserAttributes.forEach(attr => {
                        userAttributes[attr.Name] = attr.Value;
                    });
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            accessToken: authResult.AuthenticationResult.AccessToken,
                            refreshToken: authResult.AuthenticationResult.RefreshToken,
                            idToken: authResult.AuthenticationResult.IdToken,
                            tokenType: authResult.AuthenticationResult.TokenType,
                            expiresIn: authResult.AuthenticationResult.ExpiresIn,
                            user: {
                                username: userResult.Username,
                                email: userAttributes.email,
                                name: userAttributes.name,
                                emailVerified: userAttributes.email_verified === 'true',
                                status: userResult.UserStatus
                            }
                        })
                    };
                    
                } catch (error) {
                    console.error('Login error:', error);
                    
                    let errorMessage = 'Login failed';
                    if (error.name === 'NotAuthorizedException') {
                        errorMessage = 'Invalid email or password';
                    } else if (error.name === 'UserNotConfirmedException') {
                        errorMessage = 'Account not verified. Please check your email for verification link.';
                    } else if (error.name === 'UserNotFoundException') {
                        errorMessage = 'Account not found';
                    } else if (error.name === 'TooManyRequestsException') {
                        errorMessage = 'Too many login attempts. Please try again later.';
                    }
                    
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: errorMessage
                        })
                    };
                }
            }
            
            // COGNITO REGISTRATION
            if (path.includes('/register')) {
                const { email, password, firstName, lastName } = body;
                
                // Validate required fields
                if (!email || !password || !firstName || !lastName) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Email, password, first name, and last name are required'
                        })
                    };
                }
                
                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid email format'
                        })
                    };
                }
                
                // Password validation (matching your Cognito policy)
                if (password.length < 8) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Password must be at least 8 characters long'
                        })
                    };
                }
                
                if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
                        })
                    };
                }
                
                try {
                    const createResult = await cognito.adminCreateUser({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        Username: email,
                        UserAttributes: [
                            { Name: 'email', Value: email },
                            { Name: 'name', Value: `${firstName} ${lastName}` },
                            { Name: 'email_verified', Value: 'true' }
                        ],
                        TemporaryPassword: password,
                        MessageAction: 'SUPPRESS' // Don't send welcome email
                    }).promise();
                    
                    // Set permanent password
                    await cognito.adminSetUserPassword({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        Username: email,
                        Password: password,
                        Permanent: true
                    }).promise();
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            message: 'User registered successfully',
                            user: {
                                username: createResult.User.Username,
                                email: email,
                                name: `${firstName} ${lastName}`,
                                status: createResult.User.UserStatus
                            }
                        })
                    };
                    
                } catch (error) {
                    console.error('Registration error:', error);
                    
                    let errorMessage = 'Registration failed';
                    if (error.name === 'UsernameExistsException') {
                        errorMessage = 'An account with this email already exists';
                    } else if (error.name === 'InvalidPasswordException') {
                        errorMessage = 'Password does not meet requirements';
                    } else if (error.name === 'InvalidParameterException') {
                        errorMessage = 'Invalid email or password format';
                    }
                    
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: errorMessage
                        })
                    };
                }
            }
            
            // TOKEN VALIDATION
            if (path.includes('/validate-token')) {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            valid: false,
                            error: 'No valid authorization header provided'
                        })
                    };
                }
                
                const accessToken = authHeader.substring(7); // Remove 'Bearer '
                
                try {
                    const userResult = await cognito.getUser({
                        AccessToken: accessToken
                    }).promise();
                    
                    // Extract user attributes
                    const userAttributes = {};
                    userResult.UserAttributes.forEach(attr => {
                        userAttributes[attr.Name] = attr.Value;
                    });
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            valid: true,
                            user: {
                                username: userResult.Username,
                                email: userAttributes.email,
                                name: userAttributes.name,
                                emailVerified: userAttributes.email_verified === 'true'
                            }
                        })
                    };
                    
                } catch (error) {
                    console.error('Token validation error:', error);
                    
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            valid: false,
                            error: 'Invalid or expired token'
                        })
                    };
                }
            }
            
            // TOKEN REFRESH
            if (path.includes('/refresh-token')) {
                const { refreshToken } = body;
                
                if (!refreshToken) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Refresh token is required'
                        })
                    };
                }
                
                try {
                    const refreshResult = await cognito.adminInitiateAuth({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        ClientId: COGNITO_CONFIG.clientId,
                        AuthFlow: 'REFRESH_TOKEN_AUTH',
                        AuthParameters: {
                            REFRESH_TOKEN: refreshToken
                        }
                    }).promise();
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            accessToken: refreshResult.AuthenticationResult.AccessToken,
                            idToken: refreshResult.AuthenticationResult.IdToken,
                            tokenType: refreshResult.AuthenticationResult.TokenType,
                            expiresIn: refreshResult.AuthenticationResult.ExpiresIn
                        })
                    };
                    
                } catch (error) {
                    console.error('Token refresh error:', error);
                    
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Invalid or expired refresh token'
                        })
                    };
                }
            }
            
            // LOGOUT
            if (path.includes('/logout')) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: true,
                        message: 'Logout successful. Please discard your tokens on the client side.'
                    })
                };
            }
            
            // USER CHECK
            if (path.includes('/user-check')) {
                const { email } = body;
                
                if (!email) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Email is required for user check'
                        })
                    };
                }
                
                try {
                    await cognito.adminGetUser({
                        UserPoolId: COGNITO_CONFIG.userPoolId,
                        Username: email
                    }).promise();
                    
                    return {
                        statusCode: 200,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: true,
                            exists: true
                        })
                    };
                    
                } catch (error) {
                    if (error.name === 'UserNotFoundException') {
                        return {
                            statusCode: 200,
                            headers: corsHeaders,
                            body: JSON.stringify({
                                success: true,
                                exists: false
                            })
                        };
                    }
                    
                    return {
                        statusCode: 500,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'User check failed'
                        })
                    };
                }
            }
            
            // VERIFY ENDPOINT (POST)
            if (path.includes('/verify')) {
                const { keyData, keyType } = body;
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Authentication required'
                        })
                    };
                }
                
                if (!keyData) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Key data is required for verification'
                        })
                    };
                }
                
                // IMPLEMENTATION REQUIRED: Replace with actual CASL key verification logic
                return {
                    statusCode: 501,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: 'Key verification implementation required'
                    })
                };
            }
            
            // Default POST response for unimplemented endpoints
            return {
                statusCode: 501,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: `POST endpoint ${path} not implemented yet`
                })
            };
        }
        
        // Handle GET requests
        if (event.httpMethod === 'GET') {
            
            if (path.includes('/casl-config')) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        auth: {
                            userPoolId: COGNITO_CONFIG.userPoolId,
                            userPoolWebClientId: COGNITO_CONFIG.clientId,
                            region: COGNITO_CONFIG.region
                        },
                        api: {
                            baseUrl: 'https://2mez9qoyt6.execute-api.us-east-2.amazonaws.com/prod',
                            endpoints: {
                                login: '/login',
                                register: '/register',
                                setNewPassword: '/set-new-password',
                                changePassword: '/change-password',
                                verify: '/verify',
                                history: '/verification-history',
                                status: '/status',
                                validateToken: '/validate-token',
                                refreshToken: '/refresh-token',
                                userCheck: '/user-check',
                                packages: '/packages',
                                logout: '/logout'
                            }
                        },
                        app: {
                            name: 'CASL Key Verification System',
                            version: '1.0.0',
                            environment: 'production'
                        }
                    })
                };
            }
            
            if (path.includes('/packages')) {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Authentication required'
                        })
                    };
                }
                
                // IMPLEMENTATION REQUIRED: Connect to your actual package data source
                // Example data sources: DynamoDB, RDS, S3, or external API
                return {
                    statusCode: 501,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: 'Package data source implementation required'
                    })
                };
            }
            
            if (path.includes('/verification-history')) {
                const authHeader = event.headers?.Authorization || event.headers?.authorization;
                
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                    return {
                        statusCode: 401,
                        headers: corsHeaders,
                        body: JSON.stringify({
                            success: false,
                            error: 'Authentication required'
                        })
                    };
                }
                
                // IMPLEMENTATION REQUIRED: Connect to your verification history data source
                return {
                    statusCode: 501,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        success: false,
                        error: 'Verification history data source implementation required'
                    })
                };
            }
            
            if (path.includes('/status')) {
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        status: 'healthy',
                        version: '1.0.0',
                        timestamp: new Date().toISOString(),
                        cognito: 'connected'
                    })
                };
            }
            
            // Default GET response for unimplemented endpoints
            return {
                statusCode: 501,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: false,
                    error: `GET endpoint ${path} not implemented yet`
                })
            };
        }
        
        // Method not allowed
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: `Method ${event.httpMethod} not allowed`
            })
        };
        
    } catch (error) {
        console.error('Lambda error:', error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};