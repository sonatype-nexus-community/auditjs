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

import path from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync } from 'fs';
import { writeFileSync } from 'fs';
import { safeDump } from 'js-yaml';

import { ConfigPersist } from './ConfigPersist';

export abstract class Config {
  private directoryName = '.ossindex';
  private fileName = '.oss-index-config';
  private configLocation: string;
  constructor(protected type: string, protected username: string, protected token: string) {
    if (this.type == 'iq') {
      this.directoryName = '.iqserver';
      this.fileName = '.iq-server-config';
    }
    this.configLocation = path.join(homedir(), this.directoryName, this.fileName);
  }

  protected getConfigLocation(): string {
    this.tryCreateDirectory();
    return this.configLocation;
  }

  private tryCreateDirectory(): void {
    if (!existsSync(path.join(homedir(), this.directoryName))) {
      mkdirSync(path.join(homedir(), this.directoryName));
    }
    return;
  }

  public saveFile(objectToSave: ConfigPersist): boolean {
    writeFileSync(this.getConfigLocation(), safeDump(objectToSave, { skipInvalid: true }));
    this.getConfigFromFile();
    return true;
  }

  public exists(): boolean {
    return existsSync(this.configLocation);
  }

  abstract getConfigFromFile(saveLocation?: string): Config;
}
