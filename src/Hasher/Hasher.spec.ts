/*
 * Copyright (c) 2020-present Sonatype, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import expect from '../Tests/TestHelper';
import { Hasher } from './Hasher';
import mock from 'mock-fs';

const json = `{"thing": "value"}`;

const json2 = `{"anotherThing": "anotherValue"}`;

const json3 = `{"yetAnotherThing": "yetAnotherValue"}`;

describe("Hasher", () => {
  it("should return a sha1 hash for a provided path", async () => {
    mock({'/nonsensical': {
      'auditjs.js': json,
      'directory': {
        'anotherpath.js': json2,
        'fakething.js': json3,
        'anotherdirectory': {}
        }
      } 
    });

    let expected = '54bbc009e6ba2ee4e892a0347279819bd30e5e29';

    let hasher = new Hasher('sha1');

    let result = await hasher.getHashFromPath('/nonsensical/auditjs.js');

    expect(result)
      .to.eq(expected);

    mock.restore();
  });
});
