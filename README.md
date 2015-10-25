AuditJS
=======

Audits an NPM project using the [OSS Index REST API](https://ossindex.net)
to identify known vulnerabilities and outdated package versions.

![Screenshot](screenshots/screenshot.png)

Installation
------------

```
npm install auditjs -g
```

Usage
-----

```
  Usage: audit [options]

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -p --package [package.json]  Specific package.json file to audit
    -v --verbose                 Print all vulnerabilities
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

If a newer version of a package is available the installed version will be
highlighted in yellow followed by the newest available version, surrounded by
square brackets.

![Screenshot](screenshots/new_version.png)

We are starting to identify external dependencies. They are displayed in the
output like so:

![Screenshot](screenshots/deps.png)

Where the NPM package is the top line, and the **[+]** indicates the external
dependency. An external dependency indicates a requirement outside of the
code itself, for example to a database or other external service or program.
These can be seen as "runtime" dependencies.

Running in verbose mode prints more descriptive output, and some extra information
such as ALL vulnerabilities for a package, whether they are identified as
impacting the installed version or not.

Vulnerabilities
---------------

Vulnerabilities are currently output in two different ways. Vulnerabilities
identified in the National Vulnerability Database (NVD) are displayed with
descriptive text and the vulnerability ID.

Vulnerabilities manually added directly to OSS Index tend to be displayed as
links with attached version information, like so:

![Screenshot](screenshots/external_vulnerability.png)

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
