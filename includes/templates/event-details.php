<?php
/**
 * Template Name: Eventbrite API: Event Details
 */

// load theme page
require_once(get_template_directory() . '/page.php');
require_once(dirname(__FILE__) . "/js-libraries.php");
?>

<?php $event = new Eventbrite_Query( array( 'p' => get_query_var( 'event_id' ) ) ); ?>
<?php // var_dump($event); ?>
<?php if ( $event->have_posts() ) : ?>
<script type="text/javascript" src="<?= plugins_url('assets/js/details-app.js', plugin_dir_path( dirname(__FILE__) ) ); ?>"></script>
<script type="text/javascript">
	App.start(<?= json_encode([
		'event' => $event->post,
		'evi_event_links_tag_id' => get_option('evi_event_links_tag_id', null),
		'evi_event_tickets_tag_id' => get_option('evi_event_tickets_tag_id', null),
		'evi_event_when_where_tag_id' => get_option('evi_event_when_where_tag_id', null),
		'evi_enable_scroll_wheel' => get_option('evi_enable_scroll_wheel',null),
		'evi_map_style' => get_option('evi_map_style',null),
		'evi_marker_icon' => get_option('evi_marker_icon',null) ? wp_get_attachment_thumb_url( get_option('evi_marker_icon') ) : null,
	]); ?>);
</script>

<?php endif; ?>
