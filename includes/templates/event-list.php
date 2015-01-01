<?php
/**
 * Template Name: Eventbrite API: Event List
 */

// load theme page
require_once(get_template_directory() . '/page.php');
require_once(dirname(__FILE__) . "/js-libraries.php");
?>

<?php // Set up and call our Eventbrite query. ?>
<?php $events = new Eventbrite_Query( apply_filters( 'eventbrite_query_args', array(
	'display_private' => true, // boolean
	// 'limit' => null,            // integer
	// 'organizer_id' => null,     // integer
	// 'p' => null,                // integer
	// 'post__not_in' => null,     // array of integers
	// 'venue_id' => null,         // integer
))); ?>

<?php if ( is_object($events) && $events->have_posts() ) : ?>
<script type="text/javascript" src="<?= plugins_url('assets/js/list-app.js', plugin_dir_path( dirname(__FILE__) ) ); ?>"></script>
<script type="text/javascript">
	App.start(<?= json_encode([
		'events' => $events->posts,
		'evi_event_detail_page' => get_option('evi_event_detail_page',null),
		'evi_event_id_variable' => get_option('evi_event_id_variable',null),
		'evi_organizer_id' => get_option('evi_organizer_id',null),
		'evi_upcoming_tag_id' => get_option('evi_upcoming_tag_id',null),
		'evi_alphabetical_tag_id' => get_option('evi_alphabetical_tag_id',null),
		'evi_alphabetical_event_attribute' => get_option('evi_alphabetical_event_attribute',null),
		'evi_nearby_tag_id' => get_option('evi_nearby_tag_id',null),
		'evi_map_tag_id' => get_option('evi_map_tag_id',null),
		'evi_event_template' => get_option('evi_event_template',null),
		'evi_enable_scroll_wheel' => get_option('evi_enable_scroll_wheel',null),
		'evi_map_style' => get_option('evi_map_style',null),
		'evi_map_style_name' => get_option('evi_map_style_name',null),
		'evi_marker_icon' => get_option('evi_marker_icon',null) ? wp_get_attachment_thumb_url( get_option('evi_marker_icon') ) : null,
	]); ?>);
</script>
<?php endif; ?>
