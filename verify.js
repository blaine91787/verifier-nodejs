var fs   = require('fs');
var clc  = require('cli-color');
var sver = require('semver');
var argv = require('yargs')
				.default({
					"port": 9999,
					"url": "",
					"id": "",
					"parameter": "",
					"timemax": "",
					"timemin": ""
				})
				.argv

var tests = require('./tests.js'); // Test runner

if (!sver.gte(process.version,'6.0.0')) {
	console.log(clc.red("node.js version >= 6 required. node.js -v returns " + process.version + ". See README for instructions on upgrading using nvm."));
	process.exit(1);
}
if (argv.url !== "") {
	// Command-line mode

	// Allow 
	//   --url=http://server/hapi?id=abc
	// and treat as equivalent to 
	//   --url=http://server/hapi --id=abc
	if (/\?id=/.test(argv['url'])) {
		argv['id'] = argv['url'].split("?")[1].replace("id=","");
		argv['url'] = argv['url'].split("?")[0];
	}
	argv.parameter = argv.parameter || argv.parameters || "";

	tests.run(argv.url,argv.id,argv.parameter,argv["timemin"],argv["timemax"]);
} else {
	// Server mode
	var express = require('express');
	var app     = express();
	var server  = require("http").createServer(app);

	// Not working.
	app.use(function(err, req, res, next) {
  		res.end('Application error.');
	});

	app.get('/', function (req, res, next) {

		var addr = req.headers['x-forwarded-for'] || req.connection.remoteAddress
		console.log(new Date().toISOString() + " Request from " + addr + ": " + req.originalUrl)
		
		if (!req.query.url) { // Send html page if no url given in query string
			res.contentType("text/html");
			fs.readFile(__dirname + "/verify.html",function (err,html) {res.end(html);});
			return;
		}

		var allowed = ["url","id","parameter","parameters","time.min","time.max"];
		for (var key in req.query) {
			if (!allowed.includes(key)) {
				res.end("Only allowed parameters are " + allowed.join(",") + " (not "+key+").");
				return;
			}
		}

		// Allow 
		//   ?url=http://server/hapi?id=abc
		// and treat as equivalent to 
		//   ?url=http://server/hapi&id=abc
		if (/\?id=/.test(req.query['url'])) {
			req.query['id'] = req.query['url'].split("?")[1].replace("id=","");
			req.query['url'] = req.query['url'].split("?")[0];
		}

		var url   = req.query["url"]       || ""
		var id    = req.query["id"]        || ""
		var param = req.query["parameter"] || req.query["parameters"] || ""
		var start = req.query["time.min"]  || ""
		var stop  = req.query["time.max"]  || ""
		if (param) {
			if (param.split(",").length > 1) {
				res.end("Only one parameter may be specified.");
			}
		}
		tests.run(url,id,param,start,stop,res);

	})

	app.listen(argv.port)
	console.log("Listening on port " + argv.port + ". See http://localhost:" + argv.port + "/")
}

process.on('uncaughtException', function(err) {
	if (err.errno === 'EADDRINUSE') {
		console.log(clc.red("Port " + argv.port + " already in use."));
	} else {
		console.log(err.stack);
	}
})
