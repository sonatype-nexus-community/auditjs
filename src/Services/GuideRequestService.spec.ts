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

import { expect, vi, describe, it, afterEach, beforeEach } from 'vitest';
import { GuideRequestService } from './GuideRequestService';
import { OSSIndexCompatibilityApi } from '@sonatype/sonatype-guide-api-client';
import type { InitOverrideFunction } from '@sonatype/sonatype-guide-api-client';
import { Coordinates } from '../Types/Coordinates';
import { rmSync, existsSync } from 'fs';

const CACHE_PATH = '/tmp/.sonatype-guide-test';
const SERVER = 'https://api.guide.sonatype.com';

describe('GuideRequestService', () => {
  beforeEach(() => {
    if (existsSync(CACHE_PATH)) rmSync(CACHE_PATH, { recursive: true, force: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends Authorization: Bearer when accessToken is set (PAT token mode)', async () => {
    const spy = vi
      .spyOn(OSSIndexCompatibilityApi.prototype, 'getComponentReports')
      .mockResolvedValue([{ coordinates: 'pkg:npm/test@1.0.0', reference: '', vulnerabilities: [] }] as Awaited<
        ReturnType<typeof OSSIndexCompatibilityApi.prototype.getComponentReports>
      >);

    const svc = new GuideRequestService(undefined, undefined, CACHE_PATH, SERVER, 'sonatype_pat_test123');
    const coords = [new Coordinates('test', '1.0.0', '')];
    await svc.callGuideOrGetFromCache(coords, 'npm');

    expect(spy).toHaveBeenCalledOnce();
    const initOverrides = spy.mock.calls[0][1] as InitOverrideFunction;
    expect(initOverrides).toBeDefined();

    const result = await initOverrides({ init: { method: 'POST', headers: { 'Content-Type': 'application/json' } } });
    expect(result.headers).toMatchObject({ Authorization: 'Bearer sonatype_pat_test123' });
    expect(result.headers['Content-Type']).toEqual('application/json');
  });

  it('does not override Authorization when no accessToken (Basic auth mode)', async () => {
    const spy = vi
      .spyOn(OSSIndexCompatibilityApi.prototype, 'getComponentReports')
      .mockResolvedValue([{ coordinates: 'pkg:npm/test@1.0.0', reference: '', vulnerabilities: [] }] as Awaited<
        ReturnType<typeof OSSIndexCompatibilityApi.prototype.getComponentReports>
      >);

    const svc = new GuideRequestService('myuser', 'mytoken', CACHE_PATH, SERVER, undefined);
    const coords = [new Coordinates('test', '1.0.0', '')];
    await svc.callGuideOrGetFromCache(coords, 'npm');

    expect(spy).toHaveBeenCalledOnce();
    const initOverrides = spy.mock.calls[0][1];
    expect(initOverrides).toBeUndefined();
  });
});
