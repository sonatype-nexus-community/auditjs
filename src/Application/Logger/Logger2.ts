/*
 * Copyright (c) 2019-present Sonatype, Inc.
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
import path from 'path';
import { homedir } from 'os';
import pino from 'pino';
import childProcess from 'child_process';
import stream from 'stream';

export const DEBUG = 'debug';
export const ERROR = 'error';

const cwd = process.cwd();
const { env } = process;

const logThrough = new stream.PassThrough();
const log = pino({ name: 'auditjs' }, logThrough);

const child = childProcess.spawn(
  process.execPath,
  [
    require.resolve('pino-tee'),
    ERROR,
    path.join(homedir(), '.ossindex', '.audit-js.error.log'),
    DEBUG,
    path.join(homedir(), '.ossindex', '.audit-js.combined.log'),
  ],
  { cwd, env },
);

logThrough.pipe(child.stdin);

// const transports = {
//   console: new winston.transports.Console({
//     level: ERROR,
//   }),
//   file: new winston.transports.File({
//     filename: path.join(homedir(), '.ossindex', '.audit-js.error.log'),
//     options: { flags: 'w' },
//     level: ERROR,
//   }),
//   combinedFile: new winston.transports.File({
//     filename: path.join(homedir(), '.ossindex', '.audit-js.combined.log'),
//     options: { flags: 'w' },
//     level: DEBUG,
//   }),
// };

// const createAppLogger = (logLevel: string = DEBUG, name: string = 'auditjs') => {
//   winston.loggers.add(name, {
//     level: logLevel,
//     format: format.combine(format.label({ label: 'AuditJS' }), format.timestamp(), format.prettyPrint()),
//     transports: [transports.file, transports.combinedFile, transports.console],
//   });
// };

// const setConsoleTransportLevel = (logLevel: string) => {
//   transports.console.level = logLevel;
// };

// const getAppLogger = (loggerName: string = 'auditjs') => {
//   return winston.loggers.get(loggerName);
// };

// const logMessage = (message: string, level: string, ...meta: any) => {
//   getAppLogger().log(level, message, meta);
// };
