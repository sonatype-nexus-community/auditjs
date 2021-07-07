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

import expect from '../Tests/TestHelper';
import { AuditIQServer } from './AuditIQServer';
import { ReportStatus } from '../Types/ReportStatus';
import { IqServerPolicyReportResult } from '../Types/IqServerPolicyReportResult';
// See IQ Policy Violations by Report REST API (v2) docs:
// https://help.sonatype.com/iqserver/automating/rest-apis/report-related-rest-apis---v2#Report-relatedRESTAPIs-v2-Step2-DownloadingtheComponentInformation
// iqServerReportMock.json file content taken from above docs
import * as iqServerReport from './iqServerReportMock.json';
import { NpmList } from '../Munchers/NpmList';
import { AuditGraph } from './AuditGraph';

const oldLog = console.log;
const oldError = console.error;

describe('AuditIQServer', () => {
  before(() => {
    console.log = () => ({});
    console.error = () => ({});
  });

  after(() => {
    console.log = oldLog;
    console.error = oldError;
  });

  it('should provide a true value if IQ Server Results have policy violations', () => {
    const auditIqServer = new AuditIQServer();
    const results: ReportStatus = { policyAction: 'Failure', isError: false };
    const result = auditIqServer.auditThirdPartyResults(results, iqServerReport);
    expect(result).to.equal(true);
  });

  it('should provide a true value if IQ Server Results have policy violations and AuditGraph exists', async () => {
    const muncher = new NpmList(false);
    expect(muncher.isValid()).to.equal(true);

    await muncher
      .getDepList()
      .then((res) => expect(Array.isArray(res)).equal(true))
      .catch((err) => expect(err).not.exist);
    const graph = muncher.getGraph();

    const auditGraph = new AuditGraph(graph!);
    const auditIqServer = new AuditIQServer(auditGraph!);
    const results: ReportStatus = { policyAction: 'Failure', isError: false };

    // force vulnerability packageUrl to something that will exist in the dependency tree
    const myIqServerReport = JSON.parse(JSON.stringify(iqServerReport));
    myIqServerReport.components[0].packageUrl = 'pkg:npm/chalk@3.0.0';
    const result = auditIqServer.auditThirdPartyResults(results, myIqServerReport);
    expect(result).to.equal(true);
  });

  it('should provide a true value if IQ Server Results have an isError value', () => {
    const auditIqServer = new AuditIQServer();
    const results: ReportStatus = { isError: true };
    const result = auditIqServer.auditThirdPartyResults(results, {} as IqServerPolicyReportResult);
    expect(result).to.equal(true);
  });

  it('should provide a false value if IQ Server Results have no policy violations', () => {
    const auditIqServer = new AuditIQServer();
    const results: ReportStatus = { policyAction: 'None', reportHtmlUrl: '', isError: false };
    results.policyAction = 'None';
    results.reportHtmlUrl = '';
    const result = auditIqServer.auditThirdPartyResults(results, {} as IqServerPolicyReportResult);
    expect(result).to.equal(false);
  });
});
