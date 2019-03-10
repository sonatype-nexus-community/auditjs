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

var program = require('commander');

// Use winston for logging
const winston = require('winston');

// Adds colors to console output
var colors = require('colors/safe');

// File system access
var fs = require('fs');

var path = require('path');

const LOGGER_LEVELS = ['error', 'warn', 'info', 'verbose', 'debug'];

var whitelist = undefined;

var categories = [];

let logger = undefined;

var pm = 'npm';

var programPackage = undefined;
var output = undefined;

process.env['SUPPRESS_NO_CONFIG_WARNING'] = 'true';
var config = require('config');

/** Help text
 *
 * @returns
 */
function usage() {
        console.log("Audit installed packages and their dependencies to identify known");
        console.log("vulnerabilities.");
        console.log();
        console.log("If a package.json file is specified as an argument, only the dependencies in");
        console.log("the package file will be audited.");
        console.log();
        console.log(colors.bold.yellow("Limitations"));
        console.log();
        console.log("As this program depends on the OSS Index database, network access is");
        console.log("required. Connection problems with OSS Index will result in an exception.");
        console.log();
        console.log("The vulnerabilities do not always indicate all (or any) of the affected");
        console.log("versions it is best to read the vulnerability text itself to determine");
        console.log("whether any particular version is known to be vulnerable.");
}


/** Overriding the winston formatter to output a log message in the same manner
 * that console.log was working, to reduce the inpact on the code for the
 * initial move to winston.
 */
function logFormatter(args) {
  return args.message;
}


/**
 * Do some preparations on the whitelist, which results in it being a map of vulnerability
 * IDs (to themselves).
 */
function prepareWhitelist(whitelist) {
	if (whitelist) {
        logger.info(colors.bold('Applying whitelist filtering for JUnit reports. Take care to keep the whitelist up to date!'));

		// The white-list is either a list or the old format, which is an object with more
		// complex structures.
	    whitelist = JSON.parse(whitelist);

	    // Ensure whitelist is in the expected format
	    whitelist = simplifyWhitelist(whitelist);
	}

  // Read the whitelist from a config file
  if (config.has('whitelist.ignore')) {
    if(!whitelist) {
      whitelist = [];
    }

    var myWhitelist = config.get('whitelist.ignore');
    for (var i = 0; i < myWhitelist.length; i++) {
      whitelist.push({
        "id": myWhitelist[i]
      });
    }
  }

  // Convert the list to a map for easy lookup
  if (whitelist) {
    var whitelistMap = {};
    for (var i = 0; i < whitelist.length; i++) {
      var key = whitelist[i].id;
      whitelistMap[key] = whitelist[i];
    }
    whitelist = whitelistMap;
  }

	return whitelist;
}

/**
 * Simplify the white-list into a list of issue IDs.
 */
function simplifyWhitelist(whitelist) {
	var results = [];

	if (Array.isArray(whitelist)) {
	  // whitelist is in Simplified format
	  for (var i = 0; i < whitelist.length; i++) {
	    results.push({
	      "id": whitelist[i]
	    });
	  }
	} else {
	  // whitelist is in Verbose format
	  for (var project in whitelist) {
	    var vlist = whitelist[project];
	    for (var i = 0; i < vlist.length; i++) {
	      var id = vlist[i].id;
	      results.push({
	        "id": id,
	        "dependencyPaths": vlist[i].dependencyPaths
	      });
	    }
	  }
	}

	return results;
}

/** Load configuration information from the specified file. Command line
 * overrides all file configuration.
 */
function loadConfig() {
  underload('whitelist', 'whitelist.file');

  if (!program['bower'] && config.has('packages.type') && config.get('packages.type') == 'bower') {
    program['bower'] = true;
  }

  if (!program['noNode'] && config.has('packages.withNode') && config.get('packages.withNode') == false) {
    program['noNode'] = true;
  }

  underload('package', 'packages.file');

  underload('level', 'logging.level');
  underload('quiet', 'logging.quiet');
  underload('verbose', 'logging.verbose');

  underload('scheme', 'server.scheme');
  underload('host', 'server.host');
  underload('port', 'server.port');

  underload('cacheDir', 'cache.path');

  underload('cacheTimeout', 'cache.timeout')

  underload('username', 'auth.user');
  underload('token', 'auth.token');
}

/** Load the config file option if not overloaded by the command line.
 *
 * @param cmdlineName: The command line option name
 * @param configName: The config file option name
 */
function underload(cmdlineName, configName) {
  if (!program[cmdlineName] && config.has(configName)) {
    program[cmdlineName] = config.get(configName);
  }
}

