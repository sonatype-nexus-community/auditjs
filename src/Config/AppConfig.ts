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
import readline from 'readline';
import { OssIndexServerConfig } from './OssIndexServerConfig';
import { IqServerConfig } from './IqServerConfig';
import { ConfigPersist } from './ConfigPersist';
import { join } from 'path';
import { homedir } from 'os';

export class AppConfig {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  public async getConfigFromCommandLine() {
    let username: string = ''; 
    let token: string = '';
    let type: string = '';

    type = await this.setVariable(
      'Do you want to set config for Nexus IQ Server or OSS Index? Hit enter for OSS Index, iq for Nexus IQ Server? '
    );

    if (type == 'iq') {
      username = 'admin';
      token = 'admin123';

      let host: string = 'http://localhost:8070';

      username = await this.setVariable(
        `What is your username (default: ${username})? `, 
        username
      );

      token = await this.setVariable(
        `What is your password/token (pretty please do not save your password to the filesystem, USE A TOKEN) (default: ${token})? `, 
        token
      );

      host = await this.setVariable(
        `What is your IQ Server address (default: ${host})? `, 
        host
      );
  
      this.rl.close();

      let iqConfig = new ConfigPersist(username, token, host.endsWith('/') ? host.slice(0, host.length - 1) : host)

      let config = new IqServerConfig();
      
      return config.saveFile(iqConfig);
    } else {
      let cacheLocation = join(homedir(), '.ossindex');
      username = await this.setVariable(
        'What is your username? '
      );

      token = await this.setVariable(
        'What is your token? '
      );

      cacheLocation = await this.setVariable(
        `Where would you like your OSS Index cache saved to (default: ${cacheLocation})? `,
        cacheLocation
      );
  
      this.rl.close();
  
      let ossIndexConfig = new ConfigPersist(username, token, cacheLocation);

      let config = new OssIndexServerConfig(username, token, cacheLocation);
      
      return config.saveFile(ossIndexConfig);
    }
  }

  private setVariable(message: string, defaultValue: string = ''): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(message, (answer) => {
        resolve(answer || defaultValue);
      });
    });
  }
}
