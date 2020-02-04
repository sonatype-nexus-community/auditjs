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
import path from "path";
import { homedir } from "os";
import { mkdirSync, existsSync } from "fs";
import { getAppLogger } from "../Application/Logger/Logger";
import { Logger } from "winston";
import { writeFileSync } from "fs";
import { safeDump } from "js-yaml";

import { ConfigPersist } from "./ConfigPersist";

export abstract class Config {
  constructor(
    protected username: string,
    protected token: string,
    readonly logger: Logger = getAppLogger()
  ) {}

  getSaveLocation(configName: string): string {
    if (configName == ".oss-index-config") {
      this.tryCreateDirectory(".ossindex");
      return path.join(homedir(), ".ossindex", configName);
    }
    this.tryCreateDirectory(".iqserver");
    return path.join(homedir(), ".iqserver", configName);
  }

  tryCreateDirectory(dir: string): void {
    if (!existsSync(path.join(homedir(), dir))) {
      mkdirSync(path.join(homedir(), dir));
    }
    return;
  }

  public getUsername(): string {
    return this.username;
  }

  public getToken(): string {
    return this.token;
  }

  protected saveConfigToFile(
    objectToSave: ConfigPersist,
    saveLocation: string = ".oss-index-config"
  ): boolean {
    try {
      writeFileSync(
        this.getSaveLocation(saveLocation),
        safeDump(objectToSave, { skipInvalid: true })
      );
      return true;
    } catch (e) {
      throw new Error(e);
    }
  }

  public saveFile(config: ConfigPersist, flag: string): boolean {
    if (flag === "ossi") {
      return this.saveConfigToFile(config, ".oss-index-config");
    }
    return this.saveConfigToFile(config, '.iq-server-config');
  }

  abstract getConfigFromFile(saveLocation?: string): Config;
}
