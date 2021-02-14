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
import { Merger } from './Merger';
import { HashCoordinate } from '../Types/HashCoordinate';
import { readFileSync } from 'fs';
import { join } from 'path';

const hashes = new Array<HashCoordinate>();

hashes.push(new HashCoordinate('hash', 'path'));
hashes.push(new HashCoordinate('hash1', 'path1'));
hashes.push(new HashCoordinate('hash2', 'path2'));
hashes.push(new HashCoordinate('hash3', 'path3'));

describe('Merger', () => {
  it('should take an array of HashCoordinates and merge them together with the existing XML SBOM', async () => {
    const sbom = readFileSync(join(__dirname, 'validsbom.xml'), 'utf8').toString();

    const merger = new Merger();

    const results = await merger.mergeHashesIntoSbom(hashes, sbom);

    expect(results).to.include(`<name>path</name>`);
    expect(results).to.include(`<hashes><hash alg="SHA-1">hash</hash></hashes>`);
    expect(results).to.include(`<name>path3</name>`);
    expect(results).to.include(`<hashes><hash alg="SHA-1">hash3</hash></hashes>`);
  });

  it('should not merge an array of HashCoordinates with an invalid XML SBOM', () => {
    const sbom = 'this is garbage data';

    const merger = new Merger();

    const results = merger.mergeHashesIntoSbom(hashes, sbom);

    expect(results).to.eventually.be.rejected;
  });
});
