var fs      = require('fs');
var request = require('request');
var clc     = require('cli-color');
var is      = require('./is.js'); // Test library

function run(ROOT,ID,PARAMETER,START,STOP,RES) {

	// Catch bugs in verification code.
	process.on('uncaughtException', function(err) {abort()});
	
	root();
	
	function abort() {
		if (RES) RES.end('Problem with verification server (Uncaught Exception). Aborting.');	
		if (!RES) console.log('Problem with verification server (Uncaught Exception). Aborting.');	
	}

	function report(url,obj,opts) {
		// Print URL and message in object obj.
		// If message indicates error, stop if opts["stop"] is true.
		// If message indicates error, give warning if opts["warn"] is true.
		// If obj is false, test was not appropriate to perform so exit and return false.
		// If RES is defined, in server mode so send HTML.

		if (obj == false) return false; // Case where test was not appropriate.

		if (opts) {
			var warn  = opts["warn"]  || false;
			var stop  = opts["stop"]  || false; // Stop on error
			if (typeof(opts["abort"] !== "undefined")) {
				var abort = opts["abort"];
			} else {
				var abort = true; 
			}
		} else {
			var warn  = false;
			var stop  = false;
			var abort = true;
		}

		if (!url) {
			// Print summary.
			if (RES) RES.write("<p>End of validation tests.</p><p>Summary: <font style='color:black;background:green'>Passes</font>:&nbsp;" + report.passes.length + ". <font style='color:black;background:yellow'>Warnings:&nbsp;</font>" + report.warns.length + ". <font style='background:red;color:black'>Failures:&nbsp;</font>" + report.fails.length + ". Warnings and failures repeated below.</p>");
			if (!RES) console.log("\nEnd of validation tests.\n\nSummary: " + clc.green.inverse('Passes') + ": " + report.passes.length + ". " + clc.yellowBright.inverse('Warnings') + ": " + report.warns.length + ". " + clc.inverse.red('Failures') + ": " + report.fails.length + ". Warnings and failures repeated below.");
			if (!RES) console.log();
			for (var i = 0;i<report.warns.length;i++) {
				if (RES) RES.write("<br><a href='" + report.warns[i].url.replace(/\&parameters/,"&amp;parameters") + "'>" + report.warns[i].url.replace(/\&parameters/,"&amp;parameters") + "</a><br>")
				if (!RES) console.log("|" + clc.blue(report.warns[i].url));
				if (RES) RES.write("&nbsp;&nbsp;<font style='color:black;background:yellow'>Warn:</font>&nbsp;" + report.warns[i].description + "; Got: <b>" + report.warns[i].got.toString().replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;") + "</b><br>");
				if (!RES) console.log("|  " + clc.yellowBright.inverse("Warn") + " " + report.warns[i].description + "; Got: " + clc.bold(report.warns[i].got));
			}
			for (var i = 0;i<report.fails.length;i++) {
				if (RES) RES.write("<br><a href='" + report.fails[i].url.replace(/\&parameters/,"&amp;parameters") + "'>" + report.fails[i].url.replace(/\&parameters/,"&amp;parameters") + "</a><br>")
				if (!RES) console.log("|" + clc.blue(report.fails[i].url));
				if (RES) RES.write("&nbsp;&nbsp;<font style='color:black;background:red'>Fail</font>&nbsp;" + report.fails[i].description + "; Got: <b>" + report.fails[i].got.toString().replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;") + "</b><br>");
				if (!RES) console.log("|  " + clc.red.inverse("Fail") + " " + report.fails[i].description + "; Got: " + clc.bold(report.fails[i].got));
			}
			if (RES) RES.end("<br>End of validation summary.</body></html>");
		
			if (!RES) {
				console.log("\nEnd of validation summary.");
				if (report.fails.length == 0) {
					process.exit(0); // Normal exit.
				} else {
					process.exit(1); // Send error signal.
				}
			}
			return;
		}
		if (typeof(report.url) === "undefined") {
			// First call to report(), initialize and attach arrays
			// to report object.
			if (RES) {RES.write("<html><body>");}
			report.fails = [];  // Initalize failure array
			report.passes = []; // Initalize passes array			
			report.warns = [];  // Initalize warning array	
			// Parse is.js to get line numbers for test functions.
			var istext = fs.readFileSync(__dirname + '/is.js').toString();
			istext = istext.split("\n");
			report.lineobj = {};
			// Store locations in report.lineobj array.
			for (var i = 0;i<istext.length;i++) {
				if (istext[i].match(/^function/)) {
					key = istext[i].replace(/^function (.*)?\(.*/,"$1");
					report.lineobj[key] = i+1;
				}
			}
		}
		if (report.url !== url) { 
			// Display URL only if not the same as last one seen 
			// when report() was called.
			if (RES) RES.write("<br><font style='color:blue'><a href='" + url + "'>" + url.replace(/\&parameters/,"&amp;parameters") + "</a></font></br>");
			if (!RES) console.log("\n" + clc.blue(url)); // Show URL
		}
		report.url = url;
		if (!obj) return;
		obj.url = url;

		if (RES) {
			// Get function name from description in obj and replace it
			// with a link to GitHub code.
			var key = obj.description.replace(/^is\.(.*?)\(.*/,"$1");
			obj.description = obj.description.replace(/^(is.*?):/,"<a href='https://github.com/hapi-server/verifier-nodejs/blob/master/is.js#L__LINE__'>$1</a>");
			obj.description = obj.description.replace(/__LINE__/,report.lineobj[key]);
		}
		if (obj.error == true && warn == false) {
			report.fails.push(obj)
			if (RES) RES.write("&nbsp&nbsp;<font style='color:black;background:red'>Fail</font>:&nbsp" + obj.description + ";&nbsp;Got: <b>" + obj.got.toString().replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;")+ "</b><br>")
			if (!RES) console.log("  " + clc.inverse.red("Fail") + ": " + obj.description + "; Got: " + clc.bold(obj.got));
		} else if (obj.error == true && warn == true) {
			report.warns.push(obj)
			if (RES) RES.write("&nbsp&nbsp;<font style='color:black;background:yellow'>Warn</font>:&nbsp;" + obj.description + ";&nbsp;Got:&nbsp<b>" + obj.got.toString().replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;") + "</b><br>")
			if (!RES) console.log("  " + clc.yellowBright.inverse("Warn") + ": " + obj.description + "; Got: " + clc.bold(obj.got));
		} else {
			report.passes.push(obj)
			if (RES) RES.write("&nbsp&nbsp;<font style='color:black;background:green'>Pass</font>:&nbsp;" + obj.description + ";&nbsp;Got:&nbsp<b>" + obj.got.toString().replace(/\n/g,"<br>").replace(/\s/g,"&nbsp;") + "</b><br>")
			if (!RES) console.log("  " + clc.green.inverse("Pass") + ": " + obj.description + "; Got: " + clc.bold(obj.got));			
		}

		if (stop && obj.error && !warn) {
			// Can't continue testing.  Send abort message.
			if (RES) RES.write("<br>&nbsp&nbsp;<font style='color:red'>Cannot continue tests due to last failure.</font><br>");
			if (!RES) console.log(clc.red("\n  Cannot continue tests on URL due to last failure."));
		}
		if (stop && obj.error && abort) {
			if (RES) RES.end("<br>End of validation tests.</body></html>");
			if (!RES) console.log(clc.red("\nEnd of validation tests."));
			if (RES) RES.end()
		}

		return (stop && obj.error);
	}

	function root() {
		var url = ROOT;
		report(url);

		request(url, 
			function (err,res,body) {
				if (err) {
					report(url,{"description":"Probably " + url + " not a valid URL","error":true,"got":err},{"warn":true});
				}
				// TODO: if (!body), warn.
				report(url,is.HTTP200(res),{"warn":true});
				report(url,is.ContentType(/^text\/html/,res.headers["content-type"]),{"warn":true});
				capabilities();
			}).on('error',abort)
	}

	function capabilities() {
		url = ROOT + "/capabilities";
		report(url);
		request(url, 
			function (err,res,body) {
				if (err) {
					report(url,{"description":"Probably " + url + " is not a valid URL","error":true,"got":err},{"stop":true})
					return;
				}
				if (report(url,is.HTTP200(res),{"stop":true})) return;
				report(url,is.ContentType(/^application\/json/,res.headers["content-type"]));
				if (report(url,is.JSONparsable(body),{"stop":true})) return;
				if (report(url,is.HAPIJSON(body,'capabilities'))) return;
				var json = JSON.parse(body)
				var outputFormats = json.outputFormats || "No outputFormats element."
				report(url,{"description":"Expect outputFormats to have 'csv'","error": outputFormats.indexOf("csv") == -1,"got": outputFormats.toString()});
				catalog();
				return;
			})
	}

	function catalog() {
		var url = ROOT + "/catalog";
		report(url);
		request(url, 
			function (err,res,body) {
				if (err) {
					if (report(url,{"description":"Probably " + url + " is not a valid URL","error":true,"warning":false,"got":error},{"stop":true,"abort":true})) return;
					return;
				}
				if (report(url,is.HTTP200(res),{"stop":true,"abort":true})) return;
				report(url,is.ContentType(/^application\/json/,res.headers["content-type"]));
				if (report(url,is.JSONparsable(body),{"stop":true})) return;
				report(url,is.HAPIJSON(body,'catalog'));
				var datasets = JSON.parse(body).catalog;
				report(url,is.Unique(datasets,"datasets","id"));			
				datasets = removeDuplicates(datasets,'id');
				report(url,is.TooLong(datasets,"catalog","id","title",40),{"warn":true});
				infoerr(datasets);
			})
	}

	function infoerr(datasets) {
		var url = ROOT + '/info?id=' + "a_test_of_an_invalid_id_by_verifier-nodejs";
		request(url, 
			function (err,res,body) {
				if (err) {
					if (report(url,{"description":"Probably " + url + " is not a valid URL","error":true,"warning":false,"got":err},{"stop":true,"abort":true})) return;
					return;
				}
				report(url,is.ContentType(/^application\/json/,res.headers["content-type"]));
				report(url,is.ErrorCorrect(res.statusCode,404,"httpcode"));
				report(url,is.ErrorInformative(res.statusMessage,1406,"httpmessage"),{"warn":true});
				if (!report(url,is.JSONparsable(body))) {
					report(url,is.HAPIJSON(body,'error14xx'));
					var json = JSON.parse(body);
					report(url,is.ErrorCorrect(json.status.code,1406,"hapicode"));
					var err1406 = errors(1406);
					report(url,is.ErrorInformative(json.status.message,err1406.message,"hapimessage"),{"warn":true});
				}
				info(datasets);
			})
	}

	function info(datasets) {

		if (datasets.length == 0) {
			report();
			return
		}

		if (ID === "") {
			var url = ROOT + '/info?id=' + datasets[0]["id"];
		} else {
			var url = ROOT + '/info' + "?id=" + ID;
			// Only check one dataset with id = ID.
			datasets = selectOne(datasets,'id',ID);
			if (datasets.length == 0) {
				if (report(url,{"description": "Dataset " + ID + " is not in catalog","error":true,"got": "to abort"},{"stop":true,"abort":true})) return;
			}
		}

		report(url);
		request(url, 
			function (err,res,body) {
				var url = res.request.href;
				if (err) {
					report(url,{"description":"","error":true,"got":err},{"stop":true})
					return;
				}
				if (report(url,is.HTTP200(res),{"stop":true})) return;

				report(url,is.ContentType(/^application\/json/,res.headers["content-type"]));
				if (report(url,is.JSONparsable(body),{"stop":true})) return;
				report(url,is.HAPIJSON(body,'info'));
				var header = JSON.parse(body);

				report(url,is.Unique(header.parameters,"parameters","name"));
				header.parameters = removeDuplicates(header.parameters,'name');
				report(url,is.TimeFirstParameter(header));

				report(url,is.TimeIncreasing(header,"{start,stop}Date"));
				report(url,is.TimeIncreasing(header,"sample{Start,Stop}Date"));
				report(url,is.CadenceOK(header,"{start,stop}Date"));
				report(url,is.CadenceOK(header,"sample{Start,Stop}Date"));

				for (var i = 0;i<header.parameters.length;i++) {
					len  = header.parameters[i]["length"];
					type = header.parameters[i]["type"];
					name = header.parameters[i]["name"];
					size = header.parameters[i]["size"];
					fill = header.parameters[i]["fill"];

					report(url,is.FillOK(fill,type,len,name,'null'),{"warn":true});

					if (type === "isotime") {
						report(url,is.FillOK(fill,type,len,name,'isotimelength'),{"warn":true});
					}
					if (type === "string") {
						report(url,is.FillOK(fill,type,len,name,'stringlength'));
						report(url,is.FillOK(fill,type,len,name,'stringparse'),{"warn":true});
					}
					if (type === "integer") {
						report(url,is.FillOK(fill,type,len,name,'integer'),{"warn":true});
					}

					if (type === "double") {
						report(url,is.FillOK(fill,type,len,name,'double'),{"warn":true});
					}

					report(url,is.LengthAppropriate(len,type,name));
					report(url,is.SizeAppropriate(size,name,"2D+"),{"warn":true});
					report(url,is.SizeAppropriate(size,name,"needed"),{"warn":true});
				}
				if (PARAMETER !== "") {
					var Time = header.parameters[0];
					header.parameters = selectOne(header.parameters,'name',PARAMETER);
					header.parameters.unshift(Time);
					if (header.parameters.length == 0) {
						var url = ROOT + '/info' + "?id=" + ID;
						if (report(url,{"description": "Parameter " + PARAMETER + " is not in parameter array","error":true,"got": "to abort"},{"stop":true})) return;
					}
				}
				//data(datasets,header,0);
				infor(datasets,header);
			})
	}

	function infor(datasets,header) {
		// Check if JSON has two parameter objects when only one parameter is requested.
		// Checks only the second parameter (first parameter after Time).
		var url = ROOT + '/info' + "?id=" + datasets[0].id + '&parameters=' + header.parameters[1].name;

		report(url);
		request(url, 
			function (err,res,body) {
				var url = res.request.href;
				if (err) {
					if (report(url,{"description":"","error":true,"got":err},{"stop":true}))
					return;
				}
				if (report(url,is.HTTP200(res),{"stop":true,"abort":false})) {
					data(datasets,header,0);
					return;
				}
				report(url,is.ContentType(/^application\/json/,res.headers["content-type"]));
				if (report(url,is.JSONparsable(body),{"stop":true})) return;
				report(url,is.HAPIJSON(body,'info'));
				var headerr = JSON.parse(body); // Reduced header
				report(url,{"description":"Expect # parameters in JSON to be 2 when one non-time parameter is requested","error": headerr.parameters.length != 2,"got": headerr.parameters.length + " parameters."});
				data(datasets,header,0);
			})
	}

	function data(datasets,header,pn) {

		if (header.parameters.length == pn) {
			datasets.shift(); // Remove first element
			info(datasets); // Start next dataset
			return; // All parameters for dataset have been checked.
		}

		if (START && STOP) {
			var start = START;
			var stop  = STOP;
		} else if (header["sampleStartDate"] && header["sampleStopDate"]) {
			var start = header["sampleStartDate"];
			var stop  = header["sampleStopDate"];
		} else {
			var start = header["startDate"];
			var stop  = new Date(start).valueOf() + 86400*1000; // Check one day
			var stop = new Date(stop).toISOString().slice(0,-1);
			// TODO: Use a multiple of cadence.
			//stop = new Date(start).valueOf() + 1000; // Add one second			
		}
		
		var parameter = header.parameters[pn].name;

		// TODO: Possibly warn if parameter not a valid c identifier: /[_a-zA-Z][_a-zA-Z0-9]{0,30}/
		var url = ROOT + '/data' + "?id=" + datasets[0].id + '&parameters=' + parameter + '&time.min=' + start + '&time.max=' + stop	
		//report(url);
		request({"url":url,"gzip":true}, 
			function (err,res,body) {
				var url = res.request.href;
				if (err) {
					if (report(url,{"description":"","error":true,"got":err},{"stop":true}))
					return;
				}

				if (report(url,is.HTTP200(res),{"stop":true,"abort":false})) {
					data(datasets,header,++pn); // Check next parameter
					return;
				}
				report(url,is.CompressionAvailable(res.headers),{"warn":true});
				report(url,is.ContentType(/^text\/csv/,res.headers["content-type"]));

				report(url,is.FileOK(body,"firstchar"));
				report(url,is.FileOK(body,"lastchar"));
				report(url,is.FileOK(body,"extranewline"));
				report(url,is.FileOK(body,"numlines"));

				line1 = lines[0].split(",");
				time1 = line1[0].trim();
				timeLength = header.parameters[0].length;
				
				report(url,is.ISO8601(time1));
				report(url,is.CorrectLength(time1,timeLength,"Time","",false),{"warn":true});
				report(url,is.TimeIncreasing(lines,"CSV"));
				report(url,is.TimeInBounds(lines,start,stop));

				len  = header.parameters[pn]["length"];
				type = header.parameters[pn]["type"];
				name = header.parameters[pn]["name"];
				size = header.parameters[pn]["size"];

				if (pn == 0) {
					// Time was requested parameter, no more columns to check
					data(datasets,header,++pn); // Check next parameter
					return;
				}

				var nf = 1; // Number of fields (columns) counter (start at 1 since time checked already)

				if (!header.parameters[pn]["size"]) {
					nf = nf + 1; // Width of field (number of columns of field)
				} else {
					nf = nf + prod(header.parameters[pn]["size"])
				}

				// Note line.length - 1 = because split() add extra empty element at end.
				report(url,is.SizeCorrect(line1.length-1,nf-1,header.parameters[pn]),{"warn":true});

				for (var j=1;j < nf;j++) {
					var extra = ' in column ' + j + ' on first line.'
					if (header.parameters[pn]["type"] == "string") {
						report(url,is.CorrectLength(line1[j],len,name,extra),{"warn":true});
					}
					if (header.parameters[pn]["type"] == "isotime") {
						report(url,is.ISO8601(line1[j].trim(),extra));
						report(url,is.CorrectLength(line1[j],len,name,extra),{"warn":true});
					}
					if (header.parameters[pn]["type"] == "integer") {
						report(url,is.Integer(line1[j],extra));
					}
					if (header.parameters[pn]["type"] == "double") {
						report(url,is.Float(line1[j],extra));
					}
				}

				report(url,{"description":'Expect (# of columns in first line of CSV) - (# computed from length and size metadata) should be zero.',"error":nf != line1.length,"got":"(" + nf + ")" + " - (" + line1.length + ")"});

				data(datasets,header,++pn); // Check next parameter
			})
	}
}
exports.run = run;

function errors(num) {

	var errs = {
		"1400": {status: 400, "message": "HAPI error 1400: user input error"},
		"1401": {status: 400, "message": "HAPI error 1401: unknown request field"},
		"1402": {status: 400, "message": "HAPI error 1402: error in start time"},
		"1403": {status: 400, "message": "HAPI error 1403: error in stop time"},
		"1404": {status: 400, "message": "HAPI error 1404: start time equal to or after stop time"},
		"1405": {status: 400, "message": "HAPI error 1405: time outside valid range"},
		"1406": {status: 404, "message": "HAPI error 1406: unknown dataset id"},
		"1407": {status: 404, "message": "HAPI error 1407: unknown dataset parameter"},
		"1408": {status: 400, "message": "HAPI error 1408: too much time or data requested"},
		"1409": {status: 400, "message": "HAPI error 1409: unsupported output format"},
		"1410": {status: 400, "message": "HAPI error 1410: unsupported include value"},
		"1500": {status: 500, "message": "HAPI error 1500: internal server error"},
		"1501": {status: 500, "message": "HAPI error 1501: upstream request error"}
	};
	
	if (!num) return errs;

	return errs[num+""];
}

function prod(arr) {
	// Compute product of array elements.
	return arr.reduce(function(a,b){return a*b;})
}

function removeDuplicates(arr,key){
	// Remove array elements with objects having
	// key value that that is not unique.  Keep first unique.
	var obj = {};

	for (var i=0;i < arr.length;i++ ) obj[arr[i][key]] = arr[i];

	arr = [];
	// Keep last unique
	// for (keys in obj) arr.push(obj[keysr[i]]);

	// Keep first unique
	var keysr = Object.keys(obj).reverse();
	for (var i=0;i<keysr.length;i++) arr.push(obj[keysr[i]]);

	return arr.reverse();
}

function selectOne(arr,key,value) {

	// Return first array element with an object that has a key with
	// the given value.
	// TODO: Allow value to be an array.

	var found = false;
	var ids = [];
	var k = 0;
	while (arr.length > 0) {
		found = arr[0][key] === value;
		ids[k] = arr[0][key];
		k = k + 1;
		if (found) {
			break;
		} else {
			arr.shift();
		}
	}
	if (found) {
		arr = [arr[0]];
	}
	return arr;			
}