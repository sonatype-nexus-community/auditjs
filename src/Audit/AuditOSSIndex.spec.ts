/*
 * Copyright (c) 2019-Present Sonatype, Inc.
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

import expect, { ossIndexObject, ossIndexObjectNoVulnerabilities } from '../Tests/TestHelper';
import { OssIndexServerResult } from '../Types/OssIndexServerResult';
import { AuditOSSIndex } from './AuditOSSIndex';

let auditOSSIndex: AuditOSSIndex;

const write = (): boolean => {
  // NO-OP
  return true;
};

const oldWrite = process.stdout.write;

const doAuditOSSIndex = (results: OssIndexServerResult[]): boolean => {
  process.stdout.write = write;
  const auditResult = auditOSSIndex.auditResults(results);
  process.stdout.write = oldWrite;
  return auditResult;
};

describe('AuditOSSIndex', () => {
  beforeEach(() => {
    auditOSSIndex = new AuditOSSIndex();
  });

  it('should return true if OSS Index results have vulnerabilities', () => {
    const results = new Array<OssIndexServerResult>();
    results.push(ossIndexObject);

    const result = doAuditOSSIndex(results);

    expect(result).to.equal(true);
  });

  it('should return true if OSS Index results have vulnerabilities, and json print is chosen', () => {
    auditOSSIndex = new AuditOSSIndex(false, true);
    const results = new Array<OssIndexServerResult>();
    results.push(ossIndexObject);

    const result = doAuditOSSIndex(results);

    expect(result).to.equal(true);
  });

  it('should return false if OSS Index results have no vulnerabilities', () => {
    const results = new Array<OssIndexServerResult>();
    results.push(ossIndexObjectNoVulnerabilities);

    const result = doAuditOSSIndex(results);

    expect(result).to.equal(false);
  });

  it('should return false if OSS Index results have no vulnerabilities, and json print is chosen', () => {
    auditOSSIndex = new AuditOSSIndex(false, true);
    const results = new Array<OssIndexServerResult>();
    results.push(ossIndexObjectNoVulnerabilities);

    const result = doAuditOSSIndex(results);

    expect(result).to.equal(false);
  });
});
