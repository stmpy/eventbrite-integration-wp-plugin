<?php
/*
 * Plugin Name: Eventbrite Integration
 * Version: 1.0
 * Description: A full suite of eventbrite integrations using eventbrites API services. Depends on Plugin: Keyring
 * Author: Travis Jeppson
 * Requires at least: 4.0
 * Tested up to: 4.0
 *
 * Text Domain: eventbrite-integration
 * Domain Path: /lang/
 *
 * @package WordPress
 * @author Travis Jeppson
 * @since 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

// Load plugin class files
require_once( 'includes/class-eventbrite-integration.php' );
require_once( 'includes/class-eventbrite-integration-settings.php' );
require_once( 'includes/eventbrite-api.php' );

// Load plugin libraries
require_once( 'includes/lib/class-eventbrite-integration-admin-api.php' );
require_once( 'includes/lib/class-eventbrite-integration-post-type.php' );
require_once( 'includes/lib/class-eventbrite-integration-taxonomy.php' );


/**
 * Returns the main instance of Eventbrite_Integration to prevent the need to use globals.
 *
 * @since  1.0.0
 * @return object Eventbrite_Integration
 */
function Eventbrite_Integration () {
	$instance = Eventbrite_Integration::instance( __FILE__, '1.4.1' );

	if ( is_null( $instance->settings ) ) {
		$instance->settings = Eventbrite_Integration_Settings::instance( $instance );
	}

	return $instance;
}

Eventbrite_Integration();
