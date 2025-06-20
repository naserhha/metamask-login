<?php
/**
 * The sidebar template file
 *
 * This is the most generic template file in a WordPress theme
 * and it is required since WordPress 3.0.0
 *
 * @package WordPress
 */

if ( ! is_active_sidebar( 'sidebar-1' ) ) {
    return;
}
?>

<aside id="secondary" class="widget-area" role="complementary">
    <?php dynamic_sidebar( 'sidebar-1' ); ?>
</aside><!-- #secondary --> 