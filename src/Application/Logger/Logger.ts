/*
 * Copyright (c) 2020-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import pino from 'pino';
import { homedir } from 'os';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const logPath = join(homedir(), '.ossindex');

const logPathFile = process.env.NODE_ENV == 'test' ? undefined : join(logPath, '.auditjs.combined.log');

export const DEBUG = 'debug';
export const ERROR = 'error';

export const createAppLogger = () => {
  if (!existsSync(logPath)) {
    mkdirSync(logPath);
  }
};

const logger = pino(
  {
    name: 'auditjs',
    level: DEBUG,
    enabled: process.env.NODE_ENV == 'test' ? false : true,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.extreme(logPathFile),
);

const loggerError = pino(
  {
    name: 'auditjs',
    level: ERROR,
    enabled: process.env.NODE_ENV == 'test' ? false : true,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.extreme(logPathFile),
);

export const logMessage = (message: string, level: string, ...meta: any) => {
  if (process.env.NODE_ENV == 'test') {
    return;
  }

  if (level == DEBUG) {
    logger.debug(message, ...meta);
  } else if (level == ERROR) {
    loggerError.error(message, ...meta);
  }
};

const handler = pino.final(logger, (err, finalLogger, evt) => {
  if (process.env.NODE_ENV == 'test') {
    return;
  }

  logger.flush();
  loggerError.flush();
  finalLogger.debug(`${evt} caught`);
  if (err) {
    finalLogger.error(err, 'Error caused exit');
  }
  process.exit(err ? 1 : 0);
});

process.on('exit', () => {
  handler(null, 'exit');
});

process.on('beforeExit', () => {
  handler(null, 'beforeExit');
});

process.on('uncaughtException', (err) => {
  handler(err, 'uncaughtException');
});

process.on('SIGINT', () => {
  handler(null, 'SIGINT');
});

process.on('SIGQUIT', () => {
  handler(null, 'SIGQUIT');
});

process.on('SIGTERM', () => {
  handler(null, 'SIGTERM');
});
