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

import { configure, getLogger, shutdown, addLayout } from 'log4js';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export const DEBUG = 'debug';
export const ERROR = 'error';

const logPath = join(homedir(), '.ossindex');

const logPathFile = join(logPath, '.auditjs.combined.log');

addLayout('json', function (config) {
  return function (logEvent) {
    return JSON.stringify(logEvent) + config.separator;
  };
});

configure({
  appenders: {
    auditjs: {
      type: 'file',
      maxLogSize: 2 * 1024 * 1024,
      layout: {
        type: 'json',
        separator: ',',
      },
      filename: logPathFile,
    },
    out: { type: 'stdout' },
    errors: { type: 'logLevelFilter', appender: 'out', level: 'error', maxLevel: 'error' },
  },
  categories: {
    default: {
      appenders: ['errors', 'auditjs'],
      level: 'error',
    },
  },
});

const logger = getLogger('auditjs');
logger.level = DEBUG;

export const createAppLogger = () => {
  if (!existsSync(logPath)) {
    mkdirSync(logPath);
  }
};

export const logMessage = (message: string, level: string, ...meta: any) => {
  if (level == DEBUG) {
    logger.debug(message, ...meta);
  } else if (level == ERROR) {
    if (meta && meta[0] && meta[0].stack) {
      logger.error(message, meta[0].stack);
    } else {
      logger.error(message, ...meta);
    }
  }
};

export const shutDownLoggerAndExit = (code: number) => {
  shutdown((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(code);
  });
};
