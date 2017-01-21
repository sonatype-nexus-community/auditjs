/**
 *	Copyright (c) 2015-2017 Vör Security Inc.
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

// Used in package version comparisons
var semver = require('semver');

/**
 * Queries should be done in batches when possible to reduce the hits on the
 * server.
 */
var BATCH_SIZE = 100;

/**
 * EXPORT providing auditing of specified dependencies.
 * 
 */
module.exports = {
		
		/** Audit a list of packages
		 * Results are sent to a callback(err, single_package_data)
		 * 
		 * @param dependencies A map of {package manager, package name, version} objects.
		 * @param callback Function to call on completion of each dependency
		 *                 analysis. This call back has 2 arguments:
		 *                 (err, single_package_data).
		 */
		auditPackages: function(depList, callback) {
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
			auditPackagesImpl([{pm: pkgManagerName, name: pkgName, version: versionRange}], callback);
		},
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
		
		var pkgs = [];
		for(var i = 0; i < BATCH_SIZE; i++)
		{
			// Get the current package/version
			var dep = depList.shift();
			pkgs.push({pm: dep.pm, name: dep.name, version: dep.version})
			
			if(depList.length == 0) break;
		}
		
		// Audit the specified package/version
		auditPackageBatchImpl(pkgs, callback, function(err) {
			// Iterate to the next element in the list
			auditPackagesImpl(depList, callback);
		});
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
				onResult(undefined, data[i]);
			}
			onComplete();
		}
	});
};
