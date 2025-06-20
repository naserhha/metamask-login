<?php
/**
 * MetaMask Admin Dashboard
 * 
 * Provides the UI for the admin blockchain dashboard
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

// Add admin menu page
add_action('admin_menu', 'metamask_add_admin_menu');

function metamask_add_admin_menu() {
    add_menu_page(
        __('Blockchain Dashboard', 'metamask-login'),
        __('Blockchain', 'metamask-login'),
        'manage_options',
        'blockchain-dashboard',
        'metamask_admin_dashboard_page',
        'dashicons-smartphone',
        30
    );
    
    add_submenu_page(
        'blockchain-dashboard',
        __('Settings', 'metamask-login'),
        __('Settings', 'metamask-login'),
        'manage_options',
        'blockchain-settings',
        'metamask_admin_settings_page'
    );
}

/**
 * Admin Dashboard Page
 */
function metamask_admin_dashboard_page() {
    // Get MetaMask Admin instance
    global $metamask_admin_login;
    
    // Check if wallet is connected
    $has_wallet = $metamask_admin_login->has_connected_wallet();
    $wallet_address = $metamask_admin_login->get_connected_wallet();
    $formatted_address = $metamask_admin_login->get_formatted_wallet_address();
    ?>
    <div class="wrap metamask-admin-dashboard">
        <h1><?php _e('Blockchain Dashboard', 'metamask-login'); ?></h1>
        
        <div class="metamask-dashboard-container">
            <div class="metamask-status-card">
                <div class="metamask-card-header">
                    <h2><?php _e('Wallet Connection', 'metamask-login'); ?></h2>
                </div>
                
                <div class="metamask-card-body">
                    <div id="metamask-status">
                        <?php if ($has_wallet): ?>
                            <div class="metamask-status-connected">
                                <span class="dashicons dashicons-yes-alt"></span>
                                <?php _e('Connected', 'metamask-login'); ?>
                            </div>
                            <div class="metamask-wallet-address">
                                <?php echo esc_html($formatted_address); ?>
                                <button class="copy-address button-secondary" data-address="<?php echo esc_attr($wallet_address); ?>">
                                    <span class="dashicons dashicons-clipboard"></span>
                                </button>
                            </div>
                        <?php else: ?>
                            <div class="metamask-status-disconnected">
                                <span class="dashicons dashicons-no"></span>
                                <?php _e('Not Connected', 'metamask-login'); ?>
                            </div>
                        <?php endif; ?>
                    </div>
                    
                    <div id="metamask-actions">
                        <?php if ($has_wallet): ?>
                            <button id="metamask-disconnect" class="button button-secondary">
                                <?php _e('Disconnect Wallet', 'metamask-login'); ?>
                            </button>
                        <?php else: ?>
                            <button id="metamask-connect" class="button button-primary">
                                <img src="<?php echo plugin_dir_url(dirname(__FILE__)) . 'assets/images/metamask-fox.svg'; ?>" alt="MetaMask" width="20" height="20">
                                <?php _e('Connect MetaMask', 'metamask-login'); ?>
                            </button>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            
            <div class="metamask-network-card">
                <div class="metamask-card-header">
                    <h2><?php _e('Network Information', 'metamask-login'); ?></h2>
                </div>
                
                <div class="metamask-card-body">
                    <div id="metamask-network-info">
                        <div class="metamask-network-item">
                            <span class="metamask-network-label"><?php _e('Current Network:', 'metamask-login'); ?></span>
                            <span id="metamask-current-network" class="metamask-network-value">
                                <?php echo $has_wallet ? 'Loading...' : '-'; ?>
                            </span>
                        </div>
                        
                        <div class="metamask-network-item">
                            <span class="metamask-network-label"><?php _e('Chain ID:', 'metamask-login'); ?></span>
                            <span id="metamask-chain-id" class="metamask-network-value">
                                <?php echo $has_wallet ? 'Loading...' : '-'; ?>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="metamask-balance-card">
                <div class="metamask-card-header">
                    <h2><?php _e('Account Balance', 'metamask-login'); ?></h2>
                </div>
                
                <div class="metamask-card-body">
                    <div id="metamask-balance-info">
                        <div class="metamask-balance-item">
                            <span class="metamask-balance-label"><?php _e('ETH Balance:', 'metamask-login'); ?></span>
                            <span id="metamask-eth-balance" class="metamask-balance-value">
                                <?php echo $has_wallet ? 'Loading...' : '-'; ?>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="metamask-dashboard-notice" id="metamask-notice" style="display: none;">
            <p></p>
        </div>
        
        <div class="metamask-dashboard-info">
            <h3><?php _e('About MetaMask Connection', 'metamask-login'); ?></h3>
            <p><?php _e('Connecting your MetaMask wallet allows you to manage blockchain transactions and view data directly from the WordPress admin panel.', 'metamask-login'); ?></p>
            <p><?php _e('When you connect your wallet, your address is securely stored in your user profile. Your private keys remain secure in your MetaMask wallet.', 'metamask-login'); ?></p>
        </div>
    </div>
    <?php
}

