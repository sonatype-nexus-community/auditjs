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

import { CycloneDXSbomCreator } from './CycloneDXSbomCreator';
import expect from '../Tests/TestHelper';
import { Bom } from './Types/Bom';

// Test object with circular dependency, scoped dependency, dependency with dependency
const object = {
  name: 'testproject',
  version: '1.0.0',
  description: 'Test Description',
  dependencies: {
    testdependency: {
      name: 'testdependency',
      version: '1.0.1',
      bugs: {
        url: 'git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.3',
        },
      },
    },
    testdependency2: {
      name: 'testdependency2',
      version: '1.0.2',
      repository: {
        url: 'git@slack-github.com:anuj/csp-html-webpack-plugin.git',
      },
      dependencies: {
        testdependency: {
          name: 'testdependency',
          version: '1.0.0',
        },
      },
    },
    '@scope/testdependency3': {
      name: '@scope/testdependency3',
      version: '1.0.2',
    },
  },
};

const bomSchemaVersion = '1.3';
const serialNumberToReplace = 'serialNumberToReplace';
const metadataTimestampToReplace = 'metadataTimestampToReplace';

const expectedResponseTemplate =
  // @todo OK to use https for bom xmlns?
  `<?xml version="1.0" encoding="utf-8"?><bom xmlns="https://cyclonedx.org/schema/bom/` +
  bomSchemaVersion +
  `" serialNumber="` +
  serialNumberToReplace +
  // @todo Should `version` be the same value as bomSchemaVersion?
  `" version="1"><metadata><timestamp>` +
  metadataTimestampToReplace +
  `</timestamp><component type="library" bom-ref="pkg:npm/testproject@1.0.0"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type="library" bom-ref="pkg:npm/testdependency@1.0.1"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl><description/><externalReferences><reference type="issue-tracker"><url>git+ssh://git@github.com/slackhq/csp-html-webpack-plugin.git</url></reference></externalReferences></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.3"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl><description/></component><component type="library" bom-ref="pkg:npm/testdependency2@1.0.2"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl><description/></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.0"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl><description/></component><component type="library" bom-ref="pkg:npm/%40scope/testdependency3@1.0.2"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl><description/></component></components><dependencies><dependency ref="pkg:npm/testproject@1.0.0"><dependency ref="pkg:npm/testdependency@1.0.1"/><dependency ref="pkg:npm/testdependency2@1.0.2"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependency><dependency ref="pkg:npm/testdependency@1.0.1"><dependency ref="pkg:npm/testdependency@1.0.3"/></dependency><dependency ref="pkg:npm/testdependency@1.0.3"/><dependency ref="pkg:npm/testdependency2@1.0.2"><dependency ref="pkg:npm/testdependency@1.0.0"/></dependency><dependency ref="pkg:npm/testdependency@1.0.0"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependencies></bom>`;

const expectedSpartanResponseTemplate =
  // @todo OK to use https for bom xmlns?
  `<?xml version="1.0" encoding="utf-8"?><bom xmlns="https://cyclonedx.org/schema/bom/` +
  bomSchemaVersion +
  `" serialNumber="` +
  serialNumberToReplace +
  // @todo Should `version` be the same value as bomSchemaVersion?
  `" version="1"><metadata><timestamp>` +
  metadataTimestampToReplace +
  `</timestamp><component type="library" bom-ref="pkg:npm/testproject@1.0.0"><group/><name>testproject</name><version>1.0.0</version><purl>pkg:npm/testproject@1.0.0</purl></component></metadata><components><component type="library" bom-ref="pkg:npm/testdependency@1.0.1"><name>testdependency</name><version>1.0.1</version><purl>pkg:npm/testdependency@1.0.1</purl></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.3"><name>testdependency</name><version>1.0.3</version><purl>pkg:npm/testdependency@1.0.3</purl></component><component type="library" bom-ref="pkg:npm/testdependency2@1.0.2"><name>testdependency2</name><version>1.0.2</version><purl>pkg:npm/testdependency2@1.0.2</purl></component><component type="library" bom-ref="pkg:npm/testdependency@1.0.0"><name>testdependency</name><version>1.0.0</version><purl>pkg:npm/testdependency@1.0.0</purl></component><component type="library" bom-ref="pkg:npm/%40scope/testdependency3@1.0.2"><group>@scope</group><name>testdependency3</name><version>1.0.2</version><purl>pkg:npm/%40scope/testdependency3@1.0.2</purl></component></components><dependencies><dependency ref="pkg:npm/testproject@1.0.0"><dependency ref="pkg:npm/testdependency@1.0.1"/><dependency ref="pkg:npm/testdependency2@1.0.2"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependency><dependency ref="pkg:npm/testdependency@1.0.1"><dependency ref="pkg:npm/testdependency@1.0.3"/></dependency><dependency ref="pkg:npm/testdependency@1.0.3"/><dependency ref="pkg:npm/testdependency2@1.0.2"><dependency ref="pkg:npm/testdependency@1.0.0"/></dependency><dependency ref="pkg:npm/testdependency@1.0.0"/><dependency ref="pkg:npm/%40scope/testdependency3@1.0.2"/></dependencies></bom>`;

describe('CycloneDXSbomCreator', async () => {
  it('should create an sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSbomCreator(process.cwd());

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);
    // replace template placeholders with real values
    const expectedResponse = expectedResponseTemplate
      .replace(serialNumberToReplace, bom['@serial-number'])
      .replace(metadataTimestampToReplace, bom.metadata.timestamp);

    expect(sbomString).to.eq(expectedResponse);
  });

  it('should create a spartan sbom string given a minimal valid object', async () => {
    const sbomCreator = new CycloneDXSbomCreator(process.cwd(), { spartan: true });

    const bom: Bom = await sbomCreator.getBom(object);

    const sbomString = sbomCreator.toXml(bom, false);

    // replace template placeholders with real values
    const expectedResponse = expectedSpartanResponseTemplate
      .replace(serialNumberToReplace, bom['@serial-number'])
      .replace(metadataTimestampToReplace, bom.metadata.timestamp);

    expect(sbomString).to.eq(expectedResponse);
  });
});
