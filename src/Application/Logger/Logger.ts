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

const home = homedir();
const logPath = `${home}/.ossindex`;

export const DEBUG = 'debug';
export const ERROR = 'error';

export const logger = pino(
  {
    name: 'auditjs',
    level: DEBUG,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.extreme(`${logPath}/.auditjs.combined.log`),
);

export const loggerError = pino(
  {
    name: 'auditjs',
    level: DEBUG,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.extreme(`${logPath}/.auditjs.combined.log`),
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
