jQuery(document).ready(function($) {

  /* ***** Colour picker ***** */

  /* ***** Uploading images ***** */
  var file_frame;
  file_frame = false;
  jQuery.fn.uploadMediaFile = function(button, preview_media) {
    var button_id, field_id, preview_id;
    button_id = button.attr('id');
    field_id = button_id.replace('_button', '');
    preview_id = button_id.replace('_button', '_preview');
    if (file_frame) {
      file_frame.open();
      return;
    }
    file_frame = wp.media.frames.file_frame = wp.media({
      title: jQuery(this).data('uploader_title'),
      button: {
        text: jQuery(this).data('uploader_button_text')
      },
      multiple: false
    });
    file_frame.on('select', function() {
      var attachment;
      attachment = file_frame.state().get('selection').first().toJSON();
      jQuery("#" + field_id).val(attachment.id);
      if (preview_media) {
        jQuery("#" + preview_id).attr('src', (attachment.sizes.thumbnail ? attachment.sizes.thumbnail : attachment.sizes.full).url);
      }
      return file_frame = false;
    });
    return file_frame.open();
  };
  jQuery('.image_upload_button').click(function() {
    return jQuery.fn.uploadMediaFile(jQuery(this), true);
  });
  return jQuery('.image_delete_button').click(function() {
    jQuery(this).closest('td').find('.image_data_field').val('');
    jQuery(this).closest('td').find('.image_preview').remove();
    return false;
  });
});
