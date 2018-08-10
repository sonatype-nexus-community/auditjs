#!/bin/sh
':' //; exec "$(command -v node || command -v nodejs)" "$0" "$@"

/**
 *	    Copyright (c) 2015-2017 Vör Security Inc.
 *      Copyright (c) 2018-present Sonatype, Inc. All rights reserved.
 *      All rights reserved.
 *
 *      Redistribution and use in source and binary forms, with or without
 *      modification, are permitted provided that the following conditions are met:
 *          * Redistributions of source code must retain the above copyright
 *            notice, this list of conditions and the following disclaimer.
 *          * Redistributions in binary form must reproduce the above copyright
 *            notice, this list of conditions and the following disclaimer in the
 *            documentation and/or other materials provided with the distribution.
 *          * Neither the name of the <organization> nor the
 *            names of its contributors may be used to endorse or promote products
 *            derived from this software without specific prior written permission.
 *
 *      THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *      ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 *      WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 *      DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 *      DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 *      (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 *      LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 *      ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 *      (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *      SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/** Read through the package.json file in a specified directory. Build
 * a map of best case dependencies and indicate if there are any known
 * vulnerabilities.
 */
//create reports directory
var mkdirp = require('mkdirp');
var path = require('path');
//sumarize results in JUnit with this
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
//write found vulnerabilities to JUnit xml
var jsontoxml = require('jsontoxml');

// Use winston for logging
const winston = require('winston');

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

// dictionary of vulnerable packages for xml-report
var JUnit = { 'testsuite':[] };

// Used to find installed packages and their dependencies
var npm = require('npm');

/**
 * Total number of dependencies being audited. This will be set
 * before starting the audit.
 */
var expectedAudits = 0;

/**
 * Total number of dependencies audited so far.
 */
var actualAudits = 0;

/**
 * List of dependencies that we want to check after the package checks.
 */
var dependencies = [];

/**
 * Map of dependencies to audit. This ensures we only audit a dependency
 * once.
 */
var auditLookup = {};

/**
 * Count encountered vulnerabilities
 */
var vulnerabilityCount = 0;

var config = require('./config');
config.init(pkg, auditor);
var logger = config.get("logger");
var categories = config.get("categories");
var whitelist = config.get("whitelist");
var programPackage = config.get("programPackage");
var output = config.get("output");

// Remember all vulnerabilities that were white-listed
var whitelistedVulnerabilities = [];

// By default we run an audit against all installed packages and their
// dependencies.
if (!config.get("package")) {
        npm.load(function(err, npm) {
                npm.commands.ls([], true, function(err, data, lite) {
                        // Get a flat list of dependencies instead of a map.
                        var depObjectLookup = buildDependencyObjectLookup(data);
                        var dataDeps = getDepsFromDataObject(data, depObjectLookup);
                        var deps = getDependencyList(dataDeps, depObjectLookup);
                        if(config.get("noNode")) {
                                // Set the number of expected audits
                                expectedAudits = deps.length;

                                // Only check dependencies
                                auditor.auditPackages(deps, resultCallback);
                        }
                        else {
                                // Set the number of expected audits
                                expectedAudits = deps.length + 1; // +1 for hardcoded nodejs test

                                // First check for node itself. We use the 'chocolatey' package manager
                                // to hang this query on.
                                version = (process.version.charAt(0) === "v") ? process.version.substr(1) : process.version;
                                auditor.auditPackage("chocolatey", "nodejs", version, function(err, data) {
                                        resultCallback(err, data);

                                        // Now check for the dependencies
                                        auditor.auditPackages(deps, resultCallback);
                                });
                        }
                });
        });
}

// If a package.json file is specified, do an audit on the dependencies
// in the file only.
else {

        //Load the target package file
        var filename = config.get("package");
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
        var deps = [];
        for (var i = 0; i < categories.length; i++) {
        	var category = categories[i];
            if(targetPkg[category] != undefined) {
                // Get a flat list of dependencies instead of a map.
            	var myDeps = getDependencyList(targetPkg[category]);
            	if (myDeps) {
            		// getDependencyList avoids duplicates, so we can just append
            		deps = deps.concat(myDeps);
            	}
            }
        }

        expectedAudits = deps.length;
        auditor.auditPackages(deps, resultCallback);
}

