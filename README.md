**IMPORTANT NOTE**: Welcome to AuditJS 4.0.0-alpha, lots has changed since 3.0.0, mainly around usage. Make sure to read the new docs.

# AuditJS

Audits JavaScript projects using the [OSS Index v3 REST API](https://ossindex.sonatype.org/rest)
to identify known vulnerabilities and outdated package versions.

Supports:
- npm
- yarn
- bower

<img src="https://github.com/sonatype-nexus-community/auditjs/blob/alpha/assets/images/auditjs.png" width="640">

## Installation

```
npm install auditjs@alpha -g
```

## Usage

Note that the OSS Index v3 API is rate limited. If you are seeing errors that
indicate a problem (HTTP code 429) then you may need to make an account at
OSS Index and supply the username and "token". See below for more details.

### Generic Usage
```terminal
auditjs [command]

Commands:
  auditjs iq [options]    Audit this application using Nexus IQ Server
  auditjs ossi [options]  Audit this application using Sonatype OSS Index

Options:
  --version  Show version number                                       [boolean]
  --help     Show help                                                 [boolean]
```

### OSS Index Usage
```terminal
auditjs ossi [options]

Audit this application using Sonatype OSS Index

Options:
  --version       Show version number                                  [boolean]
  --help          Show help                                            [boolean]
  --user, -u      Specify OSS Index username                            [string]
  --password, -p  Specify OSS Index password or token                   [string]
  --quiet, -q     Only print out vulnerable dependencies               [boolean]
  --verbose, -V   Set console logging level to verbose                 [boolean]
```

### Nexus IQ Server Usage
```
auditjs iq [options]

Audit this application using Nexus IQ Server

Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --application, -a  Specify IQ application public ID        [string] [required]
  --stage, -s        Specify IQ app stage
  [choices: "develop", "build", "stage-release", "release"] [default: "develop"]
  --server, -h       Specify IQ server url/port
                                     [string] [default: "http://localhost:8070"]
  --user, -u         Specify username for request    [string] [default: "admin"]
  --password, -p     Specify password for request [string] [default: "admin123"]
  --artie, -x        Artie                                             [boolean]
  --dev, -d          Exclude Development Dependencies                  [boolean]
```

### Usage Information

Execute from inside a node project (above the node_modules directory) to audit
the dependencies. This will audit not only the direct dependencies of the project,
but all **transitive** dependencies. To identify transitive dependencies they must
all be installed for the project under audit.

If a vulnerability is found to be affecting an installed library the package
header will be highlighted in red and information about the pertinent
vulnerability will be printed to the screen.

Running in verbose mode will give you lots of silly debug data. By default however we write all silly debug data to:

`YOUR_HOME_DIR/.ossindex/.audit-js.combined.log`

All errors are written to:

`YOUR_HOME_DIR/.ossindex/.audit-js.error.log`

The format in these files is similar to:

```
{ level: 'debug',
  message: 'Results audited',
  label: 'AuditJS',
  timestamp: '2019-12-22T20:09:33.447Z' }
```

## Config file

TBD

## OSS Index Credentials

The OSS Index API is rate limited to prevent abuse. Guests (non-authorized users)
are restricted to 16 requests of 120 packages each, which replenish at a rate
of one request per minute. This means if you have 600 dependencies, then 5 requests
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

## Whitelisting

TBD

## Limitations

As this program depends on the OSS Index database, network access is
required. Connection problems with OSS Index will result in an exception.

## Credit
------

Thank you to everybody who has contributed to this project, both with
[code contributions](https://github.com/OSSIndex/auditjs/pulls?q=is%3Apr+is%3Aclosed)
and also suggestions, testing help, and notifying us of new and/or missing
vulnerabilities.

## Contributing

We care a lot about making the world a safer place, and that's why we continue to work on this and other plugins for Sonatype OSS Index. If you as well want to speed up the pace of software development by working on this project, jump on in! Before you start work, create a new issue, or comment on an existing issue, to let others know you are!

## The Fine Print

It is worth noting that this is **NOT SUPPORTED** by Sonatype, and is a contribution of ours
to the open source community (read: you!)

Remember:

- Use this contribution at the risk tolerance that you have
- Do NOT file Sonatype support tickets related to `auditjs`
- DO file issues here on GitHub, so that the community can pitch in

Phew, that was easier than I thought. Last but not least of all:

Have fun creating and using this extension and the [Sonatype OSS Index](https://ossindex.sonatype.org/), we are glad to have you here!

## Getting help

Looking to contribute to our code but need some help? There's a few ways to get information:

- Chat with us on [Gitter](https://gitter.im/sonatype/nexus-developers)
