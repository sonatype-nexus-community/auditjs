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
var ossi = require('./ossindex.js');

// A simple control-flow library for node.JS
var step = require('step');

// Used in package version comparisons
var semver = require('semver');

/**
 * Queries should be done in batches when possible to reduce the hits on the
 * server.
 */
var BATCH_SIZE = 20;

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
 * We will be running the audit in batches for speed reasons.
 * 
 * @param dependencies
 * @param keys
 */
auditPackagesImpl = function(depList, callback) {
	// Iterate through the list until there are no elements left.
	if(depList.length != 0) {
		
		var names = [];
		var versions = [];
		for(var i = 0; i < BATCH_SIZE; i++)
		{
			// Get the current package/version
			var dep = depList.shift();
			names.push(dep.name);
			versions.push(dep.version);
			
			if(depList.length == 0) break;
		}
		
		// Audit the specified package/version
		auditPackageBatchImpl(names, versions, callback, function(err) {
			// Iterate to the next element in the list
			auditPackagesImpl(depList, callback);
		});
	}
};

/** Run an audit pass against a specific package version. This involves
 * multiple accesses to the OSS Index JSON API.
 * 
 * The code is rather complex because we are performing batch queries to
 * the database and we need to retain knowledge about which package
 * name/versions belong with which result data.
 * 
 * @param names Array of package names to run against
 * @param versions Array of versions for the packages
 * @param onResult Where to send results
 * @param onComplete What to call when a job is done
 */
auditPackageBatchImpl = function(names, versions, onResult, onComplete) {
	step(
			// Get the artifacts with the specified package name/version
			// We do this first query in batch.
			function() {
				ossi.getNpmArtifacts(names, versions, this)
			},
			// Given an artifact, get the related SCM
			function(err, artifacts) {
				if(err) {
					onResult(err, names[0], versions[0]);
					onComplete(err);
					return;
				}
				
				// The artifacts that are returned will match the request ranges.
				// Some package ranges may not be matched at all. We need to get
				// an array with the best matches for each of the names/versions.
				var artifactMatches = getArtifactMatches(names, artifacts);
				
				// If there is a mismatch with the array lengths then something has
				// surely gone wrong. We could try to repair the data, but for now
				// lets bail out on the query.
				if(artifactMatches.length != names.length) {
					onResult("Unexpected results. Artifact mismatch with supplied names [" + artifacts.length + "," + names.length + "]");
					return;
				}
				
				// Filter out the artifacts which we cannot find in the OSS Index.
				// There are various possible reasons why this may happen.
				var artifactIds = [];
				for(var i = 0; i < names.length; i++) {
					if(artifactMatches[i] == undefined || artifactMatches[i].scm_id == undefined) {
						onResult(err, names[i], versions[i], [{"status": "unknown"}]);
						names.splice(i, 1);
						versions.splice(i, 1);
						artifactMatches.splice(i, 1);
						i--;
					}
					else {
						artifactIds.push(artifactMatches[i].scm_id);
					}
				}
				
				// If there are any good artifactIds left, then try to get the matching
				// SCMs.
				if(artifactIds.length > 0) {
					ossi.getScms(artifactIds, this);
				}
				
				// Otherwise bail out.
				else {
					onComplete();
				}
			},
			// Get all of the SCM data and run an audit on them
			function(err, scms) {
				if(err) {
					onResult(err, names[0], versions[0]);
					onComplete(err);
					return;
				}
				
				// Now that we have SCMs batch more becomes more difficult.
				// It also becomes much less important as the number of
				// packages with known vulnerabilities are small compared to
				// the total number.
				auditScms(names, versions, scms, onResult, function(err) {
					onComplete();
				});
			}
	);
};

/** The artifacts that are returned will match the request ranges.
 * Some package ranges may not be matched at all. We need to get
 * an array with the best matches for each of the names/versions.
 */
getArtifactMatches = function(names, artifacts) {
	var results = [];
	var j = 0;
	for(var i = 0; i < names.length; i++) {
		var name = names[i];
		
		// Find the most recent artifact matching the name
		var artifact = artifacts[j];
		var matchedArtifact = undefined;
		while(artifact.search[1] == name) {
			if(matchedArtifact == undefined) {
				matchedArtifact = artifact;
			}
			else {
				// Keep the most recent artifact
				if(semver.gt(artifact.version, matchedArtifact.version)) {
					matchedArtifact = artifact;
				}
			}
			j++;
			if(j < artifacts.length) {
				artifact = artifacts[j];
			}
			else {
				break;
			}
		}
		
		// Keep the best matches as well as nulls
		results.push(matchedArtifact);
		
		// If we are out of artifacts then bail here
		if(j >= artifacts.length) break;
	}
	return results;
}

