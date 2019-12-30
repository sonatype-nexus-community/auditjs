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

import winston, { format } from 'winston';

export const DEBUG = 'debug';
export const ERROR = 'error';

const transports = {
  console: new winston.transports.Console(
    {
      level: ERROR
    }
  ),
  file: new winston.transports.File(
    {
      filename: path.join(homedir(), '.ossindex', '.audit-js.error.log'), 
      level: ERROR
    }
  ),
  combinedFile: new winston.transports.File(
    {
      filename: path.join(homedir(), '.ossindex', '.audit-js.combined.log'),
      level: DEBUG
    }
  )
};

export const createAppLogger = (logLevel: string = DEBUG, name: string = "auditjs") => {
  winston.loggers.add(name, {
    level: logLevel,
    format: 
      format.combine(format.label({label: 'AuditJS'}),
      format.timestamp(),
      format.prettyPrint()),
    transports: [
      transports.file,
      transports.combinedFile,
      transports.console
    ]
  });
}

export const setConsoleTransportLevel = (logLevel: string) => {
  transports.console.level = logLevel;
}

export const getAppLogger = (loggerName: string = "auditjs") => {
  return winston.loggers.get(loggerName);
}

export const logMessage = (message: string, level: string, ...meta: any) => {
  getAppLogger().log(level, message, meta);
}
