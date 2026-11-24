<?php
/*
Plugin Name: ZGenArtStudio Current GitHub Mobile Shell
Description: Owner-private, frameless WordPress presentation of the exact 23 November GitHub Pages three-shell beta, without modifying its painting code.
Version: 2026.11.24.33a8c861
Author: ZGen VICE
*/
if (!defined('ABSPATH')) { exit; }

/*
 * Source checkpoint: public zgen-sandbox commit
 * 33a8c8613cc9d3e218e97a849faedb41cd38614d.
 * Main HTML and the 6 shell asset files are kept byte-for-byte unchanged.
 * This plugin adds only a separate authenticated PHP delivery route.
 */
function zgen_current_mobile_serve() {
    $uri = isset($_SERVER['REQUEST_URI']) ? (string) $_SERVER['REQUEST_URI'] : '';
    $path = parse_url($uri, PHP_URL_PATH);
    if (!is_string($path)) { return; }
    $prefix = '/zgen-current-mobile';
    if ($path === $prefix) {
        wp_safe_redirect(home_url($prefix . '/'), 302);
        exit;
    }
    $files = array(
        '/' => array('index.html', 'text/html; charset=utf-8'),
        '/index.html' => array('index.html', 'text/html; charset=utf-8'),
        '/three-shell.css' => array('three-shell.css', 'text/css; charset=utf-8'),
        '/bounded-fill.css' => array('bounded-fill.css', 'text/css; charset=utf-8'),
        '/artist-feedback.css' => array('artist-feedback.css', 'text/css; charset=utf-8'),
        '/three-shell.js' => array('three-shell.js', 'application/javascript; charset=utf-8'),
        '/bounded-fill.js' => array('bounded-fill.js', 'application/javascript; charset=utf-8'),
        '/artist-feedback.js' => array('artist-feedback.js', 'application/javascript; charset=utf-8'),
    );
    if (substr($path, 0, strlen($prefix) + 1) !== $prefix . '/') {
        return;
    }
    $suffix = substr($path, strlen($prefix));
    if (!isset($files[$suffix])) {
        return;
    }

    if (!is_user_logged_in()) {
        auth_redirect();
        exit;
    }
    if (!current_user_can('manage_options')) {
        status_header(403);
        nocache_headers();
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Owner account required.';
        exit;
    }

    $source = plugin_dir_path(__FILE__) . $files[$suffix][0];
    if (!is_file($source) || !is_readable($source)) {
        status_header(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Studio source file unavailable.';
        exit;
    }
    status_header(200);
    nocache_headers();
    header('Content-Type: ' . $files[$suffix][1]);
    header('X-Robots-Tag: noindex, nofollow');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Cache-Control: private, no-store, max-age=0');
    readfile($source);
    exit;
}
add_action('init', 'zgen_current_mobile_serve', 1);
