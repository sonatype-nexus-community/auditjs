AuditJS
=======

Audits an NPM project using the [OSS Index v2 REST API](https://ossindex.net/docs/restapi2)
to identify known vulnerabilities and outdated package versions.

![Screenshot](screenshots/screenshot.png)

Installation
------------

```
npm install auditjs -g
```

Usage
-----

```terminal
  Usage [Linux]:   auditjs [options]
  Usage [Windows]: auditjs-win

  Options:

    -V, --version                output the version number
    -b --bower                   This flag is necessary to correctly audit bower
    				 packages. Use together with -p bower.json, since
    				 scanning bower_componfents is not supported
    -n --noNode                  Ignore node executable when scanning node_modules.
    -p --package <file>          Specific package.json or bower.json file to audit
    -d --dependencyTypes <list>  One or more of devDependencies, dependencies, peerDependencies, bundledDependencies, or optionalDependencies
    --prod --production          Analyze production dependencies only
    -q --quiet                   Supress console logging
    -r --report                  Create JUnit reports in reports/ directory
    -v --verbose                 Print all vulnerabilities
    -w --whitelist <file>        Whitelist of vulnerabilities that should not break the build,
    				 e.g. XSS vulnerabilities for an app with no possbile input for XSS.
    				 See Example test_data/audit_package_whitelist.json.
    -l --level <level>           Logging level. Possible options: error,warn,info,verbose,debug
    -h, --help                   output usage information

```

Audit installed packages and their dependencies to identify known
vulnerabilities.

**IMPORTANT WINDOWS USAGE NOTE ... IMPORTANT WINDOWS USAGE NOTE ... IMPORTANT WINDOWS USAGE NOTE**

> **On windows execute using `auditjs-win`.** This is required for now due to some
> Linux-specific code which mitigates some odd Debian/Ubuntu specific edge cases.

**IMPORTANT WINDOWS USAGE NOTE ... IMPORTANT WINDOWS USAGE NOTE ... IMPORTANT WINDOWS USAGE NOTE**

Execute from inside a node project (above the node_modules directory) to audit
the dependencies. This will audit not only the direct dependencies of the project,
but all **transitive** dependencies. To identify transitive dependencies they must
all be installed for the project under audit.

If a package.json file is specified as an argument, only the dependencies in
the package file will be audited (no transitive dependencies).

If a vulnerability is found to be affecting an installed library the package
header will be highlighted in red and information about the pertinent
vulnerability will be printed to the screen.

![Screenshot](screenshots/cve.png)

Running in verbose mode prints more descriptive output, and some extra information
such as ALL vulnerabilities for a package, whether they are identified as
impacting the installed version or not.

Whitelisting
------------
It may be that a particular vulnerability does not impact your code, and upgrading the
dependency is not feasible, wise, or indeed possible in your case. In that situation it
is possible to whitelist a vulnerability to hide it from the output and report.

Successful whitelisting will remove vulnerability mentions in the standard output and
report text, but will be mentioned elsewhere in the standard output like so:

```
Filtering the following vulnerabilities
==================================================
Root path disclosure vulnerability affected versions: expressjs <3.19.1 || >=4.0.0 <4.11.1
Fixed root path disclosure vulnerability in express.static, res.sendfile, and res.sendFile
==================================================
```

The whitelist is a JSON document which is passed on the command line using the `-w <file>`
option. The whitelist document itself can take one of two forms: simplified and verbose.

### Simplified Whitelist Format

The simplified whitelist is a list of vulnerability IDs. The ID for a vulnerability can
be seen by generating the report (`-r`) and viewing the embedded JSON describing a
particular vulnerability. For example:

```
...
  {
    "id": 8398878757,
    "title": "Cross Site Scripting (XSS) in JSONP",
    "description": "JSONP allows untrusted resource URLs, which provides a vector for attack by malicious actors.",
    "versions": [
      "&lt;1.6.0-rc.0"
    ],
    "references": [
      "https://github.com/angular/angular.js/commit/6476af83cd0418c84e034a955b12a842794385c4",
      "https://github.com/angular/angular.js/issues/11352"
    ],
    "published": 0,
    "updated": 1493261505026
  },
...
```

The vulnerability id is right at the top. A whitelist will look like this:

```
[
8398878757,
8402907552
]
```

### Verbose Whitelist Format

The verbose whitelist is useful because it acts as documentation on the details of the
vulnerabilities that have been filtered, with the associated title, description, version
range, and package.

Here is the simplest example:

```
{
  "packageName": [
  {
    "id": 8398878757
  },
  {
    "id": 8402907552
  }
  ]
}
...
```

The document is a JSON object, where the field names are the names of packages which contain
the vulnerabilities, and the value is a list of the vulnerabilities affecting the package that
should be filtered. The minimal data required is the ID for the vulnerability.

And now something a bit more useful.

```
{
  "expressjs": [
    {
      "id": 8301582599,
      "title": "Root path disclosure vulnerability",
      "description": "Fixed root path disclosure vulnerability in express.static, res.sendfile, and res.sendFile",
      "versions": [
        "&lt;3.19.1 || >=4.0.0 &lt;4.11.1"
      ]
    },
    ...
  ]
}
...
```

Here we reproduced the title, description, and version range of the vulnerability that is being
filtered. The data was copied straight from the JSON in the generated report. You can include any
of the fields that you feel are most useful in documenting the vulnerability.

Limitations
-----------

As this program depends on the OSS Index database, network access is
required. Connection problems with OSS Index will result in an exception.

The current version of AuditJS only reports on top level dependencies.
If feedback indicates people are interested we will extend auditing to run
against the full dependency tree

The NVD does not always indicate all (or any) of the affected versions
it is best to read the vulnerability text itself to determine whether
any particular version is known to be vulnerable.

Credit
------

Many thanks to [Fredrik J](https://github.com/qacwnfq) for his great improvements, including:
* Bower support
* JUnit reports
* Whitelisting

Data in OSS Index has been retrieved and cross referenced from several
sources, including but not limited to:

* npm: https://www.npmjs.com/
* The National Vulnerability Database (NVD): https://nvd.nist.gov/
* Node Security Project: https://nodesecurity.io/
