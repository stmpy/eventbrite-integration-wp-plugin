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
		'evi_event_detail_page' => get_option('evi_event_detail_page'),
		'evi_event_id_variable' => get_option('evi_event_id_variable'),
		'evi_organizer_id' => get_option('evi_organizer_id'),
		'evi_upcoming_tag_id' => get_option('evi_upcoming_tag_id'),
		'evi_alphabetical_tag_id' => get_option('evi_alphabetical_tag_id'),
		'evi_alphabetical_event_attribute' => get_option('evi_alphabetical_event_attribute'),
		'evi_nearby_tag_id' => get_option('evi_nearby_tag_id'),
		'evi_event_template' => get_option('evi_event_template'),
	]); ?>);
</script>
<?php endif; ?>
