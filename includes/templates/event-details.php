<?php
/**
 * Template Name: Eventbrite API: Event Details
 */
// load theme page
?>

<?php if (
	get_query_var( get_option('evi_event_id_variable', 'event_id' ) ) ||
	get_query_var( get_option('evi_event_metro_variable', 'event_metro' ) )
): ?>
	<?php require_once(get_template_directory() . '/page.php'); ?>
	<?php

		// if event_metro .. then get the ID
		if( get_query_var( get_option('evi_event_metro_variable', 'event_metro'), false ) )
		{

			$events = new Eventbrite_Query( apply_filters( 'eventbrite_query_args', array(
				'display_private' => true, // boolean
			)));

			$event_metro = get_query_var( get_option('evi_event_metro_variable') );

			$event_id = array_reduce($events->posts, function($carry, $event) use ($event_metro) {
				if( isset($carry) ) { return $carry; }
				elseif( stripos( preg_replace( "/[^\w]+/", "_", $event->post_title ), $event_metro) !== false ) { return $event->ID; }
				else { return null; }
			});

		}
		else
		{
			$event_id = get_query_var( 'event_id' );
		}

	?>
	<?php $event = new Eventbrite_Query( array( 'p' => $event_id ) ); ?>
	<script type="text/javascript">
		// don't trigger until the document is loaded
		jQuery( document ).ready(function() {
			// once loaded then trigger load-events
			jQuery( document ).trigger('load-event',<?= json_encode([
				'event' => $event->have_posts() ? $event->post : null,
				'evi_event_links_tag_id' => get_option('evi_event_links_tag_id', null),
				'evi_event_tickets_tag_id' => get_option('evi_event_tickets_tag_id', null),
				'evi_map_tag_id' => get_option('evi_map_tag_id', null),
				'evi_enable_scroll_wheel' => get_option('evi_enable_scroll_wheel',null),
				'evi_map_style' => get_option('evi_map_style',null),
				'evi_map_style_name' => get_option('evi_map_style_name',null),
				'evi_marker_icon' => get_option('evi_marker_icon',null) ? wp_get_attachment_thumb_url( get_option('evi_marker_icon') ) : null,
				'evi_event_metro_regex' => get_option('evi_event_metro_regex', null),
				'evi_event_private_class' => get_option('evi_event_private_class', null),
				'evi_event_public_class' => get_option('evi_event_public_class', null),
				'evi_event_sold_out_class' => get_option('evi_event_sold_out_class', null),
				'evi_event_template_class' => get_option('evi_event_template_class', null)
			]); ?>);
		});
	</script>

<?php else:
	// wp_redirect('//' . $_SERVER['HTTP_HOST'] . '/locations');
endif; ?>
