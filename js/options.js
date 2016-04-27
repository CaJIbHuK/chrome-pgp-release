var openpgp = window.openpgp;
setOpenpgpConfig();

$(window).ready(function() {

	if (!chrome.runtime.id)
		location.reload();

	changePill("main_opt");

	$("#menu").children('ul').children('li').click(function(event) {
		changePill(event.currentTarget.id);
	});

});

function changePill(id) {
	chrome.runtime.sendMessage(chrome.runtime.id, {
		action: "get",
		id: id
	}, function(response) {
		changePillWithData(response.id, response.result);
	});
}

function changePillWithData(id, dataFromStorage) {

	$(".active").removeClass('active');
	var element = $("#" + id + "").addClass('active');

	$("#current-settings").remove();

	var context = getContext(id, dataFromStorage);

	var data = {
		title: context[0].main_title,
		settings: context[1]
	};

	var templateScript = $("#template").html();
	var template = Handlebars.compile(templateScript);
	$("#main_settings").append(template(data));

	initEvents(id);
}

function getContext(id, data) {
	if (id == "main_opt") {
		return [{
				main_title: "Main settings"
			},
			[{
				title: "",
				content: getContent("my_keys", data)
			}]
		];
	} else if (id == "keys_opt") {
		return [{
				main_title: "My keys"
			},
			[{
				title: "",
				content: getContent("pub_keys", data)
			}]
		];
	} else if (id == "gen_opt") {
		return [{
				main_title: "Key generation"
			},
			[{
				title: "",
				content: getContent("subject")
			}, {
				title: "",
				content: getContent("key_gen")
			}]
		];
	} else if (id == "about_opt") {
		return [{
				main_title: "About"
			},
			[{
				title: "Author",
				content: getContent("about")
			}]
		];
	}
}

function getContent(name, data = undefined) {

	var text;

	if (name == "pub_keys") {

		text = getPKTable();

		var tableRows = "";
		if (data !== undefined && data.hasOwnProperty("PublicKeys")) {
			var publicKeys = data.PublicKeys;
			for (var ids in publicKeys) {
				var id_name = ids.substring(0, ids.indexOf(":"));
				var email = ids.substring(ids.indexOf(":") + 1);

				tableRows +=
					`
			      <tr id="tr_pk">
			      	<td id="td_check" class="check-box"></td>
			        <td id="td_name">` +
					id_name + `</td>
			        <td id="td_email">` + email +
					`</td>
			        <td id="td_pk">` + publicKeys[ids] +
					`</td>
			      </tr>	`;
			}
		}

		return text.replace("%rows%", tableRows);

	} else if (name == "subject") {
		text =
			`
		<div id="subject">
			<div class="form-group">
				<label for="subj_name" class="control-label col-md-2">Name:</label>
				<div class="col-md-8">
		 			<input type="text" class="form-control" id="subj_name" data-toggle="tooltip" data-placement="right" title="empty" placeholder="John Smith">
		 		</div>
		 	</div>
		 	<div class="form-group">
				<label for="subj_email" class="control-label col-md-2">Email:</label>
				<div class="col-md-8">
		 			<input type="text" class="form-control" id="subj_email" data-toggle="tooltip" data-placement="right" title="invalid" placeholder="john@example.com">
			 	</div>
		 	</div>
		 	<div class="form-group">
				<label for="subj_passphrase" class="control-label col-md-2">Passpharse:</label>
				<div class="col-md-8">
		 			<input type="password" class="form-control" id="subj_passphrase" data-toggle="tooltip" data-placement="right" title="empty" placeholder="key">
			 	</div>
		 	</div>
		 </div>`;

		return text;

	} else if (name == "key_gen") {
		text =
			`
			<div class="form-group">
				<div class="col-md-5">
					<label for="gen_priv_key" class="control-label">Private key:</label>
					<textarea class="form-control gen-key-text" rows="5" id="gen_priv_key" readonly></textarea>
				</div>
				<div class="col-md-5">
					<label for="gen_pub_key" class="control-label">Public key:</label>
					<textarea class="form-control gen-key-text" rows="5" id="gen_pub_key" readonly></textarea>
				</div>
			</div>
			<div class="form-group btn-group col-md-5">
					<input type="button" class="btn btn-primary" id="generate" value="Generate"></input>
					<input type="reset" class="btn btn-primary" id="clear" value="Clear"></input>
					<input type="button" class="btn btn-success" id="save" value="Download"></input>
					<div id="preloader-container" class="hidden">
						<img id="loader" src="images/loader.gif">
					</div>
			</div>
			`;
		return text;


	} else if (name == "my_keys") {

		text =
			`
		<div class="form-group">
			<div class="col-md-5">
				<label for="my_priv_key" class="control-label">Private key:</label>
				<textarea class="form-control gen-key-text" rows="5" id="my_priv_key" readonly>%priv_key%</textarea>
			</div>
			<div class="col-md-5">
				<label for="my_pub_key" class="control-label">Public key:</label>
				<textarea class="form-control gen-key-text" rows="5" id="my_pub_key" readonly>%pub_key%</textarea>
			</div>
		</div>
		<h4><small>drag&drop files with keys into the corresponding textarea</small></h4>
		<div class="form-group btn-group col-md-5">
			<input type="reset" class="btn btn-primary" id="clear_my_keys" value="Clear"></input>
			<input type="button" class="btn btn-success" id="save_my_keys" value="Download"></input>
		</div>`;

		if (data !== undefined && data.hasOwnProperty("MyKeys")) {
			text = text.replace("%priv_key%", data.MyKeys.private_key);
			text = text.replace("%pub_key%", data.MyKeys.public_key);
		} else {
			text = text.replace("%priv_key%", "");
			text = text.replace("%pub_key%", "");
		}

		return text;

	} else if (name == "about") {

		return `Anton Zaslavskii`;
	}
}

