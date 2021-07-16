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

import { create } from 'xmlbuilder2';

import { Formatter, getNumberOfVulnerablePackagesFromResults } from './Formatter';
import { ComponentDetails, SecurityIssue } from '@sonatype/js-sona-types';

export class XmlFormatter implements Formatter {
  public printAuditResults(components: ComponentDetails) {
    const testsuite = create().ele('testsuite');
    testsuite.att('tests', components.componentDetails.length.toString());
    testsuite.att('timestamp', new Date().toISOString());
    testsuite.att('failures', getNumberOfVulnerablePackagesFromResults(components).toString());

    for (let i = 0; i < components.componentDetails.length; i++) {
      const testcase = testsuite.ele('testcase', { classname: components.componentDetails[i].component.packageUrl, name: components.componentDetails[i].component.packageUrl });
      const vulns = components.componentDetails[i].securityData?.securityIssues;

      if (vulns) {
        if (vulns.length > 0) {
          const failure = testcase.ele('failure');
          let failureText = '';
          for (let j = 0; j < vulns.length; j++) {
            failureText += this.getVulnerabilityForXmlBlock(vulns[j]) + '\n';
          }
          failure.txt(failureText);
          failure.att('type', 'Vulnerability detected');
        }
      }
    }

    const xml = testsuite.end({ prettyPrint: true });

    console.log(xml);
  }

  private getVulnerabilityForXmlBlock(vuln: SecurityIssue): string {
    let vulnBlock = '';
    vulnBlock += `Vulnerability Title: ${vuln.reference}\n`;
    vulnBlock += `ID: ${vuln.id}\n`;
    vulnBlock += `Description: ${vuln.description}\n`;
    vulnBlock += `CVSS Score: ${vuln.severity}\n`;
    vulnBlock += `CVSS Vector: ${vuln.vector}\n`;
    vulnBlock += `CVE: ${vuln.source}\n`;
    vulnBlock += `Reference: ${vuln.url}\n`;

    return vulnBlock;
  }
}
