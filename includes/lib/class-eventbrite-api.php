<?php
/**
 * Eventbrite_API class, which interacts with the Keyring service to make the actual API requests to Eventbrite.
 *
 * @package Eventbrite_API
 */

// This plugin requires the Keyring plugin and its Eventbrite service.
if ( ! class_exists( 'Keyring_Service_Eventbrite' ) ) {
	exit;
}

class Eventbrite_API extends Keyring_Service_Eventbrite {

	static $instance;

	/**
	 * Constructor.
	 */
	function __construct() {
		parent::__construct();

		// Remove duplicate UI elements caused by constructors.
		remove_action( 'keyring_eventbrite_manage_ui', array( $this, 'basic_ui' ) );
		remove_filter( 'keyring_eventbrite_basic_ui_intro', array( $this, 'basic_ui_intro' ) );

		self::$instance = $this;

		$token = get_option( 'eventbrite_api_token' );
		if ( ! empty( $token ) ) {
			$this->set_token( Keyring::init()->get_token_store()->get_token( array( 'type' => 'access', 'id' => $token ) ) );
		}
		$this->define_endpoints();
		add_action( 'keyring_connection_verified', array( $this, 'keyring_connection_verified' ), 10, 3 );
		add_action( 'keyring_connection_deleted', array( $this, 'keyring_connection_deleted' ) );
	}

	/**
	 * Get the user's API token.
	 *
	 * @access public
	 *
	 * @return string The user's token
	 */
	public function get_token() {
		$token = get_option( 'eventbrite_api_token' );
		if ( empty( $token ) )
			return false;

		$this->set_token( Keyring::init()->get_token_store()->get_token( array( 'type' => 'access', 'id' => $token ) ) );
		return $this->token;
	}

	/**
	 * Define API endpoints.
	 *
	 * @access private
	 */
	private function define_endpoints() {
		$token = self::$instance->get_token();
		if ( empty( $token ) )
			return;

		$this->set_endpoint( 'user_owned_events', self::API_BASE . 'users/' . $token->get_meta( 'user_id' ) . '/owned_events', 'GET' );
		$this->set_endpoint( 'event_details', self::API_BASE . 'events/', 'GET' );
		$this->set_endpoint( 'event_search', self::API_BASE . 'events/search/', 'GET' );
	}

	/**
	 * Make an API call.
	 *
	 * @access public
	 *
	 * @param  string $endpoint API endpoint supported by the plugin.
	 * @param  array $query_params Parameters to be passed with the API call.
	 * @param  integer $object_id Eventbrite event ID used when requesting a single event from the API.
	 * @return object API response if successful, error (Keyring_Error or WP_Error) otherwise
	 */
	public static function call( $endpoint, $query_params = array(), $object_id = null ) {
		$token = self::$instance->get_token();
		if ( empty( $token ) )
			return new Keyring_Error( '400', 'No token present for the Eventbrite API.' );

		$endpoint_url = self::$instance->{$endpoint . '_url'};
		$method = self::$instance->{$endpoint . '_method'};
		$params = array( 'method' => $method );

		if ( ! empty( $object_id ) && is_numeric( $object_id ) ) {
			$endpoint_url = trailingslashit( $endpoint_url ) . absint( $object_id );
		}

		if ( 'GET' == $method ) {
			$endpoint_url = add_query_arg( $query_params, $endpoint_url );
		} else if ( 'POST' == $method ) {
			$params['body'] = $query_params;
		} else {
			return new WP_Error( '500', 'Method ' . $method . ' is not implemented in the Eventbrite API.' );
		}

		return self::attemptRequest($endpoint_url, $query_params, 3);
	}

	public static function attemptRequest($endpoint_url, $query_params, $attemptMax = 3, $attempt = 1) {
		$response = self::$instance->request( $endpoint_url, array_merge($query_params,array('timeout' => 10)) );

		if( is_wp_error($response) ) {
			foreach($response->get_error_codes() as $code) {
				$r = $response->get_error_messages($code);

				// check if max attempts made or response is a 404
				if($attempt >= $attemptMax || ($code == 404)) {
					return self::emailError($endpoint_url, $query_params, $response);
				}
			}

			// try again
			return self::attemptRequest($endpoint_url, $query_params, $attemptMax, ++$attempt);
		} elseif (is_object($response) && ! get_option('evi_enable_pagination',true)) {

			// multiple pages ... I need them all for the final response
			if(isset($response->pagination) && ((integer) $response->pagination->page_count > 1 && (integer) $response->pagination->page_number == 1)) {
				$unpagedResponse = $response;
				$pagination = $response->pagination;
				unset($unpagedResponse->pagination);

				// get all consecutive pages after page 1 (which is the default returned page)
				for($i = 2; $i <= (integer) $pagination->page_count; $i++) {
					$endpoint_url = add_query_arg( ['page' => $i ], $endpoint_url);
					$resp = self::attemptRequest($endpoint_url,$query_params, $attemptMax);
					unset($resp->pagination);
					$unpagedResponse = (object) array_merge_recursive((array) $unpagedResponse, (array) $resp);
				}
				$response = $unpagedResponse;
			}
		}

		// no error
		return $response;
	}

	public static function emailError($endpoint_url, $query_params, $response) {
		ob_start();
			echo "<pre><h3>Endpoint: " . $endpoint_url . "</h3>";
			if(isset($_SERVER['HTTP_REFERER'])) { echo "<h4>referrer: " . $_SERVER['HTTP_REFERER'] . '</h4>'; }
			var_dump($query_params);
			echo "<h3>Errors</h3>";
			foreach($response->get_error_codes() as $code) {
				echo "<h4>" . $code . "</h4>";
				var_dump($response->get_error_messages($code));
				echo "</pre><br/><br/>\r\n";
			}
		$output = ob_get_clean();
		echo $output;
		$recipients = array(
			get_option('admin_email')
		);
		if(get_option('evi_support_email', null)) {
			if(stripos(get_option('evi_support_email'),',') !== false) {
				$support = array_map('trim', explode(',', get_option('evi_support_email')));
				$recipients = array_merge($recipients,$support);
			} else {
				$recipients[] = get_option('evi_support_email');
			}
		}
		wp_mail( $recipients, 'Keyring Response Error', $output, array(
			"From: " . get_option('admin_email'),
			"MIME-Version: 1.0",
			"Content-Type: text/html; charset=ISO-8859-1"
		));
		// check if there was an error and try again
		return $response;
	}

	/**
	 * Save the token for our Keyring connection.
	 *
	 * @param string $service The Keyring service being checked.
	 * @param int $id The current user's token.
	 * @param object $request_token Keyring_Request_Token object containing info required for the service's API call.
	 */
	function keyring_connection_verified( $service, $id, $request_token ) {
		if ( 'eventbrite' != $service || 'eventbrite' != $request_token->name ) {
			return;
		}

		update_option( 'eventbrite_api_token', $id );
	}

	/**
	 * Remove the stored token when the Keyring connection is lost.
	 *
	 * @param string $service The Keyring service connection being deleted.
	 */
	function keyring_connection_deleted( $service ) {
		if ( 'eventbrite' != $service ) {
			return;
		}

		delete_option( 'eventbrite_api_token' );
	}

}

new Eventbrite_API;
