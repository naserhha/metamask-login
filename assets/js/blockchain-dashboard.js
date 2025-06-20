/**
 * Blockchain Dashboard JavaScript
 * Handles all Web3 functionality for the modern blockchain dashboard
 */

(function($) {
    'use strict';
    
    // Store global references
    const dashboard = {
        provider: null,
        signer: null,
        address: null,
        isConnected: false,
        networkData: null,
        ethUsdPrice: 0,
        balanceHistory: [],
        tokens: [],
        nfts: [],
        transactions: [],
        daoTokens: [],
        securityInfo: {},
        achievements: {},
        badges: {}
    };

    /**
     * Initialize dashboard
     */
    function initDashboard() {
        console.log('Initializing blockchain dashboard...');
        
        // Set up copy address button
        $('#copy-address').on('click', function() {
            const address = $('#wallet-address').text().trim();
            copyToClipboard(address);
        });
        
        // Set up NFT filter
        $('#nft-filter').on('change', function() {
            filterNFTs($(this).val());
        });

        // Check if MetaMask is installed
        if (typeof window.ethereum !== 'undefined' && typeof ethers !== 'undefined') {
            // Try to auto-connect to the wallet immediately when page loads
            connectWallet();
            
            // Listen for network changes
            window.ethereum.on('chainChanged', () => {
                location.reload(); // Reload the page to refresh all data
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
     * Connect to MetaMask wallet
     */
    async function connectWallet() {
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
                showNotification(blockchainDashboardData.texts.wallet_connected, 'success');
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
                        showNotification(blockchainDashboardData.texts.wallet_connected, 'success');
                    } else {
                        showConnectButton();
                    }
                } catch (innerError) {
                    // User rejected the connection request
                    console.error('User rejected connection', innerError);
                    showNotification(blockchainDashboardData.texts.wallet_error, 'error');
                    showConnectButton();
                }
            }
        } catch (error) {
            console.error('Error connecting to wallet:', error);
            showNotification(blockchainDashboardData.texts.wallet_error, 'error');
            showConnectButton();
        }
    }

    /**
     * Show connect wallet button in the wallet address area
     */
    function showConnectButton() {
        $('#wallet-address').html(`
            <button id="connect-wallet-btn" class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                ${blockchainDashboardData.texts.connect_wallet}
            </button>
        `);
        
        // Add click event to the connect button
        $('#connect-wallet-btn').on('click', connectWallet);
        
        // Show empty states for all sections
        $('.loading-container').each(function() {
            $(this).html(`
                <div class="empty-state text-center py-8">
                    <p class="text-gray-500">${blockchainDashboardData.texts.connect_wallet}</p>
                </div>
            `);
        });
        
        // Set wallet state to not connected
        dashboard.isConnected = false;
    }

    /**
     * Show MetaMask not installed error
     */
    function showMetaMaskError() {
        $('.loading-container').each(function() {
            $(this).html(`
                <div class="error-message text-center py-8">
                    <svg class="w-12 h-12 mx-auto text-red-500 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p class="text-red-600 font-medium">${blockchainDashboardData.texts.no_metamask}</p>
                    <a href="https://metamask.io/download/" target="_blank" class="inline-block mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                        ${blockchainDashboardData.texts.install_metamask}
                    </a>
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
        await updateNetworkInfo();
        
        // Get ETH price from API
        await fetchEthPrice();
        
        // Load all dashboard data in parallel
        Promise.all([
            loadWalletInfo(),
            loadTokens(),
            loadNFTs(),
            loadTransactions(),
            loadSecurityInfo(),
            loadDAOInfo(),
            initBalanceChart(),
            updateBadgesAndAchievements()
        ]).catch(error => {
            console.error('Error loading dashboard data:', error);
        });
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
            
            dashboard.networkData = {
                name: networkName,
                chainId: network.chainId,
                class: networkClass
            };
            
            $('#network-name').text(networkName);
            $('.network-dot').attr('class', 'network-dot ' + networkClass);
        } catch (error) {
            console.error('Error getting network:', error);
            $('#network-name').text(blockchainDashboardData.texts.chain_error);
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
     * Fetch current ETH price in USD from CoinGecko API
     */
    async function fetchEthPrice() {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
            const data = await response.json();
            
            if (data && data.ethereum && data.ethereum.usd) {
                dashboard.ethUsdPrice = data.ethereum.usd;
                console.log('ETH price fetched:', dashboard.ethUsdPrice);
            }
        } catch (error) {
            console.error('Error fetching ETH price:', error);
            dashboard.ethUsdPrice = 0;
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
            const usdValue = dashboard.ethUsdPrice > 0 ? 
                (parseFloat(etherBalance) * dashboard.ethUsdPrice).toFixed(2) : 
                '---';
            
            // Create formatted balance HTML
            const balanceHTML = `
                <div class="flex items-center">
                    <div class="flex-shrink-0 mr-4">
                        <div class="eth-icon p-3 bg-blue-100 rounded-full">
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
                    </div>
                    <div>
                        <h3 class="text-xl font-bold">${parseFloat(etherBalance).toFixed(4)} ETH</h3>
                        <div id="eth-usd-value" class="text-gray-600">$${usdValue} USD</div>
                    </div>
                </div>
            `;
            
            $('#wallet-balance').html(balanceHTML);
            
            // Store for balance history if needed
            dashboard.currentBalance = parseFloat(etherBalance);
            
            // Push to balance history for chart (mock data for now)
            updateBalanceHistory(dashboard.currentBalance);
            
        } catch (error) {
            console.error('Error fetching balance:', error);
            $('#wallet-balance').html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }
    
    /**
     * Update balance history data for chart
     * In a real application, this would fetch historical data from an API
     */
    function updateBalanceHistory(currentBalance) {
        // For demo purposes, create mock data based on current balance
        const dates = [];
        const balances = [];
        const today = new Date();
        
        // Generate 7 days of data
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            dates.push(date.toLocaleDateString());
            
            // Random variation around current balance for demo
            const variation = (Math.random() * 0.2) - 0.1; // -10% to +10%
            const historicalBalance = currentBalance * (1 + variation);
            balances.push(historicalBalance);
        }
        
        dashboard.balanceHistory = {
            dates: dates,
            balances: balances
        };
    }
    
    /**
     * Initialize and draw the balance chart
     */
    function initBalanceChart() {
        if (!dashboard.balanceHistory || !dashboard.balanceHistory.dates) return;
        
        const ctx = document.getElementById('balance-chart').getContext('2d');
        
        // Destroy previous chart if it exists
        if (dashboard.balanceChart) {
            dashboard.balanceChart.destroy();
        }
        
        // Create new chart
        dashboard.balanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dashboard.balanceHistory.dates,
                datasets: [{
                    label: 'ETH Balance',
                    data: dashboard.balanceHistory.balances,
                    fill: true,
                    backgroundColor: 'rgba(96, 165, 250, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    tension: 0.4,
                    pointRadius: 3,
                    pointBackgroundColor: 'rgba(59, 130, 246, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `${context.raw.toFixed(4)} ETH`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(4) + ' ETH';
                            }
                        }
                    }
                }
            }
        });
    }
    
    /**
     * Load ERC-20 tokens
     * In a real implementation, this would use an API like Moralis, Covalent, Alchemy
     */
    async function loadTokens() {
        if (!dashboard.isConnected) return;
        
        const tokensContainer = $('#tokens-container');
        
        try {
            // Fetch token data
            const tokens = await fetchTokenData();
            dashboard.tokens = tokens;
            
            if (tokens && tokens.length > 0) {
                let tokensHTML = `
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ${blockchainDashboardData.texts.token}
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ${blockchainDashboardData.texts.balance}
                                    </th>
                                    <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ${blockchainDashboardData.texts.value}
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                `;
                
                tokens.forEach(token => {
                    tokensHTML += `
                        <tr>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <div class="flex-shrink-0 h-10 w-10">
                                        <img class="h-10 w-10 rounded-full" src="${token.logo}" alt="${token.symbol}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'32\\' height=\\'32\\' viewBox=\\'0 0 24 24\\'><circle cx=\\'12\\' cy=\\'12\\' r=\\'12\\' fill=\\'%23C4C4C4\\'/></svg>'">
                                    </div>
                                    <div class="mr-4">
                                        <div class="text-sm font-medium text-gray-900">${token.symbol}</div>
                                        <div class="text-sm text-gray-500">${token.name}</div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm text-gray-900">${token.balance}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                ${token.usdValue ? '$' + token.usdValue : '—'}
                            </td>
                        </tr>
                    `;
                });
                
                tokensHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
                
                tokensContainer.html(tokensHTML);
            } else {
                tokensContainer.html(`
                    <div class="empty-state text-center py-8">
                        <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p class="text-gray-500">${blockchainDashboardData.texts.no_tokens}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching tokens:', error);
            tokensContainer.html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch token data (mock implementation)
     * In production, use an API service like Alchemy or Moralis
     */
    async function fetchTokenData() {
        // Mock token data for demonstration
        return [
            {
                name: 'USD Coin',
                symbol: 'USDC',
                balance: '250.00',
                decimals: 6,
                logo: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
                usdValue: '250.00'
            },
            {
                name: 'Dai Stablecoin',
                symbol: 'DAI',
                balance: '125.75',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
                usdValue: '125.75'
            },
            {
                name: 'Chainlink',
                symbol: 'LINK',
                balance: '10.5',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/chainlink-link-logo.png',
                usdValue: '84.00'
            },
            {
                name: 'Uniswap',
                symbol: 'UNI',
                balance: '15.2',
                decimals: 18,
                logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
                usdValue: '76.00'
            }
        ];
    }

    /**
     * Helper function to copy text to clipboard
     */
    function copyToClipboard(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => showNotification(blockchainDashboardData.texts.copy_success, 'success'))
                .catch(() => showNotification(blockchainDashboardData.texts.copy_error, 'error'));
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
                showNotification(successful ? blockchainDashboardData.texts.copy_success : blockchainDashboardData.texts.copy_error, 
                    successful ? 'success' : 'error');
            } catch (err) {
                showNotification(blockchainDashboardData.texts.copy_error, 'error');
            }
            
            document.body.removeChild(textArea);
        }
    }

    /**
     * Show notification
     */
    function showNotification(message, type = 'info') {
        const notification = $(`<div class="notification ${type} bg-white border-r-4 p-4 shadow-md mb-2 rounded-md opacity-0 transition-opacity duration-300"></div>`);
        
        // Set border color based on type
        switch(type) {
            case 'success':
                notification.addClass('border-green-500');
                break;
            case 'error':
                notification.addClass('border-red-500');
                break;
            case 'warning':
                notification.addClass('border-yellow-500');
                break;
            default:
                notification.addClass('border-blue-500');
        }
        
        notification.text(message);
        $('#notification-container').append(notification);
        
        // Show notification with animation
        setTimeout(() => {
            notification.addClass('opacity-100');
            
            // Hide and remove after delay
            setTimeout(() => {
                notification.removeClass('opacity-100');
                setTimeout(() => {
                    notification.remove();
                }, 300);
            }, 3000);
        }, 100);
    }
    
    /**
     * Helper function to format addresses
     */
    function formatAddress(address, length = 6) {
        if (!address) return '';
        return `${address.substring(0, length)}...${address.substring(address.length - 4)}`;
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
            dashboard.nfts = nfts;
            
            // Populate NFT filter with collections
            updateNFTFilter(nfts);
            
            if (nfts && nfts.length > 0) {
                renderNFTGallery(nfts);
            } else {
                nftsContainer.html(`
                    <div class="empty-state text-center py-8">
                        <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                        <p class="text-gray-500">${blockchainDashboardData.texts.no_nfts}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching NFTs:', error);
            nftsContainer.html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.wallet_error}</p>
                </div>
            `);
        }
    }

    /**
     * Render NFT Gallery
     */
    function renderNFTGallery(nfts) {
        const nftsContainer = $('#nfts-container');
        let nftsHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">';
        
        nfts.forEach(nft => {
            const openseaUrl = `https://opensea.io/assets/${nft.contract}/${nft.tokenId}`;
            
            nftsHTML += `
                <div class="nft-item bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300" data-collection="${nft.collection}">
                    <div class="nft-image aspect-square relative">
                        <img src="${nft.image}" alt="${nft.name}" class="w-full h-full object-cover" 
                             onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\' viewBox=\\'0 0 24 24\\'><rect width=\\'24\\' height=\\'24\\' fill=\\'%23f0f0f0\\'/><text x=\\'50%\\' y=\\'50%\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'6\\' fill=\\'%23999\\'>Image not available</text></svg>'">
                    </div>
                    <div class="nft-details p-4">
                        <h3 class="nft-name text-lg font-medium mb-1 truncate">${nft.name}</h3>
                        <span class="nft-collection block text-sm text-gray-500 mb-3">${nft.collection}</span>
                        <a href="${openseaUrl}" target="_blank" class="inline-block text-sm text-blue-600 hover:text-blue-800">
                            ${blockchainDashboardData.texts.view_on_opensea}
                            <svg class="inline-block w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                    </div>
                </div>
            `;
        });
        
        nftsHTML += '</div>';
        nftsContainer.html(nftsHTML);
    }

    /**
     * Update NFT filter with available collections
     */
    function updateNFTFilter(nfts) {
        const collections = new Set();
        nfts.forEach(nft => collections.add(nft.collection));
        
        const filterSelect = $('#nft-filter');
        filterSelect.html('<option value="all">' + blockchainDashboardData.texts.all_collections + '</option>');
        
        collections.forEach(collection => {
            filterSelect.append(`<option value="${collection}">${collection}</option>`);
        });
    }

    /**
     * Filter NFTs by collection
     */
    function filterNFTs(collection) {
        if (collection === 'all') {
            $('.nft-item').show();
        } else {
            $('.nft-item').hide();
            $(`.nft-item[data-collection="${collection}"]`).show();
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
            },
            {
                name: 'Doodle #3456',
                collection: 'Doodles',
                image: 'https://ipfs.io/ipfs/QmPMc4tcBsMqLRuCQtPmPe84bpSjrC3Ky7t3JWuHXYB4aS',
                tokenId: '3456',
                contract: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e'
            },
            {
                name: 'Clone X #7890',
                collection: 'Clone X',
                image: 'https://ipfs.io/ipfs/QmZtUhMmw1K5KfCeQAJgZ9LMzXbFQY9qEuKT1uFUCLGvj8',
                tokenId: '7890',
                contract: '0x49cF6f5d44E70224e2E23fDcdd2C053F30aDA28B'
            },
            {
                name: 'Art Blocks #2345',
                collection: 'Art Blocks',
                image: 'https://ipfs.io/ipfs/QmXzzu6LYc8Wm9HWFJPgjaAmpXnQa6Nj8cFSrCEHe9JjC1',
                tokenId: '2345',
                contract: '0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270'
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
            dashboard.transactions = transactions;
            
            if (transactions && transactions.length > 0) {
                let txHTML = `
                    <div class="overflow-hidden">
                        <ul class="divide-y divide-gray-200">
                `;
                
                transactions.forEach(tx => {
                    const isIncoming = tx.to && tx.to.toLowerCase() === dashboard.address.toLowerCase();
                    const direction = isIncoming ? 'in' : 'out';
                    const directionText = isIncoming ? blockchainDashboardData.texts.received : blockchainDashboardData.texts.sent;
                    const otherParty = isIncoming ? tx.from : tx.to;
                    const otherPartyShort = otherParty ? formatAddress(otherParty) : '';
                    const txDate = new Date(tx.timestamp).toLocaleDateString();
                    const etherscanUrl = `https://etherscan.io/tx/${tx.hash}`;
                    
                    txHTML += `
                        <li class="py-4">
                            <div class="flex items-center space-x-4">
                                <div class="flex-shrink-0">
                                    <div class="w-10 h-10 rounded-full flex items-center justify-center ${isIncoming ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}">
                                        <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            ${isIncoming ? 
                                                '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline>' : 
                                                '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline>'}
                                        </svg>
                                    </div>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 truncate">
                                        ${directionText} ${tx.value} ETH
                                    </p>
                                    <p class="text-sm text-gray-500 truncate">
                                        ${isIncoming ? blockchainDashboardData.texts.from : blockchainDashboardData.texts.to}: ${otherPartyShort}
                                    </p>
                                    <p class="text-xs text-gray-400">
                                        ${txDate}
                                    </p>
                                </div>
                                <div>
                                    <a href="${etherscanUrl}" target="_blank" 
                                       class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                                        ${blockchainDashboardData.texts.view}
                                    </a>
                                </div>
                            </div>
                        </li>
                    `;
                });
                
                txHTML += `
                        </ul>
                        <div class="mt-4 text-center">
                            <a href="https://etherscan.io/address/${dashboard.address}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">
                                ${blockchainDashboardData.texts.view_all_transactions}
                            </a>
                        </div>
                    </div>
                `;
                
                txContainer.html(txHTML);
            } else {
                txContainer.html(`
                    <div class="empty-state text-center py-8">
                        <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="1" x2="12" y2="23"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
                        <p class="text-gray-500">${blockchainDashboardData.texts.no_transactions}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            txContainer.html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.wallet_error}</p>
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
                timestamp: Date.now() - 86400000 // 1 day ago
            },
            {
                hash: '0xabcdef123456789abcdef123456789abcdef12345678',
                from: dashboard.address,
                to: '0x1234567890123456789012345678901234567890',
                value: '0.1',
                timestamp: Date.now() - 172800000 // 2 days ago
            },
            {
                hash: '0x9abcdef123456789abcdef123456789abcdef12345',
                from: '0x9876543210987654321098765432109876543210',
                to: dashboard.address,
                value: '1.2',
                timestamp: Date.now() - 259200000 // 3 days ago
            },
            {
                hash: '0xdef123456789abcdef123456789abcdef12345678',
                from: dashboard.address,
                to: '0x5432109876543210987654321098765432109876',
                value: '0.3',
                timestamp: Date.now() - 345600000 // 4 days ago
            },
            {
                hash: '0xef123456789abcdef123456789abcdef123456789',
                from: dashboard.address,
                to: '0x9876543210987654321098765432109876543210',
                value: '0.05',
                timestamp: Date.now() - 432000000 // 5 days ago
            }
        ];
    }

    /**
     * Load security information for the wallet
     */
    async function loadSecurityInfo() {
        if (!dashboard.isConnected) return;
        
        const securityContainer = $('#security-info');
        
        try {
            // In a real implementation, you would use services like Revoke.cash, BlockSec, etc.
            const securityInfo = await fetchSecurityInfo();
            dashboard.securityInfo = securityInfo;
            
            let securityHTML = '';
            
            // Wallet risk assessment
            securityHTML += `
                <div class="p-4 rounded-lg ${securityInfo.isRisky ? 'bg-red-100' : 'bg-green-100'}">
                    <div class="flex items-center">
                        <div class="flex-shrink-0">
                            <svg class="w-6 h-6 ${securityInfo.isRisky ? 'text-red-600' : 'text-green-600'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${securityInfo.isRisky ? 
                                    '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' : 
                                    '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'}
                            </svg>
                        </div>
                        <div class="mr-4">
                            <p class="text-sm font-medium ${securityInfo.isRisky ? 'text-red-800' : 'text-green-800'}">
                                ${securityInfo.isRisky ? blockchainDashboardData.texts.wallet_flagged : blockchainDashboardData.texts.wallet_safe}
                            </p>
                        </div>
                    </div>
                </div>
            `;
            
            // Connected dApps
            if (securityInfo.connectedDapps && securityInfo.connectedDapps.length > 0) {
                securityHTML += `
                    <div class="mt-4">
                        <h3 class="text-sm font-medium text-gray-700 mb-2">${blockchainDashboardData.texts.connected_dapps}</h3>
                        <ul class="bg-white rounded-lg divide-y divide-gray-200 border border-gray-200">
                `;
                
                securityInfo.connectedDapps.forEach(dapp => {
                    securityHTML += `
                        <li class="px-4 py-3 flex items-center justify-between">
                            <span class="text-sm">${dapp.name}</span>
                            <span class="px-2 py-1 text-xs rounded-full ${dapp.isRisky ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                                ${dapp.isRisky ? blockchainDashboardData.texts.risky : blockchainDashboardData.texts.safe}
                            </span>
                        </li>
                    `;
                });
                
                securityHTML += `
                        </ul>
                        <div class="mt-2 text-sm">
                            <a href="https://revoke.cash/address/${dashboard.address}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                ${blockchainDashboardData.texts.check_approvals}
                            </a>
                        </div>
                    </div>
                `;
            }
            
            securityContainer.html(securityHTML);
        } catch (error) {
            console.error('Error fetching security info:', error);
            securityContainer.html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.error_loading}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch security information (mock implementation)
     */
    async function fetchSecurityInfo() {
        // This is a simplified mock example - in production, use security services
        return {
            isRisky: false,
            riskFactors: [],
            connectedDapps: [
                {
                    name: 'Uniswap V3',
                    address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
                    isRisky: false
                },
                {
                    name: 'OpenSea',
                    address: '0x7Be8076f4EA4A4AD08075C2508e481d6C946D12b',
                    isRisky: false
                },
                {
                    name: 'Unknown Protocol',
                    address: '0x7A250d5630B4cF539739dF2C5dAcb4c659F2488D',
                    isRisky: true
                }
            ]
        };
    }

    /**
     * Load DAO and governance information
     */
    async function loadDAOInfo() {
        if (!dashboard.isConnected) return;
        
        const daoContainer = $('#dao-container');
        
        try {
            // In a real implementation, you would use APIs to fetch governance tokens and voting history
            const daoInfo = await fetchDAOInfo();
            dashboard.daoTokens = daoInfo.tokens;
            
            if (daoInfo.tokens && daoInfo.tokens.length > 0) {
                let daoHTML = `
                    <div class="mb-6">
                        <h3 class="text-sm font-medium text-gray-700 mb-2">${blockchainDashboardData.texts.governance_tokens}</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                `;
                
                daoInfo.tokens.forEach(token => {
                    daoHTML += `
                        <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                            <div class="flex items-center mb-2">
                                <div class="flex-shrink-0 mr-3">
                                    <img class="h-8 w-8 rounded-full" src="${token.logo}" alt="${token.symbol}">
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold">${token.name}</h4>
                                    <p class="text-xs text-gray-500">${token.balance} ${token.symbol}</p>
                                </div>
                            </div>
                            <a href="${token.daoUrl}" target="_blank" class="text-xs text-blue-600 hover:text-blue-800">
                                ${blockchainDashboardData.texts.view_dao}
                            </a>
                        </div>
                    `;
                });
                
                daoHTML += `
                        </div>
                    </div>
                `;
                
                // Add voting history if available
                if (daoInfo.votes && daoInfo.votes.length > 0) {
                    daoHTML += `
                        <div>
                            <h3 class="text-sm font-medium text-gray-700 mb-2">${blockchainDashboardData.texts.voting_history}</h3>
                            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                                <ul class="divide-y divide-gray-200">
                    `;
                    
                    daoInfo.votes.forEach(vote => {
                        daoHTML += `
                            <li class="px-4 py-3">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <p class="text-sm font-medium text-gray-700">${vote.proposal}</p>
                                        <p class="text-xs text-gray-500">${vote.dao} • ${new Date(vote.date).toLocaleDateString()}</p>
                                    </div>
                                    <span class="px-2 py-1 text-xs rounded-full ${vote.vote === 'For' ? 'bg-green-100 text-green-800' : vote.vote === 'Against' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">
                                        ${vote.vote}
                                    </span>
                                </div>
                            </li>
                        `;
                    });
                    
                    daoHTML += `
                                </ul>
                            </div>
                        </div>
                    `;
                } else {
                    daoHTML += `
                        <div class="bg-gray-50 p-4 rounded-lg text-center">
                            <p class="text-sm text-gray-500">${blockchainDashboardData.texts.no_votes}</p>
                        </div>
                    `;
                }
                
                daoContainer.html(daoHTML);
            } else {
                daoContainer.html(`
                    <div class="empty-state text-center py-8">
                        <svg class="w-12 h-12 mx-auto text-gray-400 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p class="text-gray-500">${blockchainDashboardData.texts.no_dao_tokens}</p>
                    </div>
                `);
            }
        } catch (error) {
            console.error('Error fetching DAO info:', error);
            daoContainer.html(`
                <div class="error-message p-4 bg-red-100 text-red-700 rounded-lg">
                    <p>${blockchainDashboardData.texts.error_loading}</p>
                </div>
            `);
        }
    }

    /**
     * Fetch DAO and governance information (mock implementation)
     */
    async function fetchDAOInfo() {
        // This is a simplified mock example - in production, use DAO-specific APIs
        return {
            tokens: [
                {
                    name: 'Uniswap',
                    symbol: 'UNI',
                    balance: '15.2',
                    logo: 'https://cryptologos.cc/logos/uniswap-uni-logo.png',
                    daoUrl: 'https://app.uniswap.org/#/vote'
                },
                {
                    name: 'Aave',
                    symbol: 'AAVE',
                    balance: '2.5',
                    logo: 'https://cryptologos.cc/logos/aave-aave-logo.png',
                    daoUrl: 'https://app.aave.com/governance'
                }
            ],
            votes: [
                {
                    proposal: 'UNI Proposal #12: Treasury Diversification',
                    dao: 'Uniswap',
                    date: Date.now() - 1209600000, // 14 days ago
                    vote: 'For'
                },
                {
                    proposal: 'AAVE Proposal #7: Risk Parameter Updates',
                    dao: 'Aave',
                    date: Date.now() - 2592000000, // 30 days ago
                    vote: 'Against'
                }
            ]
        };
    }

    /**
     * Update badges and achievements
     */
    async function updateBadgesAndAchievements() {
        if (!dashboard.isConnected) return;
        
        // Calculate badges based on wallet data
        calculateBadges();
        
        // Calculate achievements based on wallet data
        calculateAchievements();
        
        // Render badges
        renderBadges();
        
        // Render achievements
        renderAchievements();
    }

    /**
     * Calculate badges based on wallet data
     */
    function calculateBadges() {
        const badges = {};
        
        // Whale badge (if balance > 10 ETH)
        if (dashboard.currentBalance > 10) {
            badges.whale = {
                name: blockchainDashboardData.texts.whale_badge,
                description: blockchainDashboardData.texts.whale_desc,
                icon: 'whale',
                color: 'blue'
            };
        }
        
        // NFT Collector (if owns > 5 NFTs)
        if (dashboard.nfts && dashboard.nfts.length > 5) {
            badges.nftCollector = {
                name: blockchainDashboardData.texts.nft_collector_badge,
                description: blockchainDashboardData.texts.nft_collector_desc,
                icon: 'image',
                color: 'purple'
            };
        }
        
        // Governance Participant (if has governance tokens)
        if (dashboard.daoTokens && dashboard.daoTokens.length > 0) {
            badges.governance = {
                name: blockchainDashboardData.texts.governance_badge,
                description: blockchainDashboardData.texts.governance_desc,
                icon: 'shield',
                color: 'green'
            };
        }
        
        // Store badges
        dashboard.badges = badges;
    }

    /**
     * Calculate achievements based on wallet data
     */
    function calculateAchievements() {
        const achievements = {};
        
        // First NFT Acquired
        if (dashboard.nfts && dashboard.nfts.length > 0) {
            achievements.firstNFT = {
                name: blockchainDashboardData.texts.first_nft_achievement,
                description: blockchainDashboardData.texts.first_nft_desc,
                icon: 'image',
                unlocked: true
            };
        }
        
        // Interacted with Contracts
        if (dashboard.transactions && dashboard.transactions.length > 0) {
            const contractInteractions = dashboard.transactions.filter(tx => 
                tx.from.toLowerCase() === dashboard.address.toLowerCase() && 
                tx.to && tx.to.toLowerCase() !== dashboard.address.toLowerCase()
            );
            
            if (contractInteractions.length >= 5) {
                achievements.contractMaster = {
                    name: blockchainDashboardData.texts.contract_master,
                    description: blockchainDashboardData.texts.contract_master_desc,
                    icon: 'code',
                    unlocked: true
                };
            }
        }
        
        // Portfolio Diversifier (if has multiple tokens)
        if (dashboard.tokens && dashboard.tokens.length >= 3) {
            achievements.diversifier = {
                name: blockchainDashboardData.texts.diversifier,
                description: blockchainDashboardData.texts.diversifier_desc,
                icon: 'chart-pie',
                unlocked: true
            };
        }
        
        // Store achievements
        dashboard.achievements = achievements;
    }

    /**
     * Render badges in the UI
     */
    function renderBadges() {
        const badgesContainer = $('#wallet-badges');
        const badges = dashboard.badges;
        
        if (Object.keys(badges).length > 0) {
            let badgesHTML = '';
            
            for (const key in badges) {
                const badge = badges[key];
                badgesHTML += `
                    <div class="bg-${badge.color}-100 border border-${badge.color}-200 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                        <div class="w-10 h-10 rounded-full bg-${badge.color}-200 flex items-center justify-center mb-2">
                            <svg class="w-6 h-6 text-${badge.color}-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${getIconSVG(badge.icon)}
                            </svg>
                        </div>
                        <h3 class="text-sm font-bold text-${badge.color}-800">${badge.name}</h3>
                        <p class="text-xs text-${badge.color}-600">${badge.description}</p>
                    </div>
                `;
            }
            
            badgesContainer.html(badgesHTML);
        } else {
            badgesContainer.html(`
                <div class="col-span-2 empty-state text-center py-4">
                    <p class="text-gray-500 text-sm">${blockchainDashboardData.texts.no_badges}</p>
                </div>
            `);
        }
    }

    /**
     * Render achievements in the UI
     */
    function renderAchievements() {
        const achievementsContainer = $('#achievements-container');
        const achievements = dashboard.achievements;
        
        if (Object.keys(achievements).length > 0) {
            let achievementsHTML = '';
            
            for (const key in achievements) {
                const achievement = achievements[key];
                achievementsHTML += `
                    <div class="bg-white border border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                        <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center mb-2">
                            <svg class="w-6 h-6 text-yellow-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                ${getIconSVG(achievement.icon)}
                            </svg>
                        </div>
                        <h3 class="text-sm font-bold text-gray-800">${achievement.name}</h3>
                        <p class="text-xs text-gray-600 mt-1">${achievement.description}</p>
                        <span class="mt-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ${blockchainDashboardData.texts.unlocked}
                        </span>
                    </div>
                `;
            }
            
            achievementsContainer.html(achievementsHTML);
        } else {
            achievementsContainer.html(`
                <div class="col-span-4 empty-state text-center py-8">
                    <p class="text-gray-500">${blockchainDashboardData.texts.no_achievements}</p>
                    <p class="text-gray-400 text-sm mt-2">${blockchainDashboardData.texts.keep_exploring}</p>
                </div>
            `);
        }
    }

    /**
     * Get SVG path for different icon types
     */
    function getIconSVG(iconType) {
        switch (iconType) {
            case 'whale':
                return '<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>';
            case 'image':
                return '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline>';
            case 'shield':
                return '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>';
            case 'code':
                return '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>';
            case 'chart-pie':
                return '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path>';
            default:
                return '<circle cx="12" cy="12" r="10"></circle>';
        }
    }

    // Initialize when document is ready
    $(document).ready(initDashboard);

})(jQuery); 