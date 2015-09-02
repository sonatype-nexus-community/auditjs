#!/usr/bin/env node
/**
 *	Copyright (c) 2015 Vör Security Inc.
 *	All rights reserved.
 *	
 *	Redistribution and use in source and binary forms, with or without
 *	modification, are permitted provided that the following conditions are met:
 *	    * Redistributions of source code must retain the above copyright
 *	      notice, this list of conditions and the following disclaimer.
 *	    * Redistributions in binary form must reproduce the above copyright
 *	      notice, this list of conditions and the following disclaimer in the
 *	      documentation and/or other materials provided with the distribution.
 *	    * Neither the name of the <organization> nor the
 *	      names of its contributors may be used to endorse or promote products
 *	      derived from this software without specific prior written permission.
 *	
 *	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *	ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *	WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *	DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 *	DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 *	(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *	LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 *	ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *	(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *	SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/** Read through the package.json file in a specified directory. Build
 * a map of best case dependencies and indicate if there are any known
 * vulnerabilities.
 */

// File system access
var fs = require('fs');

// Next two requires used to get version from out package.json file
var path = require('path');
var pkg = require( path.join(__dirname, 'package.json') );

// Actual auditing "library". The library uses the OSS Index REST API
// to retrieve dependency information.
var auditor = require('./audit-package');

// Adds colors to console output
var colors = require('colors/safe');

// Decode HTML entities
var Entities = require('html-entities').AllHtmlEntities;
var entities = new Entities();

// Semantic version code
var semver = require('semver');

// Used to find installed packages and their dependencies
var npm = require('npm');

//Parse command line options. We currently support only one argument so
// this is a little overkill. It allows for future growth.
var program = require('commander');
program
.version(pkg.version)
.option('-p --package [package.json]', 'Specific package.json file to audit')
.option('-n --check-node', 'Do a vulnerability check against nodejs')
.option('-v --verbose', 'Print all vulnerabilities')
.action(function () {
});

program.on('--help', function(){
	usage();
});

program.parse(process.argv);

// By default we run an audit against all installed packages and their
// dependencies.
if (!program["package"]) {
	npm.load(function(err, npm) {
	    npm.commands.ls([], true, function(err, data, lite) {
			// Get a flat list of dependencies instead of a map.
			var deps = getDependencyList(data.dependencies);
			
			if(program.checkNode) {
				// First check for node itself
				auditor.auditScm("https://github.com/joyent/node.git", function(err, data) {
					resultCallback(err, "nodejs", process.version, data);
					
					// Now check for the dependencies
					auditor.auditPackages(deps, resultCallback);
				});
			}
			else {
				// Don't check node, only the dependencies
				auditor.auditPackages(deps, resultCallback);
			}
	    });
	});
}

// If a package.json file is specified, do an audit on the dependencies
// in the file only.
else {
	//Load the target package file
	var filename = program["package"];
	var targetPkg = undefined;
	
	try {
		// default encoding is utf8
		encoding = 'utf8';
	
		// read file synchroneously
		var contents = fs.readFileSync(filename, encoding);
	
		// parse contents as JSON
		targetPkg = JSON.parse(contents);
	
	} catch (err) {
		// an error occurred
		throw err;	
	}
	
	// Call the auditor library passing the dependency list from the
	// package.json file. The second argument is a callback that will
	// print the results to the console.
	if(targetPkg.dependencies != undefined) {
		// Get a flat list of dependencies instead of a map.
		var deps = getDependencyList(targetPkg.dependencies);
		auditor.auditPackages(deps, resultCallback);
	}
}

/** Recursively get a flat list of dependency objects. This is simpler for
 * subsequent code to handle then a tree of dependencies.
 * 
 * @param depMap
 * @returns A list of dependency objects
 */
function getDependencyList(depMap) {
	var results = [];
	var keys = Object.keys(depMap);
	for(var i = 0; i < keys.length; i++) {
		var name = keys[i];
		
		// The value of o depends on the type of structure we are passed
		var o = depMap[name];
		if(o.version) {
			results.push({"name": name, "version": o.version});
			if(o.dependencies) {
				var deps = getDependencyList(o.dependencies);
				if(deps != undefined) {
					results = results.concat(deps);
				}
			}
		}
		else {
			results.push({"name": name, "version": o});
		}
	}
	return results;
}

/** Help text
 * 
 * @returns
 */
