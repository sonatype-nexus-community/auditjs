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
import expect, { ossIndexObject, ossIndexObjectNoVulnerabilities } from '../Tests/TestHelper';
import { OssIndexServerResult } from '../Types/OssIndexServerResult';
import { AuditOSSIndex } from './AuditOSSIndex';
import { Coordinates } from '../Types/Coordinates';

let auditOSSIndex: AuditOSSIndex;

const write = (): boolean => {
  // NO-OP
  return true;
};

const written = Array<string>();
afterEach(() => {
  written.length = 0;
});

const writeCapture = (chunk: any): boolean => {
  written.push(chunk);
  return true;
};

const oldWrite = process.stdout.write;

const doAuditOSSIndex = (results: OssIndexServerResult[]): boolean => {
  return doAuditOSSIndexCapture(results, [], write);
};

const doAuditOSSIndexCapture = (
  results: OssIndexServerResult[],
  supplemental: Array<Coordinates>,
  writeFunc: any,
): boolean => {
  process.stdout.write = writeFunc;
  const auditResult = auditOSSIndex.auditResults(results, supplemental);
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

  it('should include supplemental when empty', () => {
    const results = new Array<OssIndexServerResult>();
    results.push(ossIndexObjectNoVulnerabilities);

    const result = doAuditOSSIndexCapture(results, [], writeCapture);

    expect(result).to.equal(false);
    expect(written.indexOf('  [32mPath: [39m\n')).to.not.eq(-1);
    expect(written.indexOf('  [32mRequired By: [39m\n')).to.not.eq(-1);
  });

  it('should include supplemental', () => {
    const ossiServerResult: OssIndexServerResult = new OssIndexServerResult({
      coordinates: 'pkg:npm/supName1@subVersion1',
      reference: 'reference',
      vulnerabilities: [],
    });

    const results = new Array<OssIndexServerResult>();
    results.push(ossiServerResult);

    const result = doAuditOSSIndexCapture(
      results,
      new Array<Coordinates>(new Coordinates('supName1', 'subVersion1', '', new Set<string>(), 'supPath')),
      writeCapture,
    );

    expect(result).to.equal(false);
    expect(written.indexOf('  [32mPath: supPath[39m\n')).to.not.eq(-1);
    expect(written.indexOf('  [32mRequired By: [39m\n')).to.not.eq(-1);
  });
});
