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
var ossi = require('ossindexjs');

// A simple control-flow library for node.JS
var step = require('step');

/**
 * EXPORT providing auditing of specified dependencies.
 * 
 */
module.exports = {
		
		/** Audit a list of packages
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
		auditPackages: function(depList, callback) {
			auditPackagesImpl(depList, callback);
		},

		/**
		 * Audit a specific package
		 * 
		 * @param pkgName Name of the package to audit
		 * @param versionRange Semantic version range for the package
		 * @param callback Function to call on completion of each dependency
		 *                 analysis. This call back has 4 arguments:
		 *                 (err, pkgName, version, details).
		 */
		auditPackage: function(pkgName, versionRange, callback) {
			auditPackageImpl(pkgName, versionRange, callback);
		},
		
		/**
		 * Audit an SCM with the supplied URI. For example
		 * `https://github.com/joyent/node.git`
		 */
		auditScm: function(uri, callback) {
			auditScmImpl(uri, callback);
		}
};

/** Iterate through the dependencies. Get the audit results for each.
 * 
 * @param dependencies
 * @param keys
 */
auditPackagesImpl = function(depList, callback) {
	// Iterate through the list until there are no elements left.
	if(depList.length != 0) {
		// Get the current package/version
		var dep = depList.shift();
		var name = dep.name;
		var version = dep.version;
		
		// Audit the specified package/version
		auditPackageImpl(name, version, function(err, details) {
			if(err) {
				callback(err, name, version);
			}
			else {
				// Send the results to the result callback
				callback(undefined, name, version, details);
				
				// Iterate to the next element in the list
				auditPackagesImpl(depList, callback);
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
auditPackageImpl = function(key, version, onComplete) {
	step(
			// Get the artifact with the specified package name/version
			function() {
				ossi.getNpmArtifact(key, version, this)
			},
			// Given an artifact, get the related SCM
			function(err, artifact) {
				if(err) {
					onComplete(err);
					return;
				}
				if(artifact != undefined && artifact.scm_id != undefined) {
					ossi.getScm(artifact.scm_id, this);
				}
				else
				{
					onComplete(undefined, [{"status": "unknown"}]);
				}
			},
			// For a given SCM, get the associated CPEs
			function(err, scm) {
				if(err) {
					onComplete(err);
					return;
				}
				var cpeIds = [];
				var statusCpes = [];
				if(scm != undefined && scm.cpes != undefined) {
					var cpes = scm.cpes;
					for(var i = 0; i < cpes.length; i++) {
						if(cpes[i].status != undefined) {
							statusCpes.push(cpes[i]);
						}
						else {
							cpeIds.push(cpes[i].cpecode);
						}
					}
				}
				if(cpeIds.length > 0) {
					ossi.getCpeListDetails(cpeIds, this);
				}
				else {
					onComplete(undefined, statusCpes);
				}
			},
			// For the specified CVEs get the full CVE details
			function(err, cpes) {
				if(err) {
					onComplete(err);
					return;
				}
				if(cpes != undefined) {
					// Collect all the CVE IDs from the CPE detail list
					var cveIds = [];
					for(var i = 0; i < cpes.length; i++) {
						var cpe = cpes[i];
						if(cpe.cves != undefined) {
							for(var j = 0; j < cpe.cves.length; j++) {
								cveIds.push(cpe.cves[j].id);
							}
						}
					}
					ossi.getCveListDetails(cveIds, this);
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

/** Run an audit pass against a specific SCM version. This involves
 * multiple access to the OSS Index JSON API.
 * 
 * @param key
 * @param version
 * @param callback
 */
auditScmImpl = function(uri, onComplete) {
	step(
			// Get the SCM ID for the artifact with the specified package name/version
			function() {
				ossi.getScmByUri(uri, this)
			},
			// Given a small SCM object (from search) request the full details
			function(err, scmShortForm) {
				if(err) {
					onComplete(err);
					return;
				}
				if(scmShortForm != undefined && scmShortForm.length == 1 && scmShortForm[0].id != undefined) {
					ossi.getScm(scmShortForm[0].id, this);
				}
				else
				{
					onComplete(undefined, [{"status": "unknown"}]);
				}
			},
			// For a given SCM, get the associated CPEs
			function(err, scm) {
				if(err) {
					onComplete(err);
					return;
				}
				var cpeIds = [];
				var statusCpes = [];
				if(scm != undefined && scm.cpes != undefined) {
					var cpes = scm.cpes;
					for(var i = 0; i < cpes.length; i++) {
						if(cpes[i].status != undefined) {
							statusCpes.push(cpes[i]);
						}
						else {
							cpeIds.push(cpes[i].cpecode);
						}
					}
				}
				if(cpeIds.length > 0) {
					ossi.getCpeListDetails(cpeIds, this);
				}
				else {
					onComplete(undefined, statusCpes);
				}
			},
			// For the specified CPEs get the full CVE details
			function(err, cpes) {
				if(err) {
					onComplete(err);
					return;
				}
				if(cpes != undefined) {
					// Collect all the CVE IDs from the CPE detail list
					var cveIds = [];
					for(var i = 0; i < cpes.length; i++) {
						var cpe = cpes[i];
						if(cpe.cves != undefined) {
							for(var j = 0; j < cpe.cves.length; j++) {
								cveIds.push(cpe.cves[j].id);
							}
						}
					}
					ossi.getCveListDetails(cveIds, this);
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
