#!/usr/bin/env node
/*
 * Copyright 2019-Present Sonatype Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import yargs from 'yargs';
import {Argv} from 'yargs';
import {Application} from './Application/Application';
import {AppConfig} from './Config/AppConfig';
import {OssIndexServerConfig} from './Config/OssIndexServerConfig';

// TODO: Flesh out the remaining set of args that NEED to be moved over, look at them with a fine toothed comb and lots of skepticism
const normalizeHostAddress = (address: string) => {
  if (address.endsWith('/')) {
    return address.slice(0, address.length - 1);
  }
  return address;
};

let argv = yargs
  .help()
  .scriptName('auditjs')
  .command('iq [options]', 'Audit this application using Nexus IQ Server', (y: Argv) => {
    return y.options({
      application: {
        alias: 'a',
        type: 'string',
        demandOption: true,
        description: 'Specify IQ application public ID',
      },
      stage: {
        alias: 's',
        choices: ['develop', 'build', 'stage-release', 'release'] as const,
        demandOption: false,
        default: 'develop',
        description: 'Specify IQ app stage',
      },
      server: {
        alias: 'h',
        type: 'string',
        description: 'Specify IQ server url/port',
        demandOption: false,
      },
      timeout: {
        alias: 't',
        type: 'number',
        description: 'Specify an optional timeout in seconds for IQ Server Polling',
        default: 300,
        demandOption: false,
      },
      user: {
        alias: 'u',
        type: 'string',
        description: 'Specify username for request',
        demandOption: false,
      },
      password: {
        alias: 'p',
        type: 'string',
        description: 'Specify password for request',
        demandOption: false,
      },
      artie: {
        alias: 'x',
        type: 'boolean',
        description: 'Artie',
        demandOption: false,
      },
      allen: {
        alias: 'w',
        type: 'boolean',
        description: 'Allen',
        demandOption: false,
      },
      dev: {
        alias: 'd',
        type: 'boolean',
        description: 'Include Development Dependencies',
        demandOption: false,
      },
      insecure: {
        type: 'boolean',
        description: 'Allow insecure connections',
        demandOption: false,
      },
    });
  })
  .command('config', 'Set config for OSS Index or Nexus IQ Server')
  .command('ossi [options]', 'Audit this application using Sonatype OSS Index', (y: Argv) => {
    return y.options({
      user: {
        alias: 'u',
        type: 'string',
        description: 'Specify OSS Index username',
        demandOption: false,
      },
      password: {
        alias: 'p',
        type: 'string',
        description: 'Specify OSS Index password or token',
        demandOption: false,
      },
      quiet: {
        alias: 'q',
        type: 'boolean',
        description: 'Only print out vulnerable dependencies',
        demandOption: false,
      },
      json: {
        alias: 'j',
        type: 'boolean',
        description: 'Set output to JSON',
        demandOption: false,
      },
      xml: {
        alias: 'x',
        type: 'boolean',
        description: 'Set output to JUnit XML format',
        demandOption: false,
      },
      ignorelist: {
        alias: 'w',
        type: 'string',
        description: 'Set path to ignorelist file',
        demandOption: false,
      },
      clear: {
        description: 'Clears cache location if it has been set in config',
        type: 'boolean',
        demandOption: false,
      },
      bower: {
        description: 'Force the application to explicitly scan for Bower',
        type: 'boolean',
        demandOption: false,
      },
    })
      .command('sbom', 'Output the purl only CycloneDx sbom to std_out');
  }).argv;

if (argv) {
  if (argv._[0] == 'config') {
    let config = new AppConfig();

    config
      .getConfigFromCommandLine()
      .then((val) => {
        val ? process.exit(0) : process.exit(1);
      })
      .catch((e) => {
        throw new Error(e);
      });
  } else if (argv.clear) {
    let config = new OssIndexServerConfig();
    if (config.exists()) {
      config.getConfigFromFile();

      console.log('Cache location:', config.getCacheLocation());

      config.clearCache().then((success) => {
        if (success) {
          console.log('Cache cleared');
          process.exit(0);
        } else {
          console.log(
            'There was an error clearing the cache, the cache location must only contain AuditJS cache files.',
          );
          process.exit(1);
        }
      });
    } else {
      console.error(
        'Attempted to clear cache but no config file Present, run `auditjs config` to set a cache location.',
      );
    }
  } else if (argv._[0] == 'iq' || argv._[0] == 'ossi' || argv._[0] == 'sbom') {
    // silence all output if quiet or if sending file to std_out
    let silence = argv.json || argv.quiet || argv.xml || argv._[0] == 'sbom' ? true : false;
    let artie = argv.artie ? true : false;
    let allen = argv.allen ? true : false;
    let bower = argv.bower ? true : false;

    if (argv.server) {
      argv.server = normalizeHostAddress(argv.server as string);
    }

    let app: Application;
    try {
      if (argv.dev) {
        app = new Application(argv.dev as boolean, silence, artie, allen, bower);
      } else {
        app = new Application(false, silence, artie, allen, bower);
      }
      app.startApplication(argv);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  } else {
    yargs.showHelp();
    process.exit(0);
  }
}
