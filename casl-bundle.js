<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CASL Key Verification System</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1000px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      background-color: #f5f5f5;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 5px;
    }
    h1 {
      margin-top: 0;
      color: #333;
    }
    .app-container {
      min-height: 600px;
      border: 1px solid #ddd;
      border-radius: 5px;
      padding: 20px;
      margin-bottom: 20px;
    }
    footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #eee;
      color: #777;
      font-size: 14px;
    }
    .loading {
      text-align: center;
      padding: 20px;
    }
    .error {
      color: #d9534f;
      background-color: #f9f2f2;
      border: 1px solid #ebccd1;
      padding: 15px;
      border-radius: 4px;
      margin-bottom: 20px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>CASL Key Verification System</h1>
      <p>A comprehensive guest verification system for short-term rentals</p>
    </header>
    
    <div class="app-container">
      <div id="loading" class="loading">Loading CASL Key Verification System...</div>
      <div id="error" class="error"></div>
      <casl-app></casl-app>
    </div>
    
    <footer>
      <p>&copy; 2025 CASL Key Verification System. All rights reserved.</p>
    </footer>
  </div>
  
  <!-- Global configuration and polyfills -->
  <script>
    // Simple process polyfill for browser environment
    window.process = {
      env: {
        NODE_ENV: 'production'
      }
    };
    
    // Global error handler
    window.handleCASLError = function(error) {
      console.error('CASL Error:', error);
      const errorEl = document.getElementById('error');
      errorEl.textContent = error.message || 'An error occurred loading the verification system';
      errorEl.style.display = 'block';
      document.getElementById('loading').style.display = 'none';
    };
  </script>
  
  <!-- Configuration loaded as regular script -->
  <script src="casl-config.js"></script>
  
  <!-- The main entry point as ES6 module -->
  <script type="module">
    // Import your modules
    import { initializeApp } from './app.js';
    
    document.addEventListener('DOMContentLoaded', () => {
      // Check if configuration is loaded
      if (!window.CASL_CONFIG) {
        window.handleCASLError(new Error('CASL configuration not loaded!'));
        return;
      }
      
      try {
        console.log('Initializing CASL verification system...');
        initializeApp();
      } catch (error) {
        window.handleCASLError(error);
      }
    });
  </script>
</body>
</html>
