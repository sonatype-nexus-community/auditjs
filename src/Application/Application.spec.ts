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
import { GuideRequestService } from '../Services/GuideRequestService';
import { OssIndexServerConfig } from '../Config/OssIndexServerConfig';
import { GuideServerConfig } from '../Config/GuideServerConfig';
import { TextFormatter } from '../Audit/Formatters/TextFormatter';
import { NpmList } from '../Munchers/NpmList';

describe('Application', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  const mockGuideCall = () => {
    let capturedService: GuideRequestService | null = null;
    const spy = vi.spyOn(GuideRequestService.prototype, 'callGuideOrGetFromCache').mockImplementation(async function (
      this: GuideRequestService,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      capturedService = this;
      return [{ coordinates: 'pkg:npm/test@1.0.0', reference: '', vulnerabilities: [] }];
    });
    return { spy, get: () => capturedService };
  };

  it('uses AUDITJS_GUIDE_TOKEN env var as bearer token when no username is set', async () => {
    vi.spyOn(NpmList.prototype, 'isValid').mockReturnValue(true);
    vi.spyOn(NpmList.prototype, 'getDepList').mockResolvedValue([]);
    vi.spyOn(GuideServerConfig.prototype, 'getConfigFromFile').mockImplementation(function () {
      return this as any;
    });
    vi.stubEnv('AUDITJS_GUIDE_TOKEN', 'env-bearer-token');

    const app = new Application(false, true);
    const { get } = mockGuideCall();

    await app.startApplication({ _: ['guide'] });

    const svc = get();
    expect(svc).toBeInstanceOf(GuideRequestService);
    if (svc instanceof GuideRequestService) {
      expect(svc.username).toBeUndefined();
      expect(svc.accessToken).toEqual('env-bearer-token');
    }
  });

  it('uses AUDITJS_GUIDE_USERNAME + AUDITJS_GUIDE_TOKEN env vars for basic auth', async () => {
    vi.spyOn(NpmList.prototype, 'isValid').mockReturnValue(true);
    vi.spyOn(NpmList.prototype, 'getDepList').mockResolvedValue([]);
    vi.spyOn(GuideServerConfig.prototype, 'getConfigFromFile').mockImplementation(function () {
      return this as any;
    });
    vi.stubEnv('AUDITJS_GUIDE_USERNAME', 'env-user');
    vi.stubEnv('AUDITJS_GUIDE_TOKEN', 'env-token');

    const app = new Application(false, true);
    const { get } = mockGuideCall();

    await app.startApplication({ _: ['guide'] });

    const svc = get();
    expect(svc).toBeInstanceOf(GuideRequestService);
    if (svc instanceof GuideRequestService) {
      expect(svc.username).toEqual('env-user');
      expect(svc.token).toEqual('env-token');
      expect(svc.accessToken).toBeUndefined();
    }
  });

  it('uses config Token as bearer token when username is absent (backward compat)', async () => {
    vi.spyOn(NpmList.prototype, 'isValid').mockReturnValue(true);
    vi.spyOn(NpmList.prototype, 'getDepList').mockResolvedValue([]);
    vi.spyOn(GuideServerConfig.prototype, 'exists').mockReturnValue(true);
    vi.spyOn(GuideServerConfig.prototype, 'getConfigFromFile').mockImplementation(function () {
      return this as any;
    });
    vi.spyOn(GuideServerConfig.prototype, 'getUsername').mockReturnValue(undefined);
    vi.spyOn(GuideServerConfig.prototype, 'getToken').mockReturnValue('config-bearer-token');
    vi.spyOn(GuideServerConfig.prototype, 'getAccessToken').mockReturnValue(undefined);

    const app = new Application(false, true);
    const { get } = mockGuideCall();

    await app.startApplication({ _: ['guide'] });

    const svc = get();
    expect(svc).toBeInstanceOf(GuideRequestService);
    if (svc instanceof GuideRequestService) {
      expect(svc.username).toBeUndefined();
      expect(svc.accessToken).toEqual('config-bearer-token');
    }
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
