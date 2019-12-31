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
import { Logger } from 'winston';
import { writeFileSync } from "fs";
import { getAppLogger, logMessage, ERROR } from "../Application/Logger/Logger";

export abstract class Config {
  constructor(
    protected username: string, 
    protected token: string,
    readonly logger: Logger = getAppLogger()) {
  }
  
  getSaveLocation(configName: string = `.oss-index-config`): string {
    return path.join(homedir(), configName);
  }

  protected saveConfigToFile(
    stringToSave: string,
    saveLocation: string = this.getSaveLocation()
  ): boolean {
    let ableToWrite = false;

    try {
      writeFileSync(saveLocation, stringToSave, { flag: "wx" });
      ableToWrite = true;
    } catch (e) {
      logMessage(e, ERROR);
    }

    return ableToWrite;
  }

  abstract getConfigFromFile(saveLocation?: string): Config;

  abstract getStringToSave(): string;

  abstract saveFile(): boolean;

  public getBasicAuth(): string[] {
    return ['Authorization', `Basic ` + Buffer.from(this.username + ":" + this.token).toString('base64') ];
  }
}