module.exports = {
  init: function (pkg, auditor) {
    // Collect command line and configuration options. This is a bit of a hack to
    // support the old-style options as well as configuration files. This code
    // should be refactored over time.
    program
           .version(pkg.version)
           .option('-b --bower', 'This flag is necessary to correctly audit bower\n\t\t\t\t packages. Use together with -p bower.json, since\n\t\t\t\t scanning bower_components is not supported')
           .option('-n --noNode', 'Ignore node executable when scanning node_modules.')
           .option('-p --package <file>', 'Specific package.json, package-lock.json, yarn.lock, or bower.json file to audit')
           .option('-d --dependencyTypes <list>', 'One or more of devDependencies, dependencies, peerDependencies, bundledDependencies, or optionalDependencies')
           .option('--prod --production', 'Analyze production dependencies only')
           .option('-q --quiet', 'Supress console logging')
           .option('-r --report', 'Create JUnit reports in reports/ directory')
           .option('-v --verbose', 'Print all vulnerabilities')
           .option('-w --whitelist <file>', 'Whitelist of vulnerabilities that should not break the build,\n\t\t\t\t e.g. XSS vulnerabilities for an app with no possbile input for XSS.\n\t\t\t\t See Example test_data/audit_package_whitelist.json.')
           .option('-l --level <level>', 'Logging level. Possible options: ' + LOGGER_LEVELS)
           .option('--suppressExitError', 'Supress exit code when vulnerability found')
           .option('--cacheDir <path>', 'Cache parent directory [default: <homedir>/.auditjs]')
           .option('--cacheTimeout <hours>', 'Expiration period for the cache')
           .option('--username <username>', 'Username for registered users')
           .option('--token <token>', 'Password for registered users')
           .option('--scheme <scheme>', '[testing] http/https')
           .option('--host <host>', '[testing] data host')
           .option('--port <port>', '[testing] data port')
           .action(function () {
           });

    program.on('--help', function(){
           usage();
    });

    program.parse(process.argv);

    // Look for a configuration file?
    loadConfig();

    if(program['bower'] && !program['package']){
           throw Error('Use -b option together with -p bower.json. Bower dependencies are flat, therefore it is enough to only support the auditing of bower.json files.');
    }
    programPackage = program['package'] ? path.basename(program['package']): 'scan_node_modules.json';
    output = `${programPackage.toString().split('.json').slice(0, -1)}.xml`;
    pm = program['bower'] ? 'bower' : 'npm';

    if (program['dependencyTypes'] && program['production']) {
     throw Error('Cannot use --dependencyTypes and --production options together');
    }

    //Set logging level based on environmental value or flag
    if (program['quiet']) {
     logger = new (winston.Logger)();
    } else {
     logger = new (winston.Logger)({
       transports: [
         new (winston.transports.Console)({
           level: process.env.LOG_LEVEL ||
             (program['verbose']?'verbose':false) ||
             (LOGGER_LEVELS.includes(program['level'])?program['level']:false)
             || 'info',
           formatter: logFormatter})
       ]
     });
    }

    /** Hack code to allow us to check if a specific logger level is enabled.
    */
    logger.isLevelEnabled = function(level) {
     if (this.transports && this.transports.console) {
       var levels = this.transports.console.level;
       return levels == level;
     }
     return false;
    };

    // Categories are somewhat complicated in order to not break backward-compatibility.
    if (program['package']) {
     // By default in package mode we only check production dependencies
     categories = ['dependencies'];
    }

    // The --production option means do dependencies
    if (program['production']) {
     categories = ['dependencies'];
    }

    categories = program['dependencyTypes'] ? program['dependencyTypes'].split(",") : categories;

    // Set the categories using the configuration file if it was not overridden
    // by the command line.
    if (!program['package'] &&
        !program['production'] &&
        !program['dependencyTypes'] &&
        config.has('dependencyTypes')) {
      categories = config.get('dependencyTypes');
    }

    // For recursive dependencies 'dependencies' should be '_dependencies'
    if (!program['package']) {
     newCategories = [];
     for (var i = 0; i < categories.length; i++) {
       switch (categories[i]) {
         case 'dependencies':
           newCategories.push('_dependencies');
           break;
         default:
           newCategories.push(categories[i]);
           break;
       }
     }
     categories = newCategories;
    }

    // Override the host
    if (program['scheme'] || program['host'] || program['port']) {
     var scheme = program['scheme'] ? program['scheme'] : "https";
     var host = program['host'] ? program['host'] : "ossindex.net";
     var port = program['port'] ? program['port'] : 443;
     auditor.setHost(scheme, host, port);
    }

    if (program['cacheTimeout']) {
      auditor.setCacheDuration(program['cacheTimeout']);
    }

    if (program['cacheDir']) {
     auditor.setCache(program['cacheDir']);
    }

    if (program['username']) {
     auditor.setUser(program['username'], program['token']);
    }


    // Simplify the white-list so that it is a simple lookup table of vulnerability IDs.
    whitelist = program['whitelist'] ? fs.readFileSync(program['whitelist'], 'utf-8') : null;
    whitelist = prepareWhitelist(whitelist);
  },

  get: function(key) {
    switch (key) {
      case "pm": return pm;
      case "programPackage": return programPackage;
      case "output": return output;
      case "logger": return logger;
      case "categories": return categories;
      case "noNode": return program.noNode;
      case "whitelist": return whitelist;
      default: return program[key];
    }
  }
};