/** Given a list of names, versions, and matching SCMs, figure out
 * which ones can be audited further (have valid CPE codes). Ones
 * that do not either have a status of some sort or will be given
 * one.
 * 
 * @param names
 * @param versions
 * @param scms
 * @param onResult
 * @param onComplete
 */
auditScms = function(names, versions, scms, onResult, onComplete) {
	// Figure out which SCMs have CPEs. This will be a small subset.
	// The remainder are sent as results.
	for(var i = 0; i < scms.length; i++) {
		
		// Figure out the status
		var status = undefined;
		if(scms[i].cpes == undefined) status = "pending";
		else if(scms[i].cpes.length == 0) status = "pending";
		else if(scms[i].cpes[0].status != undefined) status = scms[i].cpes[0].status;
		
		// Does this SCM has a known status?
		if(status != undefined) {
			onResult(undefined, names[i], versions[i], [{"status": status}]);
			names.splice(i, 1);
			versions.splice(i, 1);
			scms.splice(i, 1);
			i--;
		}
	}
	
	// Anything left by this point have CPEs
	if(scms.length > 0) {
		auditScmList(names, versions, scms, onResult, function(err){
			onComplete();
		});
	}
	else {
		onComplete();
	}
};

/** Given arrays of names/versions/scms which we *know* have valid CPE
 * codes, find any related CVEs and related interesting information.
 * 
 * @param names
 * @param versions
 * @param scms
 * @param onResult
 * @param onComplete
 */
auditScmList = function(names, versions, scms, onResult, onComplete) {
	if(names.length == 0) {
		onComplete();
		return;
	}
	
	var name = names.shift();
	var version = versions.shift();
	var scm = scms.shift();
	
	auditScm(name, version, scm, onResult, function(err) {
		auditScmList(names, versions, scms, onResult, onComplete);
	});
};

/** Given a single SCM which we KNOW has valid CPE code(s), find any
 * related CVEs and related interesting information.
 * 
 * @param name
 * @param version
 * @param scm
 * @param onResult
 * @param onComplete
 */
auditScm = function(name, version, scm, onResult, onComplete) {
	step(
			// First get a list of CPE IDs and perform a query to get the details
		function() {
			var cpeIds = [];
			var cpes = scm.cpes;
			for(var i = 0; i < cpes.length; i++) {
				cpeIds.push(cpes[i].cpecode);
			}
			ossi.getCpeListDetails(cpeIds, this);
		},
		// For the CPEs we can get a list of CVEs which we will then
		// get further details for.
		function(err, cpes) {
			if(err) {
				onResult(err, name, version);
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
				ossi.getCves(cveIds, this);
			}
			else {
				onResult(undefined, name, version);
				onComplete();
			}
		},
		// Now that we have full CVE results, send them to the results callback.
		// Finally some real data!
		function(err, cveDetails) {
			if(err) {
				onResult(err, name, version);
				onComplete(err);
				return;
			}
			
			onResult(undefined, name, version, cveDetails);
			onComplete();
		}
	);
};


/** Run an audit pass against a specific SCM version. This involves
 * multiple access to the OSS Index JSON API.
 * 
 * Note that this is a simple case where there is no batch processing
 * going on. It is reasonable to run things this way if there are not
 * too many queries going on.
 * 
 * If we will be calling this A LOT then we will want to start batching
 * the queries.
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
					ossi.getScms([scmShortForm[0].id], this);
				}
				else
				{
					onComplete(undefined, [{"status": "unknown"}]);
				}
			},
			// For a given SCM, get the associated CPEs
			function(err, scms) {
				if(err) {
					onComplete(err);
					return;
				}
				var cpeIds = [];
				var statusCpes = [];
				if(scms != undefined && scms.length == 1 && scms[0].cpes != undefined) {
					var cpes = scms[0].cpes;
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
					ossi.getCves(cveIds, this);
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
