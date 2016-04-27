var timer;
chrome.runtime.onStartup.addListener(function() {
	chrome.storage.local.remove("CurrentPassphrase");
})

chrome.runtime.onSuspend.addListener(function(event) {
	chrome.storage.local.remove("CurrentPassphrase");
});


createContextMenuItems();

function createContextMenuItems() {
	var properties = {
		type: 'normal',
		id: 'encrypt',
		title: 'Encrypt selected (ctrl+right mouse)',
		contexts: ["selection"]
	};

	chrome.contextMenus.create(properties);

	var properties = {
		type: 'normal',
		id: 'decrypt',
		title: 'Decrypt selected (ctrl+alt+right mouse)',
		contexts: ["selection"]
	};

	chrome.contextMenus.create(properties);
}

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	chrome.tabs.sendMessage(tab.id, {
		action: info.menuItemId
	});
})

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if (!checkSenderID(sender.id))
			sendResponse({
				result: "Forbidden!"
			});

		console.log(sender.tab ?
			"from a content script:" + sender.tab.url :
			"from the extension");

		if (request.action == "set") {

			chrome.storage.local.set(request.data, function() {
				console.log("Saved:" + data.toString());
			});

			sendResponse({
				result: "saved"
			});

		} else if (request.action == "get") {

			if (request.hasOwnProperty("id")) {
				chrome.storage.local.get(getNeededProps(request.id), function(items) {
					sendResponse({
						id: request.id,
						result: items
					});
				});
			} else {
				chrome.storage.local.get(request.data, function(items) {
					sendResponse({
						result: items
					});
				});
			}
		} else if (request.action == "remove") {

			chrome.storage.local.remove(request.data, function() {
				sendResponse({
					result: "removed"
				});
			});
		}

		return true;
	});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if (!checkSenderID(sender.id))
			sendResponse({
				result: "Forbidden!"
			});

		if (request.hasOwnProperty("action") && request.hasOwnProperty("data")) {

			if (request.action !== "encrypt" && request.action !== "decrypt") {
				return;
			}

			try {
				var openpgp = window.openpgp; // use as CommonJS, AMD, ES6 module or via window.openpgp

				if (openpgp.getWorker() === undefined)
					openpgp.initWorker({
						path: 'js/openpgp.worker.min.js'
					});

				getOptions(request.action, request.data, function(opts) {
					try {
						if (request.action == "encrypt") {

							opts.data = request.data.selection;

							openpgp.encrypt(opts).then(function(ciphertext) {
								result = ciphertext.data;
								sendResponse({
									result: result.replace(
										"\nComment: http://openpgpjs.org", "")
								});
							});

						} else if (request.action == "decrypt") {

							opts.message = openpgp.message.readArmored(request.data.selection);

							openpgp.decrypt(opts).then(function(plaintext) {
								result = plaintext.data;
								sendResponse({
									result: result
								});
							});
						}
					} catch (e) {
						alert(
							"Oops, Something has gone wrong! Probably your message is not properly formatted."
						);
						console.log(e);
					}

				});
			} catch (e) {
				alert("Oops, Something has gone wrong!");
				console.log(e);
			}

		}

		return true;
	}
);

function getOptions(actionType, settings, callback) {

	var options;

	switch (settings.mode) {
		case "mode_pass":

			var key = settings.passphrase;

			if (actionType == "encrypt") {
				options = {
					passwords: [key],
				};
			} else if (actionType == "decrypt") {
				options = {
					password: key,
				};
			}

			callback(options);
			break;
		case "mode_pgp":

			chrome.storage.local.get(["MyKeys"],
				function(items) {
					if (settings.passphrase === "") {
						alert("No password entered!");
						chrome.storage.local.remove("CurrentPassphrase");
						return;
					}

					if (settings.passphrase) {
						chrome.storage.local.set({
							"CurrentPassphrase": settings.passphrase
						});
						if (timer)
							clearTimeout(timer);
						timer = setTimeout(function() {
								chrome.storage.local.remove("CurrentPassphrase")
							},
							5 * 60000)


						if (items.hasOwnProperty("MyKeys")) {
							var pubk;
							var privk;

							try {
								pubk = openpgp.key.readArmored(settings.pk)
									.keys;
								privk = openpgp.key.readArmored(items.MyKeys.private_key)
									.keys[
										0];

								if (!privk.decrypt(settings.passphrase)) {
									chrome.storage.local.remove("CurrentPassphrase");
									throw new Error("Invalid passphrase!");
								}

							} catch (e) {
								console.log(e);
								return;
							}

							if (actionType == "encrypt") {
								options = {
									publicKeys: pubk,
									privateKeys: privk,
									armor: true
								};
							} else if (actionType == "decrypt") {
								options = {
									privateKey: privk,
									publicKeys: pubk,
									format: 'utf8'
								};
							}
						}

						callback(options);

					}
				});
			break;

		default:
			break;
	}
}

function getNeededProps(id) {
	switch (id) {
		case "main_opt":
			return ["Mode", "MyKeys"];
		case "keys_opt":
			return ["PublicKeys"];
		case "gen_opts":
			return [""];
		case "about_opt":
			return [""];
		default:
			return [""];
	}
}

function checkSenderID(id) {
	//todo: list of permitted extenstion IDs fron chrome.storage.local
	//fiiling the list using options.html
	return id === chrome.runtime.id;
}