/**
 * Admin Settings Page
 */
function metamask_admin_settings_page() {
    global $metamask_admin_login;
    
    // Check if form is submitted
    if (isset($_POST['metamask_admin_settings_nonce']) && wp_verify_nonce($_POST['metamask_admin_settings_nonce'], 'metamask_admin_settings')) {
        // Save settings
        update_option('metamask_admin_wallet_required', isset($_POST['metamask_admin_wallet_required']) ? 1 : 0);
        
        // Handle network settings
        $networks = array();
        if (isset($_POST['network_id']) && is_array($_POST['network_id'])) {
            foreach ($_POST['network_id'] as $index => $network_id) {
                $network_name = isset($_POST['network_name'][$index]) ? sanitize_text_field($_POST['network_name'][$index]) : '';
                $network_enabled = isset($_POST['network_enabled'][$index]) ? 1 : 0;
                
                if (!empty($network_id) && !empty($network_name)) {
                    $networks[] = array(
                        'id' => sanitize_text_field($network_id),
                        'name' => $network_name,
                        'enabled' => $network_enabled
                    );
                }
            }
        }
        
        update_option('metamask_admin_networks', $networks);
        
        // Show success message
        add_settings_error(
            'metamask_admin_settings',
            'settings_updated',
            __('Settings saved successfully.', 'metamask-login'),
            'updated'
        );
    }
    
    // Get current settings
    $wallet_required = get_option('metamask_admin_wallet_required', false);
    $networks = get_option('metamask_admin_networks', array());
    ?>
    <div class="wrap metamask-admin-settings">
        <h1><?php _e('Blockchain Settings', 'metamask-login'); ?></h1>
        
        <?php settings_errors('metamask_admin_settings'); ?>
        
        <form method="post" action="">
            <?php wp_nonce_field('metamask_admin_settings', 'metamask_admin_settings_nonce'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Require Wallet Connection', 'metamask-login'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="metamask_admin_wallet_required" value="1" <?php checked($wallet_required, true); ?>>
                            <?php _e('Require admins to connect MetaMask wallet for admin access', 'metamask-login'); ?>
                        </label>
                        <p class="description"><?php _e('If enabled, admins must connect their MetaMask wallet before accessing admin pages.', 'metamask-login'); ?></p>
                    </td>
                </tr>
            </table>
            
            <h2><?php _e('Supported Networks', 'metamask-login'); ?></h2>
            <p><?php _e('Configure which blockchain networks are supported in your admin dashboard.', 'metamask-login'); ?></p>
            
            <table class="wp-list-table widefat fixed striped" id="metamask-networks-table">
                <thead>
                    <tr>
                        <th><?php _e('Network ID', 'metamask-login'); ?></th>
                        <th><?php _e('Network Name', 'metamask-login'); ?></th>
                        <th><?php _e('Enabled', 'metamask-login'); ?></th>
                        <th><?php _e('Actions', 'metamask-login'); ?></th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (empty($networks)): ?>
                        <tr>
                            <td colspan="4"><?php _e('No networks configured.', 'metamask-login'); ?></td>
                        </tr>
                    <?php else: ?>
                        <?php foreach ($networks as $index => $network): ?>
                            <tr>
                                <td>
                                    <input type="text" name="network_id[]" value="<?php echo esc_attr($network['id']); ?>" class="regular-text">
                                </td>
                                <td>
                                    <input type="text" name="network_name[]" value="<?php echo esc_attr($network['name']); ?>" class="regular-text">
                                </td>
                                <td>
                                    <input type="checkbox" name="network_enabled[]" value="<?php echo esc_attr($index); ?>" <?php checked($network['enabled'], true); ?>>
                                </td>
                                <td>
                                    <button type="button" class="button remove-network"><?php _e('Remove', 'metamask-login'); ?></button>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="4">
                            <button type="button" class="button button-secondary" id="add-network"><?php _e('Add Network', 'metamask-login'); ?></button>
                        </td>
                    </tr>
                </tfoot>
            </table>
            
            <p class="submit">
                <input type="submit" name="submit" id="submit" class="button button-primary" value="<?php _e('Save Changes', 'metamask-login'); ?>">
            </p>
        </form>
        
        <script>
            jQuery(document).ready(function($) {
                // Add network
                $('#add-network').on('click', function() {
                    var row = '<tr>' +
                        '<td><input type="text" name="network_id[]" value="" class="regular-text"></td>' +
                        '<td><input type="text" name="network_name[]" value="" class="regular-text"></td>' +
                        '<td><input type="checkbox" name="network_enabled[]" value="1" checked></td>' +
                        '<td><button type="button" class="button remove-network"><?php _e('Remove', 'metamask-login'); ?></button></td>' +
                        '</tr>';
                    
                    $('#metamask-networks-table tbody').append(row);
                });
                
                // Remove network
                $(document).on('click', '.remove-network', function() {
                    $(this).closest('tr').remove();
                });
            });
        </script>
    </div>
    <?php
} 