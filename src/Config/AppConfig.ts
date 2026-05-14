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
import { GuideServerConfig } from './GuideServerConfig';
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
      'What would you like to configure?\n' +
        '  1. Sonatype Lifecycle\n' +
        '  2. Sonatype Guide (Bearer Token)\n' +
        '  3. Sonatype Guide (OSS Index Compatibility - Username and Token)\n' +
        '  4. OSS Index [DEPRECATED]\n' +
        'Enter your choice (default: 3): ',
      '3',
    );

    if (type == '1') {
      // Sonatype Lifecycle (formerly Nexus IQ)
      username = 'admin';
      token = 'admin123';

      let host = 'http://localhost:8070';

      username = await this.setVariable(`What is your username (default: ${username})? `, username);

      token = await this.setVariable(
        `What is your password/token (pretty please do not save your password to the filesystem, USE A TOKEN) (default: ${token})? `,
        token,
      );

      host = await this.setVariable(`What is your Lifecycle Server address (default: ${host})? `, host);

      this.rl.close();

      const iqConfig = new ConfigPersist(username, token, host.endsWith('/') ? host.slice(0, host.length - 1) : host);

      const config = new IqServerConfig();

      return config.saveFile(iqConfig);
    } else if (type == '2') {
      // Sonatype Guide Bearer Token
      let accessToken = '';
      let server = 'https://api.guide.sonatype.com';

      accessToken = await this.setVariable('What is your Sonatype Guide API token? ');

      server = await this.setVariable(`What is your Sonatype Guide server address (default: ${server})? `, server);

      this.rl.close();

      const guideConfig = new ConfigPersist(
        '',
        '',
        server.endsWith('/') ? server.slice(0, server.length - 1) : server,
        undefined,
        accessToken,
      );

      const config = new GuideServerConfig();

      return config.saveFile(guideConfig);
    } else if (type == '3') {
      // Sonatype Guide OSS Index Compatibility (username + token)
      let server = 'https://api.guide.sonatype.com';

      username = await this.setVariable('What is your Sonatype Guide username? ');

      token = await this.setVariable('What is your Sonatype Guide token? ');

      server = await this.setVariable(`What is your Sonatype Guide server address (default: ${server})? `, server);

      this.rl.close();

      const guideConfig = new ConfigPersist(
        username,
        token,
        server.endsWith('/') ? server.slice(0, server.length - 1) : server,
      );

      const config = new GuideServerConfig();

      return config.saveFile(guideConfig);
    } else if (type == '4') {
      // OSS Index (deprecated)
      console.warn(
        'DEPRECATION: OSS Index configuration is deprecated. ' + 'Please migrate to Sonatype Guide (option 3).',
      );

      let cacheLocation = join(homedir(), '.ossindex', 'auditjs');
      let server = 'https://api.guide.sonatype.com';

      username = await this.setVariable('What is your OSS Index username? ');

      token = await this.setVariable('What is your OSS Index token? ');

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
    } else {
      // Default fallback: treat as option 3 (Guide OSS Index Compatibility)
      let server = 'https://api.guide.sonatype.com';

      username = await this.setVariable('What is your Sonatype Guide username? ');

      token = await this.setVariable('What is your Sonatype Guide token? ');

      server = await this.setVariable(`What is your Sonatype Guide server address (default: ${server})? `, server);

      this.rl.close();

      const guideConfig = new ConfigPersist(
        username,
        token,
        server.endsWith('/') ? server.slice(0, server.length - 1) : server,
      );

      const config = new GuideServerConfig();

      return config.saveFile(guideConfig);
    }
  }

  private setVariable(message: string, defaultValue = ''): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(message, (answer) => {
        resolve(answer || defaultValue);
      });
    });
  }
}
