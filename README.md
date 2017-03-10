 [![Build Status](https://travis-ci.org/qacwnfq/auditjs.svg?branch=master)](https://travis-ci.org/qacwnfq/my_first_webshop)

AuditJS - Fork
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
  Usage: auditjs [options]

  Options:

    -b --bower                   This flag is necessary to correctly audit bower packages. 
                                 Use together with -p bower.json, since scanning
                                 bower_components is not supported.
    -h, --help                   Output usage information

    -n --noNode                  Ignore node executable when scanning node_modules
    -p --package [package.json]  Specific package.json or bower.json file to audit
    -q --quiet                   Supress console logging
    -r --report                  Create JUnit reports in reports/ directory
    -v --verbose                 Print all vulnerabilities
    -V --version                 Output the version number
    -w --whitelist               Whitelist of vulnerabilities that should not break the build,
                                 e.g. XSS vulnerabilities for an app with no possbile input for XSS.

```

Audit installed packages and their dependencies to identify known
vulnerabilities.

Execute from inside a node project (above the node_modules directory) to audit
the dependencies. 

If a package.json file is specified as an argument, only the dependencies in
the package file will be audited.

If a vulnerability is found to be affecting an installed library the package
header will be highlighted in red and information about the pertinent
vulnerability will be printed to the screen.

![Screenshot](screenshots/cve.png)

Running in verbose mode prints more descriptive output, and some extra information
such as ALL vulnerabilities for a package, whether they are identified as
impacting the installed version or not.

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

Data in OSS Index has been retrieved and cross referenced from several
sources, including but not limited to:

* npm: https://www.npmjs.com/
* The National Vulnerability Database (NVD): https://nvd.nist.gov/
* Node Security Project: https://nodesecurity.io/
