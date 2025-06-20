<?php
/**
 * Plugin Name: MetaMask Login
 * Plugin URI: https://example.com/metamask-login
 * Description: Login to WordPress using MetaMask or other Web3 wallets with admin wallet access control. Supports RTL and Persian language.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://example.com
 * Text Domain: metamask-login
 * Domain Path: /languages
 * Requires PHP: 7.2
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('METAMASK_LOGIN_VERSION', '1.0.0');
define('METAMASK_LOGIN_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('METAMASK_LOGIN_PLUGIN_URL', plugin_dir_url(__FILE__));

// Load plugin text domain for translations
function metamask_login_load_textdomain() {
    load_plugin_textdomain('metamask-login', false, basename(dirname(__FILE__)) . '/languages');
}
add_action('plugins_loaded', 'metamask_login_load_textdomain');

// Include required files
require_once METAMASK_LOGIN_PLUGIN_DIR . 'includes/admin-settings.php';
require_once METAMASK_LOGIN_PLUGIN_DIR . 'includes/class-dashboard-shortcode.php';

// Enqueue scripts and styles
function metamask_login_enqueue_scripts() {
    // Enqueue on login page
    if ($GLOBALS['pagenow'] === 'wp-login.php') {
        wp_enqueue_script('ethers', 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js', array(), '5.7.2', true);
        wp_enqueue_script('metamask-login', METAMASK_LOGIN_PLUGIN_URL . 'assets/js/metamask-login.js', array('jquery', 'ethers'), METAMASK_LOGIN_VERSION, true);
        
        // Add ajax url and nonce to script
        wp_localize_script('metamask-login', 'metamaskLoginObj', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('metamask_login_nonce'),
            'loginText' => __('ورود با دنیای بلاکچین توسط متامسک', 'metamask-login'),
            'connectingText' => __('در حال اتصال...', 'metamask-login'),
            'signingText' => __('لطفاً پیام را امضا کنید...', 'metamask-login'),
            'errorText' => __('خطا', 'metamask-login'),
            'noWalletText' => __('کیف پول Web3 یافت نشد. لطفاً متامسک را نصب کنید.', 'metamask-login')
        ));
        
        // Enqueue styles
        wp_enqueue_style('metamask-login', METAMASK_LOGIN_PLUGIN_URL . 'assets/css/metamask-login.css', array(), METAMASK_LOGIN_VERSION);
        
        // Enqueue RTL styles if needed
        if (is_rtl()) {
            wp_enqueue_style('metamask-login-rtl', METAMASK_LOGIN_PLUGIN_URL . 'assets/css/metamask-login-rtl.css', array('metamask-login'), METAMASK_LOGIN_VERSION);
        }
    }
}
add_action('login_enqueue_scripts', 'metamask_login_enqueue_scripts');

// Add login button to WordPress login form
function metamask_login_button() {
    // Check if RTL
    $rtl_class = is_rtl() ? 'rtl' : '';
    
    // Output login container
    echo '<div class="metamask-login-container ' . $rtl_class . '">';
    echo '<button type="button" id="metamask-login-button">ورود با متامسک</button>';
    echo '<div class="metamask-blockchain-tagline">دروازه‌ی بلاکچین</div>';
    echo '<div class="metamask-login-tagline">' . esc_html(get_option('metamask_login_tagline', 'اتصال به کیف پول برای ورود')) . '</div>';
    echo '<div class="metamask-login-status"></div>';
    echo '</div>';
}
add_action('login_form', 'metamask_login_button');

// Register activation hook
function metamask_login_activate() {
    // Create necessary database tables
    global $wpdb;
    
    $charset_collate = $wpdb->get_charset_collate();
    
    $activity_table = $wpdb->prefix . 'metamask_activity_log';
    
    $sql = "CREATE TABLE IF NOT EXISTS $activity_table (
        id bigint(20) NOT NULL AUTO_INCREMENT,
        user_id bigint(20) NOT NULL,
        type varchar(50) NOT NULL,
        description text NOT NULL,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY  (id),
        KEY user_id (user_id)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
    
    // Create required directories
    $dirs = array(
        'includes',
        'assets/js',
        'assets/css',
        'languages'
    );
    
    foreach ($dirs as $dir) {
        $path = METAMASK_LOGIN_PLUGIN_DIR . $dir;
        if (!file_exists($path)) {
            wp_mkdir_p($path);
        }
    }
    
    // Clear permalinks
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'metamask_login_activate');

// Register deactivation hook
function metamask_login_deactivate() {
    // Clear permalinks
    flush_rewrite_rules();
}
register_deactivation_hook(__FILE__, 'metamask_login_deactivate');

// Initialize session with improved security
function metamask_login_session_init() {
    if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
        $secure = is_ssl();
        $httponly = true;
        
        // Set SameSite cookie attribute with improved parameters
        if (PHP_VERSION_ID >= 70300) {
            session_set_cookie_params([
                'lifetime' => 0,
                'path' => COOKIEPATH,
                'domain' => COOKIE_DOMAIN,
                'secure' => $secure,
                'httponly' => $httponly,
                'samesite' => 'Strict'
            ]);
        } else {
            session_set_cookie_params(0, COOKIEPATH . '; samesite=Strict', COOKIE_DOMAIN, $secure, $httponly);
        }
        
        session_name('metamask_session');
        session_start();
    }
}
add_action('init', 'metamask_login_session_init', 1);

// Add the page template to the templates list
function metamask_login_add_page_template($templates) {
    $templates['templates/user-profile.php'] = __('User Profile with Wallet Connection', 'metamask-login');
    return $templates;
}
add_filter('theme_page_templates', 'metamask_login_add_page_template');

// Redirect to the plugin template file
function metamask_login_redirect_page_template($template) {
    global $post;
    
    if (is_page() && get_post_meta($post->ID, '_wp_page_template', true) === 'templates/user-profile.php') {
        $new_template = METAMASK_LOGIN_PLUGIN_DIR . 'templates/user-profile.php';
        if (file_exists($new_template)) {
            return $new_template;
        }
    }
    
    return $template;
}
add_filter('page_template', 'metamask_login_redirect_page_template');

// Create user profile page
function metamask_login_create_profile_page() {
    $profile_page_id = get_option('metamask_login_profile_page_id');
    
    if (!$profile_page_id || !get_post($profile_page_id)) {
        // Create the profile page if it doesn't exist
        $profile_page = array(
            'post_title'    => __('User Profile', 'metamask-login'),
            'post_content'  => '',
            'post_status'   => 'publish',
            'post_type'     => 'page',
        );
        
        $profile_page_id = wp_insert_post($profile_page);
        
        if (!is_wp_error($profile_page_id)) {
            update_option('metamask_login_profile_page_id', $profile_page_id);
            update_post_meta($profile_page_id, '_wp_page_template', 'templates/user-profile.php');
        }
    }
} 