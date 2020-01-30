/*
 * Copyright (c) 2019-present Sonatype, Inc.
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
import { Lister } from './Lister';
import mock from 'mock-fs';

describe("Lister", () => {
  it("should return a set of files and no directories given a base path", async () => {
    mock({'/nonsensical': {
      'auditjs.js': '{}',
      'directory': {
        'anotherpath.js': '{}',
        'fakething.notjs': '{}',
        'anotherdirectory': {}
        }
      } 
    });

    let expected = new Set();

    expected.add('auditjs.js');
    expected.add('directory/anotherpath.js');

    let result = Lister.getListOfFilesInBasePath('/nonsensical');

    expect(result)
      .to.deep.eq(expected);

    mock.restore();
  });
});
