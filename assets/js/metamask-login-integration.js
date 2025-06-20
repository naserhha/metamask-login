// MetaMask Login Integration for Admin Dashboard

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
});

// Initialize the login page
function initLoginPage() {
    // Create necessary UI elements if they don't exist
    createLoginUI();
    
    // Initialize the MetaMask login functionality
    if (typeof initMetaMaskLogin === 'function') {
        initMetaMaskLogin();
    } else {
        console.error('MetaMask login functionality not loaded');
        displayError('Unable to initialize login system. Please try again later.');
    }
    
    // Set up event listeners for the form
    setupFormListeners();
}

// Create the login UI elements if they don't exist
function createLoginUI() {
    const container = document.querySelector('.login-container') || document.querySelector('.admin-login-container');
    
    if (!container) {
        console.warn('Login container not found, creating one');
        
        // Create container if it doesn't exist
        const mainContent = document.querySelector('main') || document.body;
        
        const newContainer = document.createElement('div');
        newContainer.className = 'login-container admin-login-container';
        
        mainContent.appendChild(newContainer);
        
        // Use the new container
        createLoginUIInContainer(newContainer);
    } else {
        // Use existing container
        createLoginUIInContainer(container);
    }
}

// Create login UI elements inside the container
function createLoginUIInContainer(container) {
    // Only create elements if they don't exist
    if (!document.getElementById('login-form')) {
        const formHtml = `
            <div class="login-card">
                <div class="login-header">
                    <h2>Admin Dashboard Login</h2>
                    <p>Connect your MetaMask wallet to access the admin dashboard</p>
                </div>
                
                <form id="login-form" class="login-form">
                    <div id="login-status" class="login-status" style="display: none;"></div>
                    
                    <div class="metamask-container">
                        <img src="assets/images/metamask-fox.svg" alt="MetaMask" class="metamask-logo" />
                        <button type="button" id="metamask-login-btn" class="metamask-button">
                            Connect with MetaMask
                        </button>
                    </div>
                    
                    <div class="login-info">
                        <p>You need an authorized admin wallet to access the dashboard.</p>
                        <p>If you don't have MetaMask installed, <a href="https://metamask.io/" target="_blank">download it here</a>.</p>
                    </div>
                </form>
            </div>
            
            <div id="admin-access-section" class="admin-access" style="display: none;">
                <div class="access-granted">
                    <h2>Access Granted!</h2>
                    <p>Redirecting to dashboard...</p>
                    <div class="loader"></div>
                </div>
            </div>
        `;
        
        container.innerHTML = formHtml;
    }
}

// Set up event listeners for the form
function setupFormListeners() {
    // Add form submission prevention if needed
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            return false;
        });
    }
}

// Display error message
function displayError(message) {
    const statusEl = document.getElementById('login-status');
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = 'login-status status-error';
        statusEl.style.display = 'block';
    } else {
        console.error('Error:', message);
        alert('Error: ' + message);
    }
}

// Add some basic styles if needed
function addLoginStyles() {
    // Check if styles already exist
    if (document.getElementById('metamask-login-styles')) {
        return;
    }
    
    const styleEl = document.createElement('style');
    styleEl.id = 'metamask-login-styles';
    styleEl.textContent = `
        .login-container {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
            background: #f9fafc;
        }
        
        .login-card {
            width: 100%;
            max-width: 450px;
            padding: 30px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header h2 {
            margin-bottom: 10px;
            font-size: 24px;
            color: #333;
        }
        
        .login-header p {
            color: #666;
        }
        
        .login-status {
            padding: 12px;
            margin-bottom: 20px;
            border-radius: 6px;
            font-size: 14px;
        }
        
        .status-error {
            background: #ffebee;
            color: #d32f2f;
            border-left: 4px solid #d32f2f;
        }
        
        .status-info {
            background: #e3f2fd;
            color: #1976d2;
            border-left: 4px solid #1976d2;
        }
        
        .status-success {
            background: #e8f5e9;
            color: #2e7d32;
            border-left: 4px solid #2e7d32;
        }
        
        .status-pending {
            background: #fff8e1;
            color: #ff8f00;
            border-left: 4px solid #ff8f00;
        }
        
        .metamask-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: 30px;
        }
        
        .metamask-logo {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
        }
        
        .metamask-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 14px;
            background: #f6851b;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .metamask-button:hover {
            background: #e2761b;
        }
        
        .metamask-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        
        .login-info {
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        
        .login-info a {
            color: #f6851b;
            text-decoration: none;
        }
        
        .login-info a:hover {
            text-decoration: underline;
        }
        
        .admin-access {
            text-align: center;
            padding: 50px;
        }
        
        .access-granted h2 {
            color: #2e7d32;
            margin-bottom: 15px;
        }
        
        .loader {
            display: inline-block;
            width: 40px;
            height: 40px;
            margin-top: 20px;
            border: 4px solid rgba(46, 125, 50, 0.2);
            border-top: 4px solid #2e7d32;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `;
    
    document.head.appendChild(styleEl);
}

// Call this to add styles
addLoginStyles(); 