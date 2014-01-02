var page = require('webpage').create();

var srcImage = phantom.args[0];
var targetImage = phantom.args[1];
var threshold = Number(phantom.args[2]);

page.onConsoleMessage = function (msg) {
	if (msg === "__exitPhantomMatch__") {
		console.log("PHANTOM IMAGE COMPARER:: Great, the images MATCH!");
		phantom.exit();
	}
	else if (msg === "__exitPhantomMismatch__") {
		console.log("PHANTOM IMAGE COMPARER:: The images do NOT match!");
		phantom.exit();
	}
	else {
		console.log("PHANTOM IMAGE COMPARER:: " + msg);
	}
};

page.onError = function (msg) {
	console.log('****** PAGE ERROR ******');
	console.error(msg);
	console.log('****** ********** ******');

	page.render('ImageComparer.png');
	phantom.exit();
};

page.open('http://localhost:8090/', function (status) {

	if (status === "success") {
		var resp = page.evaluate(function (srcFile, targetFile, threshold) {

			resemble(srcFile).compareTo(targetFile).onComplete(function (data) {
				console.log("INFO:: Image mismatch percentage: " + data.misMatchPercentage);
				if (data.misMatchPercentage < threshold) {
					console.log("__exitPhantomMatch__");
				}
				else {
					console.log("__exitPhantomMismatch__");
				}
			});
		}, srcImage, targetImage, threshold);
	}
	else {
		console.error("ERROR:: Unable to open page");
		phantom.exit();
	}
});