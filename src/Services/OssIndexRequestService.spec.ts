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

import { OssIndexRequestService } from './OssIndexRequestService';
import expect from '../Tests/TestHelper';
import { Coordinates } from '../Types/Coordinates';
import nock from 'nock';
import rimraf from 'rimraf';

// This will only work on Linux/OS X, find a better Windows friendly path
const CACHE_LOCATION = '/tmp/.ossindex';

const OSS_INDEX_BASE_URL = 'http://ossindex.sonatype.org/';

describe('OssIndexRequestService', () => {
  it('should have its request rejected when the OSS Index server is down', async () => {
    rimraf.sync(CACHE_LOCATION);
    nock(OSS_INDEX_BASE_URL)
      .post('/api/v3/component-report')
      .replyWithError('you messed up!');
    const requestService = new OssIndexRequestService(undefined, undefined, CACHE_LOCATION, OSS_INDEX_BASE_URL);
    const coords = [new Coordinates('commander', '2.12.2', '@types')];
    return expect(requestService.callOSSIndexOrGetFromCache(coords)).to.eventually.be.rejected;
  });

  it('should return a valid response when given a valid component request', async () => {
    rimraf.sync(CACHE_LOCATION);
    const expectedOutput = [
      {
        coordinates: 'pkg:npm/%40types/commander@2.12.2',
        reference: 'https://ossindex.sonatype.org/blahblahblah',
        vulnerabilities: [],
      },
    ];
    nock(OSS_INDEX_BASE_URL)
      .post('/api/v3/component-report')
      .reply(200, expectedOutput);
    const requestService = new OssIndexRequestService(undefined, undefined, CACHE_LOCATION, OSS_INDEX_BASE_URL);
    const coords = [new Coordinates('commander', '2.12.2', '@types')];
    return expect(requestService.callOSSIndexOrGetFromCache(coords)).to.eventually.deep.equal(expectedOutput);
  });
});