/** Set the return value
 *
 * @param options
 * @param err
 * @returns
 */
function exitHandler(options, err) {
  if (err) {
    if (err.stack) {
      console.error(err.stack);
    } else {
      console.error(err.toString());
    }
  }
	if (whitelistedVulnerabilities.length > 0) {
        logger.info(colors.bold.yellow("Filtering the following vulnerabilities"));
        logger.info(colors.bold.yellow('=================================================='));
        for (var i = 0; i < whitelistedVulnerabilities.length; i++) {
        	var detail = whitelistedVulnerabilities[i];
          logger.info(`${colors.bold.blue(detail['title'])} affected versions: ${colors.red(detail['package'])} ${colors.red(detail['versions'])}`);
          logger.info(`${detail['description']}`);
          logger.info(colors.bold("ID") + ": " + detail.id);
          if (detail.whitelistedPaths) {
            detail.whitelistedPaths.forEach(function(path) {
              logger.info(colors.bold("Ignored Path") + ": " + path);
            })
          }
          logger.info(colors.bold.yellow('=================================================='));
        };
	}

  logger.info('');
  logger.info('Audited dependencies: ' + actualAudits +
            ', Vulnerable: ' + colors.bold.red(vulnerabilityCount) +
            ', Ignored: ' + whitelistedVulnerabilities.length);

    if(config.get('report')) {
        var filtered = whitelistedVulnerabilities.length;
        mkdirp('reports');
        if (JUnit[0] != '<') { // This is a hack in case this gets called twice
        	// Convert to XML
            JUnit = jsontoxml(JUnit);
        }
        var dom = new DOMParser().parseFromString(JUnit);
        dom.documentElement.setAttribute('name', `auditjs.security.${programPackage.split('.')[0]}`);
        dom.documentElement.setAttribute('errors', 0);
        dom.documentElement.setAttribute('tests', expectedAudits);
        dom.documentElement.setAttribute('package', 'test');
        dom.documentElement.setAttribute('id', '');
        dom.documentElement.setAttribute('skipped', filtered);
        dom.documentElement.setAttribute('failures', vulnerabilityCount);
        JUnit = new XMLSerializer().serializeToString(dom);
        logger.info( `Wrote JUnit report to reports/${output}`);
        fs.writeFileSync('reports/' + output, `<?xml version="1.0" encoding="UTF-8"?>\n${JUnit}`);
    }

    if (config.get('suppressExitError')) {
      process.exit(0);
    } else {
      process.exit(vulnerabilityCount);
    }
}

function replacer(key, value) {
        if(typeof value === 'undefined'){
                return undefined;
        }
        return value;
}

