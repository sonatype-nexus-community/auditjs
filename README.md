**New major release, which uses OSS Index API v3.x!!**

- [AuditJS](#auditjs)
  * [Installation](#installation)
  * [Usage](#usage)
  * [Config file](#config-file)
  * [OSS Index Credentials](#oss-index-credentials)
  * [Whitelisting](#whitelisting)
    + [Whitelist in configuration](#whitelist-in-configuration)
    + [Whitelist File](#whitelist-file)
      - [Simplified Whitelist Format](#simplified-whitelist-format)
      - [Verbose Whitelist Format](#verbose-whitelist-format)
  * [Limitations](#limitations)
  * [Credit](#credit)

AuditJS
=======

Audits an NPM project using the [OSS Index v3 REST API](https://ossindex.sonatype.org/rest)
to identify known vulnerabilities and outdated package versions.

![Screenshot](screenshots/screenshot.png)

Installation
------------

```
npm install auditjs -g
```

Usage
-----

Note that the OSS Index v3 API is rate limited. If you are seeing errors that
indicate a problem (HTTP code 429) then you may need to make an account at
OSS Index and supply the username and "token". See below for more details.

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
  --suppressExitError          Supress exit code when vulnerability found
  --cacheDir <path>            Cache parent directory [default: <homedir>/.auditjs]
  --username <username>        Username for registered users
  --token <token>              Password for registered users
  --scheme <scheme>            [testing] http/https
  --host <host>                [testing] data host
  --port <port>                [testing] data port
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

Config file
-----------

Support is now provided for configuration files. This reduces the need for
command line options, and is particularly important when using authentication
as it allows you to supply credentials without having them visible on the
command line.

Audit.js uses [node-config](https://github.com/lorenwest/node-config/wiki) to
provide support for configuration files, though the original command line options
still work. Configuration files are loaded from the
[config directory](https://github.com/lorenwest/node-config/wiki/Configuration-Files)
which by default is the application installation directory in a sub-directory
called config, but can be controlled using the `NODE_CONFIG_DIR` environment variable.

The default configuration file in the config directory should be called
`default.json`, and might have contents like the following. You do not need
to specify all configuration options, and subset is reasonable.

```
{
  "auth": {
    "user": "username@example.com",
    "token": "ef40752eeb642ba1c3df1893d270c6f9fb7ab9e1"
  },
  "cache": {
    "path": "./ossi-cache"
  },
  "dependencyTypes": [
    "devDependencies",
    "dependencies",
    "peerDependencies",
    "bundledDependencies",
    "optionalDependencies"
  ],
  "server": {
    "scheme": "https",
    "host": "ossindex.sonatype.org",
    "port": 443
  },
  "packages": {
    "type": "npm",
    "file": "./package.json",
    "withNode": false
  },
  "logging": {
    "level": "info",
    "verbose": false,
    "quiet": false
  },
  "whitelist": {
    "file": "./whitelist.json",
    "ignore": [
      "a81a18b3-26bf-43d8-b823-826ef69bf8e8"
    ]
  }
}
```

If you want to make different configurations for different situations, create
set the NODE_ENV environment variable and change the configuration file name
to use the same name as the selected environment.

eg.
```
export NODE_ENV=production
# File name: config/production.json
```

OSS Index Credentials
---------------------

The OSS Index API is rate limited to prevent abuse. Guests (non-authorized users)
are restricted to 16 requests of 120 packages each, which replenish at a rate
of one request per minute. This means if you have 600 dependencies then 5 requests
will be used. No problem! If you have many projects which are run close to each
other you could run into the limit.

You can either wait for the cool-down period to expire, or make a free account at
OSS Index. By going to the "settings" page for your account, you will see your
"token". Using your username (email address) and this security token you would
have access to 64 requests, which is likely plenty for most use cases.

Audit.js caches results, which means if you run against multiple projects which
have a common set of dependencies (and they almost certainly will) then you will
not use up requests getting the same results more than once.

You can specify your credentials on either the command line or the configuration
file. It is almost certainly better to put the credentials in a configuration
file as described above, as using them on the command line is less secure.

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

The whitelist can either be specified in the configuration, or as a separate whitelist file.
The whitelist file has two format alternatives.

### Whitelist in configuration

Vulnerabilities can be blocked (whitelisted) by specifying them directly in the configuration
file as follows:


```
{
  ...
  "whitelist": {
    "file": "./whitelist.json",
    "ignore": [
      "a81a18b3-26bf-43d8-b823-826ef69bf8e8",
      "49da4413-af2b-4e55-acc0-9c752e30dde4"
    ]
  }
  ...
}
```

### Whitelist File

The whitelist is a JSON document which is passed on the command line using the `-w <file>`
option. The whitelist document itself can take one of two forms: simplified and verbose.

#### Simplified Whitelist Format

The simplified whitelist is a list of vulnerability IDs. The ID for a vulnerability can
be seen by generating the report (`-r`) and viewing the embedded JSON describing a
particular vulnerability. For example:

```
...
  {
    "id": "a81a18b3-26bf-43d8-b823-826ef69bf8e8",
    "title": "Denial of Service",
    "description": "Kris Reeves and Trevor Norris pinpointed a bug in V8 in the way it decodes UTF strings. This impacts Node at the Buffer to UTF8 String conversion and can cause a process to crash. The security concern comes from the fact that a lot of data from outside of an application is delivered to Node via this mechanism which means that users can potentially deliver specially crafted input data that can cause an application to crash when it goes through this path.",
    "cvssScore": 0,
    "reference": "https://ossindex.sonatype.org/vuln/a81a18b3-26bf-43d8-b823-826ef69bf8e8"
  },
...
```

The vulnerability id is right at the top. A whitelist will look like this:

```
[
"a81a18b3-26bf-43d8-b823-826ef69bf8e8",
"49da4413-af2b-4e55-acc0-9c752e30dde4"
]
```

#### Verbose Whitelist Format

The verbose whitelist is useful because it acts as documentation on the details of the
vulnerabilities that have been filtered, with the associated title, description, version
range, and package.

Here is the simplest example:

```
{
  "packageName": [
  {
    "id": "a81a18b3-26bf-43d8-b823-826ef69bf8e8"
  },
  {
    "id": "49da4413-af2b-4e55-acc0-9c752e30dde4"
  }
  ]
}
...
```

The document is a JSON object, where the field names are the names of packages which contain
the vulnerabilities, and the value is a list of the vulnerabilities affecting the package that
should be filtered. The minimal data required is the ID for the vulnerability. Dependency paths
may be the full path of the dependency or any matching regular expression.

And now something a bit more useful.

```
{
  "node": [
  {
    "id": "a81a18b3-26bf-43d8-b823-826ef69bf8e8",
    "title": "Denial of Service",
    "description": "Kris Reeves and Trevor Norris pinpointed a bug in V8 in the way it decodes UTF strings. This impacts Node at the Buffer to UTF8 String conversion and can cause a process to crash. The security concern comes from the fact that a lot of data from outside of an application is delivered to Node via this mechanism which means that users can potentially deliver specially crafted input data that can cause an application to crash when it goes through this path."
  },
    ...
  ]
}
...
```

Here we reproduced the title and description. You can include any
of the fields that you feel are most useful in documenting the vulnerability, and
even your own descriptive fields.

Limitations
-----------

As this program depends on the OSS Index database, network access is
required. Connection problems with OSS Index will result in an exception.

The NVD does not always indicate all (or any) of the affected versions
it is best to read the vulnerability text itself to determine whether
any particular version is known to be vulnerable.

Credit
------

Thank you to everybody who has contributed to this project, both with
[code contributions](https://github.com/OSSIndex/auditjs/pulls?q=is%3Apr+is%3Aclosed)
and also suggestions, testing help, and notifying us of new and/or missing
vulnerabilities.
