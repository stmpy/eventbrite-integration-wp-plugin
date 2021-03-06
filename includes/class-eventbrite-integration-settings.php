<?php

if ( ! defined( 'ABSPATH' ) ) exit;

class Eventbrite_Integration_Settings {

	/**
	 * The single instance of Eventbrite_Integration_Settings.
	 * @var 	object
	 * @access  private
	 * @since 	1.0.0
	 */
	private static $_instance = null;

	/**
	 * The main plugin object.
	 * @var 	object
	 * @access  public
	 * @since 	1.0.0
	 */
	public $parent = null;

	/**
	 * Prefix for plugin settings.
	 * @var     string
	 * @access  public
	 * @since   1.0.0
	 */
	public $base = '';

	/**
	 * Available settings for plugin.
	 * @var     array
	 * @access  public
	 * @since   1.0.0
	 */
	public $settings = array();

	public function __construct ( $parent ) {
		$this->parent = $parent;

		$this->base = 'evi_';

		// Initialise settings
		add_action( 'init', array( $this, 'init_settings' ), 11 );

		// Register plugin settings
		add_action( 'admin_init' , array( $this, 'register_settings' ) );

		// Add settings page to menu
		add_action( 'admin_menu' , array( $this, 'add_menu_item' ) );

		// Add settings link to plugins page
		add_filter( 'plugin_action_links_' . plugin_basename( $this->parent->file ) , array( $this, 'add_settings_link' ) );
	}

	/**
	 * Initialise settings
	 * @return void
	 */
	public function init_settings () {
		$this->settings = $this->settings_fields();

		// check if reset cache is set ... if so reset and then change it to false
		if ( ! empty( get_option( 'evi_clear_cache', '' ) ) ) {
			clear_transients();
			update_option( 'evi_clear_cache', '');
		}
	}

	/**
	 * Add settings page to admin menu
	 * @return void
	 */
	public function add_menu_item () {
		$page = add_options_page( __( 'Eventbrite Integration', 'eventbrite-integration' ) , __( 'Eventbrite Integration', 'eventbrite-integration' ) , 'manage_options' , $this->parent->_token . '_settings' ,  array( $this, 'settings_page' ) );
		add_action( 'admin_print_styles-' . $page, array( $this, 'settings_assets' ) );
	}

	/**
	 * Load settings JS & CSS
	 * @return void
	 */
	public function settings_assets () {

		// We're including the farbtastic script & styles here because they're needed for the colour picker
		// If you're not including a colour picker field then you can leave these calls out as well as the farbtastic dependency for the wpt-admin-js script below
		// wp_enqueue_style( 'farbtastic' );
		// wp_enqueue_script( 'farbtastic' );

		// We're including the WP media scripts here because they're needed for the image upload field
		// If you're not including an image upload then you can leave this function call out
		wp_enqueue_media();

		wp_register_script( $this->parent->_token . '-settings-js', $this->parent->assets_url . 'js/settings' . $this->parent->script_suffix . '.js', array( /*'farbtastic',*/ 'jquery' ), '1.0.0' );
		wp_enqueue_script( $this->parent->_token . '-settings-js' );
	}

	/**
	 * Add settings link to plugin list table
	 * @param  array $links Existing links
	 * @return array 		Modified links
	 */
	public function add_settings_link ( $links ) {
		$settings_link = '<a href="options-general.php?page=' . $this->parent->_token . '_settings">' . __( 'Settings', 'eventbrite-integration' ) . '</a>';
  		array_push( $links, $settings_link );
  		return $links;
	}