//do something when app is closing
process.on('exit', exitHandler.bind(null,{cleanup:true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit:true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// Check if all properties of an object are null and return true if they are
function checkProperties(obj) {
        for (var key in obj) {
                if (obj[key] !== null && obj[key] != "")
                        return false;
        }
        return true;
}

/** Each specific package@version is only represented with the complete
 * dependency definitions once in the tree, but might not be where we need it.
 * Therefore we make a special lookup table
 * of package@version = [Object] which will be referenced later.
 */
function buildDependencyObjectLookup(data, lookup, parentPath) {
  if (lookup == undefined) {
    lookup = {};
  }

  parentPath = parentPath || '';

  for(var k in data.dependencies) {
    var dep = data.dependencies[k];
    depPath = parentPath + '/' + dep.name;

    var lookupKey = 'UNKNOWN'; //If we can't find a key below, something's wrong.
    var depToStore = dep;
    if (dep.name) {
      lookupKey = dep.name + '@' + dep.version
    } else if (dep._from) {
      lookupKey = dep._from;
    } else if (dep.requiredBy) {
      // If we can't find the node_modules folder, we'll get 'requiredBy' instead.
      lookupKey = k + "@" + dep.requiredBy;
      depToStore = extractDep(data.dependencies[k]);
    }

    var existing = lookup[lookupKey];
    if (existing) {
      existing.depPaths.push(depPath);
    } else {
      lookup[lookupKey] = depToStore;
      lookup[lookupKey].depPaths = [depPath];
    }

    buildDependencyObjectLookup(dep, lookup, depPath);
  }
  return lookup;
}

/** Recursively get a flat list of dependency objects. This is simpler for
 * subsequent code to handle then a tree of dependencies.
 *
 * Depending on the command line arguments, the dependencies may includes
 * a mix of production, development, optional, etc. dependencies.
 */
function getDependencyList(depMap, depLookup) {
  var results = [];
  var lookup = {};
  var keys = Object.keys(depMap);

  for(var i = 0; i < keys.length; i++) {
    var name = keys[i];

    // The value of o depends on the type of structure we are passed
    var o = depMap[name];

    var spec = o.version ? name + "@" + o.version : name + "@" + o;
    var version = o.version ? o.version : o;
    var depPaths = o.depPaths ? o.depPaths : [spec];

    // Only add a dependency once
    // We need both the local and global "auditLookup" tables.
    // The global lookup is used to ensure we only audit a
    // dependency once, but cannot be done at the same level
    // as the local lookup since the sub-dependencies are not
    // available at all locations of the dependency tree (depMap).
    if(lookup[spec] == undefined && auditLookup[spec] == undefined) {
      lookup[spec] = true;
			auditLookup[spec] = true;
			results.push({"pm": config.get("pm"), "name": name, "version": version, "depPaths": depPaths});

      // If there is a possibility of recursive dependencies...
      if (o.version) {
        var dataDeps = getDepsFromDataObject(o, depLookup);
        if(dataDeps) {
          var deps = getDependencyList(dataDeps, depLookup);

          if(deps != undefined) {
            results = results.concat(deps);
          }
        }
      }
    }
  }
  return results;
}

/** It seems dependencies can be defined in numerous ways. This method is
 * a hack to try and normalize the data.
 *
 * TODO: Why do we get these different representations?
 */
function extractDep(dep) {
  if (dep.requiredBy) {
    // {"requiredBy":"^5.0.0","missing":true,"optional":false}
    return {"version": dep.requiredBy};
  }
  return dep;
}

/** Given a lookup table, try and find the best specification match for the
 * provided name@version
 */
function lookupSpecMatch(lookup, spec) {
  // Direct match
  if (lookup[spec]) {
    return lookup[spec];
  }

  // Close match
  var shortSpec = spec.replace(/@\D/g,'@');
  if (lookup[shortSpec]) {
    return lookup[shortSpec];
  }

  // Check for Semver valid match
  var lastIndex = spec.lastIndexOf('@');
  var myName = spec.substring(0, lastIndex);
  var myVersion = spec.substring(lastIndex + 1);
  for(var k in lookup) {
    lastIndex = k.lastIndexOf('@');
    var yourName = k.substring(0, lastIndex);
    var yourVersion = k.substring(lastIndex + 1);
    if (myName == yourName && semver.valid(yourVersion) && semver.satisfies(yourVersion, myVersion)) {
      return lookup[k];
    }
  }
  return undefined;
}

/** Get the dependencies from an npm object. The exact dependencies retrieved
 * depend on categories requested by the user.
 */
function getDepsFromDataObject(data, lookup) {
  var results = {};
  if (categories.length == 0) {
    for(var k in data.dependencies) {
      var dep = extractDep(data.dependencies[k]);
      results[k]=dep;
    }
  }

  if (lookup) {
    for (var i = 0; i < categories.length; i++) {
      var category = categories[i];
      for(var k in data[category]) {
        var spec = k + "@" + data[category][k];

        var specMatch = lookupSpecMatch(lookup, spec);

        // If there is no match in the lookup then this dependency was "deduped"
        if (specMatch) {
          results[k]=specMatch;
        }
      }
    }
  }
  return results;
}

/** Write the audit results. This handles both standard and verbose
 * mode.
 *
 * Currently the v2 API does not provide information about most recently available
 * package version, so some of this code can be considered "dead" until that
 * information becomes available.
 *
 * @param pkgName
 * @param version
 * @param details
 * @returns
 */
function resultCallback(err, pkg) {
        pkgName = undefined;
        version = undefined;
        versionString = undefined;
        bestVersion = undefined;
        if(pkg) {
                pkgName = pkg.name;
                if (pkg.scope) {
                  pkgName = "@" + pkg.scope + "/" + pkgName;
                }
                version = pkg.version;
                versionString = version;
                bestVersion = undefined;
        }
        // Add one to audits completed
        actualAudits++;

        // If we KNOW a possibly used version is vulnerable then highlight the
        // title in red.
        var myVulnerabilities = getValidVulnerabilities(version, pkg.vulnerabilities, pkg.name, pkg.depPaths);
        var prefix = undefined;
        if(myVulnerabilities.length > 0) {
                vulnerabilityCount += 1;
                logger.error("------------------------------------------------------------");
                prefix = "[" + actualAudits + "/" + expectedAudits + "] " + colors.bold.red(pkgName + " " + versionString + "  [VULNERABLE]") + "   ";
                if (logger.isLevelEnabled("verbose")) {

                  logger.verbose(prefix);
                  prefix = "";
                }
                JUnit['testsuite'].push({name: 'testcase', attrs: {name: pkg.name}, children: [{
                        name: 'failure', text: `Details:\n
                        ${JSON.stringify(myVulnerabilities, null, 2).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')}\n\n`,
                        attrs: {message:`Found ${myVulnerabilities.length} vulnerabilities. See stacktrace for details.`}}]});
        }
        else {
                logger.verbose("------------------------------------------------------------");
                prefix = "[" + actualAudits + "/" + expectedAudits + "] " + colors.bold(pkgName + " " + versionString) + "   ";
                if (logger.isLevelEnabled("verbose")) {

                  logger.verbose(prefix);
                  logger.verbose();
                  prefix = "";
                }
                JUnit['testsuite'].push({name: 'testcase', attrs: {name: pkg.name}});
        }

        if(err) {
                if(err.error) {
                        logger.error(prefix + colors.bold.red("Error running audit: " + err.error + " (" + err.code + ")"));
                        switch (err.code) {
                          case 429:
                            logger.error(colors.bold.red("Exceeded request rate limit. Please try again later. Use registered account for higher limit."));
                            throw ("Exceeded request rate limit");
                            break;
                        }
                }
                else {
                        logger.error(prefix + colors.bold.red("Error running audit: " + err));
                }
                if(err.stack) {
                        logger.error(prefix + err.stack);
                }
                return;
        }

        // Print information about the expected and actual package versions
        if(semver.valid(version)) {
                if(bestVersion) {
                        if(bestVersion != version) {
                                logger.verbose(colors.bold.yellow("Installed version: " + version));
                        }
                        else {
                                logger.verbose("Installed version: " + version);
                        }
                        logger.verbose("Available version: " + bestVersion);
                }
                else {
                        logger.verbose("Installed version: " + version);
                }
        }
        else {
                logger.verbose("Requested range: " + version);
                if(bestVersion) {
                        logger.verbose("Available version: " + bestVersion);
                }
        }

        // The details will specify whether there are vulnerabilities and what the
        // vulnerability status is.
        if(pkg.vulnerabilities != undefined) {
                // Special statuses
                if(pkg.vulnerabilities.length == 0) {
                        // FIXME: We should always get some response. This should not happen.
                        logger.info(prefix + colors.grey("No known vulnerabilities against package/version..."));
                }
                // Vulnerabilities found
                else {
                        var log = logger.error;
                        // Status line
                        if (myVulnerabilities.length == 0) {
                          log = logger.info;
                        }
                        log(prefix + pkg.vulnerabilities.length + " known vulnerabilities affecting installed version");

                        // By default only print known problems
                        var printTheseProblems = myVulnerabilities;

                        // If verbose, print all problems
                        if (logger.isLevelEnabled("verbose")) {
                                printTheseProblems = pkg.vulnerabilities;
                        }

                        // We have decided that these are the problems worth mentioning.
                        for(var i = 0; i < printTheseProblems.length; i++) {
                                log();

                                var detail = printTheseProblems[i];
                                if (!detail.depPaths) {
                                  detail.depPaths = [];
                                }
                                log(colors.red.bold(detail.title));

                                if(detail.description != undefined) {
                                        log(entities.decode(detail.description));
                                }
                                log();

                                log(colors.bold("ID") + ": " + detail.id);
                                log(colors.bold("Details") + ": https://ossindex.sonatype.org/vuln/" + detail.id);
                                for (var j = 0; j < detail.depPaths.length; j++) {
                                  log(colors.bold("Dependency path") + ": " + detail.depPaths[j]);
                                }

                                if (detail.references != undefined && detail.references.length > 0) {
                                        log(colors.bold("References") + ":");
                                        for (var j = 0; j < detail.references.length; j++) {
                                                log("  * " + detail.references[j]);
                                        }
                                }
                        }

                        // If we printed vulnerabilities we need a separator. Don't bother
                        // if we are running in verbose mode since one will be printed later.
                        if(!logger.isLevelEnabled("verbose") && myVulnerabilities.length > 0) {
                                logger.error("------------------------------------------------------------");
                                logger.error();
                        }
                }
        } else {
                logger.info(prefix + colors.grey("No known vulnerabilities against package/version..."));
        }

        // Print a separator
        logger.verbose("------------------------------------------------------------");
        logger.verbose();

        //console.log(JSON.stringify(pkg.artifact));
}

/** Return list of vulnerabilities found to affect this version.
 *
 * @param productRange A version range as defined by semantic versioning
 * @param details Vulnerability details
 * @returns
 */
function getValidVulnerabilities(productRange, details, pkg, depPaths) {
        var results = [];
        if(details != undefined) {
                for(var i = 0; i < details.length; i++) {
                        var detail = details[i];
                        detail.depPaths = depPaths;

                  		// Do we white-list this match?
                        var id = detail.id;
                        if (whitelist && whitelist[id]) {
                            var whitelistEntry = whitelist[id];
                            if (whitelistEntry.dependencyPaths) {
                              for (var whitelistIdx = 0; whitelistIdx < whitelistEntry.dependencyPaths.length; whitelistIdx++) {
                                var wDep = whitelistEntry.dependencyPaths[whitelistIdx];
                                var regex = new RegExp(wDep);
                                detail.depPaths = detail.depPaths.filter(function(dDep) {
                                  if (regex.test(dDep)){
                                    detail.whitelistedPaths = detail.whitelistedPaths || [];
                                    detail.whitelistedPaths.push(dDep);
                                    return false;
                                  }

                                  return true;
                                });
                              }

                              detail["package"] = pkg;
                              whitelistedVulnerabilities.push(detail);
                              if (detail.depPaths.length == 0) {
                                console.log('SKIPPING BECAUSE ALL PATHS MATCHED')
                              }
                            } else {
                              detail["package"] = pkg;
                              whitelistedVulnerabilities.push(detail);
                            }
                        }
                        else {
                          results.push(detail);
                        }
                }
        }
        return results;
}

/** Return true if the given ranges overlap.
 *
 * @param prange Product range
 * @param vrange Vulnerability range
 */
function rangesOverlap(prange, vrange) {
        // Try and treat the vulnerability range as a single version, as it
        // is in CVEs.
        if(semver.valid(getSemanticVersion(vrange))) {
                return semver.satisfies(getSemanticVersion(vrange), prange);
        }

        // Try and treat the product range as a single version, as when not
        // run in --package mode.
        if(semver.valid(getSemanticVersion(prange))) {
                return semver.satisfies(getSemanticVersion(prange), vrange);
        }

        // Both prange and vrange are ranges. A simple test for overlap for not
        // is to attempt to coerce a range into static versions and compare
        // with the other ranges.
        var pversion = forceSemanticVersion(prange);
        if(pversion != undefined) {
                if(semver.satisfies(pversion, vrange)) return true;
        }

        var vversion = forceSemanticVersion(vrange);
        if(vversion != undefined) {
                if(semver.satisfies(vversion, prange)) return true;
        }

        return false;
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

/** Identify a semantic version within the given range for use in comparisons.
 *
 * @param range
 * @returns
 */
function forceSemanticVersion(range) {
        var re = /([0-9]+)\.([0-9]+)\.([0-9]+)/;
        var match = range.match(re);
        if(match != undefined) {
                return match[1] + "." + match[2] + "." + match[3];
        }
        return undefined;
}
