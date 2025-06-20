<?php
/**
 * MetaMask Login for WordPress Admin
 * 
 * Handles MetaMask wallet integration for WordPress admin users
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

class MetaMask_Admin_Login {
    private static $instance = null;
    private $admin_connected_wallet = null;
    private $admin_networks = array();
    private $admin_wallet_required = false;

    /**
     * Get the singleton instance
     */
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    private function __construct() {
        // Register activation hook
        register_activation_hook(__FILE__, array($this, 'activation'));
        
        // Set default networks
        $this->set_default_networks();

        // Initialize 
        add_action('init', array($this, 'init'));
        
        // Admin init
        add_action('admin_init', array($this, 'admin_init'));
        
        // Add Scripts and Styles for admin
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        
        // Add Ajax handlers
        add_action('wp_ajax_metamask_admin_connect_wallet', array($this, 'ajax_connect_wallet'));
        add_action('wp_ajax_metamask_admin_disconnect_wallet', array($this, 'ajax_disconnect_wallet'));
        
        // Check if wallet is required for admin
        $this->admin_wallet_required = get_option('metamask_admin_wallet_required', false);
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
    }

    /**
     * Plugin activation
     */
    public function activation() {
        // Add default settings
        add_option('metamask_admin_wallet_required', false);
        add_option('metamask_admin_networks', $this->admin_networks);
    }

    /**
     * Set default networks
     */
    private function set_default_networks() {
        $this->admin_networks = array(
            array(
                'id' => '1',
                'name' => 'Ethereum Mainnet',
                'enabled' => true
            ),
            array(
                'id' => '5',
                'name' => 'Goerli Testnet',
                'enabled' => true
            ),
            array(
                'id' => '11155111',
                'name' => 'Sepolia Testnet',
                'enabled' => true
            ),
            array(
                'id' => '137',
                'name' => 'Polygon Mainnet',
                'enabled' => true
            ),
            array(
                'id' => '80001',
                'name' => 'Mumbai Testnet',
                'enabled' => true
            )
        );
    }

    /**
     * Initialize the plugin
     */
    public function init() {
        // Load text domain
        load_plugin_textdomain('metamask-login', false, dirname(plugin_basename(__FILE__)) . '/languages');
        
        // Check for connected wallet
        if (is_admin() && is_user_logged_in()) {
            $user_id = get_current_user_id();
            $this->admin_connected_wallet = get_user_meta($user_id, 'metamask_connected_wallet', true);
        }
    }

    /**
     * Admin init
     */
    public function admin_init() {
        // Check if admin should be restricted
        if ($this->admin_wallet_required && empty($this->admin_connected_wallet) && is_admin() && !wp_doing_ajax()) {
            // Don't restrict certain admin pages
            $allowed_pages = array(
                'profile.php',
                'admin.php',
            );
            
            $current_page = isset($_SERVER['REQUEST_URI']) ? basename($_SERVER['REQUEST_URI']) : '';
            foreach ($allowed_pages as $page) {
                if (strpos($current_page, $page) !== false) {
                    return;
                }
            }
            
            // Add admin notice for blockchain dashboard
            if (isset($_GET['page']) && $_GET['page'] === 'blockchain-dashboard') {
                return;
            }
            
            // Redirect to blockchain dashboard
            wp_redirect(admin_url('admin.php?page=blockchain-dashboard'));
            exit;
        }
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('metamask_admin_settings', 'metamask_admin_wallet_required');
        register_setting('metamask_admin_settings', 'metamask_admin_networks');
    }

    /**
     * Enqueue admin scripts and styles
     */
    public function enqueue_admin_assets($hook) {
        // Only load on admin pages we need
        if (!in_array($hook, array('toplevel_page_blockchain-dashboard', 'profile.php'))) {
            return;
        }
        
        // Ethers.js for MetaMask integration
        wp_enqueue_script('ethers-js', 'https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js', array(), '5.7.2', true);
        
        // Admin dashboard JS
        wp_enqueue_script(
            'metamask-admin-dashboard',
            plugin_dir_url(__FILE__) . '../assets/js/admin-dashboard.js',
            array('jquery', 'ethers-js'),
            '1.0.0',
            true
        );
        
        // Admin dashboard CSS
        wp_enqueue_style(
            'metamask-admin-dashboard',
            plugin_dir_url(__FILE__) . '../assets/css/admin-dashboard.css',
            array(),
            '1.0.0'
        );
        
        // Localize script
        wp_localize_script(
            'metamask-admin-dashboard',
            'metamaskAdminData',
            array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('metamask_admin_nonce'),
                'adminID' => get_current_user_id(),
                'connectedWallet' => $this->admin_connected_wallet,
                'networks' => get_option('metamask_admin_networks', $this->admin_networks),
                'walletRequired' => $this->admin_wallet_required,
                'connectingText' => __('Connecting to MetaMask...', 'metamask-login'),
                'noWalletText' => __('MetaMask is not installed. Please install the MetaMask extension.', 'metamask-login'),
                'errorText' => __('Error', 'metamask-login')
            )
        );
    }

    /**
     * Ajax handler for connecting admin wallet
     */
    public function ajax_connect_wallet() {
        check_ajax_referer('metamask_admin_nonce', 'security');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to connect a wallet.', 'metamask-login')
            ));
        }
        
        // Get wallet address
        $wallet_address = isset($_POST['wallet_address']) ? sanitize_text_field($_POST['wallet_address']) : '';
        $signature = isset($_POST['signature']) ? sanitize_text_field($_POST['signature']) : '';
        $message = isset($_POST['message']) ? sanitize_textarea_field($_POST['message']) : '';
        
        if (empty($wallet_address) || empty($signature) || empty($message)) {
            wp_send_json_error(array(
                'message' => __('Missing required data for wallet connection.', 'metamask-login')
            ));
        }
        
        // Store wallet address for user
        $user_id = get_current_user_id();
        update_user_meta($user_id, 'metamask_connected_wallet', $wallet_address);
        update_user_meta($user_id, 'metamask_wallet_signature', $signature);
        update_user_meta($user_id, 'metamask_wallet_connection_time', current_time('timestamp'));
        
        // Send success response
        wp_send_json_success(array(
            'message' => __('Wallet connected successfully.', 'metamask-login'),
            'wallet' => $wallet_address
        ));
    }

    /**
     * Ajax handler for disconnecting admin wallet
     */
    public function ajax_disconnect_wallet() {
        check_ajax_referer('metamask_admin_nonce', 'security');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error(array(
                'message' => __('You do not have permission to disconnect a wallet.', 'metamask-login')
            ));
        }
        
        // Remove wallet address for user
        $user_id = get_current_user_id();
        delete_user_meta($user_id, 'metamask_connected_wallet');
        delete_user_meta($user_id, 'metamask_wallet_signature');
        delete_user_meta($user_id, 'metamask_wallet_connection_time');
        
        // Send success response
        wp_send_json_success(array(
            'message' => __('Wallet disconnected successfully.', 'metamask-login')
        ));
    }

    /**
     * Check if admin has connected wallet
     */
    public function has_connected_wallet() {
        return !empty($this->admin_connected_wallet);
    }

    /**
     * Get admin connected wallet
     */
    public function get_connected_wallet() {
        return $this->admin_connected_wallet;
    }

    /**
     * Get formatted wallet address (shortened)
     */
    public function get_formatted_wallet_address() {
        if (empty($this->admin_connected_wallet)) {
            return '';
        }
        
        // Format as 0x1234...5678
        $wallet = $this->admin_connected_wallet;
        return substr($wallet, 0, 6) . '...' . substr($wallet, -4);
    }
}

// Initialize the plugin
$metamask_admin_login = MetaMask_Admin_Login::get_instance();

// Include admin dashboard UI
require_once(plugin_dir_path(__FILE__) . 'admin-dashboard.php'); 