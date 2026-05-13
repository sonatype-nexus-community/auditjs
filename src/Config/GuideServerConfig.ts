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

export class GuideServerConfig extends Config {
  constructor(
    protected username: string = '',
    protected token: string = '',
    protected server: string = '',
    protected accessToken: string = '',
  ) {
    super('guide', username, token);
  }

  public getUsername(): string | undefined {
    if (this.username != '') {
      return this.username;
    }
    return undefined;
  }

  public getToken(): string | undefined {
    if (this.token != '') {
      return this.token;
    }
    return undefined;
  }

  public getServer(): string | undefined {
    if (this.server != '') {
      return this.server;
    }
    return undefined;
  }

  public getAccessToken(): string | undefined {
    if (this.accessToken != '') {
      return this.accessToken;
    }
    return undefined;
  }

  public getConfigFromFile(saveLocation: string = this.getConfigLocation()): GuideServerConfig {
    const doc = safeLoad(readFileSync(saveLocation, 'utf8')) as GuideServerConfigOnDisk;
    if (doc && doc.Username) {
      this.username = doc.Username;
    }
    if (doc && doc.Token) {
      this.token = doc.Token;
    }
    if (doc && doc.Server) {
      this.server = doc.Server;
    }
    if (doc && doc.AccessToken) {
      this.accessToken = doc.AccessToken;
    }

    return this;
  }
}

interface GuideServerConfigOnDisk {
  Username?: string;
  Token?: string;
  Server?: string;
  AccessToken?: string;
}
