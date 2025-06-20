<?php
/**
 * Dashboard Setup Class
 * 
 * Handles dashboard initialization and redirections
 */

if (!defined('ABSPATH')) {
    exit;
}

class MetaMask_Dashboard_Setup {
    /**
     * Constructor
     */
    public function __construct() {
        // Add WooCommerce integration
        add_action('init', array($this, 'woocommerce_integration'));
        
        // Add menu items
        add_action('admin_menu', array($this, 'add_menu_items'));
        
        // Add dashboard widget
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
        
        // Add MetaMask endpoint to WooCommerce My Account
        add_action('init', array($this, 'add_metamask_endpoint'));
        add_filter('woocommerce_account_menu_items', array($this, 'add_metamask_menu_item'));
        add_action('woocommerce_account_metamask-wallet_endpoint', array($this, 'metamask_wallet_content'));
        
        // Modify user profile fields
        add_action('show_user_profile', array($this, 'add_metamask_profile_fields'));
        add_action('edit_user_profile', array($this, 'add_metamask_profile_fields'));
        
        // Save custom profile fields
        add_action('personal_options_update', array($this, 'save_metamask_profile_fields'));
        add_action('edit_user_profile_update', array($this, 'save_metamask_profile_fields'));
    }

    /**
     * WooCommerce Integration
     */
    public function woocommerce_integration() {
        if (class_exists('WooCommerce')) {
            // Add MetaMask fields to WooCommerce registration
            add_action('woocommerce_register_form', array($this, 'add_metamask_registration_fields'));
            add_action('woocommerce_created_customer', array($this, 'save_metamask_registration_fields'));
            
            // Add MetaMask fields to WooCommerce edit account
            add_action('woocommerce_edit_account_form', array($this, 'add_metamask_account_fields'));
            add_action('woocommerce_save_account_details', array($this, 'save_metamask_account_fields'));
        }
    }

    /**
     * Add MetaMask endpoint to WooCommerce My Account
     */
    public function add_metamask_endpoint() {
        add_rewrite_endpoint('metamask-wallet', EP_ROOT | EP_PAGES);
    }

    /**
     * Add MetaMask menu item to WooCommerce My Account
     */
    public function add_metamask_menu_item($items) {
        $items['metamask-wallet'] = __('کیف پول متامسک', 'metamask-login');
        return $items;
    }

    /**
     * MetaMask wallet content in WooCommerce My Account
     */
    public function metamask_wallet_content() {
        $user_id = get_current_user_id();
        $wallet_address = get_user_meta($user_id, 'metamask_wallet_address', true);
        ?>
        <div class="metamask-wallet-section">
            <h3><?php _e('کیف پول متامسک', 'metamask-login'); ?></h3>
            <?php if ($wallet_address): ?>
                <div class="wallet-info">
                    <p><strong><?php _e('آدرس کیف پول:', 'metamask-login'); ?></strong> <?php echo esc_html($wallet_address); ?></p>
                    <button class="button" id="disconnect-metamask"><?php _e('قطع اتصال کیف پول', 'metamask-login'); ?></button>
                </div>
            <?php else: ?>
                <div class="wallet-connect">
                    <p><?php _e('کیف پول متامسک شما متصل نیست.', 'metamask-login'); ?></p>
                    <button class="button" id="connect-metamask"><?php _e('اتصال به متامسک', 'metamask-login'); ?></button>
                </div>
            <?php endif; ?>
            
            <div class="metamask-transactions">
                <h4><?php _e('تاریخچه تراکنش‌ها', 'metamask-login'); ?></h4>
                <?php
                $transactions = get_user_meta($user_id, 'metamask_transactions', true);
                if ($transactions): ?>
                    <table class="woocommerce-table">
                        <thead>
                            <tr>
                                <th><?php _e('تاریخ', 'metamask-login'); ?></th>
                                <th><?php _e('نوع', 'metamask-login'); ?></th>
                                <th><?php _e('مقدار', 'metamask-login'); ?></th>
                                <th><?php _e('وضعیت', 'metamask-login'); ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($transactions as $tx): ?>
                                <tr>
                                    <td><?php echo esc_html($tx['date']); ?></td>
                                    <td><?php echo esc_html($tx['type']); ?></td>
                                    <td><?php echo esc_html($tx['amount']); ?></td>
                                    <td><?php echo esc_html($tx['status']); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php else: ?>
                    <p><?php _e('هیچ تراکنشی یافت نشد.', 'metamask-login'); ?></p>
                <?php endif; ?>
            </div>
        </div>
        <?php
    }

    /**
     * Add MetaMask fields to user profile
     */
    public function add_metamask_profile_fields($user) {
        ?>
        <h3><?php _e('اطلاعات کیف پول متامسک', 'metamask-login'); ?></h3>
        <table class="form-table">
            <tr>
                <th><label for="metamask_wallet_address"><?php _e('آدرس کیف پول', 'metamask-login'); ?></label></th>
                <td>
                    <input type="text" name="metamask_wallet_address" id="metamask_wallet_address" 
                           value="<?php echo esc_attr(get_user_meta($user->ID, 'metamask_wallet_address', true)); ?>" 
                           class="regular-text" readonly />
                    <p class="description"><?php _e('این آدرس به صورت خودکار هنگام اتصال کیف پول ثبت می‌شود.', 'metamask-login'); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }

    /**
     * Save MetaMask profile fields
     */
    public function save_metamask_profile_fields($user_id) {
        if (current_user_can('edit_user', $user_id)) {
            update_user_meta($user_id, 'metamask_wallet_address', sanitize_text_field($_POST['metamask_wallet_address']));
        }
    }

    /**
     * Add dashboard widget
     */
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'metamask_dashboard_widget',
            __('آمار کیف پول متامسک', 'metamask-login'),
            array($this, 'render_dashboard_widget')
        );
    }

    /**
     * Render dashboard widget
     */
    public function render_dashboard_widget() {
        $users_with_wallet = count(get_users(array('meta_key' => 'metamask_wallet_address')));
        $total_users = count_users();
        ?>
        <div class="metamask-dashboard-widget">
            <p><?php printf(__('کاربران دارای کیف پول: %d', 'metamask-login'), $users_with_wallet); ?></p>
            <p><?php printf(__('درصد کاربران دارای کیف پول: %d%%', 'metamask-login'), 
                ($total_users['total_users'] > 0 ? ($users_with_wallet / $total_users['total_users']) * 100 : 0)); ?></p>
        </div>
        <?php
    }
}

// Initialize the dashboard setup
new MetaMask_Dashboard_Setup(); 