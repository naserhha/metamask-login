/**
 * MetaMask Login JavaScript
 * Handles wallet connection and signature verification
 */

(function($) {
    'use strict';

    // Add console debug function
    function debug(message) {
        console.log('[MetaMask Login] ' + message);
    }

    // Check if ethers.js is available
    if (typeof ethers === 'undefined') {
        console.error('ethers.js is required for MetaMask login');
        return;
    } else {
        debug('ethers.js loaded successfully: ' + ethers.version);
    }

    // MetaMask Login for Admin Dashboard

    // Configuration - List of authorized admin wallet addresses (all lowercase)
    const ADMIN_WALLETS = [
        '0x1234567890123456789012345678901234567890', // Admin 1
        '0x0987654321098765432109876543210987654321'  // Admin 2
        // Add more authorized admin wallet addresses as needed
    ];

    // Session storage key
    const SESSION_KEY = 'metamask_admin_session';
    const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    // DOM Elements
    let loginButton;
    let statusMessage;
    let loginForm;
    let adminAccessSection;

    // Initialize MetaMask login functionality
    function initMetaMaskLogin() {
        // Get DOM elements
        loginButton = document.getElementById('metamask-login-btn');
        statusMessage = document.getElementById('login-status');
        loginForm = document.getElementById('login-form');
        adminAccessSection = document.getElementById('admin-access-section');
        
        if (!loginButton || !statusMessage || !loginForm) {
            console.error('Required login elements not found');
            return;
        }
        
        // Check if user is already logged in
        if (checkLoginSession()) {
            showLoggedInState();
            setTimeout(() => {
                redirectToDashboard();
            }, 1000);
            return;
        }
        
        // Check if MetaMask is installed
        if (!isMetaMaskInstalled()) {
            updateStatus(
                'MetaMask is not installed. Please install MetaMask to continue.',
                'error'
            );
            loginButton.disabled = true;
            return;
        }
        
        // Add event listener to login button
        loginButton.addEventListener('click', handleLogin);
    }

    // Check if MetaMask is installed
    function isMetaMaskInstalled() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    // Handle login button click
    async function handleLogin() {
        try {
            updateStatus('Connecting to MetaMask...', 'pending');
            loginButton.disabled = true;
            
            // Request account access
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            if (accounts.length === 0) {
                throw new Error('No accounts found. Please connect to MetaMask.');
            }
            
            const currentAccount = accounts[0];
            
            // Check if wallet is authorized
            if (isAdminWallet(currentAccount)) {
                updateStatus('Wallet verified! You are authorized.', 'success');
                saveLoginSession(currentAccount);
                grantAccess();
            } else {
                updateStatus(
                    'This wallet is not authorized for admin access.',
                    'error'
                );
                loginButton.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle specific errors
            if (error.code === 4001) {
                // User rejected the request
                updateStatus('Connection request rejected. Please try again.', 'error');
            } else {
                updateStatus(`Error connecting to MetaMask: ${error.message}`, 'error');
            }
            
            loginButton.disabled = false;
        }
    }

    // Check if wallet address is in the admin list
    function isAdminWallet(address) {
        // Convert address to lowercase for case-insensitive comparison
        const normalizedAddress = address.toLowerCase();
        return ADMIN_WALLETS.includes(normalizedAddress);
    }

    // Update status message
    function updateStatus(message, type) {
        if (!statusMessage) return;
        
        statusMessage.textContent = message;
        statusMessage.className = 'login-status';
        
        // Add status type class
        if (type) {
            statusMessage.classList.add(`status-${type}`);
        }
        
        statusMessage.style.display = 'block';
    }

    // Grant access and show success state
    function grantAccess() {
        if (loginForm) {
            loginForm.style.display = 'none';
        }
        
        if (adminAccessSection) {
            adminAccessSection.style.display = 'block';
        }
        
        // Redirect to dashboard after a delay
        setTimeout(() => {
            redirectToDashboard();
        }, 2000);
    }

    // Redirect to admin dashboard
    function redirectToDashboard() {
        // Redirect to the main admin dashboard page
        window.location.href = 'admin-dashboard.html';
    }

    // Save login session to browser storage
    function saveLoginSession(address) {
        const session = {
            address: address,
            timestamp: Date.now(),
            expiry: Date.now() + SESSION_EXPIRY
        };
        
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    // Check if user has a valid login session
    function checkLoginSession() {
        const sessionData = localStorage.getItem(SESSION_KEY);
        
        if (!sessionData) {
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            
            // Check if session is expired
            if (Date.now() > session.expiry) {
                // Session expired, remove it
                localStorage.removeItem(SESSION_KEY);
                return false;
            }
            
            // Verify the wallet is still authorized
            if (!isAdminWallet(session.address)) {
                localStorage.removeItem(SESSION_KEY);
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('Error checking session:', error);
            localStorage.removeItem(SESSION_KEY);
            return false;
        }
    }

    // Show logged in state
    function showLoggedInState() {
        if (loginForm) {
            loginForm.style.display = 'none';
        }
        
        if (adminAccessSection) {
            adminAccessSection.style.display = 'block';
        }
        
        updateStatus('You are already logged in. Redirecting...', 'success');
    }

    // Handle MetaMask events
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', () => {
            // Reload the page when accounts change
            window.location.reload();
        });
        
        window.ethereum.on('chainChanged', () => {
            // Reload the page when the chain changes
            window.location.reload();
        });
        
        window.ethereum.on('disconnect', () => {
            // Clear session and reload when disconnected
            localStorage.removeItem(SESSION_KEY);
            window.location.reload();
        });
    }

    // Logout function
    function logoutAdmin() {
        localStorage.removeItem(SESSION_KEY);
        window.location.reload();
    }

    // Export logout function for use in other files
    window.logoutAdmin = logoutAdmin;

    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', initMetaMaskLogin);

})(jQuery); 