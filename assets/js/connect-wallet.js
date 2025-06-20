/**
 * Connect Wallet JavaScript
 * Handles wallet connection and signature verification for existing users
 */

(function($) {
    'use strict';

    // Add console debug function with extra visibility for important messages
    function debug(message, isImportant = false) {
        if (isImportant) {
            console.log('%c[Connect Wallet] ' + message, 'color: #0066ff; font-weight: bold;');
        } else {
            console.log('[Connect Wallet] ' + message);
        }
    }

    // Direct check if MetaMask is installed - make this immediately visible
    if (typeof window.ethereum !== 'undefined') {
        debug('MetaMask is installed! ethereum object is available', true);
    } else {
        debug('MetaMask is NOT installed! No ethereum object available', true);
    }

    // Check if ethers.js is available - with retry mechanism
    function checkEthersAvailability(retries = 0, maxRetries = 5) {
        if (typeof ethers !== 'undefined') {
            debug('ethers.js loaded successfully: ' + ethers.version, true);
            // Initialize wallet connection once ethers is available
            ConnectWallet.init();
        } else {
            if (retries < maxRetries) {
                debug('ethers.js not loaded yet. Retrying in 1 second... (' + (retries + 1) + '/' + maxRetries + ')');
                setTimeout(function() {
                    checkEthersAvailability(retries + 1, maxRetries);
                }, 1000);
            } else {
                console.error('%c[Connect Wallet] ethers.js is required for wallet connection but failed to load after ' + maxRetries + ' attempts.', 'color: red; font-weight: bold;');
                
                // Try to load ethers.js from an alternative CDN as a fallback
                debug('Attempting to load ethers.js from fallback CDN...', true);
                
                // Create script element for alternative CDN
                var script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
                script.async = false;
                
                // Add load event handler
                script.onload = function() {
                    debug('ethers.js loaded successfully from fallback CDN', true);
                    if (typeof ethers !== 'undefined') {
                        ConnectWallet.init();
                    } else {
                        $('#connect-wallet-status')
                            .text('Error: ethers.js library failed to load from all sources. Please reload the page or contact support.')
                            .addClass('error');
                    }
                };
                
                // Add error event handler
                script.onerror = function() {
                    debug('Failed to load ethers.js from fallback CDN', true);
                    $('#connect-wallet-status')
                        .text('Error: ethers.js library failed to load. Please reload the page or contact support.')
                        .addClass('error');
                };
                
                // Append script to document head
                document.head.appendChild(script);
                
                // Try to show error if the status element exists
                try {
                    $('#connect-wallet-status')
                        .text('Attempting to load required libraries from alternative source...')
                        .removeClass('error')
                        .addClass('loading');
                } catch (e) {
                    console.error('Failed to update status element', e);
                }
            }
        }
    }

    // Wallet Connection Handler
    const ConnectWallet = {
        provider: null,
        signer: null,
        walletAddress: null,
        isConnecting: false,
        hasRequestedSignature: false, // Track if signature has been requested

        // Initialize
        init: function() {
            debug('Initializing Wallet Connection', true);
            // Debug button existence
            if ($('#connect-wallet-button').length) {
                debug('Found connect-wallet-button in DOM', true);
                // Clear any existing handlers first to prevent duplicates
                $('#connect-wallet-button').off('click');
                // Add click event for connect button
                $('#connect-wallet-button').on('click', this.connectWallet.bind(this));
                debug('Click handler attached to connect button', true);
            } else {
                debug('WARNING: connect-wallet-button NOT found in DOM!', true);
                // Try to log more details about possible selectors
                debug('Possible button selectors found: ' + 
                    $('button').map(function() { return '#' + this.id; }).get().join(', '));
            }
            
            // Remove any existing fallback handlers to prevent duplicates
            $('body').off('click', '#connect-wallet-button');
            
            // Check if MetaMask is already installed
            if (typeof window.ethereum !== 'undefined') {
                debug('MetaMask is installed', true);
                
                // Remove any existing listeners to prevent duplicates
                try {
                    window.ethereum.removeAllListeners('accountsChanged');
                    window.ethereum.removeAllListeners('chainChanged');
                } catch (e) {
                    debug('Error removing listeners: ' + e.message);
                }
                
                // Implement ethereum event listeners
                window.ethereum.on('accountsChanged', function (accounts) {
                    debug('MetaMask account changed to: ' + accounts[0], true);
                    // Reload UI if account changes and we're not in the middle of connecting
                    if (!this.isConnecting && accounts && accounts.length > 0) {
                        this.walletAddress = accounts[0];
                        this.updateUIAfterConnection(accounts[0]);
                    }
                }.bind(this));
                
                window.ethereum.on('chainChanged', function (chainId) {
                    debug('MetaMask network changed to: ' + chainId, true);
                });
            } else {
                debug('MetaMask is not installed', true);
                this.updateStatus(connectWalletObj.noWalletText, true);
            }
            
            // Check if wallet is already connected and show connected UI
            this.checkExistingConnection();
        },

        // Check if wallet is already connected
        checkExistingConnection: async function() {
            if (typeof window.ethereum !== 'undefined') {
                try {
                    // Try to get accounts without prompting
                    const accounts = await window.ethereum.request({
                        method: 'eth_accounts'
                    });
                    
                    if (accounts && accounts.length > 0) {
                        debug('Already connected to wallet: ' + accounts[0], true);
                        this.walletAddress = accounts[0];
                        
                        // Check if this wallet is linked to current user
                        this.checkWalletLinked(accounts[0]);
                    }
                } catch (e) {
                    debug('Error checking existing connection: ' + e.message);
                }
            }
        },
        
        // Check if wallet is linked to current user
        checkWalletLinked: function(address) {
            $.ajax({
                url: connectWalletObj.ajaxurl,
                type: 'POST',
                data: {
                    action: 'metamask_check_wallet_linked',
                    security: connectWalletObj.nonce,
                    wallet_address: address
                },
                success: (response) => {
                    if (response.success && response.data.is_linked) {
                        debug('Wallet is linked to current user', true);
                        // Update UI to show connected state
                        this.updateUIAfterConnection(address);
                    }
                },
                error: (xhr) => {
                    debug('Error checking wallet link status');
                }
            });
        },

        // Update status message
        updateStatus: function(message, isError = false, isLoading = false) {
            const $status = $('#connect-wallet-status');
            if ($status.length) {
                $status.text(message);
                
                // Clear all status classes
                $status.removeClass('error loading success');
                
                if (isError) {
                    $status.addClass('error');
                    debug('Error: ' + message, true);
                } else if (isLoading) {
                    $status.addClass('loading');
                    debug('Loading: ' + message);
                } else {
                    debug('Status: ' + message);
                }
            } else {
                debug('Status element not found: ' + message);
            }
        },

        // Connect to MetaMask wallet
        connectWallet: async function(e) {
            e.preventDefault();
            debug('Connect wallet button clicked', true);

            // Prevent multiple clicks
            if (this.isConnecting) {
                debug('Already connecting, ignoring click');
                // Add reset option if connection is stuck
                this.updateStatus(connectWalletObj.connectingText + ' (click again to reset)', false, true);
                this.isConnecting = false;
                this.hasRequestedSignature = false;
                return;
            }
            
            this.isConnecting = true;
            this.hasRequestedSignature = false;

            // Check if MetaMask is installed
            if (typeof window.ethereum === 'undefined') {
                this.updateStatus(connectWalletObj.noWalletText, true);
                this.isConnecting = false;
                return;
            }

            try {
                // Update status
                this.updateStatus(connectWalletObj.connectingText, false, true);

                // Connect to provider
                debug('Creating Web3Provider');
                this.provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
                
                // Request accounts access with timeout to handle stuck requests
                debug('Requesting accounts access from MetaMask', true);
                
                // Create a promise that rejects after timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Request timeout. Please try again.')), 30000);
                });
                
                // Handle "already pending" errors by suggesting user to check MetaMask
                try {
                    // Race between the request and the timeout
                    const accounts = await Promise.race([
                        window.ethereum.request({ 
                            method: 'eth_requestAccounts',
                            params: []
                        }),
                        timeoutPromise
                    ]);
                    
                    debug('Accounts received: ' + (accounts ? accounts.length : 0), true);
                    
                    if (!accounts || accounts.length === 0) {
                        throw new Error('No accounts found or user rejected the connection');
                    }

                    this.walletAddress = accounts[0];
                    debug('Connected to wallet: ' + this.walletAddress, true);
                    this.signer = this.provider.getSigner();

                    // Generate message to sign
                    this.generateMessageToSign();
                } catch (error) {
                    debug('Error connecting: ' + error.message, true);
                    
                    // Special handling for already pending requests
                    if (error.message.includes('already pending')) {
                        this.updateStatus('MetaMask request already pending. Please open MetaMask and check for pending requests.', true);
                        // Add detailed instructions
                        $('#connect-wallet-status').append('<br><small>Try these steps:<br>1. Open MetaMask extension<br>2. Check for pending requests<br>3. Complete or reject them<br>4. Try connecting again</small>');
                    } else {
                        throw error; // Re-throw for the outer catch block
                    }
                    this.isConnecting = false;
                    this.hasRequestedSignature = false;
                }
            } catch (error) {
                console.error('Connection error:', error);
                this.updateStatus(connectWalletObj.errorText + ': ' + error.message, true);
                this.isConnecting = false;
                this.hasRequestedSignature = false;
            }
        },

        // Generate message to sign
        generateMessageToSign: function() {
            debug('Generating message to sign');
            
            // Prevent multiple signature requests
            if (this.hasRequestedSignature) {
                debug('Signature already requested, skipping duplicate request');
                return;
            }
            
            this.hasRequestedSignature = true;
            
            $.ajax({
                url: connectWalletObj.ajaxurl,
                type: 'POST',
                data: {
                    action: 'metamask_generate_link_message',
                    security: connectWalletObj.nonce,
                    wallet_address: this.walletAddress
                },
                success: (response) => {
                    debug('Message response received');
                    if (response.success) {
                        // Sign the message with nonce
                        debug('Message generated successfully');
                        this.signMessage(response.data.message, response.data.nonce);
                    } else {
                        this.updateStatus(connectWalletObj.errorText + ': ' + (response.data.message || 'Server error'), true);
                        this.isConnecting = false;
                        this.hasRequestedSignature = false;
                    }
                },
                error: (xhr, status, error) => {
                    console.error('AJAX error:', xhr.responseText);
                    let errorMessage = error;
                    
                    // Try to parse response for more detailed error
                    try {
                        const jsonResponse = JSON.parse(xhr.responseText);
                        if (jsonResponse && jsonResponse.data && jsonResponse.data.message) {
                            errorMessage = jsonResponse.data.message;
                        }
                    } catch (e) {
                        // If parsing fails, use the original error
                        console.error('Failed to parse error response:', e);
                    }
                    
                    this.updateStatus(connectWalletObj.errorText + ': ' + errorMessage, true);
                    this.isConnecting = false;
                    this.hasRequestedSignature = false;
                }
            });
        },

        // Sign message with wallet
        signMessage: async function(message, nonce) {
            this.updateStatus(connectWalletObj.signingText, false, true);
            debug('Signing message: ' + message);
            
            // Add a cancel button
            $('#connect-wallet-status').append('<br><button id="cancel-signing" class="button-small">Cancel</button>');
            
            // Add cancel handler
            $('#cancel-signing').on('click', (e) => {
                e.preventDefault();
                debug('User cancelled signing');
                this.updateStatus('Signing cancelled. Please try again.', true);
                this.isConnecting = false;
                this.hasRequestedSignature = false;
            });

            try {
                // Create a promise that rejects after timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Signing timeout. Please check MetaMask and try again.')), 60000);
                });
                
                // Sign the message with timeout - use a single signature request
                let signature;
                try {
                    signature = await Promise.race([
                        this.signer.signMessage(message),
                        timeoutPromise
                    ]);
                } catch (err) {
                    throw new Error('Signing failed: ' + err.message);
                }
                
                debug('Message signed successfully');
                
                // Verify the signature
                const recoveredAddress = ethers.utils.verifyMessage(message, signature);
                debug('Recovered address: ' + recoveredAddress);
                
                if (recoveredAddress.toLowerCase() !== this.walletAddress.toLowerCase()) {
                    throw new Error('Signature verification failed');
                }
                
                debug('Signature verified successfully');
                
                // Start UI update before AJAX request to make it feel more responsive
                this.updateStatus('Wallet connected! Linking with your account...', false, true);
                
                // Submit the signature to the server
                this.linkWallet(signature, nonce, message);
            } catch (error) {
                console.error('Signing error:', error);
                this.updateStatus(connectWalletObj.errorText + ': ' + error.message, true);
                this.isConnecting = false;
                this.hasRequestedSignature = false;
            }
        },

        // Link wallet to user account
        linkWallet: function(signature, nonce, message) {
            debug('Linking wallet to user account');
            $.ajax({
                url: connectWalletObj.ajaxurl,
                type: 'POST',
                data: {
                    action: 'metamask_link_wallet',
                    security: connectWalletObj.nonce,
                    wallet_address: this.walletAddress,
                    signature: signature,
                    nonce: nonce,
                    message: message
                },
                success: (response) => {
                    debug('Link response received');
                    if (response.success) {
                        this.updateStatus(response.data.message, false);
                        debug('Wallet linked successfully');
                        
                        // Show a clear confirmation 
                        $('#connect-wallet-status')
                            .removeClass('error loading')
                            .addClass('success')
                            .html('<strong>' + response.data.message + '</strong><br>' + 
                                  '<small>Wallet address: ' + response.data.wallet_address + '</small>');
                        
                        // Update UI immediately instead of page reload
                        this.updateUIAfterConnection(response.data.wallet_address);
                        
                        // If there's a redirect URL, go there
                        if (response.data.redirect) {
                            debug('Redirecting to: ' + response.data.redirect);
                            setTimeout(function() {
                                window.location.href = response.data.redirect;
                            }, 3000);
                        } else if (response.data.refresh) {
                            // Reload the page after a short delay if explicitly requested
                            debug('Reloading page in 3 seconds');
                            setTimeout(function() {
                                window.location.reload();
                            }, 3000);
                        }
                    } else {
                        const errorMsg = response.data && response.data.message ? response.data.message : 'Unknown linking error';
                        console.error('Linking error:', errorMsg);
                        
                        // Handle session errors by providing clear instructions
                        if (response.data && response.data.session_error) {
                            this.updateStatus(errorMsg + ' Please try again from the beginning.', true);
                            setTimeout(function() {
                                window.location.reload();
                            }, 3000);
                        } else {
                            this.updateStatus(connectWalletObj.errorText + ': ' + errorMsg, true);
                        }
                        
                        this.isConnecting = false;
                    }
                },
                error: (xhr, status, error) => {
                    console.error('AJAX error:', xhr.responseText);
                    let errorMessage = error;
                    
                    // Try to parse response for more detailed error
                    try {
                        const jsonResponse = JSON.parse(xhr.responseText);
                        if (jsonResponse && jsonResponse.data && jsonResponse.data.message) {
                            errorMessage = jsonResponse.data.message;
                        }
                    } catch (e) {
                        // If parsing fails, use the original error
                        console.error('Failed to parse error response:', e);
                    }
                    
                    this.updateStatus(connectWalletObj.errorText + ': ' + errorMessage, true);
                    this.isConnecting = false;
                }
            });
        },

        // New method to update UI after successful connection
        updateUIAfterConnection: function(walletAddress) {
            // Create elements for the updated UI
            const $container = $('.connect-wallet-container');
            
            // Format the wallet address with ellipsis in the middle if too long
            let displayAddress = walletAddress;
            if (walletAddress.length > 24) {
                displayAddress = walletAddress.substring(0, 10) + '...' + walletAddress.substring(walletAddress.length - 10);
            }
            
            // Create the updated UI HTML
            const connectedHTML = `
                <div id="wallet-connection-messages">
                    <div class="wallet-message success">
                        ${connectWalletObj.connectedMessage || 'Wallet successfully connected'}
                    </div>
                </div>
                <p>${connectWalletObj.alreadyConnectedText || 'Your wallet is already connected:'}</p>
                <div class="wallet-address-display" title="${walletAddress}">
                    ${walletAddress}
                </div>
                <div id="disconnect-wallet-container">
                    <button type="button" id="disconnect-wallet-button" class="unlink-wallet-button">
                        ${connectWalletObj.disconnectText || 'Disconnect Wallet'}
                    </button>
                    <div id="disconnect-wallet-status"></div>
                </div>
            `;
            
            // Hide the current UI elements smoothly
            $('#connect-wallet-button, #connect-wallet-status').fadeOut(300, function() {
                // Replace the container content with the connected state
                $container.find('p:first, #connect-wallet-button, #connect-wallet-status').remove();
                
                // Insert the new connected UI
                const $newContent = $(connectedHTML);
                $container.prepend($newContent);
                $newContent.hide().fadeIn(300);
                
                // Add disconnect handler
                this.attachDisconnectHandler();
            }.bind(this));
        },
        
        // Attach handler for disconnect button
        attachDisconnectHandler: function() {
            $('#disconnect-wallet-button').on('click', function(e) {
                e.preventDefault();
                
                // Show loading status
                $('#disconnect-wallet-status').text(connectWalletObj.disconnectingText || 'Disconnecting wallet...').addClass('loading');
                
                // Send AJAX request
                $.ajax({
                    url: connectWalletObj.ajaxurl,
                    type: 'POST',
                    data: {
                        action: 'metamask_unlink_wallet',
                        metamask_unlink_nonce: connectWalletObj.unlinkNonce
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#disconnect-wallet-status').text(response.data.message).removeClass('loading error').addClass('success');
                            // Reload the page after a short delay
                            setTimeout(function() {
                                window.location.href = response.data.redirect || window.location.href;
                            }, 1500);
                        } else {
                            $('#disconnect-wallet-status').text('Error: ' + (response.data ? response.data.message : 'Unknown error')).removeClass('loading').addClass('error');
                        }
                    },
                    error: function(xhr, status, error) {
                        $('#disconnect-wallet-status').text('Error: ' + error).removeClass('loading').addClass('error');
                    }
                });
            });
        }
    };

    // Wait for document ready and check for ethers.js
    $(document).ready(function() {
        debug('Document ready, checking for ethers.js', true);
        // Log important DOM information
        debug('connect-wallet-button exists: ' + ($('#connect-wallet-button').length > 0), true);
        debug('connect-wallet-status exists: ' + ($('#connect-wallet-status').length > 0), true);
        debug('ethereum object exists: ' + (typeof window.ethereum !== 'undefined'), true);
        debug('ethers object exists: ' + (typeof ethers !== 'undefined'), true);
        
        // Force direct connection if button exists and ethers is available
        if ($('#connect-wallet-button').length && typeof ethers !== 'undefined' && typeof window.ethereum !== 'undefined') {
            debug('All requirements met, initializing directly', true);
            ConnectWallet.init();
        } else {
            // Otherwise try the regular check with retries
            checkEthersAvailability();
        }
        
        // Add a direct click handler as a fallback
        $('body').on('click', '#connect-wallet-button', function(e) {
            debug('Fallback click handler activated', true);
            if (typeof ethers !== 'undefined' && typeof window.ethereum !== 'undefined') {
                e.preventDefault();
                const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');
                provider.send('eth_requestAccounts', [])
                    .then(function(accounts) {
                        debug('Accounts received via fallback: ' + accounts[0], true);
                        $('#connect-wallet-status').text('Connected: ' + accounts[0]);
                    })
                    .catch(function(error) {
                        debug('Error in fallback handler: ' + error.message, true);
                        $('#connect-wallet-status').text('Error: ' + error.message).addClass('error');
                    });
            } else {
                debug('Fallback handler - requirements not met', true);
                $('#connect-wallet-status').text('Error: MetaMask or ethers.js not available').addClass('error');
            }
        });
    });

})(jQuery); 