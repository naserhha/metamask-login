<?php
/**
 * User Dashboard Functions for MetaMask Login
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

/**
 * Register Dashboard Scripts
 */
function metamask_login_dashboard_scripts() {
    global $post;
    
    // Only load on pages containing our shortcode
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'metamask_dashboard')) {
        // Enqueue Ethers.js from reliable CDN
        wp_enqueue_script('ethers-js', 'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js', array(), '5.7', true);
        
        // Enqueue dashboard script
        wp_enqueue_script('metamask-dashboard', plugins_url('/assets/js/metamask-dashboard.js', dirname(__FILE__)), array('jquery', 'ethers-js'), METAMASK_LOGIN_VERSION, true);
        
        // Dashboard styles
        wp_enqueue_style('metamask-dashboard', plugins_url('/assets/css/metamask-dashboard.css', dirname(__FILE__)), array(), METAMASK_LOGIN_VERSION);
        
        // Pass data to JavaScript
        wp_localize_script('metamask-dashboard', 'metamaskDashboardData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('metamask_dashboard_nonce'),
            'is_rtl' => is_rtl(),
            'texts' => array(
                'copy_success' => __('Copied to clipboard!', 'metamask-login'),
                'copy_error' => __('Failed to copy!', 'metamask-login'),
                'loading' => __('Loading...', 'metamask-login'),
                'no_metamask' => __('Please install MetaMask to view your blockchain data.', 'metamask-login'),
                'connect_wallet' => __('Connect Wallet', 'metamask-login'),
                'no_tokens' => __('No tokens found', 'metamask-login'),
                'no_nfts' => __('No NFTs found', 'metamask-login'),
                'no_transactions' => __('No transactions found', 'metamask-login'),
                'etherscan' => __('View on Etherscan', 'metamask-login'),
                'wallet_error' => __('Could not connect to wallet. Please try again.', 'metamask-login'),
                'chain_error' => __('Unable to detect network. Please check your connection.', 'metamask-login'),
                'network_switch' => __('Please switch to a supported network.', 'metamask-login'),
            )
        ));
    }
}
add_action('wp_enqueue_scripts', 'metamask_login_dashboard_scripts');

/**
 * User Dashboard Shortcode
 */
function metamask_user_dashboard_shortcode() {
    // Check if user is logged in
    if (!is_user_logged_in()) {
        return '<div class="metamask-dashboard-error">' . 
            __('You must be logged in to view this dashboard.', 'metamask-login') . 
            '</div>';
    }
    
    // Get current user
    $current_user = wp_get_current_user();
    $wallet_address = get_user_meta($current_user->ID, 'metamask_wallet_address', true);
    
    // Check if user has a wallet address
    if (empty($wallet_address)) {
        return '<div class="metamask-dashboard-error">' . 
            __('No MetaMask wallet connected to this account.', 'metamask-login') . 
            '</div>';
    }
    
    // RTL class if needed
    $rtl_class = is_rtl() ? 'rtl' : '';
    
    // Start output buffering
    ob_start();
    ?>
    <div class="metamask-dashboard <?php echo esc_attr($rtl_class); ?>">
        <div class="dashboard-header">
            <h2><?php echo sprintf(__('Welcome, %s', 'metamask-login'), esc_html($current_user->display_name)); ?></h2>
            <div class="dashboard-network-indicator">
                <span class="network-dot"></span>
                <span id="network-name"><?php _e('Loading network...', 'metamask-login'); ?></span>
            </div>
        </div>
        
        <div class="dashboard-tabs">
            <button class="tab-button active" data-tab="wallet"><?php _e('Wallet', 'metamask-login'); ?></button>
            <button class="tab-button" data-tab="tokens"><?php _e('Tokens', 'metamask-login'); ?></button>
            <button class="tab-button" data-tab="nfts"><?php _e('NFTs', 'metamask-login'); ?></button>
            <button class="tab-button" data-tab="transactions"><?php _e('Transactions', 'metamask-login'); ?></button>
        </div>
        
        <!-- Wallet Tab -->
        <div id="wallet-tab" class="tab-content active">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><?php _e('Your Wallet Address', 'metamask-login'); ?></h3>
                </div>
                <div class="card-body">
                    <div class="wallet-address-container">
                        <div class="wallet-address-box">
                            <div id="wallet-address"><?php echo esc_html($wallet_address); ?></div>
                            <button class="copy-btn" id="copy-address" title="<?php esc_attr_e('Copy address', 'metamask-login'); ?>">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><?php _e('Your Balance', 'metamask-login'); ?></h3>
                </div>
                <div class="card-body">
                    <div class="wallet-balance-container" id="wallet-balance">
                        <div class="loading-container">
                            <div class="loading-spinner"></div>
                            <p><?php _e('Loading your balance...', 'metamask-login'); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Tokens Tab -->
        <div id="tokens-tab" class="tab-content">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><?php _e('Your Tokens', 'metamask-login'); ?></h3>
                </div>
                <div class="card-body">
                    <div id="tokens-container">
                        <div class="loading-container">
                            <div class="loading-spinner"></div>
                            <p><?php _e('Loading your tokens...', 'metamask-login'); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- NFTs Tab -->
        <div id="nfts-tab" class="tab-content">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><?php _e('Your NFT Collection', 'metamask-login'); ?></h3>
                </div>
                <div class="card-body">
                    <div id="nfts-container">
                        <div class="loading-container">
                            <div class="loading-spinner"></div>
                            <p><?php _e('Loading your NFTs...', 'metamask-login'); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Transactions Tab -->
        <div id="transactions-tab" class="tab-content">
            <div class="dashboard-card">
                <div class="card-header">
                    <h3><?php _e('Recent Transactions', 'metamask-login'); ?></h3>
                </div>
                <div class="card-body">
                    <div id="transactions-container">
                        <div class="loading-container">
                            <div class="loading-spinner"></div>
                            <p><?php _e('Loading your transactions...', 'metamask-login'); ?></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Notification Container -->
        <div id="notification-container"></div>
    </div>
    
    <?php
    return ob_get_clean();
}
add_shortcode('metamask_dashboard', 'metamask_user_dashboard_shortcode');