	/**
	 * Build settings fields
	 * @return array Fields to be displayed on settings page
	 */
	private function settings_fields () {

		$settings['eventbrite'] = array(
			'title'					=> __( 'Eventbrite API', 'eventbrite-integration' ),
			'description'			=> __( 'The following settings help to configure the integration and ensure smooth skateboarding.', 'eventbrite-integration' ),
			'fields'				=> array(
				array(
					'id' 			=> 'debug',
					'label'			=> __( 'Debug Mode', 'wordpress-plugin-template' ),
					'description'	=> __( 'if checked then eventbrite will be queried for every request, nothing is cached' ),
					'type'			=> 'checkbox',
					'default'		=> 'false'
				),
				array(
					'id' 			=> 'enable_pagination',
					'label'			=> __( 'Enable Pagination', 'wordpress-plugin-template' ),
					'description'	=> __( 'if checked then eventbrite will be queried in the typical manner of 50 events per request. If disabled a collectionfor every request, nothing is cached' ),
					'type'			=> 'checkbox',
					'default'		=> 'true'
				),
				array(
					'id' 			=> 'support_email',
					'label'			=> __( 'Support Emails' , 'eventbrite-integration' ),
					'description'	=> __( 'A comma separated list of email address that will receive errors within the plugin', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '',
					'placeholder'	=> __( 'name@domain.com', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'organizer_id',
					'label'			=> __( 'Organizer ID' , 'eventbrite-integration' ),
					'description'	=> __( 'You can find this on this page <a href="https://www.eventbrite.com/myprofile/">https://www.eventbrite.com/myprofile/</a>.', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '',
					'placeholder'	=> __( 'Organizer ID', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'cache_duration',
					'label'			=> __( 'Cache Duration' , 'eventbrite-integration' ),
					'description'	=> __( 'The length (in hours) you would like the cache to stay valid. Once the cache duration has expired the Eventbrite API will directly be accessed to get updated information.', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '1',
					'placeholder'	=> __( 'Cache Duration', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'event_detail_page',
					'label'			=> __( 'Event Detail Page' , 'eventbrite-integration' ),
					'description'	=> __( 'The name of the page used to display event details on.', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'event',
					'placeholder'	=> __( 'Event Detail Page', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'event_seo_url',
					'label'			=> __( 'Event SEO URL' , 'eventbrite-integration' ),
					'description'	=> __( 'The slug to use for SEO purposes', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'run',
					'placeholder'	=> __( 'Event SEO URL', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'event_id_variable',
					'label'			=> __( 'Event ID Variable' , 'eventbrite-integration' ),
					'description'	=> __( 'The variable name to use when viewing event details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'event_id',
					'placeholder'	=> __( 'Event ID Variable', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'event_metro_variable',
					'label'			=> __( 'Event Metro Variable' , 'eventbrite-integration' ),
					'description'	=> __( 'The variable name to use when viewing event details by metro', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'event_metro',
					'placeholder'	=> __( 'Event Metro Variable', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'event_metro_regex',
					'label'			=> __( 'Event Metro Regex' , 'eventbrite-integration' ),
					'description' 	=> __( 'The regular expressions used on the event name to extract the metro attribute' ),
					'type' 			=> 'text',
					'default'		=> '',
					'placeholder'	=> __( '', 'eventbrite-integration' ),
				),
				array(
					'id' 			=> 'clear_cache',
					'label'			=> __( 'Clear Eventbrite Cache', 'eventbrite-integration' ),
					'description'	=> __( 'Check this box and save to clear the eventbrite events cache.', 'eventbrite-integration' ),
					'type'			=> 'checkbox',
					'default'		=> ''
				),
			)
		);
		$settings['google'] = array(
			'title'					=> __( 'Google API', 'eventbrite-integration' ),
			'description'			=> __( 'The following settings are used to query google maps' ),
			'fields'				=> array(
				array(
					'id' 			=> 'google_api_key',
					'label'			=> __( 'Key' , 'eventbrite-integration' ),
					'description'	=> __( 'API key to use google maps V3. Find out more here <a href="https://developers.google.com/maps/documentation/javascript/tutorial">https://developers.google.com/maps/documentation/javascript/tutorial</a>', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '',
					'placeholder'	=> __( 'Key', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'google_api_region',
					'label'			=> __( 'Region' , 'eventbrite-integration' ),
					'description'	=> __( 'Region to orient google maps', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'US',
					'placeholder'	=> __( 'Region', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'enable_scroll_wheel',
					'label'			=> __( 'Enable Scroll Wheel', 'wordpress-plugin-template' ),
					'description'	=> __( 'if checked then the google map instances will zoom with the scroll wheel' ),
					'type'			=> 'checkbox',
					'default'		=> 'false'
				),
				array(
					'id' 			=> 'marker_icon',
					'label'			=> __( 'Marker Icon' , 'eventbrite-integration' ),
					'description'	=> __( 'An Image icon for the google maps marker. If no image is selected then the default google image will be used.', 'eventbrite-integration' ),
					'type'			=> 'image',
					'default'		=> '',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'map_style_name',
					'label'			=> __( 'Style Name' , 'eventbrite-integration' ),
					'description'	=> __( 'A name to give the map style', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'Events',
					'placeholder'	=> __( '', 'eventbrite-integration' )
				),
				array(
					'id' 			=> 'map_style',
					'label'			=> __( 'Custom Map Styling' , 'eventbrite-integration' ),
					'description'	=> __( 'Custom map styling to be applied to the google maps, Visit this page to learn more <a href="https://developers.google.com/maps/documentation/javascript/styling#styling_the_default_map">https://developers.google.com/maps/documentation/javascript/styling#styling_the_default_map</a>', 'eventbrite-integration' ),
					'type'			=> 'textarea',
					'default'		=> '[]',
					'placeholder'	=> __( 'Custom Map Styling', 'eventbrite-integration' )
				)
			)
		);
		$settings['ipinfo'] = array(
			'title'					=> __( 'IP Info API', 'eventbrite-integration' ),
			'description'			=> __( 'The following settings are used to query ipinfo ip locationing service' ),
			'fields'				=> array(
				array(
					'id' 			=> 'ipinfo_token',
					'label'			=> __( 'API Token' , 'eventbrite-integration' ),
					'description'	=> __( 'The token provided by <a href="https://ipinfo.io/pricing">ipinfo</a> to increase daily query limits', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '',
					'placeholder'	=> __( '', 'eventbrite-integration' )
				),
			)
		);
		$settings['ids'] = array(
			'title'					=> __( 'IDs', 'eventbrite-integration' ),
			'description'			=> __( 'IDs of elements to insert application information.', 'eventbrite-integration' ),
			'fields'				=> array(
				array(
					'id' 			=> 'upcoming_tag_id',
					'label'			=> __( 'Upcoming Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert the event list categorized by the event start date', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-sort-upcoming',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'alphabetical_tag_id',
					'label'			=> __( 'Alphabetical Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert the event list categorized by the name of an event attribute', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-sort-alphabetical',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'alphabetical_event_attribute',
					'label'			=> __( 'Alphabetical Event Attribute' , 'eventbrite-integration' ),
					'description'	=> __( 'The name of an event attribute to sort the events by when done alphabetically', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> 'venue.address.city',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'nearby_tag_id',
					'label'			=> __( 'Nearby Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert the event list categorized by location in proximity to the viewer', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-sort-nearby',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'map_tag_id',
					'label'			=> __( 'Map Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert a google map of the eventbrite events', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-map',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_links_tag_id',
					'label'			=> __( 'Event Links Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert eventbrite event links', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-event-links',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_tickets_tag_id',
					'label'			=> __( 'Event Tickets Tag ID' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert eventbrite event ticket details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '#eventbrite-event-tickets',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_private_class',
					'label'			=> __( 'Event Private Class' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert eventbrite event details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '.eventbrite-event-private',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_public_class',
					'label'			=> __( 'Event Public Class' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert eventbrite event details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '.eventbrite-event-public',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_sold_out_class',
					'label'			=> __( 'Event Sold Out Class' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID needs to be placed somewhere on the page for the <a href="http://backbonejs.org">Backbone</a> application to insert eventbrite event details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '.eventbrite-event-sold-out',
					'placeholder'	=> ''
				),
				array(
					'id' 			=> 'event_template_class',
					'label'			=> __( 'Event Template' , 'eventbrite-integration' ),
					'description'	=> __( 'This ID will be used by the  <a href="http://backbonejs.org">Backbone</a> application to extract the template contained therin and replace it with eventbrite event details', 'eventbrite-integration' ),
					'type'			=> 'text',
					'default'		=> '.eventbrite-event-template',
					'placeholder'	=> ''
				),
			)
		);
		$settings['templates'] = array(
			'title'					=> __( 'Templates', 'eventbrite-integration' ),
			'description'			=> __( 'Templates of different elements throughout the backbone application.', 'eventbrite-integration' ),
			'fields'				=> array(
				array(
					'id' 			=> 'event_template',
					'label'			=> __( 'Event List: Event Template' , 'eventbrite-integration' ),
					'description'	=> __( 'This will define the template to be used with the events in an event list', 'eventbrite-integration' ),
					'type'			=> 'textarea',
					'default'		=> "<span class=\"eventbrite-list-venue-name\">\n" .
											"\t<%= venue.address.city %>, <%= venue.address.region %>\n".
										"</span><br/>\n" .
										"<span class=\"eventbrite-list-start\">\n" .
											"\t<%= moment(start.local,moment.ISO_8601).format(\"MM-DD-YY\") %>\n" .
										"</span> | \n" .
										"<a href=\"<%=local_url%>\" target=\"_blank\">\n" .
											"\t<span class=\"eventbrite-list-sign-up\">\n" .
												"\t\t<% if(public) { %> View Details <%} else {%> Pre-Register Now <% } %>\n" .
											"\t</span>\n" .
										"</a>",
					'placeholder'	=> __( 'Placeholder text for this textarea', 'eventbrite-integration' )
				)
			)
		);


		$settings = apply_filters( $this->parent->_token . '_settings_fields', $settings );

		return $settings;
	}

	/**
	 * Register plugin settings
	 * @return void
	 */
	public function register_settings () {
		if ( is_array( $this->settings ) ) {

			// Check posted/selected tab
			$current_section = '';
			if ( isset( $_POST['tab'] ) && $_POST['tab'] ) {
				$current_section = $_POST['tab'];
			} else {
				if ( isset( $_GET['tab'] ) && $_GET['tab'] ) {
					$current_section = $_GET['tab'];
				}
			}

			foreach ( $this->settings as $section => $data ) {

				if ( $current_section && $current_section != $section ) continue;

				// Add section to page
				add_settings_section( $section, $data['title'], array( $this, 'settings_section' ), $this->parent->_token . '_settings' );

				foreach ( $data['fields'] as $field ) {

					// Validation callback for field
					$validation = '';
					if ( isset( $field['callback'] ) ) {
						$validation = $field['callback'];
					}

					// Register field
					$option_name = $this->base . $field['id'];
					register_setting( $this->parent->_token . '_settings', $option_name, $validation );

					// Add field to page
					add_settings_field( $field['id'], $field['label'], array( $this->parent->admin, 'display_field' ), $this->parent->_token . '_settings', $section, array( 'field' => $field, 'prefix' => $this->base ) );
				}

				if ( ! $current_section ) break;
			}
		}
	}

	public function settings_section ( $section ) {
		$html = '<p> ' . $this->settings[ $section['id'] ]['description'] . '</p>' . "\n";
		echo $html;
	}

	/**
	 * Load settings page content
	 * @return void
	 */
	public function settings_page () {

		// Build page HTML
		$html = '<div class="wrap" id="' . $this->parent->_token . '_settings">' . "\n";
			$html .= '<h2>' . __( 'Eventbrite Integration' , 'eventbrite-integration' ) . '</h2>' . "\n";

			$tab = '';
			if ( isset( $_GET['tab'] ) && $_GET['tab'] ) {
				$tab .= $_GET['tab'];
			}

			// Show page tabs
			if ( is_array( $this->settings ) && 1 < count( $this->settings ) ) {

				$html .= '<h2 class="nav-tab-wrapper">' . "\n";

				$c = 0;
				foreach ( $this->settings as $section => $data ) {

					// Set tab class
					$class = 'nav-tab';
					if ( ! isset( $_GET['tab'] ) ) {
						if ( 0 == $c ) {
							$class .= ' nav-tab-active';
						}
					} else {
						if ( isset( $_GET['tab'] ) && $section == $_GET['tab'] ) {
							$class .= ' nav-tab-active';
						}
					}

					// Set tab link
					$tab_link = add_query_arg( array( 'tab' => $section ) );
					if ( isset( $_GET['settings-updated'] ) ) {
						$tab_link = remove_query_arg( 'settings-updated', $tab_link );
					}

					// Output tab
					$html .= '<a href="' . $tab_link . '" class="' . esc_attr( $class ) . '">' . esc_html( $data['title'] ) . '</a>' . "\n";

					++$c;
				}

				$html .= '</h2>' . "\n";
			}

			$html .= '<form method="post" action="options.php" enctype="multipart/form-data">' . "\n";

				// Get settings fields
				ob_start();
				settings_fields( $this->parent->_token . '_settings' );
				do_settings_sections( $this->parent->_token . '_settings' );
				$html .= ob_get_clean();

				$html .= '<p class="submit">' . "\n";
					$html .= '<input type="hidden" name="tab" value="' . esc_attr( $tab ) . '" />' . "\n";
					$html .= '<input name="Submit" type="submit" class="button-primary" value="' . esc_attr( __( 'Save Settings' , 'eventbrite-integration' ) ) . '" />' . "\n";
				$html .= '</p>' . "\n";
			$html .= '</form>' . "\n";
		$html .= '</div>' . "\n";

		echo $html;
	}

	/**
	 * Main Eventbrite_Integration_Settings Instance
	 *
	 * Ensures only one instance of Eventbrite_Integration_Settings is loaded or can be loaded.
	 *
	 * @since 1.0.0
	 * @static
	 * @see Eventbrite_Integration()
	 * @return Main Eventbrite_Integration_Settings instance
	 */
	public static function instance ( $parent ) {
		if ( is_null( self::$_instance ) ) {
			self::$_instance = new self( $parent );
		}
		return self::$_instance;
	} // End instance()

	/**
	 * Cloning is forbidden.
	 *
	 * @since 1.0.0
	 */
	public function __clone () {
		_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?' ), $this->parent->_version );
	} // End __clone()

	/**
	 * Unserializing instances of this class is forbidden.
	 *
	 * @since 1.0.0
	 */
	public function __wakeup () {
		_doing_it_wrong( __FUNCTION__, __( 'Cheatin&#8217; huh?' ), $this->parent->_version );
	} // End __wakeup()

}
