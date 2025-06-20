/**
 * MetaMask Admin Dashboard JavaScript
 * Handles wallet connections, theme switching, and dashboard functionality
 */

// DOM Elements
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
const walletStatusIcon = document.querySelector('.status-icon');
const walletStatusText = document.querySelector('.wallet-status-text');
const walletAddressElem = document.getElementById('wallet-address');
const walletBalanceElem = document.getElementById('wallet-balance');
const networkChainIdElem = document.getElementById('network-chain-id');
const copyAddressBtn = document.getElementById('copy-address');
const notificationCount = document.querySelector('.notification-count');
const themeToggle = document.getElementById('theme-toggle');
const mobileToggle = document.getElementById('mobile-toggle');
const sidebar = document.querySelector('.sidebar');
const settingToggles = document.querySelectorAll('.settings-toggle');

// MetaMask Connection Status
let isConnected = false;
let currentAccount = null;
let currentChainId = null;
let ethBalance = 0;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', init);

async function init() {
    setupEventListeners();
    checkThemePreference();
    await checkIfWalletIsConnected();
    populateDashboardData();
}

function setupEventListeners() {
    // Wallet buttons
    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet);
    copyAddressBtn.addEventListener('click', copyAddressToClipboard);
    
    // Theme toggle
    themeToggle.addEventListener('change', toggleTheme);
    
    // Mobile sidebar toggle
    mobileToggle.addEventListener('click', toggleMobileSidebar);
    
    // Setting toggles
    settingToggles.forEach(toggle => {
        toggle.addEventListener('change', updateSetting);
    });
    
    // Listen for MetaMask account changes
    if (window.ethereum) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);
        window.ethereum.on('disconnect', handleDisconnect);
    }
}

// Check if MetaMask is already connected
async function checkIfWalletIsConnected() {
    try {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts.length > 0) {
                handleAccountsChanged(accounts);
            } else {
                updateWalletStatus(false);
                showNotification('No MetaMask wallet connected to this account', 'warning');
            }
            
            // Get current chain ID
            currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
            updateNetworkInfo(currentChainId);
        } else {
            updateWalletStatus(false);
            showNotification('MetaMask extension not detected', 'error');
        }
    } catch (error) {
        console.error('Error checking MetaMask connection:', error);
        updateWalletStatus(false);
    }
}

// Connect to MetaMask wallet
async function connectWallet() {
    try {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            handleAccountsChanged(accounts);
            showNotification('Wallet connected successfully', 'success');
        } else {
            showNotification('Please install MetaMask extension', 'error');
        }
    } catch (error) {
        console.error('Error connecting to MetaMask:', error);
        
        if (error.code === 4001) {
            showNotification('User rejected the connection', 'warning');
        } else {
            showNotification('Failed to connect wallet', 'error');
        }
    }
}

// Disconnect from wallet
function disconnectWallet() {
    currentAccount = null;
    updateWalletStatus(false);
    showNotification('Wallet disconnected', 'success');
}

// Handle account changes from MetaMask
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User logged out or disconnected
        currentAccount = null;
        updateWalletStatus(false);
    } else if (accounts[0] !== currentAccount) {
        currentAccount = accounts[0];
        updateWalletStatus(true);
        getWalletBalance();
    }
}

// Handle chain/network changes
function handleChainChanged(chainId) {
    // Recommended to reload the page on chain changes
    window.location.reload();
}

// Handle disconnect events
function handleDisconnect() {
    currentAccount = null;
    updateWalletStatus(false);
    showNotification('Wallet disconnected', 'warning');
}

// Update wallet connection status UI
function updateWalletStatus(connected) {
    isConnected = connected;
    
    if (connected && currentAccount) {
        walletStatusIcon.classList.add('connected');
        walletStatusText.textContent = 'Connected';
        walletAddressElem.textContent = formatWalletAddress(currentAccount);
        
        connectWalletBtn.style.display = 'none';
        disconnectWalletBtn.style.display = 'inline-flex';
    } else {
        walletStatusIcon.classList.remove('connected');
        walletStatusText.textContent = 'Not Connected';
        walletAddressElem.textContent = 'Connect wallet to view address';
        walletBalanceElem.textContent = '0.00 ETH';
        
        connectWalletBtn.style.display = 'inline-flex';
        disconnectWalletBtn.style.display = 'none';
    }
}

// Format wallet address (truncate middle)
function formatWalletAddress(address) {
    return address.slice(0, 6) + '...' + address.slice(-4);
}

// Get wallet balance
async function getWalletBalance() {
    if (!isConnected || !currentAccount) return;
    
    try {
        const balance = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [currentAccount, 'latest']
        });
        
        // Convert from wei to ETH
        ethBalance = parseInt(balance, 16) / 1e18;
        walletBalanceElem.textContent = ethBalance.toFixed(4) + ' ETH';
    } catch (error) {
        console.error('Error getting wallet balance:', error);
        walletBalanceElem.textContent = 'Error fetching balance';
    }
}

// Update network information
function updateNetworkInfo(chainId) {
    const networks = {
        '0x1': 'Ethereum Mainnet',
        '0x3': 'Ropsten Test Network',
        '0x4': 'Rinkeby Test Network',
        '0x5': 'Goerli Test Network',
        '0x2a': 'Kovan Test Network',
        '0x89': 'Polygon Mainnet',
        '0x13881': 'Polygon Mumbai Testnet',
        '0xa86a': 'Avalanche Mainnet',
        '0xa869': 'Avalanche Testnet'
    };
    
    const networkName = networks[chainId] || 'Unknown Network';
    networkChainIdElem.textContent = `Network: ${networkName} (ChainID: ${parseInt(chainId, 16)})`;
}

// Copy wallet address to clipboard
function copyAddressToClipboard() {
    if (!currentAccount) return;
    
    navigator.clipboard.writeText(currentAccount)
        .then(() => {
            showNotification('Address copied to clipboard', 'success');
        })
        .catch(err => {
            console.error('Failed to copy address:', err);
            showNotification('Failed to copy address', 'error');
        });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-popup ${type}`;
    notification.innerHTML = `<p>${message}</p>`;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove notification after a delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Dark/Light theme toggle
function toggleTheme() {
    if (themeToggle.checked) {
        document.body.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
    }
}

// Check user's theme preference
function checkThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    } else if (savedTheme === 'light') {
        document.body.classList.remove('dark-theme');
        themeToggle.checked = false;
    } else {
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.add('dark-theme');
            themeToggle.checked = true;
        }
    }
}

// Toggle mobile sidebar
function toggleMobileSidebar() {
    sidebar.classList.toggle('show');
}

// Update settings
function updateSetting(event) {
    const settingName = event.target.id;
    const isEnabled = event.target.checked;
    
    // In a real application, you would save this setting to a database or localStorage
    localStorage.setItem(settingName, isEnabled);
    
    showNotification(`${settingName.replace('-', ' ')} ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
}

// Populate dashboard mock data
function populateDashboardData() {
    // This function would typically fetch real data from an API
    // For demo purposes, we're using mock data
    
    // Set random notification count
    const count = Math.floor(Math.random() * 10);
    notificationCount.textContent = count;
    
    // Mock transaction data could be inserted here
    // const transactionsTable = document.querySelector('.transactions-table tbody');
    // if (!transactionsTable) return;
    
    // Normally would fetch from API:
    // fetchTransactions().then(data => {
    //   updateTransactionsTable(data);
    // });
} 