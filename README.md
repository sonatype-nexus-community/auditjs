<!--

    Copyright 2019-Present Sonatype Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

-->

<p align="center">
    <img src="https://github.com/sonatype-nexus-community/auditjs/blob/main/assets/images/auditjs.png" width="350"/>
</p>

# AuditJS

[![CircleCI](https://circleci.com/gh/sonatype-nexus-community/auditjs.svg?style=svg)](https://circleci.com/gh/sonatype-nexus-community/auditjs)

**IMPORTANT NOTE**: Welcome to AuditJS 4.0.0, lots has changed since 3.0.0, mainly around usage. Make sure to read the new docs.

If you have an issue migrating from AuditJS 3.x to AuditJS 4.x, please [file a GitHub issue here](https://github.com/sonatype-nexus-community/auditjs/issues).

Audits JavaScript projects using the [OSS Index v3 REST API](https://ossindex.sonatype.org/rest)
to identify known vulnerabilities and outdated package versions.

Supports any project with package managers that install npm dependencies into a node_modules folder including:

- npm
- Angular
- yarn
- bower

<img src="https://github.com/sonatype-nexus-community/auditjs/blob/main/assets/images/auditjsnew.png?raw=true" width="640">

## Requirements

For users wanting to use Nexus IQ Server as their data source for scanning:

1.  Version 77 or above must be installed. This is when the [Third-Party Scan REST API](https://help.sonatype.com/iqserver/automating/rest-apis/third-party-scan-rest-api---v2) was incorporated into Nexus IQ Server.

2.  The User performing the scan must have the permission "Can Evaluate Applications", this can be found in the Role Editor > _User_ > Permissions > IQ

## Installation

You can use `auditjs` a number of ways:

via npx (least permanent install)

```
npx auditjs@latest ossi
```

via global install (most permanent install)

```
npm install -g auditjs
```

We suggest you use it via `npx`, as global installs are generally frowned upon in the nodejs world.

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
  --cache, -c      Specify path to use as a cache location              [string]
  --quiet, -q      Only print out vulnerable dependencies              [boolean]
  --json, -j       Set output to JSON                                  [boolean]
  --xml, -x        Set output to JUnit XML format                      [boolean]
  --whitelist, -w  Set path to whitelist file                           [string]
  --clear          Clears cache location if it has been set in config  [boolean]
  --bower          Force the application to explicitly scan for Bower  [boolean]
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
  --dev, -d          Include Development Dependencies                  [boolean]
```

#### AuditJS usage with IQ Server, and what to expect

##### TL;DR

AuditJS should catch most if not the exact same amount of issues as the Sonatype Nexus IQ CLI Scanner. It however can't catch a few cases. If you want total visibility, please use the Sonatype Nexus IQ CLI Scanner. You can use both in tandem, too.

##### The full scoop

AuditJS functions by traversing your `node_modules` folder in your project, so it will pick up the dependencies that are physically installed. This will capture your declared as well as transititive dependencies. Once it has done this, it takes the list and converts it into something that we use to communicate with Sonatype Nexus IQ Server. The crux of this approach is that we do "coordinate" or "name based matching", which we've found to be reliable in the JavaScript ecosystem, but it will not catch corner cases such as if you've:

- Drug a vulnerable copy of jQuery into your project and left it in a folder (npm does not know about this)
- Copied and pasted code from a project into one of your files

The Nexus IQ CLI Scanner is equipped to locate and identify cases such as what I've just described. As such if you are using AuditJS, you would not be made aware of these cases, potentially until your code is audited by the IQ CLI Scanner later on.

It is our suggestion that when you are using this tooling to:

- Use AuditJS in your dev environments, etc... and use it to scan as early and as often as possible. This will alert you and other developers to using bad dependencies right off the bat.
- Use the Sonatype Nexus IQ CLI Scanner in CI/CD for a more thorough scan, and have development and your Application Security experts evaluate this scan for any "gotchas"

### Usage Information

Execute from inside a node project (above the node_modules directory) to audit
the dependencies. This will audit not only the direct dependencies of the project,
but all **transitive** dependencies. To identify transitive dependencies they must
all be installed for the project under audit.

If a vulnerability is found to be affecting an installed library the package
header will be highlighted in red and information about the pertinent
vulnerability will be printed to the screen.

By default we write all silly debug and error data to:

`YOUR_HOME_DIR/.ossindex/.auditjs.combined.log`

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

#### Proxy integration

The tool reads the `http_proxy` or `https_proxy` environment variables to perform network request through a Proxy.

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

Now that we've added a `scan` script, you can run `yarn run scan` and your project will invoke `auditjs` and scan your dependencies. This can be handy for local work, or for if you want to run `auditjs` in CI/CD without installing it globally.

Note: these reference implementations are applicable to running an IQ scan as well. The caveat is that the config for the IQ url and auth needs to either be in the home directory of the user running the job, or stored as (preferably secret) environmental variables.

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
  "ignore": [{ "id": "78a61524-80c5-4371-b6d1-6b32af349043", "reason": "Insert reason here" }]
}
```

The only field that actually matters is `id` and that is the ID you receive from OSS Index for a vulnerability. You can add fields such as `reason` so that you later can understand why you whitelisted a vulnerability.

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

## How to Fix Vulnerabilities

Or, "Patient: Hey Doc, it hurts when I do this. Doctor: Then don't do that."

So you've found a vulnerability. Now what? The best case is to upgrade the vulnerable component to a newer/non-vulnerable
version. However, it is likely the vulnerable component is not a direct dependency, but instead is a transitive dependency
(a dependency of a dependency, of a dependency, wash-rinse-repeat). In such a case, the first step is to figure out which
direct dependency (and sub-dependencies) depend on the vulnerable component. The `npm ls <vulnerable dependency>` 
command will print a dependency tree that can lead you through this dependency forest.

If your project uses yarn, the `yarn why <vulnerable dependency>` command can provide a similar trail of breadcrumbs. 

As an example, suppose we've learned that component `hosted-git-info`, version 2.8.8 is vulnerable (CVE-2021-23362). Use
the command below to find which components depend on this vulnerable component.
```shell
  $ npm ls hosted-git-info
  auditjs@4.0.25 /Users/bhamail/sonatype/community/auditjs/auditjs
  └─┬ read-installed@4.0.3
    └─┬ read-package-json@2.1.2
      └─┬ normalize-package-data@2.5.0
        └── hosted-git-info@2.8.8
```
Now we know the `read-installed@4.0.3` component has a transitive dependency on the vulnerable component `hosted-git-info@2.8.8`.
The best solution would be to upgrade `read-installed` to a newer version that uses a non-vulnerable version of `hosted-git-info`.
As of this writing, however, no such version of `read-installed` exists. The next step is to file an issue with the
`read-installed` project for them to update the vulnerable sub-dependencies. Be sure to read and follow any vulnerability
reporting instructions published by the project: Look for a `SECURITY.md` file, or other instructions on how to report
vulnerabilities. Some projects may prefer you not report the vulnerability publicly. Here's our bug report for this case:
[bug #53](https://github.com/npm/read-installed/issues/53)

To fix this particular vulnerability in our project, we need some way to force the transitive dependency to a newer version. 
This would be relatively easy if we were using yarn (see [yarn's selective dependency resolutions](https://yarnpkg.com/lang/en/docs/selective-version-resolutions/)).
Since we are not using yarn, we will use [npm-force-resolutions](https://github.com/rogeriochaves/npm-force-resolutions).
See the [excellent npm-force-resolutions docs](https://github.com/rogeriochaves/npm-force-resolutions#npm-force-resolutions)
for details on how this works.

After updating our `package.json` file as described by `npm-force-resolutions`,
```json
...
  "resolutions": {
    "hosted-git-info": "^3.0.8"
  },
  "scripts": {
    "preinstall": "npx npm-force-resolutions",
...
```
we run `npm install`, and verify
our transitive dependency is updated to a new version.
```shell
$ rm -rf node_modules && npm install
$ npm ls hosted-git-info
auditjs@4.0.25 /Users/bhamail/sonatype/community/auditjs/auditjs
└─┬ read-installed@4.0.3
  └─┬ read-package-json@2.1.1
    └─┬ normalize-package-data@2.5.0
      └── hosted-git-info@3.0.8  invalid

npm ERR! invalid: hosted-git-info@3.0.8 /Users/bhamail/sonatype/community/auditjs/auditjs/node_modules/normalize-package-data/node_modules/hosted-git-info
```
After updating the transitive dependency, we need to make sure the tests still pass:
```shell
npm run test
...
29 passing (84ms) 
```
Victory! Commit the changes, and we're done. 

You could also upgrade a higher level transitive dependency: `read-package-json` , like so:
```shell
  "resolutions": {
    "read-package-json": "^3.0.1"
  },
```


## Credit

---

Thank you to everybody who has contributed to this project, both with
[code contributions](https://github.com/OSSIndex/auditjs/pulls?q=is%3Apr+is%3Aclosed)
and also suggestions, testing help, and notifying us of new and/or missing
vulnerabilities.

## Contributing

We care a lot about making the world a safer place, and that's why we continue to work on this and other plugins for Sonatype OSS Index. If you as well want to speed up the pace of software development by working on this project, jump on in! Before you start work, create a new issue, or comment on an existing issue, to let others know you are!

## Releasing

We use [semantic-release](https://github.com/semantic-release/semantic-release) to generate releases
from commits to the `main` branch.

For example, to perform a "patch" release, add a commit to `main` with a comment like:

```
fix: Adds insecure flag, implements (#213)
```

## The Fine Print

Remember:

It is worth noting that this is **NOT SUPPORTED** by Sonatype, and is a contribution of ours to the open source
community (read: you!)

* Use this contribution at the risk tolerance that you have
* Do NOT file Sonatype support tickets related to `ossindex-lib`
* DO file issues here on GitHub, so that the community can pitch in

Phew, that was easier than I thought. Last but not least of all - have fun!

## Getting help

Looking to contribute to our code but need some help? There's a few ways to get information:

- Chat with us on the [AuditJS Gitter](https://gitter.im/sonatype-nexus-community/auditjs) or the [Nexus-Developers Gitter](https://gitter.im/sonatype/nexus-developers)

