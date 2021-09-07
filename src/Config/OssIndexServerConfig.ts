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
import storage from 'node-persist';

export class OssIndexServerConfig extends Config {
  constructor(protected username: string = '', protected token: string = '', protected cacheLocation: string = '') {
    super('ossi', username, token);
    if (this.exists()) {
      this.getConfigFromFile();
    }
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

  public getCacheLocation(): string | undefined {
    if (this.cacheLocation != '') {
      return this.cacheLocation;
    }
    return undefined;
  }

  public async clearCache(): Promise<boolean> {
    try {
      await storage.init({ dir: this.cacheLocation });
      await storage.clear();
      return true;
    } catch (error) {
      // It's likely an error would only ever occur if there was a permission based issue, so log it and move on
      console.log(error);
      return false;
    }
  }

  public getConfigFromFile(saveLocation: string = this.getConfigLocation()): OssIndexServerConfig {
    const doc = safeLoad(readFileSync(saveLocation, 'utf8')) as OssIndexServerConfigOnDisk;
    if (doc && doc.Username) {
      this.username = doc.Username;
    }
    if (doc && doc.Token) {
      this.token = doc.Token;
    }
    if (doc && doc.CacheLocation) {
      this.cacheLocation = doc.CacheLocation;
    }

    return this;
  }
}

interface OssIndexServerConfigOnDisk {
  Username?: string;
  Token?: string;
  CacheLocation?: string;
}
