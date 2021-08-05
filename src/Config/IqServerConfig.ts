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

import { Config } from './Config';
import { readFileSync } from 'fs';
import { safeLoad } from 'js-yaml';

export class IqServerConfig extends Config {
  constructor(
    // TODO: Decide if we want to put default values here or leave them blank.. regardless empty strings are not easy to handle
    protected username: string = '',
    protected token: string = '',
    private host: string = '',
  ) {
    super('iq', username, token);
    if (this.exists()) {
      this.getConfigFromFile();
    }
  }

  public getUsername(): string {
    return this.username;
  }

  public getToken(): string {
    return this.token;
  }

  public getHost(): string {
    return this.host;
  }

  public getConfigFromFile(saveLocation: string = this.getConfigLocation()): IqServerConfig {
    const doc = safeLoad(readFileSync(saveLocation, 'utf8')) as IqServerConfigOnDisk;
    if (doc && doc.Username && doc.Token && doc.Server) {
      super.username = doc.Username;
      super.token = doc.Token;
      this.host = doc.Server;
    }

    return this;
  }
}

interface IqServerConfigOnDisk {
  Username?: string;
  Token?: string;
  Server?: string;
}
