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
import { OssIndexRequestService } from './OssIndexRequestService';
import { Coordinates } from '../Types/Coordinates';
import { rmSync, existsSync } from 'fs';

// This will only work on Linux/OS X; find a better Windows-friendly path
const CACHE_LOCATION = '/tmp/.ossindex';

const OSS_INDEX_BASE_URL = 'http://ossindex.sonatype.org/';

describe('OssIndexRequestService', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('should have its request rejected when the OSS Index server is down', async () => {
    if (existsSync(CACHE_LOCATION)) rmSync(CACHE_LOCATION, { recursive: true, force: true });
    mockFetch.mockRejectedValueOnce(new Error('you messed up!'));

    const requestService = new OssIndexRequestService(undefined, undefined, CACHE_LOCATION, OSS_INDEX_BASE_URL);
    const coords = [new Coordinates('commander', '2.12.2', '@types')];
    await expect(requestService.callOSSIndexOrGetFromCache(coords)).rejects.toThrow();
  });

  it('should return a valid response when given a valid component request', async () => {
    if (existsSync(CACHE_LOCATION)) rmSync(CACHE_LOCATION, { recursive: true, force: true });
    const expectedOutput = [
      {
        coordinates: 'pkg:npm/%40types/commander@2.12.2',
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue(expectedOutput),
    });

    const requestService = new OssIndexRequestService(undefined, undefined, CACHE_LOCATION, OSS_INDEX_BASE_URL);
    const coords = [new Coordinates('commander', '2.12.2', '@types')];
    const result = await requestService.callOSSIndexOrGetFromCache(coords);
    expect(result).toEqual(expectedOutput);
  });
});
