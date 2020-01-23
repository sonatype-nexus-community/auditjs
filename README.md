**IMPORTANT NOTE**: Welcome to AuditJS 4.0.0-beta, lots has changed since 3.0.0, mainly around usage. Make sure to read the new docs.

# AuditJS

[![CircleCI](https://circleci.com/gh/sonatype-nexus-community/auditjs.svg?style=svg)](https://circleci.com/gh/sonatype-nexus-community/auditjs) 

Audits JavaScript projects using the [OSS Index v3 REST API](https://ossindex.sonatype.org/rest)
to identify known vulnerabilities and outdated package versions.

Supports:
- npm
- yarn
- bower

<img src="https://github.com/sonatype-nexus-community/auditjs/blob/alpha/assets/images/auditjs.png?raw=true" width="640">

## Installation

```
npm install -g auditjs@beta
```

## Usage

`auditjs` supports node LTS versions of 8.x forward at the moment. Usage outside of these node versions will error.

Note that the OSS Index v3 API is rate limited. If you are seeing errors that
indicate a problem (HTTP code 429) then you may need to make an account at
OSS Index and supply the username and "token". See below for more details.

### Generic Usage
```terminal
auditjs [command]

Commands:
  auditjs iq [options]    Audit this application using Nexus IQ Server
  auditjs config          Set config for OSS Index or Nexus IQ Server
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
  --version        Show version number                                 [boolean]
  --help           Show help                                           [boolean]
  --user, -u       Specify OSS Index username                           [string]
  --password, -p   Specify OSS Index password or token                  [string]
  --quiet, -q      Only print out vulnerable dependencies              [boolean]
  --verbose, -V    Set console logging level to verbose                [boolean]
  --json, -j       Set output to JSON                                  [boolean]
  --xml, -x        Set output to JUnit XML format                      [boolean]
  --whitelist, -w  Set path to whitelist file                           [string]
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
  --timeout, -t      Specify an optional timeout in seconds for IQ Server
                     Polling                             [number] [default: 300]
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

### Usage in CI

#### Jenkins
TBD

#### CircleCI

We've provided an example repo with a working CircleCI config on a "fake" but real project, you can see how it is all setup by clicking [this link](https://github.com/sonatype-nexus-community/example-auditjs-repo#usage-in-circleci).

#### TravisCI

We've provided an example repo with a working TravisCI config on a "fake" but real project, you can see how it is all setup by clicking [this link](https://github.com/sonatype-nexus-community/example-auditjs-repo#usage-in-travisci).

#### GitHub Actions

We've provided an example repo with a working GitHub Action on a "fake" but real project, you can see how it is all setup by clicking [this link](https://github.com/sonatype-nexus-community/example-auditjs-repo#usage-with-github-actions).

### Usage As A NPM Script

`auditjs` can be added as a devDependency to your project, and then an npm script can be added so you can leverage it in your npm scripts.

You would install `auditjs` like so:

```
$ npm i auditjs -D
```

An example snippet from a `package.json`:

```
  },
  "scripts": {
    "test": "mocha -r ts-node/register src/**/*.spec.ts",
    "build": "tsc -p tsconfig.json",
    "build-dev": "tsc -p tsconfig.development.json",
    "start": "node ./bin/index.js",
    "prepare": "npm run build",
    "prepublishOnly": "npm run test",
    "scan": "auditjs ossi"
  },
  "keywords": [
```

Now that we've added a `scan` script, you can run `npm run scan` and your project will invoke `auditjs` and scan your dependencies. This can be handy for local work, or for if you want to run `auditjs` in CI/CD without installing it globally.

Note: these reference implementations are applicable to running an IQ scan as well.  The caveat is that the config for the IQ url and auth needs to either be in the home directory of the user running the job, or stored as (preferably secret) environmental variables.

## Config file

Config is now set via the command line, you can do so by running `auditjs config`. You will be prompted if you'd like to set Nexus IQ Server config or Sonatype OSS Index config. Reasonable defaults are provided for Sonatype Nexus IQ Server that will work for an out of the box install. It is STRONGLY suggested that you do not save your password in config (although it will work), but rather use a token from OSS Index or Nexus IQ Server.

Config passed in via the command line will be respected over filesystem based config so that you can override specific calls to either Sonatype OSS Index or Nexus IQ Server. Please see usage of either command to see how to set this command line config.

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

Whitelisting of vulnerabilities can be done! To accomplish this thus far we have implemented the ability to have a file named `auditjs.json` checked in to your repo ideally, so that it would be at the root where you run `auditjs`. Alternatively you can run `auditjs` with a whitelist file at a different location, with an example such as:

```terminal 
$ auditjs ossi --whitelist /Users/cooldeveloperperson/code/sonatype-nexus-community/auditjs/auditjs.json
```

The file should look like:

```json
{
  "ignore": [
    { "id": "78a61524-80c5-4371-b6d1-6b32af349043", "reason": "Insert reason here" }
  ]
}
```

The only field that actually matters is `id` and that is the ID you recieve from OSS Index for a vulnerability. You can add fields such as `reason` so that you later can understand why you whitelisted a vulnerability.

Any `id` that is whitelisted will be squelched from the results, and not cause a failure.

## Alternative output formats

`auditjs` can output directly as `json` or as `xml` specifically formatted for JUnit test cases.

JSON:
```
auditjs ossi --json > file.json
```

XML:
```
auditjs ossi --xml > file.xml
```

We chose to allow output directly to the stdout, so that the user can decide what they want to do with it. If you'd like it to be written to a file by `auditjs` itself, pop in to [this issue](https://github.com/sonatype-nexus-community/auditjs/issues/115) and let us know your thoughts!

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
