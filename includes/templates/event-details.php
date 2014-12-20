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
<link rel="stylesheet" href="<?= plugins_url('icomoon/style.css', __FILE__ ); ?>">
<script type="text/javascript" src="<?= plugins_url('assets/js/details-app.js', plugin_dir_path( dirname(__FILE__) ) ); ?>"></script>
<script type="text/javascript">
	App.start(<?= json_encode([
		'event' => $event->post
	]); ?>);
</script>

<?php endif; ?>
