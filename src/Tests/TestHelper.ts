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
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import 'mocha';
import { OssIndexServerResult } from "../Types/OssIndexServerResult";

chai.use(chaiAsPromised);
const expect = chai.expect;

export const ossIndexObject: OssIndexServerResult = new OssIndexServerResult({
  coordinates: 'Test',
  reference: 'reference',
  vulnerabilities: [
    { id: 'test_id', title: 'title', cvssScore: '9.8', reference: 'reference', description: '', cvssVector: '', cve: '9.8' },
    { id: 'test_id2', title: 'title', cvssScore: '9.8', reference: 'reference', description: '', cvssVector: '', cve: '9.8' }
  ]
});

export const ossIndexObjectNoVulnerabilities: OssIndexServerResult = new OssIndexServerResult({
  coordinates: 'Test',
  reference: 'reference',
  vulnerabilities: []
});

export const ossIndexServerResults = [ossIndexObjectNoVulnerabilities, ossIndexObject];

export default expect; 
