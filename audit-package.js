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

// Provides simplified REST API access
var RestClient = require('node-rest-client').Client;

// A simple control-flow library for node.JS
var step = require('step');

//RELEASE HOST
//var ossindex = "https://ossindex.net";

//DEBUG HOST
var ossindex = "http://localhost:8080";

// Instantiate the rest client
var client = new RestClient();

/**
 * EXPORT providing auditing of specified dependencies.
 * 
 * Results are sent to a callback(err, pkgName, version, details)
 * 
 *   pkgName is the name of the package
 *   version is the version of the package
 *   details is an OSS Index CVE object
 * 
 * @param dependencies A map of {package name: version} pairs.
 * @param callback Function to call on completion of each dependency
 *                 analysis. This call back has 4 arguments:
 *                 (err, pkgName, version, details).
 */
module.exports = {
		audit: function(dependencies, callback) {
			var keys = Object.keys(dependencies);
			auditPackages(dependencies, keys, callback);
		}
};

/** Iterate through the keys, running against each dependency. Get the audit
 * results for each.
 * 
 * @param dependencies
 * @param keys
 */
auditPackages = function(dependencies, keys, callback) {
	// Iterate through the list until there are no elements left.
	if(keys.length != 0) {
		// Get the current package/version
		var key = keys.shift();
		var version = dependencies[key];
		
		// Audit the specified package/version
		auditPackage(key, version, function(err, details) {
			if(err) {
				callback(err, key, version);
			}
			else {
				// Send the results to the result callback
				callback(undefined, key, version, details);
				
				// Iterate to the next element in the list
				auditPackages(dependencies, keys, callback);
			}
		});
	}
};

/** Run an audit pass against a specific package version. This involves
 * multiple access to the OSS Index JSON API.
 * 
 * @param key
 * @param version
 * @param callback
 */
auditPackage = function(key, version, onComplete) {
	step(
			// Get the SCM ID for the artifact with the specified package name/version
			function() {
				getOssIndexIds(key, version, this)
			},
			// Given an SCM ID, get known CPEs
			function(err, artifactId, scmId) {
				if(err) {
					onComplete(err);
					return;
				}
				if(scmId != undefined) {
					getCpes(scmId, this);
				}
				else
				{
					onComplete(undefined, [{"status": "unknown"}]);
				}
			},
			// For a given list of CPEs, get the associated CVEs
			function(err, cpes) {
				if(err) {
					onComplete(err);
					return;
				}
				var realCpes = [];
				var statusCpes = [];
				if(cpes != undefined) {
					for(var i = 0; i < cpes.length; i++) {
						if(cpes[i].status != undefined) {
							statusCpes.push(cpes[i]);
						}
						else {
							realCpes.push(cpes[i]);
						}
					}
				}
				if(realCpes.length > 0) {
					getCvesFromCpeList(realCpes, this);
				}
				else {
					onComplete(undefined, statusCpes);
				}
			},
			// For the specified CVEs get the full CVE details
			function(err, cves) {
				if(err) {
					onComplete(err);
					return;
				}
				if(cves != undefined) {
					getCveListDetails(cves, this);
				}
				else {
					onComplete();
				}
			},
			// Return the accumulated results
			function(err, cveDetails) {
				if(err) {
					onComplete(err);
					return;
				}

				onComplete(undefined, cveDetails);
			}			
	);
};

/** OSS Index REST call
 * 
 * Request a list of artifacts matching the given package/version. Return the ID
 * of the best match.
 */
function getOssIndexIds(name, version, callback) {
	var query = ossindex + "/v1.0/search/artifact/npm/" + name + "/" + version;
	client.get(query, function(data, response){
		if(data != undefined && data.length > 0) {
			callback(undefined, data[0].id, data[0].scm_id);
		}
		else {
			callback();
		}
	});
};

/** OSS Index REST call
 * 
 * Request SCM data, getting the CPE information if it exists.
 */
function getCpes(scmId, callback) {
	client.get(ossindex + "/v1.0/scm/" + scmId, function(data, response){
		if(data != undefined) {
			callback(undefined, data.cpes);
		}
		else {
			callback();
		}
	});
};

/** Request CVE information, gathering them into a list before calling
 * the callback.
 * 
 * @param cpeList
 * @param callback
 */
function getCvesFromCpeList(cpeList, callback, results) {
	if(results == undefined) {
		results = [];
	}
	if(cpeList.length == 0) {
		callback(undefined, results);
	}
	else {
		var cpe = cpeList.shift();
		getCves(cpe, function(err, cves) {
			if(err) {
				callback(err);
			}
			if(cves != undefined) {
				results = results.concat(cves);
			}
			getCvesFromCpeList(cpeList, callback, results);
		});
	}
}

/**OSS Index REST call
 * 
 * Request SCM data, getting the CPE information if it exists.
 */
function getCves(cpe, callback) {
	client.get(cpe.cpe, function(data, response){
		if(data != undefined) {
			callback(undefined, data.cves);
		}
		else {
			callback();
		}
	});
};

/**
 * Given a CVE list, get all of the details which includes but is not limited to
 *   o Score
 *   o Impact information
 *   o Affected CPEs with versions
 *   o Reference information
 */
function getCveListDetails(cveList, callback, results) {
	if(results == undefined) {
		results = [];
	}
	if(cveList.length == 0) {
		callback(undefined, results);
	}
	else {
		var cve = cveList.shift();
		getCveDetails(cve, function(err, details) {
			if(err) {
				callback(err);
			}
			if(details != undefined) {
				results.push(details);
			}
			getCveListDetails(cveList, callback, results);
		});
	}
};


/** OSS Index REST call
 * 
 * Given a CVE list, get all of the details which includes but is not limited to
 *   o Score
 *   o Impact information
 *   o Affected CPEs with versions
 *   o Reference information
 */
function getCveDetails(cve, callback) {
	client.get(cve.cve, function(data, response){
		if(data != undefined) {
			callback(undefined, data);
		}
		else {
			callback();
		}
	});
};
