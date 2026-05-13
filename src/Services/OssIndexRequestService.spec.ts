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
import { OssIndexRequestService } from './OssIndexRequestService';
import { Coordinates } from '../Types/Coordinates';
import { rmSync, existsSync } from 'fs';

// Mock node-fetch since source files still use it
vi.mock('node-fetch', () => ({
  default: vi.fn(),
  Response: class Response {
    ok: boolean;
    statusText: string;
    constructor(public body: any, init: { status?: number } = {}) {
      this.ok = (init.status || 200) >= 200 && (init.status || 200) < 300;
      this.statusText = this.ok ? 'OK' : 'Error';
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
  },
}));

import nodeFetch from 'node-fetch';
const mockFetch = nodeFetch as unknown as ReturnType<typeof vi.fn>;

// This will only work on Linux/OS X, find a better Windows friendly path
const CACHE_LOCATION = '/tmp/.ossindex';

const OSS_INDEX_BASE_URL = 'http://ossindex.sonatype.org/';

describe('OssIndexRequestService', () => {
  afterEach(() => {
    vi.clearAllMocks();
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
