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

import { describe, it, expect, vi, afterEach } from 'vitest';
import { GuideRequestService } from './GuideRequestService';
import { Coordinates } from '../Types/Coordinates';

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

describe('GuideRequestService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('callGuideOrGetFromCache() with non-semver bower version strings', () => {
    // ------------------------------------------------------------------
    // Bug-confirmation test: PASSES with current (unfixed) code.
    // Shows that a single non-semver PURL causes the entire batch to fail
    // with no results returned — including valid packages in the same chunk.
    // ------------------------------------------------------------------

    it('[BUG] API error for non-semver PURL causes the entire batch to fail', async () => {
      const service = new GuideRequestService('user', 'token', CACHE_LOCATION, GUIDE_BASE_URL);

      // Simulate the HTTP 400 the Guide API returns when it receives an invalid PURL.
      vi.spyOn(service as any, 'getResultsFromGuide').mockRejectedValueOnce(
        new Error('There was an error making the request to Sonatype Guide (HTTP 400)'),
      );

      const coords = [
        new Coordinates('iron-elements', 'PolymerElements/iron-elements#1.0.4'),
        new Coordinates('polymer', '1.9.8'), // valid — but lost along with the bad one
      ];

      // Both packages disappear: the valid polymer@1.9.8 is never reported.
      await expect(service.callGuideOrGetFromCache(coords, 'bower')).rejects.toThrow('400');
    });

    // ------------------------------------------------------------------
    // Fix-behavior tests: these FAIL with current code and should PASS
    // once callGuideOrGetFromCache() filters out non-semver PURLs before
    // forwarding the batch to the API.
    // ------------------------------------------------------------------

    it('filters non-semver PURLs from the batch before sending to the API', async () => {
      const service = new GuideRequestService('user', 'token', CACHE_LOCATION, GUIDE_BASE_URL);

      const getResultsSpy = vi
        .spyOn(service as any, 'getResultsFromGuide')
        .mockResolvedValueOnce([
          { coordinates: 'pkg:bower/polymer@1.9.8', reference: '', vulnerabilities: [] },
        ]);

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

      const getResultsSpy = vi
        .spyOn(service as any, 'getResultsFromGuide')
        .mockResolvedValue([]);

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