// Enqueue dashboard styles and scripts
function metamask_dashboard_enqueue_scripts() {
    global $post;
    
    // Only enqueue on the dashboard page
    if (is_a($post, 'WP_Post') && has_shortcode($post->post_content, 'metamask_dashboard')) {
        wp_enqueue_style('metamask-dashboard', METAMASK_LOGIN_PLUGIN_URL . 'assets/css/metamask-dashboard.css', array(), METAMASK_LOGIN_VERSION);
        
        // Enqueue ethers.js
        wp_enqueue_script('ethers', 'https://unpkg.com/ethers@5.7.2/dist/ethers.umd.min.js', array(), '5.7.2', true);
    }
}
add_action('wp_enqueue_scripts', 'metamask_dashboard_enqueue_scripts');

/**
 * Register Blockchain Dashboard Scripts
 */
function blockchain_dashboard_scripts() {
    global $post;
    
    // Only load on pages with the blockchain dashboard template
    if (is_page_template('templates/blockchain-dashboard.php')) {
        // Enqueue Ethers.js from reliable CDN
        wp_enqueue_script('ethers-js', 'https://cdn.ethers.io/lib/ethers-5.7.umd.min.js', array(), '5.7', true);
        
        // Enqueue Tailwind CSS
        wp_enqueue_style('tailwind-css', 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css', array(), '2.2.19');
        
        // Enqueue Chart.js
        wp_enqueue_script('chart-js', 'https://cdn.jsdelivr.net/npm/chart.js@3.7.1/dist/chart.min.js', array(), '3.7.1', true);
        
        // Enqueue dashboard script
        wp_enqueue_script('blockchain-dashboard', plugins_url('/assets/js/blockchain-dashboard.js', dirname(__FILE__)), array('jquery', 'ethers-js', 'chart-js'), METAMASK_LOGIN_VERSION, true);
        
        // Dashboard styles
        wp_enqueue_style('blockchain-dashboard', plugins_url('/assets/css/blockchain-dashboard.css', dirname(__FILE__)), array(), METAMASK_LOGIN_VERSION);
        
        // Pass data to JavaScript
        wp_localize_script('blockchain-dashboard', 'blockchainDashboardData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('blockchain_dashboard_nonce'),
            'is_rtl' => is_rtl(),
            'texts' => array(
                // Common texts
                'copy_success' => __('کپی شد!', 'metamask-login'),
                'copy_error' => __('کپی ناموفق بود!', 'metamask-login'),
                'loading' => __('در حال بارگذاری...', 'metamask-login'),
                'error_loading' => __('خطا در بارگذاری اطلاعات', 'metamask-login'),
                'no_metamask' => __('لطفا MetaMask را برای مشاهده داده های بلاکچین خود نصب کنید.', 'metamask-login'),
                'install_metamask' => __('نصب MetaMask', 'metamask-login'),
                'connect_wallet' => __('اتصال کیف پول', 'metamask-login'),
                'wallet_connected' => __('کیف پول متصل شد!', 'metamask-login'),
                'wallet_error' => __('اتصال به کیف پول با مشکل مواجه شد. لطفا دوباره تلاش کنید.', 'metamask-login'),
                'chain_error' => __('عدم تشخیص شبکه. لطفا اتصال خود را بررسی کنید.', 'metamask-login'),
                'view' => __('مشاهده', 'metamask-login'),
                
                // Wallet
                'token' => __('توکن', 'metamask-login'),
                'balance' => __('موجودی', 'metamask-login'),
                'value' => __('ارزش', 'metamask-login'),
                
                // Tokens
                'no_tokens' => __('هیچ توکنی یافت نشد', 'metamask-login'),
                
                // NFTs
                'no_nfts' => __('هیچ NFT یافت نشد', 'metamask-login'),
                'view_on_opensea' => __('مشاهده در OpenSea', 'metamask-login'),
                'all_collections' => __('همه مجموعه‌ها', 'metamask-login'),
                
                // Transactions
                'no_transactions' => __('هیچ تراکنشی یافت نشد', 'metamask-login'),
                'sent' => __('ارسال', 'metamask-login'),
                'received' => __('دریافت', 'metamask-login'),
                'from' => __('از', 'metamask-login'),
                'to' => __('به', 'metamask-login'),
                'view_all_transactions' => __('مشاهده همه تراکنش‌ها', 'metamask-login'),
                
                // Security
                'wallet_safe' => __('کیف پول شما امن است', 'metamask-login'),
                'wallet_flagged' => __('کیف پول شما پرچم‌گذاری شده است', 'metamask-login'),
                'connected_dapps' => __('برنامه‌های متصل', 'metamask-login'),
                'risky' => __('خطرناک', 'metamask-login'),
                'safe' => __('امن', 'metamask-login'),
                'check_approvals' => __('بررسی مجوزها و لغو دسترسی‌ها', 'metamask-login'),
                
                // DAO
                'governance_tokens' => __('توکن‌های حاکمیتی', 'metamask-login'),
                'voting_history' => __('تاریخچه رأی‌گیری', 'metamask-login'),
                'no_dao_tokens' => __('هیچ توکن حاکمیتی یافت نشد', 'metamask-login'),
                'no_votes' => __('هیچ رأی ثبت نشده‌ای ندارید', 'metamask-login'),
                'view_dao' => __('مشاهده DAO', 'metamask-login'),
                
                // Badges
                'no_badges' => __('هنوز هیچ نشانی ندارید', 'metamask-login'),
                'whale_badge' => __('نهنگ اتریوم', 'metamask-login'),
                'whale_desc' => __('بیش از 10 اتر دارد', 'metamask-login'),
                'nft_collector_badge' => __('کلکسیونر NFT', 'metamask-login'),
                'nft_collector_desc' => __('بیش از 5 NFT دارد', 'metamask-login'),
                'governance_badge' => __('مشارکت‌کننده در حاکمیت', 'metamask-login'),
                'governance_desc' => __('دارای توکن‌های حاکمیتی', 'metamask-login'),
                
                // Achievements
                'no_achievements' => __('هنوز هیچ دستاوردی نداری', 'metamask-login'),
                'keep_exploring' => __('به اکتشاف بلاکچین ادامه دهید تا دستاوردها را آزاد کنید', 'metamask-login'),
                'unlocked' => __('آزاد شده', 'metamask-login'),
                'first_nft_achievement' => __('اولین NFT', 'metamask-login'),
                'first_nft_desc' => __('اولین NFT خود را به دست آوردید', 'metamask-login'),
                'contract_master' => __('استاد قرارداد', 'metamask-login'),
                'contract_master_desc' => __('با بیش از 5 قرارداد هوشمند تعامل داشته است', 'metamask-login'),
                'diversifier' => __('متنوع‌ساز سبد دارایی', 'metamask-login'),
                'diversifier_desc' => __('دارای بیش از 3 نوع توکن مختلف', 'metamask-login'),
            )
        ));
    }
}
add_action('wp_enqueue_scripts', 'blockchain_dashboard_scripts'); 