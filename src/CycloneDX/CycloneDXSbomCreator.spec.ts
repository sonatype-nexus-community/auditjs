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
import { CycloneDXSbomCreator } from './CycloneDXSbomCreator';
import expect from '../Tests/TestHelper';

// Test object with circular dependency, scoped dependency, dependency with dependency
const object = {
  'name': 'testproject',
  'version': '1.0.0',
  'description': 'Test Description',
  'dependencies': {
    'testdependency': {
      'name': 'testdependency',
      'version': '1.0.1',
      'dependencies': {
        'testdependency': {
          'name': 'testdependency',
          'version': '1.0.1',
        }
      }
    },
    'testdependency2': {
      'name': 'testdependency2',
      'version': '1.0.2',
      'dependencies': {
        'testdependency': {
          'name': 'testdependency',
          'version': '1.0.0',
        }
      }
    },
    '@scope/testdependency3': {
      'name': '@scope/testdependency3',
      'version': '1.0.2'
    }
  }
}

const expectedResponse = `<?xml version="1.0" encoding="utf-8"?><bom xmlns="http://cyclonedx.org/schema/bom/1.1" version="1"><components><component type="library" bom-ref="pkg:npm/testdependency@1.0.1"><name>testdependency</name><version>1.0.1</version><description/><purl>pkg:npm/testdependency@1.0.1</purl></component><component type="library" bom-ref="pkg:npm/testdependency2@1.0.2"><name>testdependency2</name><version>1.0.2</version><description/><purl>pkg:npm/testdependency2@1.0.2</purl></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.0"><name>testdependency</name><version>1.0.0</version><description/><purl>pkg:npm/testdependency@1.0.0</purl></component><component type="library" bom-ref="pkg:npm/%40scope/testdependency3@1.0.2"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><description/><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl></component></components></bom>`;

describe("CycloneDXSbomCreator", async () => {
  it("should create an sbom string given a minimal valid object", async () => {
    const sbomCreator = new CycloneDXSbomCreator(process.cwd());

    const string = await sbomCreator.createBom(object);

    expect(string).to.eq(expectedResponse);
  });
});
