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
import { Config } from "./Config";
import { readFileSync } from "fs";
import { getAppLogger } from "../Application/Logger/Logger";
import { Logger } from "winston";
import { ConfigPersist } from "./ConfigPersist";
import { safeLoad } from 'js-yaml';

export class OssIndexServerConfig extends Config {

  constructor(
    protected username: string = '', 
    protected token: string = '',
    protected cacheLocation: string = '',
    readonly logger: Logger = getAppLogger()) {
    super(username, token, logger);
  }

  public getUsername(): string {
    return this.username;
  }

  public getToken(): string {
    return this.token;
  }

  public getCacheLocation(): string {
    return this.cacheLocation;
  }

  public saveFile(ossIndexConfig: ConfigPersist): boolean {
    return super.saveConfigToFile(ossIndexConfig);
  }

  public getConfigFromFile(
    saveLocation: string = this.getSaveLocation('.oss-index-config')
  ): OssIndexServerConfig {
    const doc = safeLoad(readFileSync(saveLocation, 'utf8'));
    super.username = doc.Username;
    super.token = doc.Token;

    return this;
  }
}
