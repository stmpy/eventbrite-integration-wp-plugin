<?php

if ( ! defined( 'ABSPATH' ) ) exit;

class Eventbrite_Integration_Taxonomy {

	/**
	 * The name for the taxonomy.
	 * @var 	string
	 * @access  public
	 * @since 	1.0.0
	 */
	public $taxonomy;

	/**
	 * The plural name for the taxonomy terms.
	 * @var 	string
	 * @access  public
	 * @since 	1.0.0
	 */
	public $plural;

	/**
	 * The singular name for the taxonomy terms.
	 * @var 	string
	 * @access  public
	 * @since 	1.0.0
	 */
	public $single;

	/**
	 * The array of post types to which this taxonomy applies.
	 * @var 	array
	 * @access  public
	 * @since 	1.0.0
	 */
	public $post_types;

	public function __construct ( $taxonomy = '', $plural = '', $single = '', $post_types = array() ) {

		if ( ! $taxonomy || ! $plural || ! $single ) return;

		// Post type name and labels
		$this->taxonomy = $taxonomy;
		$this->plural = $plural;
		$this->single = $single;
		if ( ! is_array( $post_types ) ) {
			$post_types = array( $post_types );
		}
		$this->post_types = $post_types;

		// Register taxonomy
		add_action('init', array( $this, 'register_taxonomy' ) );
	}

	/**
	 * Register new taxonomy
	 * @return void
	 */
	public function register_taxonomy () {

        $labels = array(
            'name' => $this->plural,
            'singular_name' => $this->single,
            'menu_name' => $this->plural,
            'all_items' => sprintf( __( 'All %s' , 'eventbrite-integration' ), $this->plural ),
            'edit_item' => sprintf( __( 'Edit %s' , 'eventbrite-integration' ), $this->single ),
            'view_item' => sprintf( __( 'View %s' , 'eventbrite-integration' ), $this->single ),
            'update_item' => sprintf( __( 'Update %s' , 'eventbrite-integration' ), $this->single ),
            'add_new_item' => sprintf( __( 'Add New %s' , 'eventbrite-integration' ), $this->single ),
            'new_item_name' => sprintf( __( 'New %s Name' , 'eventbrite-integration' ), $this->single ),
            'parent_item' => sprintf( __( 'Parent %s' , 'eventbrite-integration' ), $this->single ),
            'parent_item_colon' => sprintf( __( 'Parent %s:' , 'eventbrite-integration' ), $this->single ),
            'search_items' =>  sprintf( __( 'Search %s' , 'eventbrite-integration' ), $this->plural ),
            'popular_items' =>  sprintf( __( 'Popular %s' , 'eventbrite-integration' ), $this->plural ),
            'separate_items_with_commas' =>  sprintf( __( 'Separate %s with commas' , 'eventbrite-integration' ), $this->plural ),
            'add_or_remove_items' =>  sprintf( __( 'Add or remove %s' , 'eventbrite-integration' ), $this->plural ),
            'choose_from_most_used' =>  sprintf( __( 'Choose from the most used %s' , 'eventbrite-integration' ), $this->plural ),
            'not_found' =>  sprintf( __( 'No %s found' , 'eventbrite-integration' ), $this->plural ),
        );

        $args = array(
        	'label' => $this->plural,
        	'labels' => apply_filters( $this->taxonomy . '_labels', $labels ),
        	'hierarchical' => true,
            'public' => true,
            'show_ui' => true,
            'show_in_nav_menus' => true,
            'show_tagcloud' => true,
            'meta_box_cb' => null,
            'show_admin_column' => true,
            'update_count_callback' => '',
            'query_var' => $this->taxonomy,
            'rewrite' => true,
            'sort' => '',
        );

        register_taxonomy( $this->taxonomy, $this->post_types, apply_filters( $this->taxonomy . '_register_args', $args, $this->taxonomy, $this->post_types ) );
    }

}
