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
      output: process.stdout,
    });
  }

  public async getConfigFromCommandLine(): Promise<boolean> {
    let username = '';
    let token = '';
    let type = '';

    type = await this.setVariable(
      'Do you want to set config for Nexus IQ Server or OSS Index? Hit enter for OSS Index, iq for Nexus IQ Server? ',
    );

    if (type == 'iq') {
      // SECURITY: Removed hardcoded default credentials (CWE-798)
      // Users must now provide their own credentials
      let host = '';

      username = await this.setRequiredVariable('What is your username? ');

      token = await this.setRequiredVariable(
        'What is your password/token (please use a token, not your password)? ',
      );

      host = await this.setRequiredVariable('What is your IQ Server address (e.g., https://iq.example.com:8070)? ');

      this.rl.close();

      const iqConfig = new ConfigPersist(username, token, host.endsWith('/') ? host.slice(0, host.length - 1) : host);

      const config = new IqServerConfig();

      return config.saveFile(iqConfig);
    } else {
      let cacheLocation = join(homedir(), '.ossindex', 'auditjs');
      let server = 'https://ossindex.sonatype.org';

      username = await this.setVariable('What is your username? ');

      token = await this.setVariable('What is your token? ');

      server = await this.setVariable(`What is your OSS Index server address (default: ${server})? `, server);

      cacheLocation = await this.setVariable(
        `Where would you like your OSS Index cache saved to (default: ${cacheLocation})? `,
        cacheLocation,
      );

      this.rl.close();

      const ossIndexConfig = new ConfigPersist(
        username,
        token,
        server.endsWith('/') ? server.slice(0, server.length - 1) : server,
        cacheLocation,
      );

      const config = new OssIndexServerConfig();

      return config.saveFile(ossIndexConfig);
    }
  }

  private setVariable(message: string, defaultValue = ''): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(message, (answer) => {
        resolve(answer || defaultValue);
      });
    });
  }

  // SECURITY: Require user to provide a value - no defaults allowed
  private setRequiredVariable(message: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const askQuestion = (): void => {
        this.rl.question(message, (answer) => {
          if (answer && answer.trim() !== '') {
            resolve(answer.trim());
          } else {
            console.log('This field is required. Please provide a value.');
            askQuestion();
          }
        });
      };
      askQuestion();
    });
  }
}
