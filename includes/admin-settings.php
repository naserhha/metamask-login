<?php
/**
 * Admin Settings Page
 * 
 * Handles all plugin settings and dashboard functionality
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class MetaMask_Login_Admin {
    /**
     * Constructor
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));
    }

    /**
     * Add admin menu items
     */
    public function add_admin_menu() {
        add_menu_page(
            __('تنظیمات متامسک', 'metamask-login'),
            __('متامسک', 'metamask-login'),
            'manage_options',
            'metamask-login-settings',
            array($this, 'render_settings_page'),
            'dashicons-shield',
            25
        );
    }

    /**
     * Register settings
     */
    public function register_settings() {
        register_setting('metamask_login_options', 'metamask_login_tagline');
        register_setting('metamask_login_options', 'metamask_dashboard_page_id');
        register_setting('metamask_login_options', 'metamask_admin_wallet_required');
        register_setting('metamask_login_options', 'metamask_default_user_role');
    }

    /**
     * Add dashboard widget
     */
    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'metamask_dashboard_widget',
            __('آمار متامسک', 'metamask-login'),
            array($this, 'render_dashboard_widget')
        );
    }

    /**
     * Render settings page
     */
    public function render_settings_page() {
        $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'general';
        ?>
        <div class="wrap">
            <h1><?php _e('تنظیمات متامسک', 'metamask-login'); ?></h1>
            
            <h2 class="nav-tab-wrapper">
                <a href="?page=metamask-login-settings&tab=general" class="nav-tab <?php echo $active_tab == 'general' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('تنظیمات عمومی', 'metamask-login'); ?>
                </a>
                <a href="?page=metamask-login-settings&tab=users" class="nav-tab <?php echo $active_tab == 'users' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('مدیریت کاربران', 'metamask-login'); ?>
                </a>
                <a href="?page=metamask-login-settings&tab=shortcodes" class="nav-tab <?php echo $active_tab == 'shortcodes' ? 'nav-tab-active' : ''; ?>">
                    <?php _e('شورت‌کدها', 'metamask-login'); ?>
                </a>
            </h2>

            <?php
            switch($active_tab) {
                case 'users':
                    $this->render_users_tab();
                    break;
                case 'shortcodes':
                    $this->render_shortcodes_tab();
                    break;
                default:
                    $this->render_general_tab();
                    break;
            }
            ?>
        </div>
        <?php
    }

    /**
     * Render general settings tab
     */
    private function render_general_tab() {
        ?>
        <form method="post" action="options.php">
            <?php settings_fields('metamask_login_options'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="metamask_login_tagline">
                            <?php _e('متن زیر دکمه ورود', 'metamask-login'); ?>
                        </label>
                    </th>
                    <td>
                        <input type="text" id="metamask_login_tagline" 
                               name="metamask_login_tagline" 
                               value="<?php echo esc_attr(get_option('metamask_login_tagline', 'اتصال به کیف پول برای ورود')); ?>" 
                               class="regular-text">
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="metamask_default_user_role">
                            <?php _e('نقش پیش‌فرض کاربران', 'metamask-login'); ?>
                        </label>
                    </th>
                    <td>
                        <select name="metamask_default_user_role" id="metamask_default_user_role">
                            <?php
                            $roles = get_editable_roles();
                            $current_role = get_option('metamask_default_user_role', 'subscriber');
                            foreach($roles as $role_key => $role) {
                                printf(
                                    '<option value="%s" %s>%s</option>',
                                    esc_attr($role_key),
                                    selected($current_role, $role_key, false),
                                    esc_html($role['name'])
                                );
                            }
                            ?>
                        </select>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <?php _e('الزام اتصال کیف پول', 'metamask-login'); ?>
                    </th>
                    <td>
                        <label>
                            <input type="checkbox" 
                                   name="metamask_admin_wallet_required" 
                                   value="1" 
                                   <?php checked(get_option('metamask_admin_wallet_required'), 1); ?>>
                            <?php _e('اجباری کردن اتصال کیف پول برای مدیران', 'metamask-login'); ?>
                        </label>
                    </td>
                </tr>
            </table>
            
            <?php submit_button(__('ذخیره تنظیمات', 'metamask-login')); ?>
        </form>
        <?php
    }

    /**
     * Render users management tab
     */
    private function render_users_tab() {
        $users = get_users(array('meta_key' => 'metamask_wallet_address'));
        ?>
        <div class="tablenav top">
            <div class="tablenav-pages">
                <?php
                $total_users = count($users);
                printf(__('تعداد کل کاربران متامسک: %d', 'metamask-login'), $total_users);
                ?>
            </div>
        </div>

        <table class="wp-list-table widefat fixed striped">
            <thead>
                <tr>
                    <th><?php _e('نام کاربری', 'metamask-login'); ?></th>
                    <th><?php _e('آدرس کیف پول', 'metamask-login'); ?></th>
                    <th><?php _e('نقش', 'metamask-login'); ?></th>
                    <th><?php _e('آخرین ورود', 'metamask-login'); ?></th>
                </tr>
            </thead>
            <tbody>
                <?php
                foreach($users as $user) {
                    $wallet = get_user_meta($user->ID, 'metamask_wallet_address', true);
                    $last_login = get_user_meta($user->ID, 'metamask_last_login', true);
                    ?>
                    <tr>
                        <td><?php echo esc_html($user->display_name); ?></td>
                        <td><?php echo esc_html($wallet); ?></td>
                        <td><?php echo esc_html(implode(', ', $user->roles)); ?></td>
                        <td><?php echo $last_login ? date_i18n(get_option('date_format') . ' ' . get_option('time_format'), $last_login) : '-'; ?></td>
                    </tr>
                    <?php
                }
                ?>
            </tbody>
        </table>
        <?php
    }

    /**
     * Render shortcodes documentation tab
     */
    private function render_shortcodes_tab() {
        ?>
        <div class="card">
            <h3><?php _e('شورت‌کد داشبورد کاربری', 'metamask-login'); ?></h3>
            <p><code>[metamask_user_dashboard]</code></p>
            <p><?php _e('نمایش داشبورد کامل کاربری شامل پروفایل، امنیت، و تاریخچه', 'metamask-login'); ?></p>
        </div>

        <div class="card">
            <h3><?php _e('شورت‌کد دکمه اتصال', 'metamask-login'); ?></h3>
            <p><code>[metamask_connect_button]</code></p>
            <p><?php _e('نمایش دکمه اتصال به کیف پول متامسک', 'metamask-login'); ?></p>
        </div>
        <?php
    }

    /**
     * Render dashboard widget
     */
    public function render_dashboard_widget() {
        $users = count_users();
        $metamask_users = count(get_users(array('meta_key' => 'metamask_wallet_address')));
        ?>
        <div class="metamask-dashboard-widget">
            <p><?php printf(__('کاربران متامسک: %d', 'metamask-login'), $metamask_users); ?></p>
            <p><?php printf(__('کل کاربران: %d', 'metamask-login'), $users['total_users']); ?></p>
        </div>
        <?php
    }
}

// Initialize admin settings
new MetaMask_Login_Admin(); 