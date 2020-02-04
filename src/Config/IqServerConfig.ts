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
import { ConfigPersist } from "./ConfigPersist";
import { safeLoad } from 'js-yaml';

export class IqServerConfig extends Config {
  constructor(
    // TODO: Decide if we want to put default values here or leave them blank.. regardless empty strings are not easy to handle
    protected username: string = '', 
    protected token: string = '', 
    private host: string = '', 
  ){
    super(username, token);
  }

  public saveFile(iqServerConfig: ConfigPersist): boolean {
    return super.saveConfigToFile(iqServerConfig, '.iq-server-config');
  }

  public getHost(): string {
    return this.host;
  }
  
  public getConfigFromFile(
    saveLocation: string = this.getSaveLocation('.iq-server-config')
  ): IqServerConfig {
    // TODO: we should really have a public function to check if the config exists
    try {
      const doc = safeLoad(readFileSync(saveLocation, 'utf8'));
      super.username = doc.Username;
      super.token = doc.Token;
      this.host = doc.Server;
    }
    catch (e) {
      throw new Error('IQ Config file does not exist.  Run \'auditjs config\'.');
    }
    return this;
  }
}
