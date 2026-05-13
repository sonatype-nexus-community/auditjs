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
import os from 'os';
import { mkdirSync, existsSync } from 'fs';
import { writeFileSync, chmodSync } from 'fs';
import { dump } from 'js-yaml';

import { ConfigPersist } from './ConfigPersist';

export abstract class Config {
  private directoryName = '.ossindex';
  private fileName = '.oss-index-config';
  constructor(
    protected type: string,
    protected username: string,
    protected token: string,
  ) {
    if (this.type == 'iq') {
      this.directoryName = '.iqserver';
      this.fileName = '.iq-server-config';
    } else if (this.type == 'guide') {
      this.directoryName = '.sonatype-guide';
      this.fileName = '.sonatype-guide-config';
    }
  }

  protected getConfigLocation(): string {
    this.tryCreateDirectory();
    return path.join(os.homedir(), this.directoryName, this.fileName);
  }

  private tryCreateDirectory(): void {
    const dir = path.join(os.homedir(), this.directoryName);
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }
  }

  public saveFile(objectToSave: ConfigPersist): boolean {
    const location = this.getConfigLocation();
    writeFileSync(location, dump(objectToSave, { skipInvalid: true }));
    chmodSync(location, 0o600);
    this.getConfigFromFile();
    return true;
  }

  public exists(): boolean {
    return existsSync(path.join(os.homedir(), this.directoryName, this.fileName));
  }

  abstract getConfigFromFile(saveLocation?: string): Config;
}
