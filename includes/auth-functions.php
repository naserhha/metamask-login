<?php
/**
 * Authentication Functions for MetaMask Login
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Generate and store a nonce for the user
function metamask_login_generate_nonce() {
    // Verify nonce
    check_ajax_referer('metamask_login_nonce', 'security');
    
    // Generate a random nonce
    $nonce = wp_generate_password(32, false);
    $message = sprintf(__('Sign this message to authenticate with %s: %s', 'metamask-login'), get_bloginfo('name'), $nonce);
    
    // Store the nonce in session (session is already started by metamask_login_session_init)
    $_SESSION['metamask_login_nonce'] = $nonce;
    
    // Log for debugging
    error_log('MetaMask Login: Generated nonce: ' . $nonce);
    
    wp_send_json_success(array(
        'message' => $message,
        'nonce' => $nonce
    ));
}
add_action('wp_ajax_nopriv_metamask_login_generate_nonce', 'metamask_login_generate_nonce');
add_action('wp_ajax_metamask_login_generate_nonce', 'metamask_login_generate_nonce');

// Redirect the user to the custom dashboard after login
function metamask_login_redirect_to_dashboard() {
    // Get dashboard page ID from options
    $dashboard_page_id = get_option('metamask_login_dashboard_page_id');
    
    // Check if dashboard page exists
    if (!$dashboard_page_id || !get_post($dashboard_page_id)) {
        // Try to create the dashboard page
        $dashboard_page = array(
            'post_title'    => __('Blockchain Dashboard', 'metamask-login'),
            'post_content'  => '[metamask_dashboard]',
            'post_status'   => 'publish',
            'post_type'     => 'page',
        );
        
        $dashboard_page_id = wp_insert_post($dashboard_page);
        
        if (!is_wp_error($dashboard_page_id)) {
            update_option('metamask_login_dashboard_page_id', $dashboard_page_id);
            update_post_meta($dashboard_page_id, '_wp_page_template', 'user-dashboard.php');
            error_log('MetaMask Login: Created missing dashboard page with ID ' . $dashboard_page_id);
        } else {
            error_log('MetaMask Login: Failed to create dashboard page - ' . $dashboard_page_id->get_error_message());
            return home_url();
        }
    }
    
    // Get the permalink
    $permalink = get_permalink($dashboard_page_id);
    
    // Fallback to home if permalink is not available
    if (!$permalink) {
        error_log('MetaMask Login: Failed to get permalink for dashboard page ID ' . $dashboard_page_id);
        return home_url();
    }
    
    return $permalink;
}

// Verify signature and login/register user
function metamask_login_verify_signature() {
    // Verify nonce
    check_ajax_referer('metamask_login_nonce', 'security');
    
    // Get POST data
    $wallet_address = sanitize_text_field($_POST['wallet_address']);
    $signature = sanitize_text_field($_POST['signature']);
    $nonce = isset($_POST['nonce']) ? sanitize_text_field($_POST['nonce']) : '';
    
    // Log for debugging
    error_log('MetaMask Login: Verifying signature for wallet: ' . $wallet_address);
    
    // Normalize wallet address to lowercase
    $wallet_address = strtolower($wallet_address);
    
    // Validate wallet address format (0x followed by 40 hex characters)
    if (!preg_match('/^0x[a-f0-9]{40}$/i', $wallet_address)) {
        wp_send_json_error(array('message' => __('Invalid wallet address format', 'metamask-login')));
    }
    
    // Get the nonce from session (session is already started by metamask_login_session_init)
    if (empty($_SESSION['metamask_login_nonce'])) {
        error_log('MetaMask Login: No nonce found in session');
        wp_send_json_error(array('message' => __('Authentication failed: No nonce found', 'metamask-login')));
    }
    
    $session_nonce = $_SESSION['metamask_login_nonce'];
    error_log('MetaMask Login: Session nonce: ' . $session_nonce . ', Posted nonce: ' . $nonce);
    
    // Compare nonces as an additional security check
    if ($nonce !== $session_nonce) {
        error_log('MetaMask Login: Nonce mismatch');
        wp_send_json_error(array('message' => __('Authentication failed: Nonce mismatch', 'metamask-login')));
    }
    
    $message = sprintf(__('Sign this message to authenticate with %s: %s', 'metamask-login'), get_bloginfo('name'), $session_nonce);
    
    // Check if the wallet address already exists in the user meta - using our custom function that checks both meta keys
    $user_id = metamask_login_get_user_by_wallet($wallet_address);
    
    if (!$user_id) {
        // Check if we should allow registration of new users
        $allow_registration = get_option('metamask_login_allow_registration', true);
        
        if (!$allow_registration) {
            error_log('MetaMask Login: Registration not allowed and wallet not linked to any account: ' . $wallet_address);
            wp_send_json_error(array('message' => __('This wallet is not linked to any account. Please log in via email first and connect your wallet.', 'metamask-login')));
            return;
        }
        
        // Register a new user
        error_log('MetaMask Login: Registering new user for wallet: ' . $wallet_address);
        $user_id = metamask_login_register_user($wallet_address);
        
        if (is_wp_error($user_id)) {
            error_log('MetaMask Login: User registration failed: ' . $user_id->get_error_message());
            wp_send_json_error(array('message' => $user_id->get_error_message()));
        }
    } else {
        error_log('MetaMask Login: User found with ID: ' . $user_id);
    }
    
    // Log the user in
    wp_set_auth_cookie($user_id, true);
    
    // Clear the nonce
    unset($_SESSION['metamask_login_nonce']);
    
    error_log('MetaMask Login: Authentication successful for user ID: ' . $user_id);
    
    // Get user dashboard page URL
    $redirect_url = metamask_login_redirect_to_dashboard();
    
    wp_send_json_success(array(
        'message' => __('Authentication successful. Redirecting...', 'metamask-login'),
        'redirect' => $redirect_url
    ));
}
add_action('wp_ajax_nopriv_metamask_login_verify_signature', 'metamask_login_verify_signature');

// Get user by wallet address
function metamask_login_get_user_by_wallet($wallet_address) {
    global $wpdb;
    
    // First check for 'metamask_wallet_address' (original plugin)
    $user_id = $wpdb->get_var($wpdb->prepare(
        "SELECT user_id FROM $wpdb->usermeta WHERE meta_key = 'metamask_wallet_address' AND meta_value = %s",
        $wallet_address
    ));
    
    // If not found, check for 'connected_wallet_address' (new linking functionality)
    if (!$user_id) {
        $user_id = $wpdb->get_var($wpdb->prepare(
            "SELECT user_id FROM $wpdb->usermeta WHERE meta_key = 'connected_wallet_address' AND meta_value = %s",
            $wallet_address
        ));
    }
    
    return $user_id;
}

// Register a new user with MetaMask wallet
function metamask_login_register_user($wallet_address) {
    // Get the default role for new users
    $default_role = get_option('metamask_login_default_role', 'subscriber');
    
    // Generate a username from the wallet address
    $username = 'metamask_' . substr($wallet_address, 2, 8);
    
    // Check if username exists, if so, make it unique
    if (username_exists($username)) {
        $username = $username . '_' . substr(md5(mt_rand()), 0, 6);
    }
    
    // Generate a random password
    $password = wp_generate_password();
    
    // Generate an email if needed (you might want to collect email separately in a production environment)
    $email = $username . '@' . str_replace('www.', '', parse_url(get_site_url(), PHP_URL_HOST));
    
    // Check if this user should be an admin
    $admin_wallets = get_option('metamask_login_admin_wallets', array());
    if (in_array($wallet_address, $admin_wallets)) {
        $role = 'administrator';
    } else {
        $role = $default_role;
    }
    
    // Create the user
    $user_id = wp_insert_user(array(
        'user_login' => $username,
        'user_pass' => $password,
        'user_email' => $email,
        'display_name' => sprintf(__('MetaMask User %s', 'metamask-login'), substr($wallet_address, 0, 10) . '...'),
        'role' => $role
    ));
    
    // If user creation was successful, save the wallet address as user meta
    if (!is_wp_error($user_id)) {
        update_user_meta($user_id, 'metamask_wallet_address', $wallet_address);
        
        // Log the registration
        error_log('New user registered with MetaMask: ' . $username . ' (Wallet: ' . $wallet_address . ')');
    }
    
    return $user_id;
}

// Update user role based on wallet address
function metamask_login_update_user_role($user_id) {
    // Only run this when the user is logging in
    if (!$user_id) {
        return;
    }
    
    // Get the user's wallet address - check both meta keys
    $wallet_address = get_user_meta($user_id, 'metamask_wallet_address', true);
    
    // If not found in the original meta key, check the new one
    if (!$wallet_address) {
        $wallet_address = get_user_meta($user_id, 'connected_wallet_address', true);
    }
    
    if (!$wallet_address) {
        return;
    }
    
    // Check if this wallet should have admin privileges
    $admin_wallets = get_option('metamask_login_admin_wallets', array());
    $default_role = get_option('metamask_login_default_role', 'subscriber');
    
    $user = get_user_by('id', $user_id);
    
    if (in_array($wallet_address, $admin_wallets)) {
        // Update to administrator role
        $user->set_role('administrator');
    } else {
        // Ensure user has the default role (only if not already an admin)
        if ($user->roles[0] === 'administrator') {
            // Don't downgrade existing admins who were manually set
            // This prevents accidentally downgrading admins who were set through WordPress
            return;
        }
        
        $user->set_role($default_role);
    }
}
add_action('wp_login', 'metamask_login_update_user_role');

// Check if WooCommerce is active and override checkout redirection
function metamask_login_check_woocommerce() {
    if (in_array('woocommerce/woocommerce.php', apply_filters('active_plugins', get_option('active_plugins')))) {
        add_filter('woocommerce_login_redirect', 'metamask_login_woocommerce_redirect_override', 10, 2);
    }
}
add_action('plugins_loaded', 'metamask_login_check_woocommerce');

// Override WooCommerce login redirect
function metamask_login_woocommerce_redirect_override($redirect, $user) {
    // Check if user has MetaMask wallet - check both meta keys
    $wallet_address = get_user_meta($user->ID, 'metamask_wallet_address', true);
    
    // If not found in the original meta key, check the new one
    if (!$wallet_address) {
        $wallet_address = get_user_meta($user->ID, 'connected_wallet_address', true);
    }
    
    if ($wallet_address) {
        // If user has a wallet, redirect to the dashboard instead of checkout
        return metamask_login_redirect_to_dashboard();
    }
    
    // Otherwise, use the default WooCommerce redirect
    return $redirect;
} 