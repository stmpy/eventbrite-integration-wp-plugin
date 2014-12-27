jQuery(document).ready ($) ->

	### ***** Colour picker ***** ###

	# $('.colorpicker').hide();
	# $('.colorpicker').each( function() {
	# 	$(this).farbtastic( $(this).closest('.color-picker').find('.color') );
	# });

	# $('.color').click(function() {
	# 	$(this).closest('.color-picker').find('.colorpicker').fadeIn();
	# });

	# $(document).mousedown(function() {
	# 	$('.colorpicker').each(function() {
	# 		var display = $(this).css('display');
	# 		if ( display == 'block' )
	# 			$(this).fadeOut();
	# 	});
	# });


	### ***** Uploading images ***** ###

	file_frame = false

	jQuery.fn.uploadMediaFile = ( button, preview_media ) ->
		button_id = button.attr('id')
		field_id = button_id.replace( '_button', '' )
		preview_id = button_id.replace( '_button', '_preview' )

		# If the media frame already exists, reopen it.
		if file_frame
			file_frame.open()
			return;

		# Create the media frame.
		file_frame = wp.media.frames.file_frame = wp.media
			title: jQuery( @ ).data( 'uploader_title' )
			button:
				text: jQuery( @ ).data( 'uploader_button_text' )
			multiple: false

		# When an image is selected, run a callback.
		file_frame.on 'select', () ->
			attachment = file_frame.state().get('selection').first().toJSON()
			jQuery("#"+field_id).val(attachment.id)
			if preview_media
				jQuery("#"+preview_id).attr('src',(if attachment.sizes.thumbnail then attachment.sizes.thumbnail else attachment.sizes.full).url)

			file_frame = false

		# Finally, open the modal
		file_frame.open()

	jQuery('.image_upload_button').click () ->
		jQuery.fn.uploadMediaFile( jQuery(this), true )

	jQuery('.image_delete_button').click () ->
		jQuery(this).closest('td').find( '.image_data_field' ).val( '' )
		jQuery(this).closest('td').find( '.image_preview' ).remove()
		false
