var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var http = require('http');
var server;

var lib = path.join(__dirname, './lib');
console.log("Lib path:" + lib);

var JPRSpecRunner = function (commandLineOptions) {

	var co = commandLineOptions;

	this.isSingleSpec = (co.specFile !== "none");

	// whether to execute a single spec or all the available specs
	if (this.isSingleSpec) {
		this.specFile = co.specFile;
		this.imageFile = (co.imageFile !== "none" ? co.imageFile : null);
	}
	else {
		this.specFile = null;
		this.imageFile = null;
	}

	// location of the config file
	this.config = co.config;
	this.compareThreshold = co.threshold;
	console.log("threshold:: " +  co.threshold);

	this.srcArray = null;
	this.specArray = null;
	this.currentIndex = 0;
	this.currentSpec = null;

	this.resembleServer = null;
};

JPRSpecRunner.prototype.init = function () {
	var jpr = this,
		specFile = jpr.specFile,
		imageFile = jpr.imageFile,
		config = jpr.config;

	if (!this.isSingleSpec) {
		jpr.readConfig(function () {
			console.log("INFO:: Config file found at: " + config);

			var configPath = path.join(process.cwd(), config);
			var configJSON = require(configPath);

			var specArray = [];
			var pairs = configJSON.pairs;
			var specSource = configJSON.specSource;
			var imageSource = configJSON.imageSource;
			var srcFiles = configJSON.src.join(",");

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

			jprRunner.createResembleServer();
			jprRunner.execute(specArray, srcFiles);

		}, function () {
			console.log("ERROR:: Config file NOT found at: " + config);
		});
	}
	else {
		jpr.readConfig(function () {

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

			if (imageFile !== "none") {
				jprRunner.createResembleServer();
			}
			jpr.execute(specArray, srcFiles);

		}, function () {
			console.log("ERROR:: Config file NOT found at: " + config);
		});
	}
};

JPRSpecRunner.prototype.readConfig = function (success, error) {
	var jpr = this,
		config = jpr.config;

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

JPRSpecRunner.prototype.execute = function (specArray, srcFiles) {
	var jpr = this;

	jpr.specArray = specArray;

	if (srcFiles) {
		jpr.srcArray = srcFiles;
	}

	jpr.currentIndex = 0;
	jpr.currentSpec = null;

	jpr.executeNextSpec();
};

JPRSpecRunner.prototype.executeNextSpec = function () {
	var jpr = this,
		threshold = jpr.threshold,
		next = function () {
			fs.unlink(path.join(process.cwd(), "./temp-screenshot.png"));
			jpr.currentIndex += 1;
			jpr.executeNextSpec();
		},
		comparer = function () {
			var imageLocation = jpr.currentSpec.refImage,
				threshold = jpr.compareThreshold;

			if (imageLocation !== "none") {
				fs.exists(imageLocation, function (exists) {
					if (exists) {
						console.log("INFO:: Reference image present at: " + imageLocation);
						compareInPhantom(imageLocation, 'temp-screenshot.png', threshold, next);
					}
					else {
						console.log("ERROR:: Reference image not found at " + imageLocation);
						next();
					}
				});
			}
			else {
				console.log("WARN:: No reference image provided");
				next();
			}
		};

	if (this.currentIndex < this.specArray.length) {

		this.currentSpec = this.specArray[this.currentIndex];
		if (this.currentSpec.refImage) {
			runSpecInPhantom(this.srcArray, this.currentSpec.name,
				this.currentSpec.location, comparer);
		}
		else {
			runSpecInPhantom(this.srcArray, this.currentSpec.name,
				this.currentSpec.location, next);
		}
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

var compareInPhantom = function (srcImageLocation, targetImageLocation, threshold, callback) {
	var commands = [
		"phantomjs",
		"phantomImageComparer.js",
		srcImageLocation,
		targetImageLocation,
		threshold
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

		callback && callback();
	});
};

var runSpecInPhantom = function (srcFiles, specName, specLocation, callback) {
	var commands = [
		"phantomjs",
		"phantomSpecRunner.js",
		srcFiles,
		specLocation
	];

	var executer = exec(commands.join(" "), function (err, stdout, stderr) {
		console.log("\nPhantomJS Runner\n=======================\n" + stdout);

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

		callback && callback(err, stdout, stderr);
	});
};

module.exports = function (program) {

	jprRunner = new JPRSpecRunner(program);
	jprRunner.init();
};