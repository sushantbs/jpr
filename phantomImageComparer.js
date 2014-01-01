var page = require('webpage').create();

var srcImage = phantom.args[0];
var targetImage = phantom.args[1];

page.onConsoleMessage = function (msg) {
	if (msg === "__exitPhantomMatch__") {
		phantom.exit();
	}
	if (msg === "__exitPhantomMismatch__") {
		phantom.exit();
	}

	console.log(msg);
};

page.onError = function (msg) {
	console.log('****** page error ******');
	console.error(msg);
	console.log('****** ********** ******');

	page.render('ImageComparer.png');
	phantom.exit();
};

page.open('http://localhost:8090/', function (status) {
	console.log("localhost8090 status:" +  status);

	var resp = page.evaluate(function (srcFile, targetFile) {

		resemble(srcFile).compareTo(targetFile).onComplete(function (data) {
			console.log("Mismatch: " + data.misMatchPercentage);
			if (data.misMatchPercentage < 0.05) {
				console.log("__exitPhantomMatch__");
			}
			else {
				console.log("__exitPhantomMismatch__");
			}
		});
	}, srcImage, targetImage);
});