function usage() {
	console.log("Audit installed packages and their dependencies to identify known");
	console.log("vulnerabilities as specified in the National Vulnerability Database (NVD) found");
	console.log("here: " + colors.bold.blue("https://nvd.nist.gov/"));
	console.log();
	console.log("If a package.json file is specified as an argument, only the dependencies in");
	console.log("the package file will be audited.");
	console.log();
	console.log("A result for a package that returns 'Queued request for vulnerability search'");
	console.log("indicates that the package has been submitted at OSS Index for manual");
	console.log("cross referencing with the NVD. Once a package is cross references it");
	console.log("remains so, which means that over time we should approach complete coverage.");
	console.log("Cross referencing will be performed as quickly as possible. If you get");
	console.log("'queued' results we suggest you check again the following day -- you should");
	console.log("have complete results by that time.");
	console.log();
	console.log(colors.bold.yellow("Limitations"));
	console.log();
	console.log("As this program depends on the OSS Index database, network access is");
	console.log("required. Connection problems with OSS Index will result in an exception.");
	console.log();
	console.log("The current version of AuditJS only reports on top level dependencies.");
	console.log("If feedback indicates people are interested we will extend auditing to run");
	console.log("against the full dependency tree");
	console.log();
	console.log("The NVD does not always indicate all (or any) of the affected versions");
	console.log("it is best to read the vulnerability text itself to determine whether");
	console.log("any particular version is known to be vulnerable.")
}

/** Write the audit results.
 * 
 * @param pkgName
 * @param version
 * @param details
 * @returns
 */
function resultCallback(err, pkgName, version, details) {
	console.log("------------------------------------------------------------");
	// If we KNOW a possibly used version is vulnerable then highlight the
	// title in red.
	var myVulnerabilities = getValidVulnerabilities(version, details);
	
	if(myVulnerabilities.length > 0) {
		console.log(colors.bold.red(pkgName + " " + version + " [VULNERABLE]"));
	}
	else {
		console.log(colors.bold(pkgName + " " + version));
	}
	if(err) {
		console.log(colors.bold.red("Error running audit: " + err));
		if(err.stack) {
			console.log(err.stack);
		}
	}
	if(details != undefined) {
		// Special statuses
		if(details.length == 1 && details[0].status != undefined) {
			var detail = details[0];
			if(detail.status == "pending") {
				console.log(colors.cyan("Queued request for vulnerability search"));
			}
			else if(detail.status == "none") {
				console.log(colors.grey("No known vulnerabilities"));
			}
			else if(detail.status == "unknown") {
				console.log(colors.grey("Unknown source for package"));
			}
			console.log();
		}
		
		// Vulnerabilities found
		else {
			// Status line
			console.log(details.length + " known vulnerabilities, " + myVulnerabilities.length + " affecting installed version");

			// By default only print known problems
			var printTheseProblems = myVulnerabilities;
			
			// If verbose, print all problems
			if(program.verbose) {
				printTheseProblems = details;
			}
		
			// We have decided that these are the problems worth mentioning.
			for(var i = 0; i < printTheseProblems.length; i++) {
				console.log();
				var detail = printTheseProblems[i];
				var title = detail["cve-id"] + " [http://ossindex.net/resource/cve/" + detail.id + "]";
				//console.log("  + " + JSON.stringify(detail));
				if(detail.score < 4) {
					console.log(colors.yellow.bold(title));
				}
				else if(detail.score < 7) {
					console.log(colors.yellow.bold(title));
				}
				else {
					console.log(colors.red.bold(title));
				}
				console.log(entities.decode(detail.summary));
				console.log();
				if(detail.cpes != null && detail.cpes.length > 0) {
					var vers = "";
					for(var j = 0; j < detail.cpes.length; j++) {
						if(j > 0) vers += ", ";
						var ver = detail.cpes[j].version;
						if(ver == undefined || ver.trim() == "") {
							vers += "unspecified";
						}
						else {
							vers += ver;
						}
					}
					console.log(colors.bold("Affected versions") + ": " + vers);
				}
				else {
					console.log(colors.bold("Affected versions") + ": unspecified");
				}
			}
			console.log();
		}
	}
}

/** Return list of vulnerabilities found to affect this version
 * 
 * @param range A version range as defined by semantic versioning
 * @param details The OSS Index CVE details object
 * @returns
 */
function getValidVulnerabilities(range, details) {
	var results = [];
	if(details != undefined) {
		for(var i = 0; i < details.length; i++) {
			var detail = details[i];
			
			if(detail.cpes != null && detail.cpes.length > 0) {
				for(var j = 0; j < detail.cpes.length; j++) {
					var version = getSemanticVersion(detail.cpes[j].version);
					try {
						if(semver.satisfies(version, range)) {
							results.push(detail);
							break;
						}
					}
					catch(err) {
						// Ignore errors. Probably due to the version in NVD not
						// being a proper semantic version.
					}
				}
			}
		}
	}
	return results;
}

/** Try and force a version to match that expected by semantic versioning.
 * 
 * @param version
 * @returns
 */
function getSemanticVersion(version) {
	// Correct semantic version: x.y.z
	if(version.match("^[0-9]+\.[0-9]+\.[0-9]+$")) return version;
	
	// x.y
	if(version.match("^[0-9]+\.[0-9]+$")) return version + ".0";
	
	// Fall back: hope it works
	return version;
}