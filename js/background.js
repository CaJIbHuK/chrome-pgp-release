var timer;
var openpgp = window.openpgp; // use as CommonJS, AMD, ES6 module or via window.openpgp
setOpenpgpConfig();

chrome.runtime.onStartup.addListener(function() {
	removeCurrentPassphrase();
});

createContextMenuItems();

chrome.runtime.onSuspend.addListener(function() {
	removeCurrentPassphrase();
});

chrome.storage.onChanged.addListener(function(changes, area) {
	if (!changes.hasOwnProperty("CurrentPassphrase") && !changes.hasOwnProperty(
			"MyKeys")) {
		console.log(changes);
	} else {
		console.log("Modified:" + Object.keys(changes));
	}

	if (!changes.hasOwnProperty("CurrentPassphrase") && !changes.hasOwnProperty(
			"CurrentSubject")) {
		removeCurrentPassphrase();
		clearCurrentSubject();
	}

});

function createContextMenuItems() {
	var properties = {
		type: 'normal',
		id: 'encrypt',
		title: 'Encrypt selected (ctrl+right mouse)',
		contexts: ["selection"]
	};

	chrome.contextMenus.create(properties);

	properties = {
		type: 'normal',
		id: 'decrypt',
		title: 'Decrypt selected (ctrl+alt+right mouse)',
		contexts: ["selection"]
	};

	chrome.contextMenus.create(properties);
}

chrome.contextMenus.onClicked.addListener(function(info, tab) {
	if (info.selectionText !== "")
		chrome.tabs.sendMessage(tab.id, {
			action: info.menuItemId,
			pageUrl: info.pageUrl
		});
});

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if (!checkSenderID(sender.id)) {
			alert(
				"This app or extension can't send communicate with 'Everyone's Privacy'!"
			);
			sendResponse({
				result: undefined
			});
		}

		console.log(sender.tab ?
			"from a content script:" + sender.tab.url :
			"from the extension");

		if (request.action === "passCheck") {

			chrome.storage.local.get(["MyKeys"],
				function(items) {

					if (items.hasOwnProperty("MyKeys")) {

						var privk = openpgp.key.readArmored(items.MyKeys.private_key).keys[0];
						if (privk.decrypt(request.data)) {
							chrome.storage.local.set({
								CurrentPassphrase: request.data,
								FoundCurrentPassphrase: true
							});

							chrome.tabs.query({
								active: true,
								currentWindow: true
							}, function(tabs) {
								chrome.tabs.sendMessage(tabs[0].id, {
									action: "closeModal"
								});
							});

							sendResponse({
								result: "ok"
							});
						} else {
							sendResponse({
								result: "error"
							});
						}
					}
				});
			return true;
		} else if (request.action === "closeModal") {

			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					action: "closeModal"
				});
			});

		}
	}
);

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if (!checkSenderID(sender.id)) {
			alert(
				"This app or extension can't send communicate with 'Everyone's Privacy'!"
			);
			sendResponse({
				result: undefined
			});
		}

		console.log(sender.tab ?
			"from a content script:" + sender.tab.url :
			"from the extension");

		if (request.action == "set") {

			chrome.storage.local.set(request.data);

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
	}
);

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {

		if (!checkSenderID(sender.id)) {
			alert(
				"This app or extension can't send communicate with 'Everyone's Privacy'!"
			);
			sendResponse({
				result: undefined
			});
		}


		if (request.hasOwnProperty("action") && request.hasOwnProperty("data")) {

			if (request.action !== "encrypt" && request.action !== "decrypt") {
				return;
			}
			if (openpgp.getWorker() === undefined)
				openpgp.initWorker({
					path: 'js/openpgp.worker.min.js'
				});

			getOptions(request.action, request.data, function(opts) {
				if (request.action == "encrypt") {

					opts.data = request.data.selection;

					openpgp.encrypt(opts).then(function(ciphertext) {
						var results = {
							result: ciphertext.data
						};
						sendResponse(results);
					}).catch(function(error) {
						console.log(error);
						alert("Encryption failed!");
					});


				} else if (request.action == "decrypt") {

					try {
						opts.message = openpgp.message.readArmored(request.data.selection);
					} catch (e) {
						throw new Error("Inappropriate format of PGP message!");
					}

					openpgp.decrypt(opts).then(function(plaintext) {

						var results = {
							result: plaintext.data
						};
						if (plaintext.hasOwnProperty('signatures'))
							results.valid = plaintext.signatures[0].valid;
						sendResponse(results);
					}).catch(function(error) {
						console.log(error);
						alert("Decryption failed!");
					});

				}
			});
		}

		return true;
	}
);

function getOptions(actionType, settings, callback) {

	var options;

	chrome.storage.local.get(["MyKeys", "CurrentSubject",
			"CurrentPassphrase",
			"PublicKeys"
		],
		function(items) {
			try {
				if (!items.hasOwnProperty("CurrentPassphrase") || items.CurrentPassphrase ===
					"") {
					removeCurrentPassphrase();
					throw new Error("No password entered!");
				}
				if (timer)
					clearTimeout(timer);
				timer = setTimeout(function() {
						removeCurrentPassphrase();
					},
					5 * 60000);

				if (!items.hasOwnProperty("MyKeys") || !items.MyKeys.private_key ||
					!items.MyKeys.public_key) {
					throw new Error("You forgot to add your keys!");
				}

				if (!items.hasOwnProperty("PublicKeys") || Object.keys(items.PublicKeys)
					.length == 0) {
					throw new Error("There is no publick keys in the storage");
				}

				if (!items.hasOwnProperty("CurrentSubject") || !items.CurrentSubject) {
					throw new Error("You should choose the subject in the popup!");
				}

				var pubk;
				var privk;

				pubk = openpgp.key.readArmored(items.PublicKeys[items.CurrentSubject])
					.keys;
				privk = openpgp.key.readArmored(items.MyKeys.private_key)
					.keys[0];

				if (!privk.decrypt(items.CurrentPassphrase)) {
					removeCurrentPassphrase();
					throw new Error("Invalid passphrase!");
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
				try {
					callback(options);
				} catch (e) {
					throw e;
				}
			} catch (e) {
				alert(e);
			}
		});

}

function getNeededProps(id) {
	switch (id) {
		case "main_opt":
			return ["MyKeys"];
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

function setOpenpgpConfig() {
	openpgp.config.aead_protect = true;
	openpgp.config.show_comment = false;
	openpgp.config.show_version = false;
}

function clearCurrentSubject() {
	chrome.storage.local.set({
		"CurrentSubject": null
	});
}

function removeCurrentPassphrase() {
	chrome.storage.local.remove("CurrentPassphrase");
	chrome.storage.local.set({
		FoundCurrentPassphrase: false
	});
}
