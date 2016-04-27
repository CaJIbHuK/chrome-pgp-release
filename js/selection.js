//данный код инжектируется в загруженную страницу (см параметры в манифесте content_scripts)


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (window.location.href !== request.pageUrl)
      return;

    if (request.hasOwnProperty("action"))
      processAction(request.action);
  }
);

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.hasOwnProperty('action')) {
      if (request.action === 'closeModal') {
        $("#passphrase_modal").toggle(false);
        $("#passphrase_modal").removeData();
        $("body").removeClass('lock-pgp');
      }
    }
  });


$(document).ready(function() {
  document.addEventListener("contextmenu", function(e) {
    if (e.ctrlKey && !e.altKey) {
      e.preventDefault();
      processAction("encrypt");
    } else if (e.ctrlKey && e.altKey) {
      e.preventDefault();
      processAction("decrypt");
    }
  });

  $("body").append(getModalHtml());
  $("#passphrase_frame").attr({
    src: chrome.extension.getURL("modal.html")
  });
  $("#passphrase_modal").toggle(false);
  $("#pgp_modal").toggle(false);
  initModalEvents();
});


function processAction(actionType) {
  chrome.runtime.sendMessage(chrome.runtime.id, {
    action: "get",
    data: ["FoundCurrentPassphrase"]
  }, function(response) {
    prepareData(response.result, actionType);
  });
}

function prepareData(settings, actionType) {

  var selection = window.getSelection();
  var selected = selection.toString();
  if (actionType === "decrypt")
    selected = formatSelected(selected);

  if (selected === "") {
    alert(
      "Nothing is selected! Probably, you can't use pgp in this text area."
    );
    return;
  }


  if (settings.hasOwnProperty("FoundCurrentPassphrase") && settings.FoundCurrentPassphrase) {
    var data = {
      selection: selected
    };

    chrome.runtime.sendMessage(chrome.runtime.id, {
      action: actionType,
      data: data
    }, function(
      response) {
      replaceResult(response);
    });

  } else {

    $("#passphrase_modal").toggle(true);
    $("#passphrase_frame").focus();
    $("body").addClass('lock-pgp');
  }

}

function getModalHtml() {
  var text =
    `  <!-- The Modal -->
<div id="pgp_modal" class="modal modal-pgp">
<!-- Modal content -->
<div class="modal-content modal-content-pgp">
<span class="close-pgp" id="pgp_close">x</span>
<h2 class="modal-title-pgp" id="result_label">Result:</h2>
<textarea class="form-control-pgp" id="pgp_result"></textarea>
<button type="button" class="btn-pgp btn-default-pgp" id="pgp_copy" data-dismiss="modal">Copy&Close</button>
</div></div>
<!-- The Modal -->
   <div id="passphrase_modal" class="modal modal-pgp">
   <iframe id="passphrase_frame">
     </iframe>
    </div>
     `;

  return text;
}


function initModalEvents() {

  $("#pgp_close").click(function(e) {
    $("#pgp_modal").toggle(false);
    $("#pgp_result").val("");
    $("body").removeClass('lock-pgp');
  });
  $("#pgp_modal").bind("keyup", function(e) {
    if (e.keyCode == 27)
      $("#pgp_close").click();
  });

  $("#pgp_copy").click(function(event) {
    var result = document.getElementById('pgp_result');
    result.select();
    document.execCommand("copy");
    $("#pgp_close").click();
  });

}


function replaceResult(response) {

  if (response.hasOwnProperty('valid')) {
    if (!response.valid) {
      alert('Integrity verification failed during decryption!');
    }
  }

  if (!document.execCommand("insertText", false, response.result)) {
    $("#pgp_modal").toggle(true);
    $("body").addClass('lock-pgp');
    $("#pgp_result").val(response.result);
  }

}

function formatSelected(text) {
  return text.replace("-----BEGIN PGP MESSAGE-----",
    "-----BEGIN PGP MESSAGE-----\n");
}
