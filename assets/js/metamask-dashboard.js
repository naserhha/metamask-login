/**
 * MetaMask Dashboard JavaScript
 * Handles all Web3 functionality for the MetaMask dashboard
 */

(function($) {
    'use strict';
    
    // Store global references
    const dashboard = {
        provider: null,
        signer: null,
        address: null,
        isConnected: false,
        currentTab: 'wallet',
        notifications: []
    };

    /**
     * Initialize dashboard
     */
    function initDashboard() {
        // Set up tab navigation
        $('.tab-button').on('click', function() {
            const tabId = $(this).data('tab');
            changeTab(tabId);
        });

        // Set up copy address button
        $('#copy-address').on('click', function() {
            const address = $('#wallet-address').text().trim();
            copyToClipboard(address);
        });

        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined' && typeof ethers !== 'undefined') {
            // Try to auto-connect to the wallet immediately when page loads
            autoConnectWallet();
            
            // Listen for network changes
            window.ethereum.on('chainChanged', () => {
                updateUI();
            });
            
            // Listen for account changes
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected their wallet
                    dashboard.isConnected = false;
                    showConnectButton();
                } else {
                    // User switched accounts, update UI
                    dashboard.address = accounts[0];
                    dashboard.isConnected = true;
                    updateUI();
                }
            });
        } else {
            showMetaMaskError();
        }
    }

    /**
     * Auto connect to MetaMask wallet
     */
    async function autoConnectWallet() {
        try {
            // Initialize provider
            dashboard.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            
            // First try to get accounts without showing MetaMask popup
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });
            
            if (accounts && accounts.length > 0) {
                // User already has connected accounts - auto connect
                dashboard.address = accounts[0];
                dashboard.signer = dashboard.provider.getSigner();
                dashboard.isConnected = true;
                $('#wallet-address').text(dashboard.address);
                
                // Update UI with wallet information
                updateUI();
                showNotification('کیف پول متصل شد!', 'success');
            } else {
                // Always attempt to connect if MetaMask is installed
                try {
                    // This will show the MetaMask popup
                    const accounts = await dashboard.provider.send("eth_requestAccounts", []);
                    if (accounts && accounts.length > 0) {
                        dashboard.address = accounts[0];
                        dashboard.signer = dashboard.provider.getSigner();
                        dashboard.isConnected = true;
                        $('#wallet-address').text(dashboard.address);
                        updateUI();
                        showNotification('کیف پول متصل شد!', 'success');
                    } else {
                        showConnectButton();
                    }
                } catch (innerError) {
                    // User rejected the connection request
                    console.error('User rejected connection', innerError);
                    showNotification(metamaskDashboardData.texts.wallet_error, 'error');
                    showConnectButton();
                }
            }
        } catch (error) {
            console.error('Error auto-connecting to wallet:', error);
            showNotification(metamaskDashboardData.texts.wallet_error, 'error');
            showConnectButton();
        }
    }

    /**
     * Connect to MetaMask wallet
     */
    async function connectWallet() {
        try {
            dashboard.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
            
            try {
                // Request access to accounts - this will show the MetaMask popup
                const accounts = await dashboard.provider.send("eth_requestAccounts", []);
                if (accounts && accounts.length > 0) {
                    dashboard.address = accounts[0];
                    dashboard.signer = dashboard.provider.getSigner();
                    dashboard.isConnected = true;
                    $('#wallet-address').text(dashboard.address);
                    updateUI();
                    showNotification('کیف پول متصل شد!', 'success');
                }
            } catch (err) {
                console.error('User rejected connection', err);
                showNotification(metamaskDashboardData.texts.wallet_error, 'error');
                showConnectButton();
            }
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            showNotification(metamaskDashboardData.texts.wallet_error, 'error');
            showConnectButton();
        }
    }

    /**
     * Show connect wallet button in the wallet address area
     */
    function showConnectButton() {
        $('#wallet-address').html(`
            <button id="connect-wallet-btn" class="connect-wallet-btn">
                ${metamaskDashboardData.texts.connect_wallet}
            </button>
        `);
        
        // Add click event to the connect button
        $('#connect-wallet-btn').on('click', connectWallet);
        
        // Show empty states for all sections
        $('#wallet-balance').html(`
            <div class="empty-state">
                <p>${metamaskDashboardData.texts.connect_wallet}</p>
            </div>
        `);
        
        // Set wallet state to not connected
        dashboard.isConnected = false;
    }

    /**
     * Show MetaMask not installed error
     */
    function showMetaMaskError() {
        $('.loading-container').each(function() {
            $(this).html(`
                <div class="error-message">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>${metamaskDashboardData.texts.no_metamask}</p>
                </div>
            `);
        });
    }

    /**
     * Update the UI with blockchain data
     */
    async function updateUI() {
        if (!dashboard.isConnected) return;
        
        // Update network info
        updateNetworkInfo();
        
        // Load tab-specific content
        loadTabContent(dashboard.currentTab);
    }

    /**
     * Update current network information
     */
    async function updateNetworkInfo() {
        try {
            const network = await dashboard.provider.getNetwork();
            let networkName = formatNetworkName(network.name);
            let networkClass = 'unknown';
            
            if (network.chainId === 1) {
                networkClass = 'ethereum';
            } else if ([3, 4, 5, 42].includes(network.chainId)) {
                networkClass = 'testnet';
            } else if (network.chainId === 137) {
                networkClass = 'polygon';
            } else if (network.chainId === 56) {
                networkClass = 'bsc';
            }
            
            $('#network-name').text(networkName);
            $('.network-dot').attr('class', 'network-dot ' + networkClass);
        } catch (error) {
            console.error('Error getting network:', error);
            $('#network-name').text(metamaskDashboardData.texts.chain_error);
            $('.network-dot').attr('class', 'network-dot error');
        }
    }

    /**
     * Format network name for display
     */
    function formatNetworkName(name) {
        switch (name) {
            case 'homestead': return 'Ethereum Mainnet';
            case 'unknown': return 'Custom Network';
            default: return name.charAt(0).toUpperCase() + name.slice(1);
        }
    }

    /**
     * Change active tab
     */
    function changeTab(tabId) {
        dashboard.currentTab = tabId;
        
        // Update UI
        $('.tab-button').removeClass('active');
        $(`.tab-button[data-tab="${tabId}"]`).addClass('active');
        
        $('.tab-content').removeClass('active');
        $(`#${tabId}-tab`).addClass('active');
        
        // Load tab content if needed
        loadTabContent(tabId);
    }

    /**
     * Load content for the current tab
     */
    function loadTabContent(tabId) {
        switch (tabId) {
            case 'wallet':
                loadWalletInfo();
                break;
            case 'tokens':
                loadTokens();
                break;
            case 'nfts':
                loadNFTs();
                break;
            case 'transactions':
                loadTransactions();
                break;
        }
    }

    /**
     * Load wallet information
     */
    async function loadWalletInfo() {
        if (!dashboard.isConnected) return;
        
        try {
            const balance = await dashboard.provider.getBalance(dashboard.address);
            const etherBalance = ethers.utils.formatEther(balance);
            
            // Create formatted balance HTML
            const balanceHTML = `
                <div class="balance-item main-balance">
                    <div class="balance-icon eth-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="16" fill="#627EEA"/>
                            <path d="M16.498 4V12.87L23.995 16.22L16.498 4Z" fill="white" fill-opacity="0.602"/>
                            <path d="M16.498 4L9 16.22L16.498 12.87V4Z" fill="white"/>
                            <path d="M16.498 21.968V27.995L24 17.616L16.498 21.968Z" fill="white" fill-opacity="0.602"/>
                            <path d="M16.498 27.995V21.967L9 17.616L16.498 27.995Z" fill="white"/>
                            <path d="M16.498 20.573L23.995 16.22L16.498 12.872V20.573Z" fill="white" fill-opacity="0.2"/>
                            <path d="M9 16.22L16.498 20.573V12.872L9 16.22Z" fill="white" fill-opacity="0.602"/>
                        </svg>
                    </div>
                    <div class="balance-details">
                        <span class="balance-label">ETH Balance</span>
                        <span class="balance-value">${parseFloat(etherBalance).toFixed(4)} ETH</span>
                    </div>
                </div>
            `;
            
            $('#wallet-balance').html(balanceHTML);
        } catch (error) {
            console.error('Error fetching balance:', error);
            $('#wallet-balance').html(`
                <div class="error-message">
                    <p>${metamaskDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Load ERC-20 tokens
     */
    async function loadTokens() {
        if (!dashboard.isConnected) return;
        
        const tokensContainer = $('#tokens-container');
        
        try {
            // In a real implementation, you would use an API like Moralis, Covalent, Alchemy
            // For this example, we'll simulate fetching token data with some mock tokens
            const tokens = await fetchTokenData();
            
            if (tokens && tokens.length > 0) {
                let tokensHTML = '<div class="tokens-grid">';
                
                tokens.forEach(token => {
                    tokensHTML += `
                        <div class="token-item">
                            <div class="token-icon">
                                <img src="${token.logo}" alt="${token.symbol}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23C4C4C4\\'/></svg>'">
                            </div>
                            <div class="token-details">
                                <span class="token-name">${token.name}</span>
                                <span class="token-balance">${token.balance} ${token.symbol}</span>
                            </div>
                        </div>
                    `;
                });
                
                tokensHTML += '</div>';
                tokensContainer.html(tokensHTML);
            } else {
                tokensContainer.html(`
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>${metamaskDashboardData.texts.no_tokens}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching tokens:', error);
            tokensContainer.html(`
                <div class="error-message">
                    <p>${metamaskDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch token data (mock implementation)
     * In production, use an API service like Alchemy or Moralis
     */
    async function fetchTokenData() {
        // This is a simplified mock example - in production, use an API service
        return [
            {
                name: 'USD Coin',
                symbol: 'USDC',
                balance: '250.00',
                decimals: 6,
                logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
            },
            {
                name: 'Dai Stablecoin',
                symbol: 'DAI',
                balance: '125.75',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png'
            },
            {
                name: 'Chainlink',
                symbol: 'LINK',
                balance: '10.5',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png'
            },
            {
                name: 'Uniswap',
                symbol: 'UNI',
                balance: '15.2',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png'
            }
        ];
    }

    /**
     * Load NFTs for the current address
     */
    async function loadNFTs() {
        if (!dashboard.isConnected) return;
        
        const nftsContainer = $('#nfts-container');
        
        try {
            // In a real implementation, you would use an NFT API like Alchemy or Moralis
            const nfts = await fetchNFTData();
            
            if (nfts && nfts.length > 0) {
                let nftsHTML = '<div class="nfts-grid">';
                
                nfts.forEach(nft => {
                    nftsHTML += `
                        <div class="nft-item">
                            <div class="nft-image">
                                <img src="${nft.image}" alt="${nft.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 24 24\\'><rect width=\\'24\\' height=\\'24\\' fill=\\'%23f0f0f0\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'6\\' fill=\\'%23999\\'>Image not available</text></svg>'">
                            </div>
                            <div class="nft-details">
                                <span class="nft-name">${nft.name}</span>
                                <span class="nft-collection">${nft.collection}</span>
                            </div>
                        </div>
                    `;
                });
                
                nftsHTML += '</div>';
                nftsContainer.html(nftsHTML);
            } else {
                nftsContainer.html(`
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p>${metamaskDashboardData.texts.no_nfts}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching NFTs:', error);
            nftsContainer.html(`
                <div class="error-message">
                    <p>${metamaskDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch NFT data (mock implementation)
     * In production, use an API service like Alchemy or Moralis
     */
    async function fetchNFTData() {
        // This is a simplified mock example - in production, use an API service
        return [
            {
                name: 'Bored Ape #1234',
                collection: 'Bored Ape Yacht Club',
                image: 'https://ipfs.io/ipfs/QmeSjSinHpPnmXmspMjwiXyN6zS4E9zccariGR3jxcaWtq/1',
                tokenId: '1234',
                contract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D'
            },
            {
                name: 'CryptoPunk #5678',
                collection: 'CryptoPunks',
                image: 'https://ipfs.io/ipfs/QmcJMTboitFVH7TxRrQ6cZBjvj4XtKrSBvFi2GgzWkEATU',
                tokenId: '5678',
                contract: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB'
            },
            {
                name: 'Azuki #9012',
                collection: 'Azuki',
                image: 'https://ipfs.io/ipfs/QmYDvPAXtiJg7s8JdRBSLWdgSphQdac8j1YuQNNxcGE1hg',
                tokenId: '9012',
                contract: '0xED5AF388653567Af2F388E6224dC7C4b3241C544'
            }
        ];
    }

    /**
     * Load recent transactions
     */
    async function loadTransactions() {
        if (!dashboard.isConnected) return;
        
        const txContainer = $('#transactions-container');
        
        try {
            // In a real implementation, you would use an API for transaction history
            const transactions = await fetchTransactionData();
            
            if (transactions && transactions.length > 0) {
                let txHTML = '<div class="transactions-list">';
                
                transactions.forEach(tx => {
                    const isIncoming = tx.to && tx.to.toLowerCase() === dashboard.address.toLowerCase();
                    const direction = isIncoming ? 'in' : 'out';
                    const directionText = isIncoming ? 'Received' : 'Sent';
                    const otherParty = isIncoming ? tx.from : tx.to;
                    const otherPartyShort = otherParty ? `${otherParty.substring(0, 6)}...${otherParty.substring(otherParty.length - 4)}` : '';
                    
                    txHTML += `
                        <div class="transaction-item tx-${direction}">
                            <div class="tx-icon ${direction}-icon">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    ${isIncoming ? 
                                        '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>' : 
                                        '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>'}
                                </svg>
                            </div>
                            <div class="tx-details">
                                <div class="tx-primary">
                                    <span class="tx-type">${directionText}</span>
                                    <span class="tx-value">${tx.value} ETH</span>
                                </div>
                                <div class="tx-secondary">
                                    <span class="tx-address">${otherPartyShort}</span>
                                    <a href="https://etherscan.io/tx/${tx.hash}" target="_blank" class="tx-link">
                                        ${metamaskDashboardData.texts.etherscan}
                                    </a>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                txHTML += '</div>';
                txContainer.html(txHTML);
            } else {
                txContainer.html(`
                    <div class="empty-state">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        <p>${metamaskDashboardData.texts.no_transactions}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            txContainer.html(`
                <div class="error-message">
                    <p>${metamaskDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch transaction data (mock implementation)
     * In production, use an API service like Etherscan API, Alchemy or Moralis
     */
    async function fetchTransactionData() {
        // This is a simplified mock example - in production, use an API service
        return [
            {
                hash: '0x123456789abcdef123456789abcdef123456789abcdef',
                from: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
                to: dashboard.address,
                value: '0.5',
                timestamp: Date.now() - 86400000
            },
            {
                hash: '0xabcdef123456789abcdef123456789abcdef12345678',
                from: dashboard.address,
                to: '0x1234567890123456789012345678901234567890',
                value: '0.1',
                timestamp: Date.now() - 172800000
            },
            {
                hash: '0x9abcdef123456789abcdef123456789abcdef12345',
                from: '0x9876543210987654321098765432109876543210',
                to: dashboard.address,
                value: '1.2',
                timestamp: Date.now() - 259200000
            },
            {
                hash: '0xdef123456789abcdef123456789abcdef12345678',
                from: dashboard.address,
                to: '0x5432109876543210987654321098765432109876',
                value: '0.3',
                timestamp: Date.now() - 345600000
            }
        ];
    }

    /**
     * Helper function to copy text to clipboard
     */
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showNotification(metamaskDashboardData.texts.copy_success, 'success'))
                .catch(() => showNotification(metamaskDashboardData.texts.copy_error, 'error'));
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                showNotification(successful ? metamaskDashboardData.texts.copy_success : metamaskDashboardData.texts.copy_error, 
                    successful ? 'success' : 'error');
            } catch (err) {
                showNotification(metamaskDashboardData.texts.copy_error, 'error');
            }
            
            document.body.removeChild(textArea);
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = $(`<div class="notification ${type}">${message}</div>`);
        $('#notification-container').append(notification);
        
        // Add to notifications array
        const notificationId = Date.now();
        dashboard.notifications.push(notificationId);
        
        // Show notification with animation
        setTimeout(() => {
            notification.addClass('show');
            
            // Hide and remove after delay
            setTimeout(() => {
                notification.removeClass('show');
                setTimeout(() => {
                    notification.remove();
                    dashboard.notifications = dashboard.notifications.filter(id => id !== notificationId);
                }, 300);
            }, 3000);
        }, 100);
    }

    // Initialize when document is ready
    $(document).ready(initDashboard);

})(jQuery); 