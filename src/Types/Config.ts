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
import { mkdirSync, existsSync } from 'fs';
import { Logger } from 'winston';
import { writeFileSync } from "fs";

export abstract class Config {
  constructor(
    protected username: string, 
    protected token: string,
    readonly logger: Logger) {
  }
  
  getSaveLocation(configName: string): string {
    if (configName == '.oss-index-config') {
      this.tryCreateDirectory('.ossindex');
      return path.join(homedir(), '.ossindex', configName);
    }
    this.tryCreateDirectory('.iqserver');
    return path.join(homedir(), '.iqserver', configName);
  }

  tryCreateDirectory(dir: string): void {
    if (existsSync(path.join(homedir(), dir))) {
      return;
    } else {
      mkdirSync(path.join(homedir(), dir));
      return;
    }
  }

  protected saveConfigToFile(
    stringToSave: string,
    saveLocation: string = '.oss-index-config'
  ): boolean {
    try {
      console.log(saveLocation);
      writeFileSync(this.getSaveLocation(saveLocation), stringToSave);
      return true;
    } catch (e) {
      throw new Error(e);
    }
  }

  abstract getConfigFromFile(saveLocation?: string): Config;

  abstract getStringToSave(): string;

  abstract saveFile(): boolean;
}
