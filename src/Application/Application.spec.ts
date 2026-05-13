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

import { expect, vi, describe, it, afterEach } from 'vitest';
import { Application } from './Application';
import { OssIndexRequestService } from '../Services/OssIndexRequestService';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { TextFormatter } from '../Audit/Formatters/TextFormatter';
import { NpmList } from '../Munchers/NpmList';

describe('Application', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('merges both CLI and config options for auditWithOSSIndex, with CLI taking precedence', async () => {
    // Ensure NpmList is valid so Application constructor can create a muncher
    vi.spyOn(NpmList.prototype, 'isValid').mockReturnValue(true);
    vi.spyOn(NpmList.prototype, 'getDepList').mockResolvedValue([]);

    const app = new Application(false, true);
    const yargs = {
      _: ['ossi'],
      user: '',
      password: 'cli-password',
      cache: '',
    };

    vi.spyOn(TextFormatter.prototype, 'printAuditResults').mockImplementation(() => undefined);
    vi.spyOn(OssIndexServerConfig.prototype, 'getConfigFromFile').mockImplementation(() => undefined as any);
    vi.spyOn(OssIndexServerConfig.prototype, 'getUsername').mockReturnValue('config-user');
    vi.spyOn(OssIndexServerConfig.prototype, 'getToken').mockReturnValue('config-password');
    vi.spyOn(OssIndexServerConfig.prototype, 'getCacheLocation').mockReturnValue('config-cache-location');
    let ossIndexRequestService: any = null;
    vi.spyOn(OssIndexRequestService.prototype, 'callOSSIndexOrGetFromCache').mockImplementation(async function (
      this: any,
    ): Promise<any> {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      ossIndexRequestService = this;
      return [
        {
          coordinates: '',
          reference: '',
          vulnerabilities: [],
        },
      ];
    });
    await app.startApplication(yargs);
    expect(OssIndexRequestService.prototype.callOSSIndexOrGetFromCache).toHaveBeenCalledOnce();
    expect(ossIndexRequestService).toBeInstanceOf(OssIndexRequestService);
    if (ossIndexRequestService instanceof OssIndexRequestService) {
      expect(ossIndexRequestService.user).toEqual('config-user');
      expect(ossIndexRequestService.password).toEqual('cli-password');
      expect(ossIndexRequestService.cacheLocation).toEqual('config-cache-location');
    }
  });
});
