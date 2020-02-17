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
import os from 'os';
import pack = require('../../package.json');

export class RequestHelpers {
  public static getUserAgent(): string[] {
    const nodeVersion = process.versions;
    const environment = 'NodeJS';
    const environmentVersion = nodeVersion.node;
    const system = `${os.type()} ${os.release()}`;

    return ['User-Agent', `AuditJS/${pack.version} (${environment} ${environmentVersion}; ${system})`];
  }
}