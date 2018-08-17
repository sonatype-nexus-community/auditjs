/**
 *	Copyright (c) 2015-2017 Vör Security Inc.
 *  Copyright (c) 2018-present Sonatype, Inc. All rights reserved.
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

var cache = require('persistent-cache');
var myCache = undefined;

/**
 * Queries should be done in batches when possible to reduce the hits on the
 * server.
 */
var BATCH_SIZE = 120;

/**
 * EXPORT providing auditing of specified dependencies.
 *
 */
module.exports = {

	/** Override the data host.
	 */
	setHost: function (scheme, host, port) {
		ossi.setHost(scheme, host, port);
	},

	setCache: function (path) {
		myCache = cache({
			base: path,
			name: 'auditjs3x',
			duration: 1000 * 3600 * 24 //one day
		});
	},

	setUser: function (myUsername, myToken) {
		ossi.setUser(myUsername, myToken);
	},

		/** Audit a list of packages
		 * Results are sent to a callback(err, single_package_data)
		 *
		 * @param dependencies A map of {package manager, package name, version} objects.
		 * @param callback Function to call on completion of each dependency
		 *                 analysis. This call back has 2 arguments:
		 *                 (err, single_package_data).
		 */
		auditPackages: function(depList, callback) {
			if (!myCache) {
				myCache = cache({
					base: require('os').homedir() + "/.auditjs",
					name: 'auditjs3x',
					duration: 1000 * 3600 * 24 //one day
				});
			}
			auditPackagesImpl(depList, callback);
		},

		/**
		 * Audit a specific package
		 *
		 * @param pkgManagerName Name of the package manager the package belongs to
		 * @param pkgName Name of the package to audit
		 * @param versionRange Semantic version range for the package
		 * @param callback Function to call on completion of each dependency
		 *                 analysis. This call back has 2 arguments:
		 *                 (err, single_package_data).
		 */
		auditPackage: function(pkgManagerName, pkgName, versionRange, callback) {
			if (!myCache) {
				myCache = cache({
					base: require('os').homedir() + "/.auditjs",
					name: 'auditjs3x',
					duration: 1000 * 3600 * 24 //one day
				});
			}
			auditPackagesImpl([{pm: pkgManagerName, name: pkgName, version: versionRange}], callback);
		},
};

/** Remove any version prefixes
 */
getCleanVersion = function (range) {
	var re = /([0-9]+)\.([0-9]+)\.([0-9]+)(.*)?/;
	var match = range.match(re);
	if(match != undefined) {
		if (match[4]) {
			return match[1] + "." + match[2] + "." + match[3] + match[4];
		} else {
			return match[1] + "." + match[2] + "." + match[3];
		}
	}
	return version;
};

createAuditPackage = function(dep) {
	var data = {};
	data.version = dep.version;
	data.name = dep.name;
	if (data.name.startsWith("@")) {
		data.name = data.name.substring(1);
		var index = data.name.indexOf("/");
		data.scope = data.name.substring(0, index);
		data.name = data.name.substring(index + 1);
	}
	data.format = dep.pm;
	data.depPaths = dep.depPaths;
	return data;
}

/** Iterate through the dependencies. Get the audit results for each.
 * We will be running the audit in batches for speed reasons.
 *
 * @param dependencies
 * @param keys
 */
auditPackagesImpl = function(depList, callback) {
	// Iterate through the list until there are no elements left.
	if(depList.length != 0) {

		var pkgs = [];
		for(var i = 0; i < BATCH_SIZE; i++)
		{
			if(depList.length == 0) break;

			var dep = depList.shift();

			var auditPkg = createAuditPackage(dep);

			// For now we will ignore Git URL and local path dependencies. We do it
			// in a fairly heavy handed way (any version with a slash)
			if (dep.version.indexOf("/") !== -1) {
				callback(undefined, auditPkg);
				continue;
			}

			// Get a clean version (that doesn't have any prefix noise)
			auditPkg.version = getCleanVersion(auditPkg.version);

			// Get the current package/version
			var purl = undefined;
			if (auditPkg.scope) {
				purl = auditPkg.format + ":" + auditPkg.scope + "/" + auditPkg.name + "@" + auditPkg.version;
			} else {
				purl = auditPkg.format + ":" + auditPkg.name + "@" + auditPkg.version;
			}

			// If the result is cached then report that!
			var cachedResult = myCache.getSync(purl);
			if (cachedResult) {
				callback(undefined, cachedResult);
				i--; // Since this isn't being sent to the server, it doesn't count as one of the batch
				continue;
			}
			pkgs.push({
				pm: auditPkg.format,
				scope: auditPkg.scope,
				name: auditPkg.name,
				version: auditPkg.version,
				depPaths: auditPkg.depPaths
			})
		}

		if (pkgs.length > 0) {
			// Audit the specified package/version
			auditPackageBatchImpl(pkgs,
				// OnResult
				function(err, pkg) {
					if (!err) {
						var purl = pkg.format + ":" + pkg.name + "@" + pkg.version;
						myCache.putSync(purl, pkg);
					}
					callback(err, pkg);
				},
				// OnComplete
				function(err) {
				// Iterate to the next element in the list
				auditPackagesImpl(depList, callback);
			});
		}
	}
};

/** Run an audit pass against specific package versions.
 */
auditPackageBatchImpl = function(pkgs, onResult, onComplete) {
	ossi.getPackageData(pkgs, function(error, data) {
		if (error) {
			onResult(error, pkgs[0]);
			onComplete();
			return;
		} else {
			for (var i = 0; i < data.length; i++) {
				data[i].version = pkgs[i].version;
				data[i].name = pkgs[i].name;
				data[i].scope = pkgs[i].scope;
				data[i].format = pkgs[i].pm;
				data[i].depPaths = pkgs[i].depPaths;
				onResult(undefined, data[i]);
			}
			onComplete();
		}
	});
};
