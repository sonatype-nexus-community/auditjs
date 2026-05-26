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

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { GuideRequestService } from './GuideRequestService';
import { OSSIndexCompatibilityApi } from '@sonatype/sonatype-guide-api-client';
import type { InitOverrideFunction } from '@sonatype/sonatype-guide-api-client';
import { Coordinates } from '../Types/Coordinates';
import { rmSync, existsSync } from 'node:fs';

// node-persist is mocked globally so tests never touch the filesystem cache.
vi.mock('node-persist', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn().mockResolvedValue(undefined), // nothing cached
    setItem: vi.fn().mockResolvedValue(undefined),
  },
}));

const CACHE_LOCATION = '/tmp/.guide-test';
const GUIDE_BASE_URL = 'http://test.guide.sonatype.com';
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

  describe('callGuideOrGetFromCache() with non-semver bower version strings', () => {
    it('filters non-semver PURLs from the batch before sending to the API', async () => {
      const service = new GuideRequestService('user', 'token', CACHE_LOCATION, GUIDE_BASE_URL);

      const getResultsSpy = vi
        .spyOn(service as any, 'getResultsFromGuide')
        .mockResolvedValueOnce([{ coordinates: 'pkg:bower/polymer@1.9.8', reference: '', vulnerabilities: [] }]);

      const coords = [
        new Coordinates('iron-elements', 'PolymerElements/iron-elements#1.0.4'),
        new Coordinates('polymer', '1.9.8'),
      ];

      await service.callGuideOrGetFromCache(coords, 'bower');

      // The API must receive exactly the one valid PURL.
      const [sentPurls] = getResultsSpy.mock.calls[0] as [string[]];
      expect(sentPurls).toHaveLength(1);
      expect(sentPurls[0]).toBe('pkg:bower/polymer@1.9.8');
      expect(sentPurls.some((p) => p.includes('PolymerElements'))).toBe(false);
    });

    it('skips the API call entirely when every coordinate has a non-semver version', async () => {
      const service = new GuideRequestService('user', 'token', CACHE_LOCATION, GUIDE_BASE_URL);

      const getResultsSpy = vi.spyOn(service as any, 'getResultsFromGuide').mockResolvedValue([]);

      const coords = [
        new Coordinates('iron-elements', 'PolymerElements/iron-elements#1.0.4'),
        new Coordinates('catiline', 'calvinmetcalf/catiline#2.9.3'),
      ];

      const result = await service.callGuideOrGetFromCache(coords, 'bower');

      // No HTTP request should be made; the result is an empty array rather than an error.
      expect(getResultsSpy).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
