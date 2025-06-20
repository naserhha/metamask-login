<?php
/**
 * Dashboard Shortcode Class
 * 
 * Handles all user-facing functionality including dashboard, profile, and wallet connection
 */

if (!defined('ABSPATH')) {
    exit;
}

class MetaMask_Dashboard_Shortcode {
    /**
     * Constructor
     */
    public function __construct() {
        add_shortcode('metamask_user_dashboard', array($this, 'render_dashboard'));
        add_shortcode('metamask_connect_button', array($this, 'render_connect_button'));
        
        // Enqueue scripts and styles
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
    }

    /**
     * Enqueue required assets
     */
    public function enqueue_assets() {
        if (is_page() && has_shortcode(get_post()->post_content, 'metamask_user_dashboard')) {
            wp_enqueue_style(
                'metamask-dashboard-style',
                METAMASK_LOGIN_PLUGIN_URL . 'assets/css/user-dashboard.css',
                array(),
                METAMASK_LOGIN_VERSION
            );

            wp_enqueue_script(
                'ethers',
                'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js',
                array(),
                '5.7',
                true
            );

            wp_enqueue_script(
                'metamask-dashboard',
                METAMASK_LOGIN_PLUGIN_URL . 'assets/js/user-dashboard.js',
                array('jquery', 'ethers'),
                METAMASK_LOGIN_VERSION,
                true
            );

            wp_localize_script('metamask-dashboard', 'metamaskDashboardData', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('metamask_dashboard_nonce'),
                'is_rtl' => is_rtl()
            ));
        }
    }

    /**
     * Render the dashboard
     */
    public function render_dashboard($atts) {
        // Check if user is logged in
        if (!is_user_logged_in()) {
            return sprintf(
                '<p>%s <a href="%s">%s</a></p>',
                __('برای مشاهده داشبورد باید', 'metamask-login'),
                wp_login_url(get_permalink()),
                __('وارد شوید', 'metamask-login')
            );
        }

        // Get current user
        $current_user = wp_get_current_user();
        $wallet_address = get_user_meta($current_user->ID, 'metamask_wallet_address', true);
        
        // Buffer the output
        ob_start();
        
        // RTL class
        $rtl_class = is_rtl() ? 'rtl' : '';
        ?>
        <div class="metamask-dashboard <?php echo $rtl_class; ?>">
            <div class="dashboard-header">
                <h2><?php printf(__('خوش آمدید، %s', 'metamask-login'), $current_user->display_name); ?></h2>
                <?php if ($wallet_address): ?>
                    <div class="wallet-info">
                        <span class="wallet-label"><?php _e('آدرس کیف پول:', 'metamask-login'); ?></span>
                        <span class="wallet-address"><?php echo esc_html($wallet_address); ?></span>
                    </div>
                <?php endif; ?>
            </div>

            <div class="dashboard-tabs">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="profile"><?php _e('پروفایل', 'metamask-login'); ?></button>
                    <button class="tab-button" data-tab="security"><?php _e('امنیت', 'metamask-login'); ?></button>
                    <button class="tab-button" data-tab="activity"><?php _e('فعالیت‌ها', 'metamask-login'); ?></button>
                </div>

                <div class="tab-content">
                    <div class="tab-pane active" id="profile-tab">
                        <?php $this->render_profile_tab($current_user); ?>
                    </div>
                    <div class="tab-pane" id="security-tab">
                        <?php $this->render_security_tab($current_user); ?>
                    </div>
                    <div class="tab-pane" id="activity-tab">
                        <?php $this->render_activity_tab($current_user); ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Render profile tab
     */
    private function render_profile_tab($user) {
        ?>
        <div class="profile-section">
            <form id="profile-form" method="post">
                <div class="form-group">
                    <label><?php _e('نام نمایشی:', 'metamask-login'); ?></label>
                    <input type="text" name="display_name" value="<?php echo esc_attr($user->display_name); ?>">
                </div>
                <div class="form-group">
                    <label><?php _e('ایمیل:', 'metamask-login'); ?></label>
                    <input type="email" name="email" value="<?php echo esc_attr($user->user_email); ?>">
                </div>
                <button type="submit" class="button button-primary">
                    <?php _e('ذخیره تغییرات', 'metamask-login'); ?>
                </button>
            </form>
        </div>
        <?php
    }

    /**
     * Render security tab
     */
    private function render_security_tab($user) {
        ?>
        <div class="security-section">
            <div class="wallet-connection">
                <h3><?php _e('اتصال کیف پول', 'metamask-login'); ?></h3>
                <?php
                $wallet_address = get_user_meta($user->ID, 'metamask_wallet_address', true);
                if ($wallet_address) {
                    printf(
                        '<p>%s <strong>%s</strong></p>',
                        __('کیف پول متصل:', 'metamask-login'),
                        esc_html($wallet_address)
                    );
                    echo '<button class="button" id="disconnect-wallet">' . __('قطع اتصال', 'metamask-login') . '</button>';
                } else {
                    echo '<button class="button" id="connect-wallet">' . __('اتصال کیف پول', 'metamask-login') . '</button>';
                }
                ?>
            </div>

            <div class="password-change">
                <h3><?php _e('تغییر رمز عبور', 'metamask-login'); ?></h3>
                <form id="password-form" method="post">
                    <div class="form-group">
                        <label><?php _e('رمز عبور فعلی:', 'metamask-login'); ?></label>
                        <input type="password" name="current_password">
                    </div>
                    <div class="form-group">
                        <label><?php _e('رمز عبور جدید:', 'metamask-login'); ?></label>
                        <input type="password" name="new_password">
                    </div>
                    <div class="form-group">
                        <label><?php _e('تکرار رمز عبور جدید:', 'metamask-login'); ?></label>
                        <input type="password" name="confirm_password">
                    </div>
                    <button type="submit" class="button button-primary">
                        <?php _e('تغییر رمز عبور', 'metamask-login'); ?>
                    </button>
                </form>
            </div>
        </div>
        <?php
    }

    /**
     * Render activity tab
     */
    private function render_activity_tab($user) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'metamask_activity_log';
        $activities = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table_name} WHERE user_id = %d ORDER BY created_at DESC LIMIT 10",
            $user->ID
        ));
        ?>
        <div class="activity-section">
            <h3><?php _e('فعالیت‌های اخیر', 'metamask-login'); ?></h3>
            <?php if ($activities): ?>
                <div class="activity-list">
                    <?php foreach ($activities as $activity): ?>
                        <div class="activity-item">
                            <span class="activity-type"><?php echo esc_html($activity->type); ?></span>
                            <span class="activity-description"><?php echo esc_html($activity->description); ?></span>
                            <span class="activity-date"><?php echo date_i18n(get_option('date_format') . ' ' . get_option('time_format'), strtotime($activity->created_at)); ?></span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php else: ?>
                <p><?php _e('هیچ فعالیتی ثبت نشده است.', 'metamask-login'); ?></p>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Render connect button shortcode
     */
    public function render_connect_button($atts) {
        $atts = shortcode_atts(array(
            'text' => __('اتصال به کیف پول', 'metamask-login'),
            'class' => ''
        ), $atts);

        return sprintf(
            '<button type="button" class="metamask-connect-button %s" id="metamask-connect">%s</button>',
            esc_attr($atts['class']),
            esc_html($atts['text'])
        );
    }
}

// Initialize the shortcode
new MetaMask_Dashboard_Shortcode(); 