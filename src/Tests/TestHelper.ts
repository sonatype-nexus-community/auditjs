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

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import 'mocha';
import { ComponentContainer, SecurityIssue } from '@sonatype/js-sona-types';

chai.use(chaiAsPromised);
const expect = chai.expect;

export const securityIsses: SecurityIssue[] = [
  {
    id: 'test_id',
    reference: 'title',
    severity: 9.8,
    url: 'reference',
    description: '',
    source: 'cve',
  },
  {
    id: 'test_id2',
    reference: 'title',
    severity: 9.8,
    url: 'reference',
    description: '',
    source: 'cve',
  },
];

export const ossIndexResult: ComponentContainer = {
  component: {
    packageUrl: 'pkg:npm/test@1.0.0',
    name: 'test',
    hash: '',
  },
  matchState: 'PURL',
  catalogDate: '',
  relativePopularity: '',
  licenseData: undefined,
  securityData: {
    securityIssues: securityIsses,
  },
};

export const ossIndexResultNoVulnerabilities: ComponentContainer = {
  component: {
    packageUrl: 'pkg:npm/test-no-vulns@1.0.0',
    name: 'test-no-vulns',
    hash: '',
  },
  matchState: 'PURL',
  catalogDate: '',
  relativePopularity: '',
  licenseData: undefined,
  securityData: {
    securityIssues: [],
  },
};

export const applicationInternalIdResponse = {
  statusCode: 200,
  body: {
    applications: [
      {
        id: '4bb67dcfc86344e3a483832f8c496419',
        publicId: 'testapp',
        name: 'TestApp',
        organizationId: 'bb41817bd3e2403a8a52fe8bcd8fe25a',
        contactUserName: 'NewAppContact',
        applicationTags: [
          {
            id: '9beee80c6fc148dfa51e8b0359ee4d4e',
            tagId: 'cfea8fa79df64283bd64e5b6b624ba48',
            applicationId: '4bb67dcfc86344e3a483832f8c496419',
          },
        ],
      },
    ],
  },
};

export const ossIndexServerResults = [ossIndexResultNoVulnerabilities, ossIndexResult];

export default expect;
