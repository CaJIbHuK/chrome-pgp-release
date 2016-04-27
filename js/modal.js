$(document).ready(function() {

  $("#passphrase_ok").click(function(e) {
    chrome.runtime.sendMessage(chrome.runtime.id, {
      action: "passCheck",
      data: $("#passphrase").val()
    }, function(response) {
      if (response.hasOwnProperty('result')) {
        if (response.result === 'ok') {
          $("#passphrase").removeClass('invalid-passphrase');
          $("#passphrase").val('');
          $("#passphrase_label_error").attr({
            hidden: true
          });
        } else {
          $("#passphrase").addClass('invalid-passphrase');
          $("#passphrase_label_error").attr({
            hidden: false
          });
        }
      }
    });
  });

  $("#passphrase_cancel").click(function(e) {
    $("#passphrase").removeClass('invalid-passphrase');
    $("#passphrase").val('');
    $("#passphrase_label_error").attr({
      hidden: true
    });


    chrome.runtime.sendMessage(chrome.runtime.id, {
      action: "closeModal"
    });

  });

  $("#passphrase_modal").bind("keyup", function(event) {
    if (event.keyCode == 27)
      $("#passphrase_cancel").click();
    else if (event.keyCode == 13)
      $("#passphrase_ok").click();
  });

});
