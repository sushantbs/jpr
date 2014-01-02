var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var http = require('http');
var server;

var lib = path.join(__dirname, './lib');
console.log("Lib path:" + lib);

var currentSpecIndex = 0;

var JPRSpecRunner = function (specArray, srcFiles) {

	this.srcArray = srcFiles;
	this.specArray = specArray;
	this.currentIndex = 0;
	this.currentSpec = null;

	this.resembleServer = null;
};

JPRSpecRunner.prototype.executeNextSpec = function () {
	var jpr = this;

	if (this.currentIndex < this.specArray.length) {
		this.currentSpec = this.specArray[this.currentIndex];

		runSpecInPhantom(this.srcArray, this.currentSpec.name,
			this.currentSpec.location, this.currentSpec.refImage, function () {
				jpr.currentIndex += 1;
				jpr.executeNextSpec();
			}
		);
	}
	else {
		this.finished = true;
		this.finishedExecution();
	}
};

JPRSpecRunner.prototype.createResembleServer = function () {

	if (this.resembleServer) {
		return resembleServer;
	}

	console.log("INFO:: Creating a server to serve resemble.js");

	server = http.createServer(function (req, res) {
		var url = req.url.toString(),
			filename;

		if (url.indexOf('resemble') !== -1) {

			filename = path.join(lib, "./resemble/resemble.js")
			fs.readFile(filename, function (err, data) {

				if (err) {
					res.writeHead(404);
					res.end("Error reading file. Check if the file is present");
				}
				else {
					res.setHeader("Content-type", "text/javascript");
					res.writeHead(200);
					res.write(data);
					res.end();
				}
			});
		}
		/* TODO: For debugging only */
		else if (url.indexOf("ImageComparer") !== -1) {
			filename = path.join(process.cwd(), "./ImageComparer.html");
			fs.readFile(filename, function (err, data) {

				if (err) {
					res.writeHead(404);
					res.end("Error reading file. Check if the file is present");
				}
				else {
					res.setHeader("Content-type", "text/html");
					res.writeHead(200);
					res.write(data);
					res.end();
				}
			});
		}
		/** EOD **/
		else if (url.indexOf("screenshot") !== -1) {

			filename = path.join(process.cwd(), "." + url);
			fs.readFile(filename, function (err, data) {
				if (err) {
					res.writeHead(404);
					res.end("Error reading file. Check if the file is present");
				}
				else {
					res.setHeader("Content-type", "image/png");
					res.writeHead(200);
					res.end(data, 'binary');
				}
			});
		}
		else {
			res.write([
				"<html>",
				"<head><script type='text/javascript' src='resemble.js'></script></head>",
				"<body></body>",
				"</html>"
			].join(""));
			res.end();
		}
	});

	server.on('error', function (msg) {
		console.log("******** SERVER ERROR *******");
		console.log(msg);
		console.log("*****************************\n");
	});

	server.listen(8090);

	this.resembleServer = server;

	return server;
};

JPRSpecRunner.prototype.finishedExecution = function () {
	if (this.resembleServer) {
		this.resembleServer.close();
		this.resembleServer = null;
	}
};

var compareInPhantom = function (srcImageLocation, targetImageLocation, callback) {
	var commands = [
		"phantomjs",
		"phantomImageComparer.js",
		srcImageLocation,
		targetImageLocation
	];

	var executer = exec(commands.join(" "), function (err, stdout, stderr) {
		console.log("\nPhantomJS Comparer\n========================\n" + stdout);

		if (err) {
			console.log("****** PHANTOM ERROR *******");
			console.log(err);
			console.log("****************************\n");
		}

		if (stderr) {
			console.log("******* PHANTOM STDERR *******");
			console.log(stderr);
			console.log("******************************\n");
		}

		console.log("=========================\n");

		fs.unlink(path.join(process.cwd(), "./" + targetImageLocation));
		callback && callback();
	});
};

var runSpecInPhantom = function (srcFiles, specName, specLocation, imageLocation, callback) {
	var commands = [
		"phantomjs",
		"phantomSpecRunner.js",
		srcFiles,
		specLocation,
		(imageLocation === "none" ? "false" : "true")
	];

	var executer = exec(commands.join(" "), function (err, stdout, stderr) {
		console.log("\nPhantomJS Runner\n=======================\n" + stdout);

		//callback && callback(err, stdout, stderr);
		if (err) {
			console.log("****** PHANTOM ERROR *******");
			console.log(err);
			console.log("****************************\n");
		}

		if (stderr) {
			console.log("******* PHANTOM STDERR *******");
			console.log(stderr);
			console.log("******************************\n");
		}

		console.log("=========================\n");

		if (imageLocation !== "none") {
			fs.exists(imageLocation, function (exists) {
				if (exists) {
					console.log("INFO:: Reference image present at: " + imageLocation);
					compareInPhantom(imageLocation, 'temp-screenshot.png', callback);
				}
				else {
					console.log("ERROR:: Reference image not found at " + imageLocation);
					callback && callback();
				}
			});
		}
		else {
			console.log("WARN:: No reference image provided");
			callback && callback();
		}
	});
};

var readConfig = function (config, success, error) {
	console.log("INFO:: Config path: " + config);
	fs.exists(config, function (exists) {
		if (exists) {
			success();
		}
		else {
			console.log("ERROR:: Config not found");
			error();
		}
	});
};

var runTests = function (config, saveImages) {

	readConfig(config, function () {
		console.log("INFO:: Config file found at: " + config);

		var specArray = [];
		var configPath = path.join(process.cwd(), config);
		var configJSON = require(configPath);

		var pairs = configJSON.pairs;
		var specSource = configJSON.specSource;
		var imageSource = configJSON.imageSource;
		var srcFiles = configJSON.src.join(",");

		var specLocation;
		console.log("INFO:: Spec Source: " + path.join(process.cwd(), specSource));
		console.log("INFO:: Image Source: " + path.join(process.cwd(), imageSource));

		if (pairs) {
			pairs.forEach(function (pair) {
				specArray.push({
					name: pair.specName,
					location: path.join(process.cwd(), specSource) + pair.specName + ".js",
					refImage: (imageSource + (pair.imageName || (pair.specName + '-screenshot')) +
						".png")
				});
			});
		}

		var jprRunner = new JPRSpecRunner(specArray, srcFiles);
		jprRunner.createResembleServer();
		jprRunner.executeNextSpec();

	}, function () {
		console.log("ERROR:: Config file NOT found at: " + config);
	});
};

var runSingleTest = function (config, specFile, imageFile) {
	readConfig(config, function () {
		console.log("INFO:: Config file found at: " + config);
		console.log("INFO:: Spec file: " + specFile);
		console.log("INFO:: Image file: " + imageFile);

		var specArray = [{
			name: "singleJPRSpec",
			location: specFile,
			refImage: imageFile
		}];

		var configPath = path.join(process.cwd(), config);
		var configJSON = require(configPath);
		var srcFiles = configJSON.src.join(",");

		var jprRunner = new JPRSpecRunner(specArray, srcFiles);
		if (imageFile !== "none") {
			jprRunner.createResembleServer();
		}
		jprRunner.executeNextSpec();

	}, function () {
		console.log("ERROR:: Config file NOT found at: " + config);
	});
};

module.exports = function (program) {

	/*if (program.saveImages) {

	}
	else {

	}*/

	if (program.specFile !== "none") {
		runSingleTest(program.config, program.specFile, program.imageFile);
	}
	else {
		runTests(program.config);
	}
};