function getPKTable() {

	var table =
		`
	<div class="form-group" id="pk_table_div">
		<div class="container col-md-12">
	  		<table class="table table-hover" id="pk_table">
	    		<thead>
	      			<tr>
	      				<th id="th_check"><span data-toggle="tooltip" id="check_all" title="check/uncheck all" class="glyphicon glyphicon-unchecked"></span></th>
	        			<th>Name</th>
			        	<th>Email</th>
	        			<th>Public key</th>
	      			</tr>
	    		</thead>
	    		<tbody> %rows%
	    		</tbody>
	  		</table>
				<h4><small>drag&drop files with PK into the table</small></h4>
		</div>
	</div>
	<div class="form-group btn-group col-md-5 btn-group-pk">
  		<input type="button" class="btn btn-primary clear_key_round" id="clear_keys" value="Clear"></input>
  		<input type="button" class="btn btn-danger hidden" id="del" value="Delete"></input>
			<input type="button" class="btn btn-success hidden" id="download" value="Download"></input>
	</div>
	`;

	return table;
}

function initEvents(id) {
	if (id == "main_opt") {

		//my keys events
		var myPubKeyText = document.getElementById("my_pub_key");
		var myPrivKeyText = document.getElementById("my_priv_key");

		myPubKeyText.addEventListener("dragover", function(event) {
			event.preventDefault(); // отменяем действие по умолчанию
		}, false);

		myPrivKeyText.addEventListener("dragover", function(event) {
			event.preventDefault(); // отменяем действие по умолчанию
		}, false);

		myPrivKeyText.addEventListener("drop", function(event) {
			dropFile(event, addMyPrivKey);
		}, false);

		myPubKeyText.addEventListener("drop", function(event) {
			dropFile(event, addMyPubKey);
		}, false);

		$("#clear_my_keys").click(function(event) {
			clearKeys("MyKeys", "main_opt");
		});

		$("#save_my_keys").click(function(event) {
			if ($("#my_priv_key").text() && $("#my_pub_key").text()) {
				saveTextAsFile($("#my_priv_key").text(), "my_private_key.txt");
				saveTextAsFile($("#my_pub_key").text(), "my_public_key.txt");
			}
		});

	} else if (id == "keys_opt") {

		$('[data-toggle="tooltip"]').tooltip();

		var checked = false;
		$("#check_all").click(function(event) {
			checked = !checked;
			if (!checked) {
				$("#check_all").removeClass('glyphicon-check');
				$("#check_all").addClass('glyphicon-unchecked');
				$("[id=tr_pk][class*=danger]").children("[id=td_check]").click();
				$("[id=tr_pk][class!=danger]").children("[id=td_check]").html('');
			} else {
				$("[id=tr_pk][class!=danger]").children("[id=td_check]").click();
				$("#check_all").removeClass('glyphicon-unchecked');
				$("#check_all").addClass('glyphicon-check');
			}
		});

		$("[id=tr_pk]").hover(function() {
			if (!$(this).hasClass('danger'))
				$(this).children('#td_check').html(
					"<span class='glyphicon glyphicon-ok grey'></span>");
		}, function() {
			if (!$(this).hasClass('danger'))
				$(this).children('#td_check').html(
					"");
		});

		$("[id=td_check]").click(function(event) {
			var parent = $(this).parent("tr");

			if (parent.hasClass('danger')) {
				parent.removeClass('danger');
				$(this).html("<span class='glyphicon glyphicon-ok grey'></span>");
			} else {
				parent.addClass('danger');
				$(this).html("<span class='glyphicon glyphicon-ok black'></span>");
			}

			visibilityPKTableButtons();
		});

		//work with PK table
		$("#del").click(function(event) {
			$("[id=tr_pk][class*=danger]>[id=td_check]").html();
			var keys = [];
			$("[id=tr_pk][class*=danger]").each(function(index, el) {
				keys.push($(el).children('#td_name').text() + ":" + $(el).children(
					'#td_email').text());
				$(el).removeClass('danger');
			});
			removePK(keys);
			$("#check_all").removeClass('glyphicon-check');
			$("#check_all").addClass('glyphicon-unchecked');
			visibilityPKTableButtons();
		});

		$("#clear_keys").click(function(event) {
			clearKeys("PublicKeys", "keys_opt");
		});

		$("#download").click(function(event) {
			$("[id=tr_pk][class*=danger]").each(function(index, el) {
				saveTextAsFile($(el).children("#td_pk").text(), "public_key(" + $(el).children(
						"#td_name").text() +
					").txt");
				$(el).removeClass('danger');
				$(el).children('#td_check').html('');
			});
			visibilityPKTableButtons();
			$("#check_all").removeClass('glyphicon-check');
			$("#check_all").addClass('glyphicon-unchecked');
		});

		//modal with details about keys
		$("[id=tr_pk]>[id!=td_check]").click(function(event) {
			var row = $(event.currentTarget).parent("tr");
			var textPK = row.children('#td_pk').text();
			var modal = $("#edit_modal");
			$("#edit_name").text(row.children('#td_name').text());
			$("#edit_email").text(row.children('#td_email').text());
			$("#edit_field").text(textPK);

			modal.modal();
		});

		$("#close_span").click(function(event) {
			$("#edit_modal").modal('hide');
		});

		$("#download_pk").unbind('click');
		$("#download_pk").click(function(event) {
			saveTextAsFile($("#edit_field").text(), "public_key(" + $("#edit_name").text() +
				").txt");
		});

		$("#delete_pk").unbind('click');
		$("#delete_pk").click(function(event) {
			removePK([$("#edit_name").text() + ":" + $("#edit_email").text()]);
			$("#edit_modal").modal('hide');
		});


		$(".settings-container").bind("dragenter", function(event) {
			event.preventDefault();
			event.stopPropagation();

			$("#modal_drag").modal();

			$("#dropzone").bind("dragleave", function(event) {
				$("#modal_drag").modal("hide");
				$("#dropzone").unbind("dragleave");
				$("#dropzone").unbind("dragover");
				$("#dropzone").unbind("drop");
				$("#dropzone").unbind("dragenter");
			});

			$("#dropzone").bind("dragover", function(event) {
				event.preventDefault();
				event.stopPropagation();
			});

			$("#dropzone").bind("dragenter", function(event) {
				event.preventDefault();
				event.stopPropagation();
			});

			$("#dropzone").bind("drop", function(event) {
				event.preventDefault();
				event.stopPropagation();

				dropPKFiles(event.originalEvent);

				$("#modal_drag").modal("hide");
				$("#dropzone").unbind("dragleave");
				$("#dropzone").unbind("dragover");
				$("#dropzone").unbind("drop");
				$("#dropzone").unbind("dragenter");
			});
		});

	} else if (id == "gen_opt") {
		$("[data-toggle=tooltip]").tooltip({
			trigger: "manual"
		});
		//generation of keys
		$("#generate").click(function(event) {

			if (validateForm(event)) {
				data = {
					userIds: [{
						name: $("#subj_name").val(),
						email: $("#subj_email").val()
					}],
					numBits: 4096,
					passphrase: $("#subj_passphrase").val() //protects a private key
				};

				$("#preloader-container").removeClass('hidden');

				try {
					openpgp.generateKey(data).then(function(key) {
						$("#gen_priv_key").val(key.privateKeyArmored);
						$("#gen_pub_key").val(key.publicKeyArmored);

						$("#preloader-container").addClass('hidden');
					});
				} catch (error) {
					$("#preloader-container").addClass('hidden');
					alert(error);
				}
			}
		});

		//saving of keys (downloading)
		$("#save").click(function(event) {
			if ($("#gen_priv_key").val() && $("#gen_pub_key").val()) {
				saveTextAsFile($("#gen_priv_key").val(), "private_key.txt");
				saveTextAsFile($("#gen_pub_key").val(), "public_key.txt");
			}
		});

		//check wether required fields are empty
		$("[input],[type='text'],[type='password']").change(function(event) {
			if (event.currentTarget.value === "") {
				matchAsEmpty(event.currentTarget);
			} else {
				matchAsEmpty(event.currentTarget, true);
			}
		});

		$("#subj_name").keyup(function(event) {
			for (var i = 0; i < $(this).val().length; i++) {
				if ($(this).val()[i].charCodeAt() > 127 || $(this).val()[i] === ":") {
					$(this).val($(this).val().slice(0, i));
					break;
				}
			}
		});


	} else
	if (id == "about_opt") {}
}

