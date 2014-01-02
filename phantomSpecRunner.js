var page = require("webpage").create();

var srcFileArray = phantom.args[0].split(",");
var specFile = phantom.args[1];
//var specName = phantom.args[2];
var saveImage = phantom.args[2];

var runnerFile = "SpecRunner.html";
var specInclusion;

page.onConsoleMessage = function (msg) {
	if (msg === "__exitPhantom__") {
		//page.render(specName + '-screenshot.png');
		if (saveImage === "true") {
			page.render('temp-screenshot.png');
		}
		phantom.exit();
	}
	else {
		console.log("PHANTOM SPEC RUNNER:: " + msg);
	}
};

if (specFile) {
	page.open(runnerFile, function (status) {
		if (status === "success") {
			specInclusion = false;
			console.log("INFO:: Adding src files:\n------------");

			page.injectJs("lib/jasmine-1.3.1/jasmine.js");
			page.injectJs("lib/jasmine-1.3.1/jasmine-html.js");
			page.injectJs("lib/resemble/resemble.js");

			if (srcFileArray.length) {
				srcFileArray.forEach(function (file) {
					console.log(file);
					page.injectJs(file);
				});
			}

			console.log("\nINFO:: Adding spec file:\n-------------");
			console.log(specFile);

			if (specFile) {
				specInclusion = page.injectJs(specFile);
			}

			if (specInclusion) {
				page.evaluate(function() {
					var cbFn = function () {
						console.log("__exitPhantom__");
					};

			    	var jasmineEnv = jasmine.getEnv();
			      	jasmineEnv.updateInterval = 1000;

			      	var htmlReporter = new jasmine.HtmlReporter();

			      	jasmineEnv.addReporter(htmlReporter);

			      	jasmineEnv.specFilter = function(spec) {
			        	return htmlReporter.specFilter(spec);
			      	};

      				function execJasmine(callback) {
        				jasmineEnv.execute(callback);
      				};

    				execJasmine(cbFn);
			    });
			}
			else {
				console.log("ERROR:: Failed to include spec: " + specFile);
				phantom.exit();
			}
		}
		else {
			console.log("ERROR:: Unable to open the test runner")
			phantom.exit();
		}
	});
}
else {
	console.log("ERROR:: Spec file not found");
	phantom.exit();
}