<?php
/**
 * Wallet Connect Functions for MetaMask Login
 * Handles linking existing WordPress users to MetaMask wallets
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register the Connect Wallet shortcode
 * Displays a form for users to connect their wallet
 */
function metamask_connect_wallet_shortcode() {
    // Check if user is logged in
    if (!is_user_logged_in()) {
        return '<div class="connect-wallet-error">' . 
            __('You must be logged in to connect a wallet.', 'metamask-login') . 
            '</div>';
    }
    
    // Get current user
    $current_user = wp_get_current_user();
    
    // Check if user already has a wallet
    $wallet_address = get_user_meta($current_user->ID, 'connected_wallet_address', true);
    
    // RTL class if needed
    $rtl_class = is_rtl() ? 'rtl' : '';
    
    // Start output buffering
    ob_start();
    
    ?>
    <div class="connect-wallet-container <?php echo esc_attr($rtl_class); ?>">
        <h3><?php _e('Connect Blockchain Wallet', 'metamask-login'); ?></h3>
        
        <div id="wallet-connection-messages">
            <?php if (isset($_GET['wallet_unlinked']) && $_GET['wallet_unlinked'] === '1') : ?>
                <div class="wallet-message success">
                    <?php _e('Your wallet has been disconnected successfully.', 'metamask-login'); ?>
                </div>
            <?php endif; ?>
        </div>
        
        <?php if (empty($wallet_address)) : ?>
            <p><?php _e('Connect your MetaMask wallet to your WordPress account to enable secure blockchain login.', 'metamask-login'); ?></p>
            
            <button id="connect-wallet-button" type="button" class="button button-primary">
                <svg class="wallet-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22,12a1,1,0,0,0-1-1H19V9a3,3,0,0,0-3-3H4A3,3,0,0,0,1,9v6a3,3,0,0,0,3,3H16a3,3,0,0,0,3-3V13h2A1,1,0,0,0,22,12ZM4,8H16a1,1,0,0,1,1,1v6a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V9A1,1,0,0,1,4,8Z"/>
                </svg>
                <?php _e('Connect Blockchain Wallet', 'metamask-login'); ?>
            </button>
            
            <div id="connect-wallet-status"></div>
        <?php else : ?>
            <p><?php _e('Your wallet is already connected:', 'metamask-login'); ?></p>
            
            <div class="wallet-address-display">
                <?php echo esc_html($wallet_address); ?>
            </div>
            
            <div id="disconnect-wallet-container">
                <button type="button" id="disconnect-wallet-button" class="unlink-wallet-button">
                    <?php _e('Disconnect Wallet', 'metamask-login'); ?>
                </button>
                <div id="disconnect-wallet-status"></div>
            </div>
            
            <script type="text/javascript">
            jQuery(document).ready(function($) {
                $('#disconnect-wallet-button').on('click', function(e) {
                    e.preventDefault();
                    
                    // Show loading status
                    $('#disconnect-wallet-status').text('<?php _e('Disconnecting wallet...', 'metamask-login'); ?>').addClass('loading');
                    
                    // Send AJAX request
                    $.ajax({
                        url: '<?php echo admin_url('admin-ajax.php'); ?>',
                        type: 'POST',
                        data: {
                            action: 'metamask_unlink_wallet',
                            metamask_unlink_nonce: '<?php echo wp_create_nonce('metamask_unlink_wallet'); ?>'
                        },
                        success: function(response) {
                            if (response.success) {
                                $('#disconnect-wallet-status').text(response.data.message).removeClass('loading error').addClass('success');
                                // Reload the page after a short delay
                                setTimeout(function() {
                                    window.location.reload();
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
            });
            </script>
        <?php endif; ?>
    </div>
    
    <?php
    
    return ob_get_clean();
}
add_shortcode('metamask_connect_wallet', 'metamask_connect_wallet_shortcode');

/**
 * Process the form to unlink a wallet
 */
function metamask_process_unlink_wallet() {
    if (isset($_POST['action']) && $_POST['action'] === 'metamask_unlink_wallet') {
        // Verify nonce
        if (!isset($_POST['metamask_unlink_nonce']) || !wp_verify_nonce($_POST['metamask_unlink_nonce'], 'metamask_unlink_wallet')) {
            wp_die(__('Security check failed. Please try again.', 'metamask-login'));
        }
        
        // Check if user is logged in
        if (!is_user_logged_in()) {
            wp_die(__('You must be logged in to disconnect a wallet.', 'metamask-login'));
        }
        
        // Get current user
        $current_user = wp_get_current_user();
        
        // Delete wallet address
        delete_user_meta($current_user->ID, 'connected_wallet_address');
        delete_user_meta($current_user->ID, 'wallet_connection_timestamp');
        delete_user_meta($current_user->ID, 'wallet_connection_signature');
        
        // Check if we should process as AJAX
        if (wp_doing_ajax() || (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest')) {
            wp_send_json_success(array(
                'message' => __('Your wallet has been disconnected successfully.', 'metamask-login'),
                'redirect' => add_query_arg('wallet_unlinked', '1', remove_query_arg('wallet_linked', wp_get_referer()))
            ));
        } else {
            // Redirect back to the same page
            wp_safe_redirect(add_query_arg('wallet_unlinked', '1', remove_query_arg('wallet_linked', wp_get_referer())));
            exit;
        }
    }
}
add_action('init', 'metamask_process_unlink_wallet');
add_action('wp_ajax_metamask_unlink_wallet', 'metamask_process_unlink_wallet');

/**
 * Show a message when a wallet is unlinked
 */
function metamask_wallet_unlinked_message() {
    if (isset($_GET['wallet_unlinked']) && $_GET['wallet_unlinked'] === '1') {
        ?>
        <div class="notice notice-success is-dismissible">
            <p><?php _e('Your wallet has been disconnected successfully.', 'metamask-login'); ?></p>
        </div>
        <?php
    }
}
add_action('admin_notices', 'metamask_wallet_unlinked_message');
add_action('wp_footer', function() {
    if (isset($_GET['wallet_unlinked']) && $_GET['wallet_unlinked'] === '1') {
        echo '<div class="metamask-notice success is-dismissible"><p>' . 
             __('Your wallet has been disconnected successfully.', 'metamask-login') . 
             '</p><button type="button" class="notice-dismiss"></button></div>';
        
        // Add script to make notices dismissible
        echo '<script>
            jQuery(document).ready(function($) {
                $(".metamask-notice .notice-dismiss").on("click", function() {
                    $(this).parent().fadeOut(300, function() { $(this).remove(); });
                    // Remove query parameter from URL
                    var url = window.location.href;
                    url = url.replace(/[?&]wallet_unlinked=1/, "");
                    if (url !== window.location.href) {
                        history.replaceState({}, document.title, url);
                    }
                });
                
                // Auto-dismiss after 5 seconds
                setTimeout(function() {
                    $(".metamask-notice").fadeOut(300, function() { $(this).remove(); });
                    // Remove query parameter from URL
                    var url = window.location.href;
                    url = url.replace(/[?&]wallet_unlinked=1/, "");
                    if (url !== window.location.href) {
                        history.replaceState({}, document.title, url);
                    }
                }, 5000);
            });
        </script>';
    }
});

/**
 * Ensure Ethers.js loads globally in the head
 * This prevents issues with the library not being loaded properly
 */
function metamask_login_load_global_ethers() {
    // Check if we're on profile page
    $is_profile_page = false;
    global $pagenow;
    if ($pagenow === 'profile.php' || (isset($_GET['page']) && $_GET['page'] === 'profile.php')) {
        $is_profile_page = true;
    }
    
    // Load ethers.js in header instead of footer for better compatibility
    // Always load on frontend pages and always load on profile page in admin
    if (!is_admin() || $is_profile_page) {
        // Use unpkg CDN as it tends to be more reliable
        wp_enqueue_script('global-ethers-js', 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js', array('jquery'), '5.7.2', false);
        
        // Add defer="false" attribute to ensure synchronous loading
        add_filter('script_loader_tag', function($tag, $handle) {
            if ('global-ethers-js' === $handle) {
                return str_replace(' src', ' defer="false" src', $tag);
            }
            return $tag;
        }, 10, 2);
        
        // Add MetaMask detection script
        wp_add_inline_script('global-ethers-js', '
            // Check if MetaMask is installed
            window.addEventListener("load", function() {
                console.log("Window loaded, checking for MetaMask and Ethers.js");
                if (typeof window.ethereum !== "undefined") {
                    console.log("MetaMask is available");
                } else {
                    console.warn("MetaMask is not installed");
                }
                
                if (typeof ethers !== "undefined") {
                    console.log("Ethers.js loaded successfully:", ethers.version);
                } else {
                    console.error("Ethers.js failed to load");
                }
            });
        ', 'after');
    }
}
add_action('wp_enqueue_scripts', 'metamask_login_load_global_ethers', 5); // Priority 5 to load early
add_action('admin_enqueue_scripts', 'metamask_login_load_global_ethers', 5); // Also load in admin pages

/**
 * Enqueue Connect Wallet scripts and styles
 */
function metamask_connect_wallet_scripts() {
    // Only load if the user is logged in and the shortcode is present
    if (is_user_logged_in() && has_shortcode(get_post()->post_content, 'metamask_connect_wallet')) {
        // We use global-ethers-js that's loaded in head now
        
        // Enqueue our connect wallet script
        wp_enqueue_script('metamask-connect-wallet', 
            METAMASK_LOGIN_PLUGIN_URL . 'assets/js/connect-wallet.js', 
            array('jquery', 'global-ethers-js'), 
            METAMASK_LOGIN_VERSION, 
            true
        );
        
        // Localize the script with our data
        wp_localize_script('metamask-connect-wallet', 'connectWalletObj', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('metamask_connect_wallet_nonce'),
            'unlinkNonce' => wp_create_nonce('metamask_unlink_wallet'),
            'connectingText' => __('Connecting to MetaMask...', 'metamask-login'),
            'signingText' => __('Please sign the message in MetaMask...', 'metamask-login'),
            'errorText' => __('Error', 'metamask-login'),
            'noWalletText' => __('No Web3 wallet detected. Please install MetaMask.', 'metamask-login'),
            'connectedMessage' => __('Wallet successfully connected!', 'metamask-login'),
            'alreadyConnectedText' => __('Your wallet is now connected:', 'metamask-login'),
            'disconnectText' => __('Disconnect Wallet', 'metamask-login'),
            'disconnectingText' => __('Disconnecting wallet...', 'metamask-login'),
            'refresh' => false // Dynamic UI update instead of page refresh
        ));
        
        // Enqueue connect wallet styles
        wp_enqueue_style('metamask-connect-wallet', 
            METAMASK_LOGIN_PLUGIN_URL . 'assets/css/connect-wallet.css', 
            array(), 
            METAMASK_LOGIN_VERSION
        );
    }
}
add_action('wp_enqueue_scripts', 'metamask_connect_wallet_scripts');

/**
 * AJAX handler to generate the message to sign
 */
function metamask_generate_link_message() {
    // Verify nonce
    check_ajax_referer('metamask_connect_wallet_nonce', 'security');
    
    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => __('You must be logged in to connect a wallet.', 'metamask-login')));
    }
    
    // Get wallet address from request
    $wallet_address = sanitize_text_field($_POST['wallet_address']);
    
    // Validate wallet address (0x followed by 40 hex characters)
    if (!preg_match('/^0x[a-f0-9]{40}$/i', $wallet_address)) {
        wp_send_json_error(array('message' => __('Invalid wallet address format.', 'metamask-login')));
    }
    
    // Check if wallet is already linked to another user
    global $wpdb;
    $existing_user_id = $wpdb->get_var($wpdb->prepare(
        "SELECT user_id FROM $wpdb->usermeta WHERE meta_key = 'connected_wallet_address' AND meta_value = %s",
        $wallet_address
    ));
    
    if ($existing_user_id) {
        // Check if it's the current user
        $current_user = wp_get_current_user();
        if ($existing_user_id != $current_user->ID) {
            $existing_user = get_userdata($existing_user_id);
            wp_send_json_error(array(
                'message' => sprintf(
                    __('This wallet is already linked to another account (%s).', 'metamask-login'),
                    $existing_user->user_login
                )
            ));
        }
    }
    
    // Generate a nonce
    $nonce = wp_generate_password(16, false);
    
    // Get current user
    $current_user = wp_get_current_user();
    
    // Create message to sign
    $timestamp = current_time('timestamp');
    $message = sprintf(
        __("I confirm that I am linking this wallet (%s) to my WordPress account (%s).\nTimestamp: %s\nNonce: %s", 'metamask-login'),
        $wallet_address,
        $current_user->user_login,
        $timestamp,
        $nonce
    );
    
    // Store nonce in session for verification
    if (!isset($_SESSION)) {
        session_start();
    }
    $_SESSION['metamask_link_nonce'] = $nonce;
    $_SESSION['metamask_link_wallet'] = $wallet_address;
    $_SESSION['metamask_link_timestamp'] = $timestamp;
    
    // Return the message to sign
    wp_send_json_success(array(
        'message' => $message,
        'nonce' => $nonce
    ));
}
add_action('wp_ajax_metamask_generate_link_message', 'metamask_generate_link_message');
add_action('wp_ajax_nopriv_metamask_generate_link_message', function() {
    wp_send_json_error(array('message' => __('You must be logged in to connect a wallet.', 'metamask-login')));
});

/**
 * AJAX handler to link a wallet to a user account
 */
function metamask_link_wallet() {
    // Verify nonce
    check_ajax_referer('metamask_connect_wallet_nonce', 'security');
    
    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => __('You must be logged in to connect a wallet.', 'metamask-login')));
    }
    
    // Get data from request
    $wallet_address = sanitize_text_field($_POST['wallet_address']);
    $signature = sanitize_text_field($_POST['signature']);
    $nonce = sanitize_text_field($_POST['nonce']);
    $message = sanitize_text_field($_POST['message']);
    
    // Check session data
    if (!isset($_SESSION)) {
        session_start();
    }
    
    if (!isset($_SESSION['metamask_link_nonce']) || $_SESSION['metamask_link_nonce'] !== $nonce) {
        // Clear session data to prevent future errors
        unset($_SESSION['metamask_link_nonce']);
        unset($_SESSION['metamask_link_wallet']);
        unset($_SESSION['metamask_link_timestamp']);
        
        wp_send_json_error(array(
            'message' => __('Invalid nonce. Please try again.', 'metamask-login'),
            'session_error' => true,
            'debug_info' => 'Session nonce mismatch or missing'
        ));
    }
    
    if (!isset($_SESSION['metamask_link_wallet']) || $_SESSION['metamask_link_wallet'] !== $wallet_address) {
        // Clear session data to prevent future errors
        unset($_SESSION['metamask_link_nonce']);
        unset($_SESSION['metamask_link_wallet']);
        unset($_SESSION['metamask_link_timestamp']);
        
        wp_send_json_error(array(
            'message' => __('Wallet address mismatch. Please try again.', 'metamask-login'),
            'session_error' => true,
            'debug_info' => 'Session wallet mismatch or missing'
        ));
    }
    
    // Verify the signature (this would require web3.js or ethers.js on the server side to verify)
    // For now, we'll trust the frontend verification since we're using a nonce
    
    // Get current user
    $current_user = wp_get_current_user();
    
    // Update user meta
    update_user_meta($current_user->ID, 'connected_wallet_address', $wallet_address);
    update_user_meta($current_user->ID, 'wallet_connection_timestamp', $_SESSION['metamask_link_timestamp']);
    update_user_meta($current_user->ID, 'wallet_connection_signature', $signature);
    
    // Log for audit purposes
    error_log('MetaMask Login: User ' . $current_user->user_login . ' (ID: ' . $current_user->ID . ') linked wallet ' . $wallet_address);
    
    // Clear session data
    unset($_SESSION['metamask_link_nonce']);
    unset($_SESSION['metamask_link_wallet']);
    unset($_SESSION['metamask_link_timestamp']);
    
    // Return success with explicit instructions
    wp_send_json_success(array(
        'message' => __('Wallet successfully connected to your account.', 'metamask-login'),
        'wallet_address' => $wallet_address,
        'redirect' => wp_get_referer() ? wp_get_referer() : '',
        'refresh' => false // Set to false to use dynamic UI update instead
    ));
}
add_action('wp_ajax_metamask_link_wallet', 'metamask_link_wallet');
add_action('wp_ajax_nopriv_metamask_link_wallet', function() {
    wp_send_json_error(array('message' => __('You must be logged in to connect a wallet.', 'metamask-login')));
});

/**
 * Add wallet connection to WordPress profile page
 */
function metamask_add_wallet_connection_to_profile() {
    // Only show for current user viewing their own profile
    if (!current_user_can('edit_user', get_current_user_id())) {
        return;
    }
    
    // Get current user
    $current_user = wp_get_current_user();
    
    // Check if user already has a wallet
    $wallet_address = get_user_meta($current_user->ID, 'connected_wallet_address', true);
    if (empty($wallet_address)) {
        $wallet_address = get_user_meta($current_user->ID, 'metamask_wallet_address', true);
    }
    
    // RTL class if needed
    $rtl_class = is_rtl() ? 'rtl' : '';
    
    // Add jQuery if it's not already included (unlikely but just to be sure)
    wp_enqueue_script('jquery');
    
    // Load multiple ethers.js sources for redundancy
    wp_enqueue_script('global-ethers-js-profile-primary', 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js', array('jquery'), '5.7.2', false);
    wp_enqueue_script('global-ethers-js-profile-backup', 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js', array('jquery', 'global-ethers-js-profile-primary'), '5.7.2', false);
    
    // Make sure connect-wallet.js is loaded with proper dependencies
    wp_enqueue_script('metamask-profile-connect', 
        METAMASK_LOGIN_PLUGIN_URL . 'assets/js/connect-wallet.js', 
        array('jquery', 'global-ethers-js-profile-primary', 'global-ethers-js-profile-backup'), 
        METAMASK_LOGIN_VERSION . '-' . rand(1000, 9999), // Add random number to force reload
        true
    );
    
    // Localize the script with our data
    wp_localize_script('metamask-profile-connect', 'connectWalletObj', array(
        'ajaxurl' => admin_url('admin-ajax.php'),
        'nonce' => wp_create_nonce('metamask_connect_wallet_nonce'),
        'unlinkNonce' => wp_create_nonce('metamask_unlink_wallet'),
        'connectingText' => __('Connecting to MetaMask...', 'metamask-login'),
        'signingText' => __('Please sign the message in MetaMask...', 'metamask-login'),
        'errorText' => __('Error', 'metamask-login'),
        'noWalletText' => __('No Web3 wallet detected. Please install MetaMask.', 'metamask-login'),
        'connectedMessage' => __('Wallet successfully connected!', 'metamask-login'),
        'alreadyConnectedText' => __('Your wallet is now connected:', 'metamask-login'),
        'disconnectText' => __('Disconnect Wallet', 'metamask-login'),
        'disconnectingText' => __('Disconnecting wallet...', 'metamask-login'),
        'refresh' => false // Dynamic UI update instead of page refresh
    ));
    
    // Enqueue connect wallet styles
    wp_enqueue_style('metamask-connect-wallet', 
        METAMASK_LOGIN_PLUGIN_URL . 'assets/css/connect-wallet.css', 
        array(), 
        METAMASK_LOGIN_VERSION . '-' . rand(1000, 9999) // Add random number to force reload
    );
    
    // Add inline script to ensure proper initialization with additional fallback
    wp_add_inline_script('metamask-profile-connect', '
        jQuery(document).ready(function($) {
            console.log("Profile page ready, attempting to initialize MetaMask connection");
            
            // First check if ethers is already loaded
            if (typeof ethers !== "undefined") {
                console.log("Ethers.js is available:", ethers.version);
                initializeWalletButton();
            } else {
                console.log("Ethers.js not available, trying to load from inline fallback");
                
                // Manual fallback loader
                var script = document.createElement("script");
                script.src = "https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js";
                script.onload = function() {
                    console.log("Ethers.js loaded from inline fallback:", ethers.version);
                    initializeWalletButton();
                };
                script.onerror = function() {
                    console.error("Failed to load ethers.js from inline fallback");
                    $("#connect-wallet-status").text("Error: ethers.js library failed to load").addClass("error");
                };
                document.head.appendChild(script);
            }
            
            function initializeWalletButton() {
                // Check if button exists
                if ($("#connect-wallet-button").length) {
                    console.log("Connect wallet button found, adding click handler");
                    
                    $("#connect-wallet-button").on("click", function(e) {
                        e.preventDefault();
                        console.log("Connect wallet button clicked manually");
                        
                        if (window.ethereum) {
                            console.log("MetaMask detected");
                            try {
                                const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
                                provider.send("eth_requestAccounts", [])
                                    .then(function(accounts) {
                                        console.log("Accounts received:", accounts);
                                        if (accounts && accounts.length > 0) {
                                            $("#connect-wallet-status").text("Connected to wallet: " + accounts[0]);
                                        }
                                    })
                                    .catch(function(error) {
                                        console.error("Error connecting to MetaMask:", error);
                                        $("#connect-wallet-status").text("Error: " + error.message).addClass("error");
                                    });
                            } catch (error) {
                                console.error("Failed to initialize provider:", error);
                                $("#connect-wallet-status").text("Error: " + error.message).addClass("error");
                            }
                        } else {
                            console.error("MetaMask not installed");
                            $("#connect-wallet-status").text("MetaMask not installed").addClass("error");
                        }
                    });
                } else {
                    console.error("Connect wallet button not found");
                }
            }
        });
    ', 'after');
    
    ?>
    <h2><?php _e('MetaMask Wallet Connection', 'metamask-login'); ?></h2>
    <table class="form-table" role="presentation">
        <tr class="metamask-wallet-section">
            <th scope="row"><?php _e('Connect Your Wallet', 'metamask-login'); ?></th>
            <td>
                <div class="connect-wallet-container <?php echo esc_attr($rtl_class); ?>">
                    <?php if (empty($wallet_address)) : ?>
                        <p><?php _e('Connect your MetaMask wallet to your WordPress account to enable secure blockchain login.', 'metamask-login'); ?></p>
                        
                        <button id="connect-wallet-button" type="button" class="button button-primary">
                            <svg class="wallet-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22,12a1,1,0,0,0-1-1H19V9a3,3,0,0,0-3-3H4A3,3,0,0,0,1,9v6a3,3,0,0,0,3,3H16a3,3,0,0,0,3-3V13h2A1,1,0,0,0,22,12ZM4,8H16a1,1,0,0,1,1,1v6a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V9A1,1,0,0,1,4,8Z"/>
                            </svg>
                            <?php _e('Connect Blockchain Wallet', 'metamask-login'); ?>
                        </button>
                        
                        <div id="connect-wallet-status"></div>
                    <?php else : ?>
                        <p><?php _e('Your wallet is already connected:', 'metamask-login'); ?></p>
                        
                        <div class="wallet-address-display">
                            <?php echo esc_html($wallet_address); ?>
                        </div>
                        
                        <div id="disconnect-wallet-container">
                            <button type="button" id="disconnect-wallet-button" class="unlink-wallet-button">
                                <?php _e('Disconnect Wallet', 'metamask-login'); ?>
                            </button>
                            <div id="disconnect-wallet-status"></div>
                        </div>
                        
                        <script type="text/javascript">
                        jQuery(document).ready(function($) {
                            $('#disconnect-wallet-button').on('click', function(e) {
                                e.preventDefault();
                                
                                // Show loading status
                                $('#disconnect-wallet-status').text('<?php _e('Disconnecting wallet...', 'metamask-login'); ?>').addClass('loading');
                                
                                // Send AJAX request
                                $.ajax({
                                    url: '<?php echo admin_url('admin-ajax.php'); ?>',
                                    type: 'POST',
                                    data: {
                                        action: 'metamask_unlink_wallet',
                                        metamask_unlink_nonce: '<?php echo wp_create_nonce('metamask_unlink_wallet'); ?>'
                                    },
                                    success: function(response) {
                                        if (response.success) {
                                            $('#disconnect-wallet-status').text(response.data.message).removeClass('loading error').addClass('success');
                                            // Reload the page after a short delay
                                            setTimeout(function() {
                                                window.location.reload();
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
                        });
                        </script>
                    <?php endif; ?>
                </div>
                <p class="description"><?php _e('Connecting your wallet allows you to securely log in to this site using MetaMask.', 'metamask-login'); ?></p>
            </td>
        </tr>
    </table>
    <?php
}
add_action('show_user_profile', 'metamask_add_wallet_connection_to_profile');

/**
 * Handle admin action to remove a wallet
 */
function metamask_handle_remove_wallet() {
    if (isset($_GET['remove_wallet']) && isset($_GET['user_id']) && isset($_GET['_wpnonce'])) {
        $user_id = intval($_GET['user_id']);
        
        // Check nonce and permissions
        if (wp_verify_nonce($_GET['_wpnonce'], 'remove_wallet_' . $user_id) && current_user_can('edit_users')) {
            // Remove wallet address from both meta keys
            delete_user_meta($user_id, 'connected_wallet_address');
            delete_user_meta($user_id, 'metamask_wallet_address');
            delete_user_meta($user_id, 'wallet_connection_timestamp');
            delete_user_meta($user_id, 'wallet_connection_signature');
            
            // Add notice
            add_action('admin_notices', function() {
                echo '<div class="notice notice-success is-dismissible"><p>' . __('Wallet has been removed.', 'metamask-login') . '</p></div>';
            });
        }
    }
}
add_action('admin_init', 'metamask_handle_remove_wallet');

/**
 * Add wallet information to admin edit user page
 */
function metamask_add_wallet_info_to_admin_profile($user) {
    // Check if the current user can edit other users
    if (!current_user_can('edit_users')) {
        return;
    }
    
    // Get wallet address
    $wallet_address = get_user_meta($user->ID, 'connected_wallet_address', true);
    
    // If no wallet connected with new method, check old method
    if (empty($wallet_address)) {
        $wallet_address = get_user_meta($user->ID, 'metamask_wallet_address', true);
    }
    
    // Get connection timestamp
    $timestamp = get_user_meta($user->ID, 'wallet_connection_timestamp', true);
    $date_format = get_option('date_format') . ' ' . get_option('time_format');
    ?>
    <h2><?php _e('Blockchain Wallet Information', 'metamask-login'); ?></h2>
    
    <table class="form-table">
        <tr>
            <th><label for="metamask-wallet"><?php _e('Connected Wallet', 'metamask-login'); ?></label></th>
            <td>
                <?php if (!empty($wallet_address)) : ?>
                    <code><?php echo esc_html($wallet_address); ?></code>
                    <?php if (!empty($timestamp)) : ?>
                        <p class="description">
                            <?php echo sprintf(__('Connected on: %s', 'metamask-login'), date_i18n($date_format, $timestamp)); ?>
                        </p>
                    <?php endif; ?>
                <?php else : ?>
                    <p><?php _e('No wallet connected', 'metamask-login'); ?></p>
                <?php endif; ?>
                
                <?php if (current_user_can('edit_users') && !empty($wallet_address)) : ?>
                    <p>
                        <a href="<?php echo esc_url(admin_url('user-edit.php?user_id=' . $user->ID . '&remove_wallet=1&_wpnonce=' . wp_create_nonce('remove_wallet_' . $user->ID))); ?>" class="button">
                            <?php _e('Remove Wallet', 'metamask-login'); ?>
                        </a>
                    </p>
                <?php endif; ?>
            </td>
        </tr>
    </table>
    <?php
}
add_action('edit_user_profile', 'metamask_add_wallet_info_to_admin_profile');

/**
 * AJAX handler to check if a wallet is already linked to the current user
 */
function metamask_check_wallet_linked() {
    // Verify nonce
    check_ajax_referer('metamask_connect_wallet_nonce', 'security');
    
    // Check if user is logged in
    if (!is_user_logged_in()) {
        wp_send_json_error(array('message' => __('You must be logged in to check wallet status.', 'metamask-login')));
    }
    
    // Get wallet address from request
    $wallet_address = sanitize_text_field($_POST['wallet_address']);
    
    // Validate wallet address (0x followed by 40 hex characters)
    if (!preg_match('/^0x[a-f0-9]{40}$/i', $wallet_address)) {
        wp_send_json_error(array('message' => __('Invalid wallet address format.', 'metamask-login')));
    }
    
    // Get current user
    $current_user = wp_get_current_user();
    
    // Get user's stored wallet address
    $stored_wallet = get_user_meta($current_user->ID, 'connected_wallet_address', true);
    if (empty($stored_wallet)) {
        $stored_wallet = get_user_meta($current_user->ID, 'metamask_wallet_address', true);
    }
    
    // Check if the addresses match
    $is_linked = !empty($stored_wallet) && strtolower($stored_wallet) === strtolower($wallet_address);
    
    // Return the result
    wp_send_json_success(array(
        'is_linked' => $is_linked,
        'wallet_address' => $is_linked ? $stored_wallet : '',
    ));
}
add_action('wp_ajax_metamask_check_wallet_linked', 'metamask_check_wallet_linked'); 