function validateForm(event) {
	result = true;
	$("[input],[type='text'],[type='password']").each(function(index, el) {
		if (el.id !== "subj_email")
			if (el.value.length === 0) {
				result = false;
				matchAsEmpty(el);
				$(el).tooltip('show');
			} else {
				matchAsEmpty(el, true);
				$(el).tooltip("hide");
			}
	});

	var re =
		/^[-a-z0-9~!$%^&*_=+}{\'?]+(\.[-a-z0-9~!$%^&*_=+}{\'?]+)*@([a-z0-9_][-a-z0-9_]*(\.[-a-z0-9_]+)*\.(aero|arpa|biz|com|coop|edu|gov|info|int|mil|museum|name|net|org|pro|travel|mobi|[a-z][a-z])|([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}))(:[0-9]{1,5})?$/i;
	if (String($("#subj_email").val()).search(re) == -1) {
		result = false;
		matchAsEmpty($("#subj_email"));
		$("#subj_email").tooltip('show');
	} else {
		$("#subj_email").tooltip("hide");
		matchAsEmpty($("#subj_email"), true);
	}

	return result;
}

function matchAsEmpty(el, cancel = false) {
	if (cancel) {
		var container = $(el).closest('.form-group');
		if (container.hasClass('has-error'))
			container.removeClass('has-error');
	} else
		$(el).closest('.form-group').addClass('has-error');
}

function addNewPK(content) {

	var pks = {};

	if (typeof(content) === "string")
		content = [content];

	for (var i = 0; i < content.length; i++) {
		var obj = openpgp.key.readArmored(content[i]);

		if (obj.hasOwnProperty("err") && obj.err.length > 0) {
			var errors = obj.err;
			for (var i = 0; i < errors.length; i++) {
				console.log(errors[i]);
			}
			alert("Something has gone wrong! Look for errors in log!");
			return;
		}

		if (obj.keys[0].isPublic()) {
			var messageData = {};
			var ids = obj.keys[0].getUserIds()[0];
			var email = ids.substring(ids.lastIndexOf(" ") + 1);
			var name = ids.substring(0, ids.lastIndexOf(" "));
			var jsonKey = name + ":" + email.substring(1, email.length - 1);

			pks[jsonKey] = content[i];
		} else {
			throw new Error("Is not a public key!");
		}

	}

	chrome.runtime.sendMessage(chrome.runtime.id, {
		action: "get",
		data: "PublicKeys"
	}, function(response) {
		var publicKeys = response.result["PublicKeys"] || {};

		$.extend(true, publicKeys, pks);
		chrome.runtime.sendMessage(chrome.runtime.id, {
			action: "set",
			data: {
				"PublicKeys": publicKeys
			}
		}, function(response) {
			console.log(response.result);
			changePill("keys_opt");
		});
	});
}

function removePK(keys) {
	chrome.runtime.sendMessage(chrome.runtime.id, {
		action: "get",
		data: "PublicKeys"
	}, function(response) {
		var publicKeys = response.result["PublicKeys"] || {};
		for (var i = 0; i < keys.length; i++) {
			if (publicKeys.hasOwnProperty(keys[i])) {
				delete publicKeys[keys[i]];
			}
		}

		chrome.runtime.sendMessage(chrome.runtime.id, {
			action: "set",
			data: {
				"PublicKeys": publicKeys
			}
		}, function(response) {
			console.log(response.result);
			changePill("keys_opt");
		});
	});
}

function clearKeys(type, pill) {
	chrome.runtime.sendMessage(chrome.runtime.id, {
		action: "get",
		data: "type"
	}, function(response) {
		var keys = response.result[type] || {};
		for (var key in keys) {
			delete keys[key];
		}
		var data = {};
		data[type] = keys;

		chrome.runtime.sendMessage(chrome.runtime.id, {
			action: "set",
			data: data
		}, function(response) {
			console.log(response.result);
			changePill(pill);
		});
	});
}

function dropFile(event, callback) {

	event.preventDefault();

	var files = event.dataTransfer.files;
	if (files.length) {

		var reader = new FileReader();
		reader.onload = function(event) {
			var content = event.target.result;
			try {
				callback(content);
			} catch (e) {
				console.log(e);
			}
		};

		reader.readAsText(files[0]);

		console.log("Filename: " + file.name);
		console.log("Type: " + file.type);
		console.log("Size: " + file.size + " bytes");
	}
}

function dropPKFiles(event) {

	event.preventDefault();
	$("#dropzone").data("pk", []);

	var files = event.dataTransfer.files;
	for (var i = 0; i < files.length; i++) {
		var reader = new FileReader();
		reader.onload = function(event) {
			var content = event.target.result;
			$("#dropzone").data("pk").push(content);
			if ($("#dropzone").data("pk").length == files.length) {
				var data = $("#dropzone").data("pk");
				$("#dropzone").removeData();
				addNewPK(data);
			}
		};
		reader.readAsText(files[i]);
	}

}

function addMyKey(text, ispublic) {

	var obj = openpgp.key.readArmored(text);

	if (obj.hasOwnProperty("err") && obj.err.length > 0) {
		var errors = obj.err;
		for (var i = 0; i < errors.length; i++) {
			console.log(errors[i]);
		}
		alert("Something has gone wrong! Look for errors in log!");
		return;
	}

	if (obj.keys[0].isPublic() == ispublic) {

		chrome.runtime.sendMessage(chrome.runtime.id, {
			action: "get",
			data: "MyKeys"
		}, function(response) {
			var myKeys = response.result["MyKeys"] || {};
			myKeys[ispublic ? "public_key" : "private_key"] = text;
			var data = {
				"MyKeys": myKeys
			};

			chrome.runtime.sendMessage(chrome.runtime.id, {
				action: "set",
				data: data
			}, function(response) {
				console.log(response.result);
				changePill("main_opt");
			});
		});
	} else {
		alert("Inappropriate key!");
	}
}

function addMyPubKey(text) {
	addMyKey(text, true);
}

function addMyPrivKey(text) {
	addMyKey(text, false);
}

function visibilityPKTableButtons() {
	if ($("[id=tr_pk][class*=danger]").length) {
		$("#del").removeClass('hidden');
		$("#download").removeClass('hidden');
		$("#clear_keys").removeClass('clear_key_round');
	} else {
		$("#del").addClass('hidden');
		$("#download").addClass('hidden');
		$("#clear_keys").addClass('clear_key_round');
	}
}

function setOpenpgpConfig() {
	openpgp.config.aead_protect = true;
	openpgp.config.show_comment = false;
	openpgp.config.show_version = false;
}
