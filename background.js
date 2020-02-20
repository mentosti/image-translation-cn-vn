function capture(request) {
	return new Promise(function(resolve, reject) {
		chrome.tabs.captureVisibleTab(null, { format: "png" }, dataUrl => {
			if (!request) {
				return resolve(dataUrl);
			}

			let left = request.left * request.devicePixelRatio;
			let top = request.top * request.devicePixelRatio;
			let width = request.width * request.devicePixelRatio;
			let height = request.height * request.devicePixelRatio;

			let canvas = document.createElement("canvas");
			let ctx = canvas.getContext("2d");
			let img = new Image();
			img.onload = () => {
				canvas.width = width || img.width;
				canvas.height = height || img.height;
				if (width && height) {
					ctx.drawImage(img, left, top, width, height, 0, 0, width, height);
				} else {
					ctx.drawImage(img, 0, 0);
				}
				resolve(canvas.toDataURL());
			};
			img.onerror = e => reject(e);
			img.src = dataUrl;
		});
	});
}

function imageTranslate(imgEncode, title) {
	return new Promise(function(resolve, reject) {
		var data = JSON.stringify({
			requests: [
				{
					image: { content: imgEncode.split("base64,")[1] },
					features: [{ type: "TEXT_DETECTION" }],
					imageContext: { languageHints: ["zh"] }
				}
			]
		});

		var xhr = new XMLHttpRequest();
		xhr.withCredentials = true;

		xhr.addEventListener("readystatechange", function() {
			if (this.readyState === 4) {
				var cn = JSON.parse(this.responseText);

				resolve(cn.responses[0].fullTextAnnotation.text);
			}
		});

		xhr.open(
			"POST",
			"https://vision.googleapis.com/v1/images:annotate?key=" + key
		);
		xhr.setRequestHeader("Content-Type", "application/json");
		xhr.onerror = function() {
			reject("Failed to recognize Chinese text!");
		};
		xhr.send(data);
	});
}
function translateToVn(cn) {
	return new Promise(function(resolve, reject) {
		var data = "t=" + cn + "&tt=vi";

		var xhr = new XMLHttpRequest();
		xhr.withCredentials = true;

		xhr.addEventListener("readystatechange", function() {
			if (this.readyState === 4) {
				resolve(JSON.parse(this.responseText));
			}
		});

		xhr.open("POST", "http://dichtienghoa.com/transtext");
		xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		xhr.onerror = function() {
			reject("Failed to translate to Vietnamese!");
		};
		xhr.send(data);
	});
}
chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.tabs.insertCSS({ file: "style.css" }, function() {
		chrome.tabs.executeScript({ file: "insert.js" });
	});
});
chrome.runtime.onMessage.addListener((request, sender) => {
	capture(request)
		.then(a => imageTranslate(a, sender.tab.title))
		.then(cn => translateToVn(cn))
		.then(vn => alert(vn.data))
		.then(done => chrome.tabs.insertCSS({ file: "style.css" }, function() {
			chrome.tabs.executeScript({ file: "insert.js" });
		}))
		.catch(e => window.alert(e.message || e));
});
